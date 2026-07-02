import { describe, it, expect } from 'vitest';
import { CortexMaster } from '@ellipse/cortex';

describe('CortexMaster (via orchestrator)', () => {
  const cortex = new CortexMaster();

  it('détecte un platformer depuis le prompt', () => {
    const intent = cortex.parseIntent('Je veux un jeu platformer avec double saut');
    expect(intent.genre).toBe('platformer');
    expect(intent.dimension).toBe('2d');
  });

  it('active le pipeline photo avec agents character + animation', () => {
    const plan = cortex.planFromPrompt('Aventure avec mon chien', ['photo.jpg']);
    expect(plan.tasks.some((t) => t.agent === 'character')).toBe(true);
    expect(plan.tasks.some((t) => t.agent === 'animation')).toBe(true);
    expect(plan.master_notes).toContain('Photo-to-Game');
  });

  it('produit un DAG avec integration en fin de chaîne', () => {
    const plan = cortex.planFromPrompt('runner infinite');
    const integration = plan.tasks.find((t) => t.agent === 'integration');
    expect(integration).toBeDefined();
    expect(integration!.depends_on.length).toBeGreaterThan(0);
  });

  it('mentionne Ellipse Cortex dans master_notes', () => {
    const plan = cortex.planFromPrompt('platformer');
    expect(plan.master_notes).toContain('Ellipse Cortex');
  });
});
