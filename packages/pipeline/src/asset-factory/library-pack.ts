/**
 * T3 (amorce) — `produceLibraryPack` : génère réellement les assets **procéduraux** d'un preset.
 *
 * Consomme le plan T1 (`resolveLibraryPlan`). Pour chaque famille en recette `procedural_vector`,
 * mappe vers une famille de base (character/enemy/prop) et produit un PNG HD CPU (style-lock palette).
 * Les familles `reference_cut` (à découper) et `specialized_pending` (T3 complet) sont listées comme
 * à faire. 100 % CPU, sans GPU ni tiers.
 */
import { resolveLibraryPlan, type ProductionPreset } from '@ellipse/shared';
import type { AssetFamily } from './procedural-specs.js';
import { produceAssetFamily, type AssetFamilyResult } from './asset-family.js';

const CHARACTER_FAMILIES = new Set(['hero', 'npcs', 'party', 'fighters', 'units', 'agents']);
const ENEMY_FAMILIES = new Set(['enemies', 'bosses']);

function baseFamily(family: string): AssetFamily {
  if (CHARACTER_FAMILIES.has(family)) return 'character';
  if (ENEMY_FAMILIES.has(family)) return 'enemy';
  return 'prop';
}

export interface LibraryPackInput {
  preset: ProductionPreset;
  palette: string[];
  outputDir: string;
  seed?: number;
  urlBase?: string;
}

export interface LibraryPackResult {
  game_type: string;
  produced: AssetFamilyResult[];
  to_cut: string[];
  specialized_pending: string[];
}

export async function produceLibraryPack(input: LibraryPackInput): Promise<LibraryPackResult> {
  const plan = resolveLibraryPlan(input.preset);
  const produced: AssetFamilyResult[] = [];
  const to_cut: string[] = [];
  const specialized_pending: string[] = [];
  let seed = input.seed ?? 1;

  for (const task of plan.assets) {
    if (task.recipe === 'reference_cut') {
      to_cut.push(task.family);
      continue;
    }
    if (task.recipe === 'specialized_pending') {
      specialized_pending.push(task.family);
      continue;
    }
    const res = await produceAssetFamily({
      id: task.family,
      family: baseFamily(task.family),
      palette: input.palette,
      outputDir: input.outputDir,
      seed: seed++,
      fileName: `${task.family}.png`,
      profile: 'high',
      urlBase: input.urlBase,
    });
    produced.push(res);
  }

  return { game_type: plan.game_type, produced, to_cut, specialized_pending };
}
