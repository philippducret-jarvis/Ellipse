import { describe, it, expect } from 'vitest';
import {
  GAME_TYPES,
  ART_STYLES,
  CREATION_WIZARD,
  MECHANIC_MODULES,
  getGameType,
  getMechanicModule,
  modulesForFamily,
  listGameTypesByPhase,
  derivePreset,
} from './game-types.js';

describe('catalogue de types de jeux', () => {
  it('expose un catalogue exhaustif aux ids uniques', () => {
    const ids = GAME_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(GAME_TYPES.length).toBeGreaterThanOrEqual(20);
  });

  it('chaque type déclare sa bibliothèque complète', () => {
    for (const t of GAME_TYPES) {
      expect(t.library.systems.length).toBeGreaterThan(0);
      expect(t.library.asset_families.length).toBeGreaterThan(0);
      expect(t.dimensions.length).toBeGreaterThan(0);
      expect(t.default_art_styles.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(t.phase);
    }
  });

  it('couvre les grandes familles + souls-like', () => {
    const fams = new Set(GAME_TYPES.map((t) => t.family));
    for (const f of ['action', 'shooter', 'rpg', 'puzzle', 'narrative', 'strategy', 'simulation', 'arcade']) {
      expect(fams).toContain(f);
    }
    expect(getGameType('souls_like_2d')?.difficulty_band).toBe('souls');
  });

  it('liste par phase', () => {
    expect(listGameTypesByPhase(1).length).toBeGreaterThan(0);
    expect(listGameTypesByPhase(1).every((t) => t.phase === 1)).toBe(true);
  });
});

describe('questionnaire de création', () => {
  it('contient les questions clés', () => {
    const ids = CREATION_WIZARD.map((q) => q.id);
    for (const k of ['game_type', 'dimension', 'art_style', 'difficulty', 'platforms']) {
      expect(ids).toContain(k);
    }
  });

  it('ART_STYLES non vide', () => {
    expect(ART_STYLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe('dérivation de preset', () => {
  it('produit une config de production cohérente pour un platformer', () => {
    const p = derivePreset({ game_type: 'platformer', dimension: '2.5d', art_style: 'pixel', difficulty: 'standard', platforms: ['web', 'mobile'] });
    expect(p.dimension).toBe('2.5d');
    expect(p.systems).toContain('physics_platformer');
    expect(p.map_kind).toBe('tilemap');
    expect(p.platforms).toEqual(['web', 'mobile']);
  });

  it('retombe sur les défauts du type si réponses absentes', () => {
    const p = derivePreset({ game_type: 'souls_like_2d' });
    expect(p.difficulty).toBe('souls');
    expect(p.systems).toContain('stamina_combat');
    expect(p.platforms).toEqual(['web']);
  });

  it('rejette un type inconnu', () => {
    expect(() => derivePreset({ game_type: 'inexistant' })).toThrow();
  });

  it('intègre les modules de mécaniques choisis (gacha)', () => {
    const p = derivePreset({ game_type: 'gacha_rpg', mechanic_modules: ['gacha_summon', 'skill_tree'] });
    expect(p.mechanic_modules).toContain('gacha_summon');
    expect(p.systems).toContain('gacha_summon');
    expect(p.systems).toContain('skill_tree');
    expect(p.asset_families).toContain('banner_art');
  });

  it('le module Tetris ajoute les systèmes de blocs', () => {
    const p = derivePreset({ game_type: 'falling_block', mechanic_modules: ['falling_blocks'] });
    expect(p.systems).toContain('falling_blocks');
    expect(p.systems).toContain('line_clear');
  });
});

describe('modules de mécaniques & références', () => {
  it('expose une banque de modules aux ids uniques', () => {
    const ids = MECHANIC_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MECHANIC_MODULES.length).toBeGreaterThanOrEqual(15);
    expect(getMechanicModule('gacha_summon')?.adds_systems).toContain('gacha_summon');
  });

  it('filtre les modules par famille', () => {
    const rpgMods = modulesForFamily('rpg').map((m) => m.id);
    expect(rpgMods).toContain('gacha_summon');
    expect(modulesForFamily('puzzle').map((m) => m.id)).toContain('falling_blocks');
  });

  it('chaque type a des jeux de référence', () => {
    for (const t of GAME_TYPES) {
      expect(t.reference_games && t.reference_games.length).toBeGreaterThan(0);
    }
    expect(getGameType('souls_like_2d')?.reference_games).toContain('Dark Souls');
    expect(getGameType('gacha_rpg')?.reference_games).toContain('Genshin Impact');
  });
});
