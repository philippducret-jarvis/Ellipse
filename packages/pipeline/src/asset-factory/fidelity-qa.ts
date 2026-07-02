import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import {
  DEFAULT_FIDELITY_THRESHOLDS,
  decideFidelityPath,
  evaluateFidelityMetrics,
  type FidelityMetrics,
} from './fidelity-engine.js';

export interface FidelityQaInput {
  referencePath: string;
  candidatePath: string;
  outputDir: string;
  width?: number;
  height?: number;
}

export interface FidelityQaResult {
  metrics: FidelityMetrics;
  decision: ReturnType<typeof decideFidelityPath>;
  heatmapPath: string;
  reportPath: string;
  passed: boolean;
  shipping_ready: boolean;
}

async function loadAlphaMask(path: string, width: number, height: number): Promise<Uint8Array> {
  const { data, info } = await sharp(path).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    mask[i] = data[i * info.channels + 3] > 128 ? 1 : 0;
  }
  return mask;
}

export async function runFidelityQa(input: FidelityQaInput): Promise<FidelityQaResult> {
  const width = input.width ?? 128;
  const height = input.height ?? 192;
  await mkdir(input.outputDir, { recursive: true });

  const [refMask, candMask] = await Promise.all([
    loadAlphaMask(input.referencePath, width, height),
    loadAlphaMask(input.candidatePath, width, height),
  ]);

  let intersection = 0;
  let union = 0;
  const pixels = width * height;
  const heat = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const r = refMask[i];
    const c = candMask[i];
    if (r && c) intersection++;
    if (r || c) union++;
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
  const symmetricDiffPct = union > 0 ? ((union - intersection) * 2) / union * 50 : 100;
  const metrics = evaluateFidelityMetrics(Number(iou.toFixed(4)), Number(symmetricDiffPct.toFixed(2)));
  const decision = decideFidelityPath({
    reference_label: input.referencePath,
    candidate_label: input.candidatePath,
    metrics,
  });

  const heatmapPath = join(input.outputDir, 'fidelity-diff-heatmap.png');
  await sharp(heat, { raw: { width, height, channels: 4 } }).png().toFile(heatmapPath);

  const reportPath = join(input.outputDir, 'fidelity-qa-report.json');
  const report = {
    stage: '07_qa_fidelity',
    metrics,
    decision: decision.decision,
    agent_instruction: decision.agent_instruction,
    next_engine: decision.next_engine,
    thresholds: DEFAULT_FIDELITY_THRESHOLDS,
    passed: metrics.passed,
    shipping_ready: metrics.shipping_ready,
    generated_at: new Date().toISOString(),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  return {
    metrics,
    decision,
    heatmapPath,
    reportPath,
    passed: metrics.passed,
    shipping_ready: metrics.shipping_ready,
  };
}

/** Trouve paires référence/candidat dans un pack asset. */
export async function findFidelityPair(assetRoot: string): Promise<{ reference: string; candidate: string } | null> {
  const { stat } = await import('node:fs/promises');
  const candidates: [string, string][] = [
    [join(assetRoot, '01_source', 'board-cutout-reference.png'), join(assetRoot, '03_cleanup', 'procedural_candidate.png')],
    [join(assetRoot, '01_source', 'reference.png'), join(assetRoot, '03_cleanup', 'silhouette_hd_master.png')],
    [join(assetRoot, '01_source', 'board-cutout-reference.png'), join(assetRoot, '03_cleanup', 'silhouette_hd_master.png')],
    [join(assetRoot, '02_cutouts', 'cutout.png'), join(assetRoot, '03_cleanup', 'silhouette-clean.png')],
  ];
  for (const [ref, cand] of candidates) {
    try {
      await stat(ref);
      await stat(cand);
      return { reference: ref, candidate: cand };
    } catch {
      /* next */
    }
  }
  return null;
}
