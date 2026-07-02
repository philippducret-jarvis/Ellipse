/**
 * Éligibilité runtime — un asset n’entre dans le GDL que s’il a passé la gate QA.
 */
import type { AssetStageId } from './pipeline-stages.js';

export const MIN_SHIPPING_IOU = 0.72;
export const MIN_PASS_IOU = 0.42;

export interface AssetPackQaReport {
  passed?: boolean;
  iou?: number;
  method?: string;
  blockers?: string[];
}

export interface AssetEligibilityInput {
  /** Stages complétés (ids) */
  completedStages: AssetStageId[];
  qaReport?: AssetPackQaReport | null;
  /** Master runtime path si exporté */
  runtimeManifestPath?: string | null;
}

export interface AssetEligibilityResult {
  eligible: boolean;
  tier: 'draft' | 'review' | 'shipping';
  reasons: string[];
  missingStages: AssetStageId[];
}

const REQUIRED_FOR_RUNTIME: AssetStageId[] = [
  '01_source',
  '02_cutouts',
  '03_cleanup',
  '06_exports',
  '07_qa',
];

export function assessAssetEligibility(input: AssetEligibilityInput): AssetEligibilityResult {
  const missingStages = REQUIRED_FOR_RUNTIME.filter((s) => !input.completedStages.includes(s));
  const reasons: string[] = [];

  if (missingStages.length) {
    reasons.push(`Stages manquants: ${missingStages.join(', ')}`);
  }
  if (!input.runtimeManifestPath) {
    reasons.push('runtime-manifest.json absent (06_exports)');
  }

  const qa = input.qaReport;
  if (!qa) {
    reasons.push('Aucun rapport QA (07_qa/qa-report.json)');
  } else if (!qa.passed) {
    reasons.push(`QA échouée${qa.iou != null ? ` — IoU ${qa.iou.toFixed(2)}` : ''}`);
    if (qa.blockers?.length) reasons.push(...qa.blockers.slice(0, 3));
  }

  const iou = qa?.iou ?? 0;
  let tier: AssetEligibilityResult['tier'] = 'draft';
  if (qa?.passed && iou >= MIN_SHIPPING_IOU) tier = 'shipping';
  else if (qa?.passed && iou >= MIN_PASS_IOU) tier = 'review';

  const eligible =
    missingStages.length === 0 &&
    Boolean(input.runtimeManifestPath) &&
    Boolean(qa?.passed) &&
    iou >= MIN_PASS_IOU;

  return { eligible, tier, reasons, missingStages };
}

/** Filtre les refs GDL — rejette les placeholders et assets non validés. */
export function filterEligibleAssetUrls(
  refs: string[],
  eligiblePaths: Set<string>,
): { allowed: string[]; rejected: string[] } {
  const allowed: string[] = [];
  const rejected: string[] = [];
  for (const ref of refs) {
    if (ref.includes('placeholder') || ref.includes('procedural')) {
      rejected.push(ref);
      continue;
    }
    const known = [...eligiblePaths].some((p) => ref.includes(p) || p.includes(ref));
    if (known || eligiblePaths.size === 0) allowed.push(ref);
    else rejected.push(ref);
  }
  return { allowed, rejected };
}
