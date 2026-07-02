import { copyFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { writeAssetSpecPng } from '../../../packages/pipeline/dist/index.js';
import { buildAtlasGrid } from '../level-01/production-image-utils.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';
import { buildEnemySpec, buildBossSpec } from './procedural-builders.mjs';
import { compareSilhouettes, SILHOUETTE_GATE } from './pixel-diff-gate.mjs';
import { compositeHybridMaster, decideMasterMethod, runFinalFidelityQa } from './fidelity-qa.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

const ENEMY_CLIPS = { idle: 2, walk: 4, hit: 2 };
const BOSS_CLIPS = { idle: 2, phase: 3, attack: 3 };
const FRAME_W = 96;
const FRAME_H = 96;
const BOSS_W = 128;
const BOSS_H = 160;

const WALK_TRANSFORMS = [
  { scale: 1, rotate: 0 },
  { scale: 1.02, rotate: -2 },
  { scale: 1, rotate: 0 },
  { scale: 1.02, rotate: 2 },
];

function wsUrl(relPath) {
  return `${PUBLIC_WORKSPACE_ROOT}/${relPath.replace(/\\/g, '/')}`;
}

async function normalizeCutout(srcPath, outPath, tw, th) {
  await mkdir(dirname(outPath), { recursive: true });
  const meta = await sharp(srcPath).rotate().metadata();
  const scale = Math.min((tw * 0.9) / (meta.width ?? 1), (th * 0.92) / (meta.height ?? 1));
  const rw = Math.max(1, Math.round((meta.width ?? 1) * scale));
  const rh = Math.max(1, Math.round((meta.height ?? 1) * scale));
  const resized = await sharp(srcPath).rotate().resize(rw, rh, { fit: 'inside' }).ensureAlpha().toBuffer();
  await sharp({
    create: { width: tw, height: th, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: Math.round((tw - rw) / 2), top: Math.round((th - rh) / 2) }])
    .png()
    .toFile(outPath);
}

async function renderFrame(masterPath, outPath, transform, fw, fh) {
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(masterPath)
    .resize(Math.round(fw * (transform.scale ?? 1)), Math.round(fh * (transform.scale ?? 1)), { fit: 'inside' })
    .rotate(transform.rotate ?? 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(fw, fh, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

/**
 * Sprint C — pack ennemi/boss raffiné depuis planche (hybrid board + accent procédural).
 */
export async function produceRefinedCharacterPack(asset, options = {}) {
  const isBoss = asset.role === 'boss';
  const fw = isBoss ? BOSS_W : FRAME_W;
  const fh = isBoss ? BOSS_H : FRAME_H;
  const clips = isBoss ? BOSS_CLIPS : ENEMY_CLIPS;
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const cutoutPath = join(WORKSPACE_ROOT, asset.preview_file);
  const build = isBoss ? (f) => buildBossSpec(asset.key, f) : (f) => buildEnemySpec(asset.key, f);

  for (const stage of ['01_source', '03_cleanup', '04_rig', '05_animation', '06_exports', '07_qa']) {
    await mkdir(join(packRoot, stage), { recursive: true });
  }

  await copyFile(cutoutPath, join(packRoot, '01_source', 'board-cutout-reference.png')).catch(() => {
    throw new Error(`Cutout manquant: ${cutoutPath}`);
  });

  const boardNorm = join(packRoot, '03_cleanup', 'board_hd_normalized.png');
  await normalizeCutout(cutoutPath, boardNorm, fw * 2, fh * 2);

  const boardFrame = join(packRoot, '03_cleanup', 'board_frame.png');
  await sharp(boardNorm).resize(fw, fh, { fit: 'contain' }).png().toFile(boardFrame);

  const accentPath = join(packRoot, '03_cleanup', 'procedural_accent.png');
  await writeAssetSpecPng(build(0), accentPath, { profile: 'high' });

  const proceduralCandidate = join(packRoot, '03_cleanup', 'procedural_candidate.png');
  await copyFile(accentPath, proceduralCandidate);

  const proceduralDiff = await compareSilhouettes(boardFrame, proceduralCandidate, {
    width: fw,
    height: fh,
  });

  const masterPath = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  const method = decideMasterMethod(asset, proceduralDiff);

  if (method === 'board_master_direct') {
    await sharp(boardFrame).sharpen({ sigma: 0.4 }).png().toFile(masterPath);
  } else if (method === 'procedural_gate_pass') {
    await copyFile(proceduralCandidate, masterPath);
  } else {
    const hybridPath = join(packRoot, '03_cleanup', 'hybrid_composite.png');
    await compositeHybridMaster(boardFrame, accentPath, hybridPath, 'overlay');
    await copyFile(hybridPath, masterPath);
  }
  await copyFile(masterPath, join(packRoot, '03_cleanup', 'silhouette-clean.png'));

  await writeJson(join(packRoot, '04_rig', 'rig.json'), {
    version: 1,
    kind: isBoss ? 'boss' : 'enemy',
    pivots: { root: { x: 0.5, y: 0.92 }, torso: { x: 0.5, y: 0.55 } },
  });

  const frames = [];
  for (const [clipName, count] of Object.entries(clips)) {
    for (let i = 0; i < count; i++) {
      const out = join(packRoot, '05_animation', `${clipName}_${i}.png`);
      const t = clipName === 'walk' ? WALK_TRANSFORMS[i] ?? WALK_TRANSFORMS[0] : { scale: 1 + (i % 2) * 0.02, rotate: (i - 1) * 1.5 };
      await renderFrame(masterPath, out, t, fw, fh);
      frames.push({
        id: `${clipName}_${i}`,
        clip: clipName,
        path: out,
        workspacePath: `${asset.pack_root}/05_animation/${clipName}_${i}.png`.replace(/\\/g, '/'),
      });
    }
  }

  const atlasImage = join(packRoot, '06_exports', 'runtime_atlas.png');
  const atlasJson = join(packRoot, '06_exports', 'runtime_atlas.json');
  const atlasManifest = await buildAtlasGrid(frames, atlasImage, atlasJson, { columns: 4, padding: 12 });
  atlasManifest.image = `${asset.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/');
  await writeJson(atlasJson, atlasManifest);

  const manifest = {
    asset_id: asset.id,
    key: asset.key,
    title: asset.title,
    role: asset.role,
    pack_root: asset.pack_root,
    method,
    sprint_c: true,
    atlas: {
      image: atlasManifest.image,
      json: `${asset.pack_root}/06_exports/runtime_atlas.json`.replace(/\\/g, '/'),
      url: wsUrl(`${asset.pack_root}/06_exports/runtime_atlas.png`),
    },
    clips,
    frame_count: frames.length,
    generated_at: new Date().toISOString(),
  };
  await writeJson(join(packRoot, '06_exports', 'runtime-manifest.json'), manifest);

  const { qaReport } = await runFinalFidelityQa(boardFrame, masterPath, packRoot, { width: fw, height: fh }, {
    method,
    procedural_iou: proceduralDiff.iou,
  });

  return { asset, manifest, atlasUrl: manifest.atlas.url, frameCount: frames.length, masterPath, qa: { ...qaReport, diff: qaReport.diff, passed: qaReport.passed }, method };
}

export async function produceAllRefinedCombatants(assets) {
  const results = [];
  for (const asset of assets) {
    results.push(await produceRefinedCharacterPack(asset));
  }
  return results;
}
