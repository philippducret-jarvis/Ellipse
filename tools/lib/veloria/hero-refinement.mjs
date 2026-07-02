import { copyFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { writeAssetSpecPng } from '../../../packages/pipeline/dist/index.js';
import { buildAtlasGrid } from '../level-01/production-image-utils.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';
import { buildHeroSpec, buildHeroAccentOverlay } from './procedural-builders.mjs';
import { compareSilhouettes } from './pixel-diff-gate.mjs';
import { analyzeCutoutProfile, mergeHeroProfile } from './hero-profiles.mjs';
import { compositeHybridMaster, decideMasterMethod, runFinalFidelityQa } from './fidelity-qa.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

const TARGET_W = 256;
const TARGET_H = 384;
const FRAME_W = 128;
const FRAME_H = 192;

const CLIPS = { idle: 4, run: 4, attack: 3 };

const CLIP_TRANSFORMS = {
  idle: [
    { scale: 1, dx: 0, dy: 0, rotate: 0 },
    { scale: 1.02, dx: 0, dy: -2, rotate: 0.4 },
    { scale: 1, dx: 0, dy: 0, rotate: 0 },
    { scale: 0.98, dx: 0, dy: 2, rotate: -0.4 },
  ],
  run: [
    { scale: 1.03, dx: -3, dy: -2, rotate: -2 },
    { scale: 1.02, dx: 0, dy: 0, rotate: 0 },
    { scale: 1.03, dx: 3, dy: -2, rotate: 2 },
    { scale: 1.02, dx: 0, dy: 1, rotate: 0 },
  ],
  attack: [
    { scale: 1.04, dx: 2, dy: -1, rotate: -6 },
    { scale: 1.06, dx: 4, dy: -3, rotate: -10 },
    { scale: 1.02, dx: 1, dy: 0, rotate: -2 },
  ],
};

function wsUrl(relPath) {
  return `${PUBLIC_WORKSPACE_ROOT}/${relPath.replace(/\\/g, '/')}`;
}

async function normalizeBoardCutout(srcPath, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  const meta = await sharp(srcPath).rotate().metadata();
  const srcW = meta.width ?? 1;
  const srcH = meta.height ?? 1;
  const scale = Math.min((TARGET_W * 0.88) / srcW, (TARGET_H * 0.92) / srcH);
  const resizedW = Math.max(1, Math.round(srcW * scale));
  const resizedH = Math.max(1, Math.round(srcH * scale));

  const resized = await sharp(srcPath)
    .rotate()
    .resize(resizedW, resizedH, { fit: 'inside' })
    .ensureAlpha()
    .toBuffer();

  const left = Math.round((TARGET_W - resizedW) / 2);
  const top = Math.round((TARGET_H - resizedH) / 2);

  await sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(outPath);

  return { width: TARGET_W, height: TARGET_H, padding: { left, top } };
}

async function renderRasterFrame(masterPath, outPath, transform) {
  const scale = transform.scale ?? 1;
  const mod = 0.92 + (scale - 1) * 0.6;

  await mkdir(dirname(outPath), { recursive: true });
  await sharp(masterPath)
    .resize(Math.round(FRAME_W * mod), Math.round(FRAME_H * mod), {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .rotate(transform.rotate ?? 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

function defaultRig() {
  return {
    version: 1,
    kind: 'character',
    pivots: {
      root: { x: 0.5, y: 0.92 },
      torso: { x: 0.5, y: 0.55 },
      head: { x: 0.5, y: 0.22 },
      weapon: { x: 0.72, y: 0.4 },
    },
    bones: ['root', 'torso', 'head', 'weapon'],
  };
}

/**
 * Sprint B — pack héro raffiné : planche normalisée + gate pixel-diff + hybrid ou procédural.
 */
export async function produceRefinedHeroPack(hero, options = {}) {
  const profile = options.profile ?? 'high';
  const packRoot = join(WORKSPACE_ROOT, hero.pack_root);
  const cutoutPath = join(WORKSPACE_ROOT, hero.preview_file);

  for (const stage of ['01_source', '03_cleanup', '04_rig', '05_animation', '06_exports', '07_qa']) {
    await mkdir(join(packRoot, stage), { recursive: true });
  }

  try {
    await copyFile(cutoutPath, join(packRoot, '01_source', 'board-cutout-reference.png'));
  } catch {
    throw new Error(`Cutout manquant pour ${hero.key}: ${cutoutPath}. Lancez pnpm veloria:prep.`);
  }

  const boardNormalized = join(packRoot, '03_cleanup', 'board_hd_normalized.png');
  await normalizeBoardCutout(cutoutPath, boardNormalized);

  const proceduralMaster = join(packRoot, '03_cleanup', 'procedural_candidate.png');
  await writeAssetSpecPng(buildHeroSpec(hero.key, 0), proceduralMaster, { profile: 'high' });

  const accentOverlay = join(packRoot, '03_cleanup', 'procedural_accent_overlay.png');
  await writeAssetSpecPng(buildHeroAccentOverlay(hero.key), accentOverlay, { profile: 'high' });

  const boardFrame = join(packRoot, '03_cleanup', 'board_frame.png');
  await sharp(boardNormalized).resize(FRAME_W, FRAME_H, { fit: 'contain' }).png().toFile(boardFrame);

  const proceduralDiff = await compareSilhouettes(boardFrame, proceduralMaster, {
    width: FRAME_W,
    height: FRAME_H,
  });

  const analysis = await analyzeCutoutProfile(cutoutPath);
  const heroProfile = mergeHeroProfile(hero.key, analysis);

  const masterPath = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  const method = decideMasterMethod(hero, proceduralDiff);

  if (method === 'board_master_direct') {
    await sharp(boardFrame).sharpen({ sigma: 0.4 }).png().toFile(masterPath);
  } else if (method === 'procedural_gate_pass') {
    await copyFile(proceduralMaster, masterPath);
  } else {
    const hybridPath = join(packRoot, '03_cleanup', 'hybrid_composite.png');
    await compositeHybridMaster(boardFrame, accentOverlay, hybridPath, 'overlay');
    await copyFile(hybridPath, masterPath);
  }

  await copyFile(masterPath, join(packRoot, '03_cleanup', 'silhouette-clean.png'));
  await writeJson(join(packRoot, '04_rig', 'rig.json'), defaultRig());

  const frames = [];
  let frameIndex = 0;
  for (const [clipName, count] of Object.entries(CLIPS)) {
    const transforms = CLIP_TRANSFORMS[clipName];
    for (let i = 0; i < count; i++) {
      const out = join(packRoot, '05_animation', `${clipName}_${i}.png`);
      if (method === 'procedural_gate_pass') {
        await writeAssetSpecPng(buildHeroSpec(hero.key, frameIndex + i), out, { profile });
      } else {
        await renderRasterFrame(masterPath, out, transforms[i] ?? transforms[0]);
      }
      frames.push({
        id: `${clipName}_${i}`,
        clip: clipName,
        path: out,
        workspacePath: `${hero.pack_root}/05_animation/${clipName}_${i}.png`.replace(/\\/g, '/'),
      });
    }
    frameIndex += count;
  }

  const atlasImage = join(packRoot, '06_exports', 'runtime_atlas.png');
  const atlasJson = join(packRoot, '06_exports', 'runtime_atlas.json');
  const atlasManifest = await buildAtlasGrid(frames, atlasImage, atlasJson, { columns: 4, padding: 16 });
  atlasManifest.image = `${hero.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/');
  await writeJson(atlasJson, atlasManifest);

  const { qaReport: fidelityQa } = await runFinalFidelityQa(boardFrame, masterPath, packRoot, { width: FRAME_W, height: FRAME_H }, {
    method,
    procedural_iou: proceduralDiff.iou,
  });

  const qaReport = {
    sprint: 'B',
    hero: hero.key,
    method,
    diff: fidelityQa.diff,
    procedural_diff: proceduralDiff,
    hero_profile: heroProfile,
    reference: hero.preview_file,
    passed: fidelityQa.passed,
    generated_at: new Date().toISOString(),
  };

  const manifest = {
    asset_id: hero.id,
    key: hero.key,
    title: hero.title,
    role: hero.role,
    pack_root: hero.pack_root,
    method,
    profile,
    palette: 'veloria_dark_fantasy_premium',
    sprint_b: {
      iou: fidelityQa.diff.iou,
      passed: fidelityQa.passed,
      procedural_iou: proceduralDiff.iou,
      strong_pass: proceduralDiff.strong_pass,
      qa_report: `${hero.pack_root}/07_qa/silhouette-diff-report.json`.replace(/\\/g, '/'),
      heatmap: `${hero.pack_root}/07_qa/silhouette-diff-heatmap.png`.replace(/\\/g, '/'),
    },
    master: `${hero.pack_root}/03_cleanup/silhouette_hd_master.png`.replace(/\\/g, '/'),
    atlas: {
      image: `${hero.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/'),
      json: `${hero.pack_root}/06_exports/runtime_atlas.json`.replace(/\\/g, '/'),
      url: wsUrl(`${hero.pack_root}/06_exports/runtime_atlas.png`),
    },
    clips: CLIPS,
    frame_count: frames.length,
    atlas_size: { width: atlasManifest.meta.size.w, height: atlasManifest.meta.size.h },
    generated_at: new Date().toISOString(),
  };

  await writeJson(join(packRoot, '06_exports', 'runtime-manifest.json'), manifest);

  return {
    asset: hero,
    manifest,
    masterPath,
    atlasUrl: manifest.atlas.url,
    frameCount: frames.length,
    qa: { ...qaReport, diff: fidelityQa.diff, passed: fidelityQa.passed },
    method,
  };
}
