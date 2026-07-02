import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { compareSilhouettes, SILHOUETTE_GATE } from './pixel-diff-gate.mjs';
import { writeJson } from './io.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

/** Rôles dont le cutout planche EST le master (cartes support, HUD, arènes). */
export const BOARD_MASTER_ROLES = new Set(['companion', 'ui', 'environment']);

export function shouldUseBoardMasterDirect(asset) {
  return BOARD_MASTER_ROLES.has(asset.role);
}

export function decideMasterMethod(asset, proceduralDiff) {
  if (shouldUseBoardMasterDirect(asset)) return 'board_master_direct';
  if (proceduralDiff.strong_pass && asset.role !== 'environment') return 'procedural_gate_pass';
  if (!proceduralDiff.passed && proceduralDiff.iou < 0.35) return 'board_master_direct';
  return 'board_hybrid_refined';
}

export async function compositeHybridMaster(boardPath, accentSpecPath, outPath, blend = 'screen') {
  await mkdir(dirname(outPath), { recursive: true });
  const baseMeta = await sharp(boardPath).metadata();
  const bw = baseMeta.width ?? 128;
  const bh = baseMeta.height ?? 192;
  const accentBuf = await sharp(accentSpecPath).resize(bw, bh, { fit: 'fill' }).png().toBuffer();
  await sharp(boardPath).composite([{ input: accentBuf, blend }]).png().toFile(outPath);
}

/**
 * QA finale — compare le master livré à la référence planche (pas le candidat procédural).
 */
export async function runFinalFidelityQa(boardRefPath, masterPath, packRoot, dims, extra = {}) {
  const { width = 128, height = 192, method = 'unknown', procedural_iou = null } = extra;
  const heatmapPath = join(packRoot, '07_qa', 'silhouette-diff-heatmap.png');
  const diff = await compareSilhouettes(boardRefPath, masterPath, { width, height, heatmapPath });

  const shipping_ready = diff.iou >= 0.72;
  const qaReport = {
    method,
    gate: SILHOUETTE_GATE,
    diff,
    procedural_iou,
    passed: diff.passed,
    shipping_ready,
    agent_instruction: shipping_ready
      ? 'Fidélité shipping — verrouiller et exporter.'
      : diff.passed
        ? `Master OK (IoU ${diff.iou}) — inpaint stage 08 pour viser 0.72.`
        : `Échec gate final IoU ${diff.iou} — Character/Decor : board_master ou hybrid accent léger.`,
    generated_at: new Date().toISOString(),
  };

  await writeJson(join(packRoot, '07_qa', 'silhouette-diff-report.json'), qaReport);
  await writeJson(join(packRoot, '07_qa', 'qa-report.json'), {
    stage: '07_qa',
    passed: diff.passed,
    score: Math.round(diff.iou * 100),
    blockers: diff.passed ? [] : [`fidelity:iou=${diff.iou}`],
    fidelity: { iou: diff.iou, method, shipping_ready },
    generated_at: new Date().toISOString(),
  });

  return { diff, qaReport, passed: diff.passed };
}
