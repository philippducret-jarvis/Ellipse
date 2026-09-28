/**
 * T1 — Library resolver : transforme un `ProductionPreset` en **plan de production concret**.
 *
 * Chaque famille d'asset reçoit une recette (procédural vectoriel / découpe de référence /
 * spécialisé à venir), la carte un générateur, l'audio une recette, et chaque système son statut
 * (implémenté vs feuille de route). C'est le pont déterministe catalogue → fabrication.
 */
import type { ProductionPreset, MapKind } from './game-types.js';
import { ENGINE_IMPLEMENTED_SYSTEMS } from '../gdl/mechanics-registry.js';

export type AssetRecipe = 'procedural_vector' | 'reference_cut' | 'specialized_pending';
export interface AssetTask {
  family: string;
  recipe: AssetRecipe;
}
export interface MapTask {
  map_kind: MapKind;
  generator: string;
  status: 'available' | 'pending';
}
export interface AudioTask {
  profile: string;
  recipe: 'procedural_synth';
}
export interface SystemTask {
  id: string;
  status: 'implemented' | 'planned';
}
export interface LibraryPlan {
  game_type: string;
  dimension: ProductionPreset['dimension'];
  art_style: ProductionPreset['art_style'];
  assets: AssetTask[];
  map: MapTask;
  audio: AudioTask;
  systems: SystemTask[];
  platforms: string[];
}

/** Familles couvertes par le générateur procédural vectoriel actuel (Lot 3a/3b). */
const PROCEDURAL_FAMILIES = new Set([
  'hero', 'enemies', 'bosses', 'npcs', 'party', 'fighters', 'units', 'props', 'collectibles',
  'mushroom', 'ui_kit', 'fx', 'icons', 'items', 'loot', 'agents', 'obstacles', 'pickups',
  'craftables', 'resources', 'crates', 'interactables',
  'orb_tiers', 'hero_portraits', 'rarity_fx', 'ability_fx', 'merge_fx',
]);

/** Familles issues de références fournies / décor (découpe CV ou tileset). */
const REFERENCE_FAMILIES = new Set([
  'tileset', 'parallax_bg', 'backgrounds', 'scenes', 'cg_scenes', 'portraits', 'stages',
  'board_bg', 'biomes', 'terrain_tiles', 'grid_tiles', 'path_tiles', 'arena_tiles', 'tracks_bg',
  'dungeons', 'street_props', 'buildings',
]);

function recipeFor(family: string): AssetRecipe {
  if (PROCEDURAL_FAMILIES.has(family)) return 'procedural_vector';
  if (REFERENCE_FAMILIES.has(family)) return 'reference_cut';
  return 'specialized_pending';
}

/** Générateurs de cartes disponibles aujourd'hui (le reste = feuille de route T6). */
const MAP_GENERATORS: Partial<Record<MapKind, string>> = {
  tilemap: 'world-factory',
  board: 'merge-drop-board-factory',
};

/** Systèmes runtime déjà implémentés dans le moteur ECS (cf. mechanics-registry.ts). */
const IMPLEMENTED_SYSTEMS = new Set<string>(ENGINE_IMPLEMENTED_SYSTEMS);

export function resolveLibraryPlan(preset: ProductionPreset): LibraryPlan {
  const generator = MAP_GENERATORS[preset.map_kind];
  return {
    game_type: preset.game_type,
    dimension: preset.dimension,
    art_style: preset.art_style,
    assets: preset.asset_families.map((family) => ({ family, recipe: recipeFor(family) })),
    map: {
      map_kind: preset.map_kind,
      generator: generator ?? `${preset.map_kind}-generator`,
      status: generator ? 'available' : 'pending',
    },
    audio: { profile: preset.audio_profile, recipe: 'procedural_synth' },
    systems: preset.systems.map((id) => ({ id, status: IMPLEMENTED_SYSTEMS.has(id) ? 'implemented' : 'planned' })),
    platforms: preset.platforms,
  };
}

/** Résumé exploitable : ce qui est productible maintenant vs ce qui reste à brancher. */
export interface LibraryReadiness {
  assets_ready: number;
  assets_total: number;
  map_ready: boolean;
  systems_ready: number;
  systems_total: number;
  blocking: string[];
}

export function assessLibraryReadiness(plan: LibraryPlan): LibraryReadiness {
  const assetsReady = plan.assets.filter((a) => a.recipe !== 'specialized_pending').length;
  const systemsReady = plan.systems.filter((s) => s.status === 'implemented').length;
  const blocking: string[] = [];
  for (const a of plan.assets) if (a.recipe === 'specialized_pending') blocking.push(`asset:${a.family}`);
  if (plan.map.status === 'pending') blocking.push(`map:${plan.map.map_kind}`);
  for (const s of plan.systems) if (s.status === 'planned') blocking.push(`system:${s.id}`);
  return {
    assets_ready: assetsReady,
    assets_total: plan.assets.length,
    map_ready: plan.map.status === 'available',
    systems_ready: systemsReady,
    systems_total: plan.systems.length,
    blocking,
  };
}
