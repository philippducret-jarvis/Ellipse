import { describe, it, expect } from 'vitest';
import { DurableWorkflowSchema, type DurableWorkflow } from '@ellipse/shared';
import { executeWorkflow, InMemoryStore, type StepHandler } from './durable-executor.js';

function wf(): DurableWorkflow {
  return DurableWorkflowSchema.parse({
    id: 'test_wf',
    label: 'Test',
    runtime: 'in_process',
    objective: 'Tester l’exécuteur durable',
    steps: [
      { id: 'a', label: 'A', kind: 'analysis', owner: 'x' },
      { id: 'b', label: 'B', kind: 'generation', owner: 'x', depends_on: ['a'] },
      { id: 'c', label: 'C', kind: 'validation', owner: 'x', depends_on: ['b'] },
    ],
  });
}

describe('durable-executor', () => {
  it('exécute les steps en ordre topologique jusqu’à completion', async () => {
    const order: string[] = [];
    const handlers: Record<string, StepHandler> = {
      a: async () => void order.push('a'),
      b: async () => void order.push('b'),
      c: async () => void order.push('c'),
    };
    const state = await executeWorkflow(wf(), { runId: 'r1', store: new InMemoryStore(), handlers });
    expect(state.status).toBe('completed');
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('retry : un step qui échoue une fois puis réussit', async () => {
    let calls = 0;
    const handlers: Record<string, StepHandler> = {
      b: async () => {
        calls += 1;
        if (calls === 1) throw new Error('panne transitoire');
      },
    };
    const state = await executeWorkflow(wf(), { runId: 'r2', store: new InMemoryStore(), handlers, maxAttempts: 3 });
    expect(state.status).toBe('completed');
    expect(state.steps.b!.attempts).toBe(2);
  });

  it('gate humaine quand les essais sont épuisés', async () => {
    const handlers: Record<string, StepHandler> = {
      b: async () => {
        throw new Error('échec permanent');
      },
    };
    const state = await executeWorkflow(wf(), { runId: 'r3', store: new InMemoryStore(), handlers, maxAttempts: 2 });
    expect(state.status).toBe('awaiting_human');
    expect(state.steps.b!.attempts).toBe(2);
    expect(state.steps.c!.status).toBe('pending'); // c non exécuté
  });

  it('resume : reprend au dernier step complété après un "crash"', async () => {
    const store = new InMemoryStore();
    const runId = 'r4';
    let bRuns = 0;
    // 1er run : 'c' plante → awaiting_human, a/b done persistés
    await executeWorkflow(wf(), {
      runId,
      store,
      maxAttempts: 1,
      handlers: {
        b: async () => void (bRuns += 1),
        c: async () => {
          throw new Error('crash');
        },
      },
    });
    const mid = await store.load(runId);
    expect(mid!.steps.a!.status).toBe('done');
    expect(mid!.steps.b!.status).toBe('done');

    // 2nd run : c réparé → reprise, a/b NON réexécutés
    const final = await executeWorkflow(wf(), {
      runId,
      store,
      maxAttempts: 2,
      handlers: { b: async () => void (bRuns += 1), c: async () => {} },
    });
    expect(final.status).toBe('completed');
    expect(bRuns).toBe(1); // b joué une seule fois au total → resume effectif
  });
});
