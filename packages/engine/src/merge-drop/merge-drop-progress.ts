import type { MergeDropWorld } from '../sim/merge-drop.js';

export const MERGE_DROP_PROGRESS_VERSION = 5;

export interface MergeDropProgress {
  version: typeof MERGE_DROP_PROGRESS_VERSION;
  currency: number;
  essence: number;
  pity: number;
  unlocked: string[];
  selected_hero_id: string;
  best_tier: number;
  nexus_completions: number;
  /** Niveaux d'éveil par Gardien (v3+). */
  hero_levels: Record<string, number>;
  /** Étoiles d'évolution par Gardien (v4). */
  hero_stars: Record<string, number>;
  /** Objets possédés → niveau (v4). */
  relic_levels: Record<string, number>;
  companion_levels: Record<string, number>;
  equipped_relic?: string;
  equipped_companion?: string;
  relic_pity: number;
  /** Garantie 50/50 de bannière vedette (v5). */
  featured_guaranteed: boolean;
}

function finiteNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function cleanLevels(
  raw: unknown,
  validIds: string[],
  maxLevel: number,
): Record<string, number> {
  const levels: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return levels;
  for (const id of validIds) {
    const level = (raw as Record<string, unknown>)[id];
    if (typeof level === 'number' && Number.isFinite(level) && level > 0) {
      levels[id] = Math.min(maxLevel, Math.floor(level));
    }
  }
  return levels;
}

export function mergeDropProgressFromWorld(world: MergeDropWorld): MergeDropProgress {
  const heroIds = world.config.heroes.map((hero) => hero.id);
  return {
    version: MERGE_DROP_PROGRESS_VERSION,
    currency: Math.max(0, world.currency),
    essence: Math.max(0, world.essence),
    pity: Math.max(0, world.pity),
    unlocked: [...new Set(world.unlocked_hero_ids)],
    selected_hero_id: world.selected_hero_id,
    best_tier: Math.max(0, world.best_tier),
    nexus_completions: Math.max(0, world.nexus_completions),
    hero_levels: cleanLevels(world.hero_levels, heroIds, world.config.awaken_max_level),
    hero_stars: cleanLevels(world.hero_stars, heroIds, world.config.evolution_max_stars),
    relic_levels: cleanLevels(world.relic_levels, world.config.relics.map((item) => item.id), world.config.item_max_level),
    companion_levels: cleanLevels(world.companion_levels, world.config.companions.map((item) => item.id), world.config.item_max_level),
    equipped_relic: world.equipped_relic,
    equipped_companion: world.equipped_companion,
    relic_pity: Math.max(0, world.relic_pity),
    featured_guaranteed: world.featured_guaranteed,
  };
}

export function applyMergeDropProgress(world: MergeDropWorld, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const saved = raw as Partial<MergeDropProgress>;

  // Currency is restored exactly. Using the initial grant as a floor allowed an
  // unlimited reload exploit after spending it.
  world.currency = finiteNonNegative(saved.currency, world.currency);
  world.essence = finiteNonNegative(saved.essence, 0);
  world.pity = Math.min(
    Math.max(0, world.config.pity_after - 1),
    Math.floor(finiteNonNegative(saved.pity, 0)),
  );
  world.relic_pity = Math.min(
    Math.max(0, world.config.pity_after - 1),
    Math.floor(finiteNonNegative(saved.relic_pity, 0)),
  );
  world.featured_guaranteed = saved.featured_guaranteed === true;
  world.best_tier = Math.min(
    Math.max(0, world.config.tiers.length - 1),
    Math.floor(finiteNonNegative(saved.best_tier, 0)),
  );
  world.nexus_completions = Math.floor(finiteNonNegative(saved.nexus_completions, 0));

  if (Array.isArray(saved.unlocked)) {
    const valid = saved.unlocked.filter(
      (id): id is string => typeof id === 'string' && world.config.heroes.some((hero) => hero.id === id),
    );
    world.unlocked_hero_ids = [...new Set([...world.unlocked_hero_ids, ...valid])];
  }

  if (
    typeof saved.selected_hero_id === 'string'
    && world.unlocked_hero_ids.includes(saved.selected_hero_id)
    && world.config.heroes.some((hero) => hero.id === saved.selected_hero_id)
  ) {
    world.selected_hero_id = saved.selected_hero_id;
  }

  const heroIds = world.config.heroes.map((hero) => hero.id);
  world.hero_levels = cleanLevels(saved.hero_levels, heroIds, world.config.awaken_max_level);
  world.hero_stars = cleanLevels(saved.hero_stars, heroIds, world.config.evolution_max_stars);
  world.relic_levels = cleanLevels(saved.relic_levels, world.config.relics.map((item) => item.id), world.config.item_max_level);
  world.companion_levels = cleanLevels(saved.companion_levels, world.config.companions.map((item) => item.id), world.config.item_max_level);

  world.equipped_relic = typeof saved.equipped_relic === 'string' && world.relic_levels[saved.equipped_relic]
    ? saved.equipped_relic
    : undefined;
  world.equipped_companion = typeof saved.equipped_companion === 'string' && world.companion_levels[saved.equipped_companion]
    ? saved.equipped_companion
    : undefined;
}
