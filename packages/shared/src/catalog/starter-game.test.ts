import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '../index.js';
import { derivePreset } from './game-types.js';
import { buildStarterGdl } from './starter-game.js';

describe('T8 — buildStarterGdl (preset → GDL jouable)', () => {
  it.each([
    'platformer',
    'topdown_adventure',
    'souls_like_2d',
    'gacha_rpg',
    'survivors_like',
    'falling_block',
    'visual_novel',
  ])('produit un GDL valide pour %s', (gameType) => {
    const gdl = buildStarterGdl(derivePreset({ game_type: gameType }));
    expect(() => GameDefinitionSchema.parse(gdl)).not.toThrow();
    expect(gdl.entities.find((e) => e.id === 'player')).toBeTruthy();
    expect(gdl.scenes[0]!.layout).toBeTruthy();
    expect(gdl.scenes[0]!.layout!.goal).toBeTruthy();
  });

  it('genre top-down active la physique top-down (sans gravité)', () => {
    const gdl = buildStarterGdl(derivePreset({ game_type: 'topdown_adventure' }));
    expect(gdl.systems).toContain('physics_topdown');
    const physics = gdl.entities[0]!.components.find((c) => c.physics)?.physics;
    expect(physics?.gravity).toBe(0);
  });

  it('genre latéral active la physique platformer', () => {
    const gdl = buildStarterGdl(derivePreset({ game_type: 'platformer' }));
    expect(gdl.systems).toContain('physics_platformer');
  });

  it('la difficulté souls réduit la santé et conserve l’intention en meta', () => {
    const preset = derivePreset({ game_type: 'souls_like_2d', mechanic_modules: ['parry_dodge'] });
    const gdl = buildStarterGdl(preset);
    const hp = gdl.entities[0]!.components.find((c) => c.health)?.health;
    expect(hp?.max).toBe(1);
    const meta = gdl.meta as Record<string, unknown>;
    expect((meta.declared_systems as string[])).toContain('stamina_combat');
    expect((meta.mechanic_modules as string[])).toContain('parry_dodge');
  });
});
