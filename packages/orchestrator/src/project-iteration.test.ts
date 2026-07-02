import { describe, expect, it } from 'vitest';
import { filterIterationPlan } from './project-iteration.js';

describe('filterIterationPlan', () => {
  it('retire character et mesh_3d hors périmètre itération', () => {
    const plan = {
      plan_id: 'p1',
      user_intent: {
        raw_prompt: 'test',
        dimension: '2d' as const,
        mechanics: [],
        source_images: [],
        features: { narrative: false, vfx: false, cinematic: false },
      },
      tasks: [
        { task_id: 'a', agent: 'level' as const, priority: 1, depends_on: [], input: {} },
        { task_id: 'b', agent: 'character' as const, priority: 1, depends_on: [], input: {} },
        { task_id: 'c', agent: 'mesh_3d' as const, priority: 1, depends_on: [], input: {} },
      ],
    };
    const filtered = filterIterationPlan(plan, []);
    expect(filtered.tasks.map((t) => t.agent)).toEqual(['level']);
  });
});
