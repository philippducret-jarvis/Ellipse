import { describe, it, expect } from 'vitest';
import { CortexMaster, getModelRegistry } from './index.js';
import { AGENT_CATALOG } from '@ellipse/shared';

describe('CortexMaster', () => {
  const cortex = new CortexMaster();

  it('planifie un platformer 2D avec agents specialises', () => {
    const plan = cortex.planFromPrompt('platformer 2D');
    expect(plan.user_intent.genre).toBe('platformer');
    expect(plan.tasks.length).toBeGreaterThanOrEqual(9);
    expect(plan.tasks.some((t) => t.agent === 'character')).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'integration')).toBe(true);
  });

  it('active Photo-to-Game avec character + animation', () => {
    const plan = cortex.planFromPrompt('Aventure avec mon chien', ['photo.jpg']);
    expect(plan.tasks.some((t) => t.agent === 'character')).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'animation')).toBe(true);
    expect(plan.master_notes).toContain('Photo-to-Game');
  });

  it('active pipeline 3D pour jeux 3D', () => {
    const plan = cortex.planFromPrompt('jeu 3D aventure');
    expect(plan.user_intent.dimension).toBe('3d');
    expect(plan.tasks.some((t) => t.agent === 'mesh_3d')).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'lighting')).toBe(true);
  });

  it('active narrative pour RPG', () => {
    const plan = cortex.planFromPrompt('RPG avec quetes et dialogues');
    expect(plan.user_intent.features.narrative).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'narrative')).toBe(true);
  });

  it('reconnait les prompts premium gacha, souls-like et 2.5D', () => {
    const gacha = cortex.planFromPrompt('gatcha dark fantasy 2,5D avec invocation, roster et pity');
    expect(gacha.user_intent.genre).toBe('gacha_rpg');
    expect(gacha.user_intent.dimension).toBe('2.5d');
    expect(gacha.user_intent.mechanics).toContain('gacha_summon');
    expect(gacha.tasks.some((t) => t.agent === 'producer')).toBe(true);
    expect(gacha.tasks.some((t) => t.agent === 'economy')).toBe(true);

    const souls = cortex.planFromPrompt('jeu dark fantasy inspire Elden Ring avec esquive et loot');
    expect(souls.user_intent.genre).toBe('souls_like_2d');
    expect(souls.user_intent.mechanics).toContain('parry_dodge');
    expect(souls.user_intent.mechanics).toContain('loot_rarity');
  });

  it('reference Ellipse Cortex dans les notes', () => {
    const plan = cortex.planFromPrompt('runner');
    expect(plan.master_notes).toContain('Ellipse Cortex');
  });
});

describe('ModelRegistry', () => {
  it('mappe chaque agent du catalogue a un modele Ellipse', () => {
    const registry = getModelRegistry();
    expect(registry.getMaster().id).toBe('ellipse-cortex-master-v0');
    for (const agent of AGENT_CATALOG) {
      expect(registry.getForAgent(agent.id)?.agent_id).toBe(agent.id);
    }
  });
});
