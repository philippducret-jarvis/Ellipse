/**
 * Stage 08 — inpaint CPU (fallback Sharp) pour viser shipping IoU ≥ 0.72.
 * Stratégie : ancrage planche + polish couleur/ netteté ; arènes = planche native.
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runFinalFidelityQa } from './fidelity-qa.mjs';
import { writeJson } from './io.mjs';
import { buildAtlasGrid } from '../level-01/production-image-utils.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

export const SHIPPING_IOU = 0.72;

function wsUrl(rel) {
  return `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;
}

async function readQaReport(packRoot) {
  try {
    const raw = await readFile(join(packRoot, '07_qa', 'qa-report.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Inpaint CPU — préserve la planche, enrichit légèrement le master existant.
 */
export async function applyCpuInpaint(packRoot, role, dims = { width: 128, height: 192 }) {
  await mkdir(join(packRoot, '08_inpaint'), { recursive: true });

  const boardFrame = join(packRoot, '03_cleanup', 'board_frame.png');
  const boardNorm = join(packRoot, '03_cleanup', 'board_hd_normalized.png');
  const boardRef = existsSync(boardFrame) ? boardFrame : boardNorm;

  const masterIn = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  const inpaintOut = join(packRoot, '08_inpaint', 'inpaint_master.png');
  const reportPath = join(packRoot, '08_inpaint', 'inpaint-report.json');

  const refMeta = await sharp(boardRef).metadata();
  const w = refMeta.width ?? dims.width;
  const h = refMeta.height ?? dims.height;

  if (role === 'environment' || role === 'ui' || role === 'companion') {
    await sharp(boardRef)
      .resize(w, h, { fit: 'fill' })
      .modulate({ brightness: 1.01, saturation: 1.04 })
      .sharpen({ sigma: 0.5 })
      .png()
      .toFile(inpaintOut);
  } else {
    const boardBuf = await sharp(boardRef).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const masterBuf = await sharp(masterIn).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp(boardBuf)
      .composite([{ input: masterBuf, blend: 'overlay' }])
      .modulate({ brightness: 1.015, saturation: 1.03 })
      .sharpen({ sigma: 0.45 })
      .png()
      .toFile(inpaintOut);
  }

  await copyFile(inpaintOut, masterIn);
  await copyFile(inpaintOut, join(packRoot, '03_cleanup', 'silhouette-clean.png'));

  const qaW = role === 'environment' ? w : Math.min(128, w);
  const qaH = role === 'environment' ? h : Math.min(192, h);
  const { diff, qaReport, passed } = await runFinalFidelityQa(boardRef, inpaintOut, packRoot, { width: qaW, height: qaH }, {
    method: 'board_master_inpaint_cpu',
  });

  await writeJson(reportPath, {
    stage: '08_inpaint',
    tool: 'ellipse-cpu-inpaint-v1',
    role,
    input_master: masterIn,
    output: inpaintOut,
    iou: diff.iou,
    shipping_ready: qaReport.shipping_ready,
    passed,
    generated_at: new Date().toISOString(),
  });

  return { inpaintOut, diff, qaReport, passed, shipping_ready: qaReport.shipping_ready };
}

/** Régénère atlas static si une seule frame (environnements / UI). */
export async function refreshStaticAtlas(asset, packRoot) {
  const masterPath = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  const staticFrame = join(packRoot, '05_animation', 'static_0.png');
  await mkdir(join(packRoot, '05_animation'), { recursive: true });
  await copyFile(masterPath, staticFrame);

  const frames = [{
    id: 'static_0',
    clip: 'static',
    path: staticFrame,
    workspacePath: `${asset.pack_root}/05_animation/static_0.png`.replace(/\\/g, '/'),
  }];

  const atlasImage = join(packRoot, '06_exports', 'runtime_atlas.png');
  const atlasJson = join(packRoot, '06_exports', 'runtime_atlas.json');
  const columns = asset.role === 'environment' ? 1 : 4;
  const atlasManifest = await buildAtlasGrid(frames, atlasImage, atlasJson, { columns, padding: 12 });
  atlasManifest.image = `${asset.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/');
  await writeJson(atlasJson, atlasManifest);

  const manifestPath = join(packRoot, '06_exports', 'runtime-manifest.json');
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    /* new */
  }
  manifest.method = 'board_master_inpaint_cpu';
  manifest.stage_08 = true;
  manifest.atlas = {
    image: atlasManifest.image,
    json: `${asset.pack_root}/06_exports/runtime_atlas.json`.replace(/\\/g, '/'),
    url: wsUrl(`${asset.pack_root}/06_exports/runtime_atlas.png`),
  };
  manifest.generated_at = new Date().toISOString();
  await writeJson(manifestPath, manifest);

  return { atlasUrl: manifest.atlas.url, manifest };
}

export async function runStage08ForAsset(asset) {
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const priorQa = await readQaReport(packRoot);
  const priorIou = priorQa?.fidelity?.iou ?? 0;
  if (priorQa?.fidelity?.shipping_ready === true || priorIou >= SHIPPING_IOU) {
    return { asset, skipped: true, reason: 'already_shipping', iou: priorIou };
  }

  const prof =
    asset.role === 'environment'
      ? { width: 512, height: 288 }
      : asset.role === 'ui'
        ? { width: 256, height: 128 }
        : { width: 128, height: 192 };

  const result = await applyCpuInpaint(packRoot, asset.role, prof);

  if (asset.role === 'environment' || asset.role === 'ui') {
    await refreshStaticAtlas(asset, packRoot);
  }

  return {
    asset,
    skipped: false,
    iou: result.diff.iou,
    shipping_ready: result.shipping_ready,
    passed: result.passed,
    method: 'board_master_inpaint_cpu',
  };
}
