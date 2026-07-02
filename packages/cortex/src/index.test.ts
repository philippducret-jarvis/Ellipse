import { describe, it, expect } from 'vitest';
import { CortexMaster, getModelRegistry } from './index.js';
import { AGENT_CATALOG } from '@ellipse/shared';

describe('CortexMaster', () => {
  const cortex = new CortexMaster();

  it('planifie un platformer 2D avec agents spécialisés', () => {
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
    const plan = cortex.planFromPrompt('RPG avec quêtes et dialogues');
    expect(plan.user_intent.features.narrative).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'narrative')).toBe(true);
  });

  it('référence Ellipse Cortex dans les notes', () => {
    const plan = cortex.planFromPrompt('runner');
    expect(plan.master_notes).toContain('Ellipse Cortex');
  });
});

describe('ModelRegistry', () => {
  it('mappe chaque agent du catalogue à un modèle Ellipse', () => {
    const registry = getModelRegistry();
    expect(registry.getMaster().id).toBe('ellipse-cortex-master-v0');
    for (const agent of AGENT_CATALOG) {
      expect(registry.getForAgent(agent.id)?.agent_id).toBe(agent.id);
    }
  });
});
