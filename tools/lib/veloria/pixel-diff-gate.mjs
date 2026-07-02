import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

/** Seuils Sprint B — silhouette vs planche normalisée */
export const SILHOUETTE_GATE = {
  pass_iou: 0.42,
  strong_pass_iou: 0.55,
  max_symmetric_diff_pct: 58,
};

function loadAlphaMask(path, width, height) {
  return sharp(path)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        mask[i] = data[i * info.channels + 3] > 128 ? 1 : 0;
      }
      return mask;
    });
}

/**
 * Compare deux silhouettes (canal alpha) et produit métriques + heatmap QA.
 */
export async function compareSilhouettes(referencePath, candidatePath, options = {}) {
  const width = options.width ?? 128;
  const height = options.height ?? 192;
  const heatmapPath = options.heatmapPath ?? null;

  const [refMask, candMask] = await Promise.all([
    loadAlphaMask(referencePath, width, height),
    loadAlphaMask(candidatePath, width, height),
  ]);

  let intersection = 0;
  let union = 0;
  let refOnly = 0;
  let candOnly = 0;
  let refSumX = 0;
  let refSumY = 0;
  let refCount = 0;
  let candSumX = 0;
  let candSumY = 0;
  let candCount = 0;

  const pixels = width * height;
  const heat = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const r = refMask[i];
    const c = candMask[i];
    const x = i % width;
    const y = Math.floor(i / width);

    if (r) {
      refSumX += x;
      refSumY += y;
      refCount++;
    }
    if (c) {
      candSumX += x;
      candSumY += y;
      candCount++;
    }
    if (r && c) intersection++;
    if (r || c) union++;
    if (r && !c) refOnly++;
    if (!r && c) candOnly++;

    const o = i * 4;
    if (r && c) {
      heat[o] = 40;
      heat[o + 1] = 180;
      heat[o + 2] = 90;
      heat[o + 3] = 140;
    } else if (r) {
      heat[o] = 220;
      heat[o + 1] = 60;
      heat[o + 2] = 60;
      heat[o + 3] = 180;
    } else if (c) {
      heat[o] = 80;
      heat[o + 1] = 120;
      heat[o + 2] = 240;
      heat[o + 3] = 180;
    }
  }

  const iou = union > 0 ? intersection / union : 0;
  const symmetricDiffPct = union > 0 ? ((refOnly + candOnly) / union) * 100 : 100;
  const passed =
    iou >= SILHOUETTE_GATE.pass_iou && symmetricDiffPct <= SILHOUETTE_GATE.max_symmetric_diff_pct;
  const strongPass = iou >= SILHOUETTE_GATE.strong_pass_iou;

  if (heatmapPath) {
    await mkdir(dirname(heatmapPath), { recursive: true });
    await sharp(heat, { raw: { width, height, channels: 4 } }).png().toFile(heatmapPath);
  }

  return {
    width,
    height,
    iou: Number(iou.toFixed(4)),
    symmetric_diff_pct: Number(symmetricDiffPct.toFixed(2)),
    intersection,
    union,
    ref_only: refOnly,
    cand_only: candOnly,
    ref_centroid:
      refCount > 0
        ? { x: Number((refSumX / refCount).toFixed(2)), y: Number((refSumY / refCount).toFixed(2)) }
        : null,
    cand_centroid:
      candCount > 0
        ? { x: Number((candSumX / candCount).toFixed(2)), y: Number((candSumY / candCount).toFixed(2)) }
        : null,
    passed,
    strong_pass: strongPass,
    gate: SILHOUETTE_GATE,
  };
}
