import { describe, expect, it } from 'vitest';
import { DEFAULT_MERGE_DROP_CONFIG, createMergeDropWorld } from '../sim/merge-drop.js';
import { applyMergeDropProgress, mergeDropProgressFromWorld } from './merge-drop-progress.js';

describe('merge drop progress', () => {
  it('restaure la monnaie exacte sans regenerer la dotation initiale', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 1);

    applyMergeDropProgress(world, {
      version: 2,
      currency: 15,
      essence: 35,
      pity: 4,
      unlocked: ['mira'],
      selected_hero_id: 'mira',
      best_tier: 3,
      nexus_completions: 1,
    });

    expect(world.currency).toBe(15);
    expect(world.essence).toBe(35);
    expect(world.pity).toBe(4);
    expect(world.nexus_completions).toBe(1);
  });

  it('ignore les heros inconnus et conserve le Gardien selectionne', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 2);
    applyMergeDropProgress(world, {
      currency: 0,
      essence: 0,
      pity: 0,
      unlocked: ['mira', 'lys', 'intrus'],
      selected_hero_id: 'lys',
    });

    expect(world.unlocked_hero_ids).toEqual(['mira', 'lys']);
    expect(world.selected_hero_id).toBe('lys');
  });

  it('serialise essence, selection et progression Nexus', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 3);
    world.currency = 27;
    world.essence = 80;
    world.unlocked_hero_ids.push('aster');
    world.selected_hero_id = 'aster';
    world.best_tier = 7;
    world.nexus_completions = 2;
    world.hero_levels = { mira: 2, aster: 1 };
    world.hero_stars = { mira: 3 };
    world.relic_levels = { prisme_rosee: 2 };
    world.companion_levels = { lumen: 1 };
    world.equipped_relic = 'prisme_rosee';
    world.equipped_companion = 'lumen';
    world.relic_pity = 4;
    world.featured_guaranteed = true;

    expect(mergeDropProgressFromWorld(world)).toMatchObject({
      version: 5,
      currency: 27,
      essence: 80,
      selected_hero_id: 'aster',
      best_tier: 7,
      nexus_completions: 2,
      hero_levels: { mira: 2, aster: 1 },
      hero_stars: { mira: 3 },
      relic_levels: { prisme_rosee: 2 },
      companion_levels: { lumen: 1 },
      equipped_relic: 'prisme_rosee',
      equipped_companion: 'lumen',
      relic_pity: 4,
      featured_guaranteed: true,
    });
  });

  it('restaure les niveaux d eveil en ignorant heros inconnus et valeurs hors bornes', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 4);
    applyMergeDropProgress(world, {
      version: 3,
      currency: 10,
      hero_levels: { mira: 99, lys: 2, intrus: 3, brann: -1 },
    });

    expect(world.hero_levels).toEqual({ mira: world.config.awaken_max_level, lys: 2 });
  });

  it('accepte une sauvegarde v2 sans niveaux d eveil', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 5);
    applyMergeDropProgress(world, {
      version: 2,
      currency: 42,
      essence: 10,
      pity: 1,
      unlocked: ['mira'],
      selected_hero_id: 'mira',
      best_tier: 2,
      nexus_completions: 0,
    });

    expect(world.currency).toBe(42);
    expect(world.hero_levels).toEqual({});
    expect(world.hero_stars).toEqual({});
    expect(world.equipped_relic).toBeUndefined();
  });

  it('restaure etoiles, objets et equipement en ecartant les identifiants inconnus', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 6);
    applyMergeDropProgress(world, {
      version: 4,
      currency: 5,
      hero_stars: { mira: 2, intrus: 4 },
      relic_levels: { coeur_nexus: 9, faux_objet: 1 },
      companion_levels: { aion: 3 },
      equipped_relic: 'coeur_nexus',
      equipped_companion: 'disparu',
      relic_pity: 3,
    });

    expect(world.hero_stars).toEqual({ mira: 2 });
    expect(world.relic_levels).toEqual({ coeur_nexus: world.config.item_max_level });
    expect(world.companion_levels).toEqual({ aion: 3 });
    expect(world.equipped_relic).toBe('coeur_nexus');
    expect(world.equipped_companion).toBeUndefined();
    expect(world.relic_pity).toBe(3);
  });
});
