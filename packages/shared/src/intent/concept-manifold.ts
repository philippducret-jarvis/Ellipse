/**
 * F1 — Manifold concept : verrou style + distance mesurable vs planche.
 * Phase 1 : heuristique palette + hash ; phase 2 : embedding CLIP.
 */
import type { IntentContract } from './intent-contract.js';

export interface StyleLock {
  palette: string[];
  mood: string[];
  reference_hashes: string[];
  max_drift_score: number;
}

export interface ManifoldEvaluation {
  drift_score: number;
  within_manifold: boolean;
  reasons: string[];
}

export function buildStyleLockFromIntent(contract: IntentContract): StyleLock {
  return {
    palette: contract.palette_lock,
    mood: contract.tone,
    reference_hashes: contract.visual_anchors.map((u) => simpleHash(u)),
    max_drift_score: 0.35,
  };
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Évalue si un asset reste dans le voisinage autorisé du concept. */
export function evaluateManifoldDrift(
  lock: StyleLock,
  assetMeta: { palette?: string[]; method?: string; iou?: number },
): ManifoldEvaluation {
  const reasons: string[] = [];
  let drift = 0;

  if (assetMeta.method?.includes('procedural') && (assetMeta.iou ?? 0) < 0.55) {
    drift += 0.4;
    reasons.push('Procédural hors manifold planche');
  }
  if (lock.palette.length && assetMeta.palette?.length) {
    const overlap = lock.palette.filter((c) =>
      assetMeta.palette!.some((p) => p.toLowerCase().includes(c.toLowerCase()) || c.includes(p)),
    ).length;
    if (overlap === 0) {
      drift += 0.25;
      reasons.push('Palette asset hors contrat');
    }
  }
  if ((assetMeta.iou ?? 1) < 0.42) {
    drift += 0.35;
    reasons.push('Silhouette trop éloignée de la référence');
  }

  return {
    drift_score: Math.min(1, drift),
    within_manifold: drift <= lock.max_drift_score,
    reasons,
  };
}
