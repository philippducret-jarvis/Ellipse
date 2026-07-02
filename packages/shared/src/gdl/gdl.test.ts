import { describe, it, expect } from 'vitest';
import { applyMechanics, mergeGameplayTemplate } from './mechanics.js';
import { validateGdl } from './validate.js';
import { PLATFORMER_TEMPLATE } from '../templates/platformer.js';

describe('validateGdl', () => {
  it('valide un GDL platformer minimal', () => {
    const r = validateGdl(PLATFORMER_TEMPLATE);
    expect(r.valid).toBe(true);
  });

  it('rejette un GDL sans entités', () => {
    const r = validateGdl({
      meta: { title: 'X', dimension: '2d', version: '1' },
      entities: [],
      scenes: [],
      systems: [],
    });
    expect(r.valid).toBe(false);
  });
});

describe('applyMechanics', () => {
  it('ajoute double jump', () => {
    const gdl = applyMechanics(PLATFORMER_TEMPLATE, ['double jump']);
    expect(gdl.systems).toContain('double_jump');
  });

  it('ajoute ennemi si demandé', () => {
    const gdl = applyMechanics(PLATFORMER_TEMPLATE, ['enemy']);
    expect(gdl.entities.some((e) => e.id === 'enemy_slime')).toBe(true);
  });
});

describe('mergeGameplayTemplate', () => {
  it('préserve le sprite joueur existant', () => {
    const current = structuredClone(PLATFORMER_TEMPLATE);
    const player = current.entities[0] as { assets?: { sprite?: string } };
    player.assets = { sprite: '/generated/test/hero.png' };

    const merged = mergeGameplayTemplate(current, PLATFORMER_TEMPLATE, []);
    const mergedPlayer = merged.entities.find((e) => e.id === 'player') as { assets?: { sprite?: string } };
    expect(mergedPlayer?.assets?.sprite).toBe('/generated/test/hero.png');
  });
});
