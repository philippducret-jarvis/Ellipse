/**
 * Raffinement board-hybrid générique (supports, environnements, UI, props) + gate IoU.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { writeAssetSpecPng } from '../../../packages/pipeline/dist/index.js';
import { buildAtlasGrid } from '../level-01/production-image-utils.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';
import { builderForAsset } from './procedural-builders.mjs';
import { compareSilhouettes, SILHOUETTE_GATE } from './pixel-diff-gate.mjs';
import {
  compositeHybridMaster,
  decideMasterMethod,
  runFinalFidelityQa,
  shouldUseBoardMasterDirect,
} from './fidelity-qa.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

const ROLE_PROFILES = {
  companion: { fw: 128, fh: 192, clips: { idle: 4, run: 4, attack: 2 } },
  environment: { fw: 512, fh: 288, clips: { static: 1 } },
  ui: { fw: 256, fh: 128, clips: { static: 1 } },
  prop: { fw: 128, fh: 128, clips: { static: 1 } },
  relic: { fw: 128, fh: 128, clips: { static: 1 } },
  armor: { fw: 160, fh: 192, clips: { static: 1 } },
};

function wsUrl(relPath) {
  return `${PUBLIC_WORKSPACE_ROOT}/${relPath.replace(/\\/g, '/')}`;
}

function profileFor(asset) {
  if (asset.role === 'companion') return ROLE_PROFILES.companion;
  if (asset.role === 'environment') return ROLE_PROFILES.environment;
  if (asset.role === 'ui') return ROLE_PROFILES.ui;
  if (asset.role === 'armor') return ROLE_PROFILES.armor;
  if (asset.role === 'relic') return ROLE_PROFILES.relic;
  return ROLE_PROFILES.prop;
}

async function normalizeCutout(srcPath, outPath, tw, th) {
  await mkdir(dirname(outPath), { recursive: true });
  const meta = await sharp(srcPath).rotate().metadata();
  const scale = Math.min((tw * 0.92) / (meta.width ?? 1), (th * 0.94) / (meta.height ?? 1));
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

async function renderFrame(masterPath, outPath, fw, fh, transform = {}) {
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(masterPath)
    .resize(Math.round(fw * (transform.scale ?? 1)), Math.round(fh * (transform.scale ?? 1)), { fit: 'inside' })
    .rotate(transform.rotate ?? 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(fw, fh, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

export async function produceRefinedGenericPack(asset, options = {}) {
  const prof = profileFor(asset);
  const { fw, fh, clips } = prof;
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const cutoutPath = join(WORKSPACE_ROOT, asset.preview_file);
  const build = builderForAsset(asset);

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

  const proceduralPath = join(packRoot, '03_cleanup', 'procedural_candidate.png');
  await writeAssetSpecPng(build(0), proceduralPath, { profile: 'high' });

  const qaW = asset.role === 'environment' ? fw : Math.min(128, fw);
  const qaH = asset.role === 'environment' ? fh : Math.min(192, fh);
  const proceduralDiff = await compareSilhouettes(boardFrame, proceduralPath, {
    width: qaW,
    height: qaH,
  });

  const masterPath = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  let method = decideMasterMethod(asset, proceduralDiff);

  if (method === 'board_master_direct') {
    await sharp(boardFrame).sharpen({ sigma: 0.4 }).png().toFile(masterPath);
  } else if (method === 'procedural_gate_pass') {
    await copyFile(proceduralPath, masterPath);
  } else {
    const accentPath = join(packRoot, '03_cleanup', 'procedural_accent.png');
    await copyFile(proceduralPath, accentPath);
    const hybridPath = join(packRoot, '03_cleanup', 'hybrid_composite.png');
    await compositeHybridMaster(boardFrame, accentPath, hybridPath, 'overlay');
    await copyFile(hybridPath, masterPath);
  }
  await copyFile(masterPath, join(packRoot, '03_cleanup', 'silhouette-clean.png'));

  const { diff, qaReport: fidelityQa, passed } = await runFinalFidelityQa(boardFrame, masterPath, packRoot, { width: qaW, height: qaH }, {
    method,
    procedural_iou: proceduralDiff.iou,
  });

  await writeJson(join(packRoot, '04_rig', 'rig.json'), {
    version: 1,
    kind: asset.role,
    pivots: { root: { x: 0.5, y: asset.role === 'environment' ? 1 : 0.92 } },
  });

  const frames = [];
  for (const [clipName, count] of Object.entries(clips)) {
    for (let i = 0; i < count; i++) {
      const out = join(packRoot, '05_animation', `${clipName}_${i}.png`);
      const t = clipName === 'run' ? { scale: 1 + (i % 2) * 0.02, rotate: (i - 1) * 2 } : { scale: 1 + (i % 2) * 0.01 };
      await renderFrame(masterPath, out, fw, fh, t);
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
  const columns = asset.role === 'environment' ? 1 : 4;
  const atlasManifest = await buildAtlasGrid(frames, atlasImage, atlasJson, { columns, padding: 12 });
  atlasManifest.image = `${asset.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/');
  await writeJson(atlasJson, atlasManifest);

  const qaReport = { ...fidelityQa, refine_all: true };

  const manifest = {
    asset_id: asset.id,
    key: asset.key,
    title: asset.title,
    role: asset.role,
    pack_root: asset.pack_root,
    method,
    refine_all: true,
    atlas: {
      image: atlasManifest.image,
      json: `${asset.pack_root}/06_exports/runtime_atlas.json`.replace(/\\/g, '/'),
      url: wsUrl(`${asset.pack_root}/06_exports/runtime_atlas.png`),
    },
    clips,
    frame_count: frames.length,
    qa: qaReport,
    generated_at: new Date().toISOString(),
  };
  await writeJson(join(packRoot, '06_exports', 'runtime-manifest.json'), manifest);

  return { asset, manifest, atlasUrl: manifest.atlas.url, qa: { ...qaReport, diff: fidelityQa.diff, passed }, method };
}
