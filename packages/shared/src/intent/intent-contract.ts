/**
 * F1 — Contrat d'Intention : source de vérité sémantique du projet.
 * Toute production (asset, GDL, export) est évaluée contre ce contrat.
 */
import { z } from 'zod';

export const IntentFidelityThresholdsSchema = z.object({
  min_iou_pass: z.number().min(0).max(1).default(0.42),
  min_iou_shipping: z.number().min(0).max(1).default(0.72),
  max_enemies_on_screen: z.number().int().positive().optional(),
  min_readability_px: z.number().int().positive().default(32),
});

export const IntentContractSchema = z.object({
  version: z.literal('1.0'),
  project_title: z.string(),
  creative_intent: z.string(),
  genre: z.string().optional(),
  dimension: z.enum(['2d', '3d']).default('2d'),
  orientation: z.enum(['portrait', 'landscape', 'any']).default('landscape'),
  tone: z.array(z.string()).default([]),
  palette_lock: z.array(z.string()).default([]),
  visual_anchors: z.array(z.string()).default([]),
  mechanics_must: z.array(z.string()).default([]),
  mechanics_forbidden: z.array(z.string()).default([]),
  fidelity: IntentFidelityThresholdsSchema.default({}),
  reference_board_ids: z.array(z.string()).default([]),
  locked_at: z.string().optional(),
});

export type IntentContract = z.infer<typeof IntentContractSchema>;

export interface IntentViolation {
  code: string;
  message: string;
  severity: 'block' | 'warn';
}

export function deriveIntentContract(input: {
  title: string;
  prompt: string;
  genre?: string | null;
  dimension?: string | null;
  mechanics?: string[];
  sourceImages?: string[];
}): IntentContract {
  const palette = extractPaletteHints(input.prompt);
  return IntentContractSchema.parse({
    version: '1.0',
    project_title: input.title,
    creative_intent: input.prompt.slice(0, 2000),
    genre: input.genre ?? undefined,
    dimension: input.dimension === '3d' ? '3d' : '2d',
    orientation: /portrait|vertical|mobile/i.test(input.prompt) ? 'portrait' : 'landscape',
    tone: extractTone(input.prompt),
    palette_lock: palette,
    visual_anchors: input.sourceImages ?? [],
    mechanics_must: input.mechanics ?? [],
    mechanics_forbidden: ['placeholder_only', 'procedural_without_qa'],
    fidelity: {
      min_iou_pass: 0.42,
      min_iou_shipping: 0.72,
      max_enemies_on_screen: /survivor|lane|veloria/i.test(input.prompt) ? 5 : undefined,
      min_readability_px: 32,
    },
    reference_board_ids: [],
    locked_at: new Date().toISOString(),
  });
}

function extractPaletteHints(text: string): string[] {
  const hex = text.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const named = ['or', 'violet', 'carmin', 'noir', 'gold', 'crimson'].filter((w) =>
    text.toLowerCase().includes(w),
  );
  return [...new Set([...hex, ...named])].slice(0, 8);
}

function extractTone(text: string): string[] {
  const tones: string[] = [];
  if (/dark|sombre|mélancol/i.test(text)) tones.push('dark');
  if (/epic|épique/i.test(text)) tones.push('epic');
  if (/premium|hd/i.test(text)) tones.push('premium');
  return tones;
}

export function validateIntentContract(raw: unknown): { valid: boolean; contract?: IntentContract; errors: string[] } {
  const parsed = IntentContractSchema.safeParse(raw);
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  return { valid: true, contract: parsed.data, errors: [] };
}

export function evaluateAssetAgainstIntent(
  contract: IntentContract,
  asset: { iou?: number; method?: string; role?: string },
): IntentViolation[] {
  const v: IntentViolation[] = [];
  const iou = asset.iou ?? 0;
  if (asset.method?.includes('procedural') && iou < contract.fidelity.min_iou_pass) {
    v.push({
      code: 'INTENT_PROCEDURAL_BLOCKED',
      message: `Procédural seul IoU ${iou.toFixed(2)} < ${contract.fidelity.min_iou_pass}`,
      severity: 'block',
    });
  }
  if (iou > 0 && iou < contract.fidelity.min_iou_pass) {
    v.push({
      code: 'INTENT_IOU_FAIL',
      message: `IoU ${iou.toFixed(2)} sous le seuil contrat`,
      severity: 'block',
    });
  }
  return v;
}

export function evaluateGdlAgainstIntent(contract: IntentContract, gdl: { systems?: string[]; meta?: Record<string, unknown> }): IntentViolation[] {
  const v: IntentViolation[] = [];
  for (const m of contract.mechanics_must) {
    const sys = m.toLowerCase().replace(/\s+/g, '_');
    const has = gdl.systems?.some((s) => s.includes(sys) || sys.includes(s));
    if (!has && !gdl.systems?.includes('lane_runner') && sys.includes('lane')) {
      v.push({ code: 'INTENT_MECHANIC_MISSING', message: `Mécanique requise absente: ${m}`, severity: 'warn' });
    }
  }
  const refs = JSON.stringify(gdl.meta ?? {});
  if (refs.includes('placeholder') && contract.mechanics_forbidden.includes('placeholder_only')) {
    v.push({ code: 'INTENT_PLACEHOLDER', message: 'GDL contient des refs placeholder', severity: 'warn' });
  }
  return v;
}

export const INTENT_CONTRACT_PATH = '02_design/specs/intent-contract.json';
