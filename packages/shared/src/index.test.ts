import { describe, it, expect } from 'vitest';
import { GenerationPlanSchema, PLATFORMER_TEMPLATE } from './index.js';

describe('GenerationPlanSchema', () => {
  it('valide un plan minimal', () => {
    const plan = {
      plan_id: '550e8400-e29b-41d4-a716-446655440000',
      user_intent: {
        raw_prompt: 'platformer chat',
        dimension: '2d' as const,
        mechanics: ['jump', 'collect'],
        source_images: [],
      },
      tasks: [],
    };
    expect(GenerationPlanSchema.parse(plan)).toBeDefined();
  });
});

describe('PLATFORMER_TEMPLATE', () => {
  it('contient un joueur et une scène', () => {
    expect(PLATFORMER_TEMPLATE.entities.length).toBeGreaterThan(0);
    expect(PLATFORMER_TEMPLATE.scenes[0]?.id).toBe('level_01');
  });
});
