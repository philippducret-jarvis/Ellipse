import { describe, it, expect } from 'vitest';
import { derivePreset } from './game-types.js';
import { resolveLibraryPlan, assessLibraryReadiness } from './library-plan.js';

describe('T1 — library resolver', () => {
  it('plan platformer : assets procéduraux/référence, carte dispo, systèmes implémentés', () => {
    const plan = resolveLibraryPlan(derivePreset({ game_type: 'platformer' }));
    expect(plan.map.status).toBe('available'); // tilemap → world-factory
    expect(plan.assets.find((a) => a.family === 'hero')?.recipe).toBe('procedural_vector');
    expect(plan.assets.find((a) => a.family === 'tileset')?.recipe).toBe('reference_cut');
    expect(plan.systems.find((s) => s.id === 'physics_platformer')?.status).toBe('implemented');
    const r = assessLibraryReadiness(plan);
    expect(r.assets_ready).toBeGreaterThan(0);
    expect(r.map_ready).toBe(true);
  });

  it('plan deckbuilder : familles spécialisées + systèmes planifiés signalés', () => {
    const plan = resolveLibraryPlan(derivePreset({ game_type: 'card_deckbuilder' }));
    expect(plan.assets.find((a) => a.family === 'cards')?.recipe).toBe('specialized_pending');
    const r = assessLibraryReadiness(plan);
    expect(r.blocking.some((b) => b.startsWith('asset:cards'))).toBe(true);
    expect(r.blocking.some((b) => b.startsWith('system:deck_system'))).toBe(true);
  });

  it('plan souls-like : carte graph en attente (générateur à venir)', () => {
    const plan = resolveLibraryPlan(derivePreset({ game_type: 'souls_like_2d' }));
    expect(plan.map.status).toBe('pending');
    expect(assessLibraryReadiness(plan).map_ready).toBe(false);
  });
});
