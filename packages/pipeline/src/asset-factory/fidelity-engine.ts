/**
 * Moteur de fidélité assets — abstraction unifiée pour agents.
 */
export const DEFAULT_FIDELITY_THRESHOLDS = {
  pass_iou: 0.42,
  strong_pass_iou: 0.55,
  shipping_iou: 0.72,
  max_symmetric_diff_pct: 58,
} as const;

export type FidelityGateThresholds = typeof DEFAULT_FIDELITY_THRESHOLDS;

export type FidelityDecision =
  | 'procedural_only'
  | 'procedural_gate_pass'
  | 'board_hybrid_refined'
  | 'board_master_inpaint'
  | 'human_qc_required';

export interface FidelityMetrics {
  iou: number;
  symmetric_diff_pct: number;
  passed: boolean;
  strong_pass: boolean;
  shipping_ready: boolean;
}

export interface FidelityEvaluationInput {
  reference_label: string;
  candidate_label: string;
  metrics: FidelityMetrics;
  thresholds?: FidelityGateThresholds;
}

/**
 * Décision reproductible pour agents — documentée dans ASSET_EVOLUTION_ENGINES.md
 */
export function decideFidelityPath(input: FidelityEvaluationInput): {
  decision: FidelityDecision;
  agent_instruction: string;
  next_engine: string;
} {
  const t = input.thresholds ?? DEFAULT_FIDELITY_THRESHOLDS;
  const { metrics } = input;

  if (metrics.shipping_ready || metrics.iou >= t.shipping_iou) {
    return {
      decision: 'board_master_inpaint',
      agent_instruction: `Fidélité shipping atteinte (IoU ${metrics.iou}). Polir inpaint stage 08 puis verrouiller style-lock.`,
      next_engine: 'concept_fidelity_engine',
    };
  }

  if (metrics.strong_pass) {
    return {
      decision: 'procedural_gate_pass',
      agent_instruction: `Procédural acceptable (IoU ${metrics.iou}) mais sous shipping ${t.shipping_iou}. Affiner builders ou passer hybrid planche.`,
      next_engine: 'concept_fidelity_engine',
    };
  }

  if (metrics.passed) {
    return {
      decision: 'board_hybrid_refined',
      agent_instruction: `Hybrid obligatoire : planche normalisée + accents vectoriels. IoU procédural ${metrics.iou} — ne pas shipper procédural seul.`,
      next_engine: 'concept_fidelity_engine',
    };
  }

  return {
    decision: 'human_qc_required',
    agent_instruction: `Échec gate (IoU ${metrics.iou}, diff ${metrics.symmetric_diff_pct}%). Character agent : ajuster crop, inpaint, ou valider manuellement.`,
    next_engine: 'qa_compliance_engine',
  };
}

export function evaluateFidelityMetrics(
  iou: number,
  symmetricDiffPct: number,
  thresholds: FidelityGateThresholds = DEFAULT_FIDELITY_THRESHOLDS,
): FidelityMetrics {
  return {
    iou,
    symmetric_diff_pct: symmetricDiffPct,
    passed: iou >= thresholds.pass_iou && symmetricDiffPct <= thresholds.max_symmetric_diff_pct,
    strong_pass: iou >= thresholds.strong_pass_iou,
    shipping_ready: iou >= thresholds.shipping_iou,
  };
}

/** Étapes pipeline que les agents doivent enchaîner pour un pack HD shipping. */
export const SHIPPING_ASSET_PIPELINE = [
  { stage: '01_source', agent: 'Art Direction', output: 'board-cutout-reference.png + style-lock.json' },
  { stage: '02_cutouts', agent: 'Character', output: 'crop validé bbox' },
  { stage: '03_cleanup', agent: 'Character', output: 'silhouette_hd_master.png (pixels planche, pas DSL seul)' },
  { stage: '04_rig', agent: 'Animation', output: 'rig.json pivots gameplay' },
  { stage: '05_animation', agent: 'Animation', output: 'clips idle/run/attack ou walk/hit' },
  { stage: '06_exports', agent: 'Integration', output: 'runtime_atlas.png+json + manifest' },
  { stage: '07_qa', agent: 'QA', output: 'silhouette-diff-report.json + heatmap — GATE BLOQUANT' },
  { stage: '08_inpaint', agent: 'Character', output: 'cleanup GPU ou CPU fallback — optionnel si IoU≥0.72' },
] as const;
