import { describe, it, expect } from 'vitest';
import { CortexMaster } from '../index.js';
import { arbitratePlan, estimatePlan } from './budget.js';
import { ExecutionMemory } from './execution-memory.js';

const cortex = new CortexMaster();

function richPlan() {
  // prompt narratif + vfx → plan large (narrative, vfx, camera, animation…)
  return cortex.planFromPrompt(
    'rpg narratif cinématique avec ennemis, double saut, vfx et boss',
  );
}

describe('budget — estimation', () => {
  it('estime des totaux positifs cohérents', () => {
    const est = estimatePlan(richPlan());
    expect(est.total_minutes).toBeGreaterThan(0);
    expect(est.total_cost_units).toBeGreaterThan(0);
    expect(est.per_agent.length).toBe(richPlan().tasks.length);
  });
});

describe('budget — arbitrage', () => {
  it('sans contrainte : conserve tout le plan', () => {
    const plan = richPlan();
    const { plan: out, budget } = arbitratePlan(plan, {});
    expect(out.tasks.length).toBe(plan.tasks.length);
    expect(budget.within_budget).toBe(true);
  });

  it('budget serré : abandonne des optionnels mais préserve les essentiels', () => {
    const plan = richPlan();
    const { plan: out, budget } = arbitratePlan(plan, { max_minutes: 9 });
    expect(out.tasks.length).toBeLessThan(plan.tasks.length);
    expect(budget.estimate_after.total_minutes).toBeLessThan(budget.estimate_before.total_minutes);
    expect(budget.decisions.some((d) => d.kind === 'drop_agent')).toBe(true);
    // essentiels toujours là
    const agents = out.tasks.map((t) => t.agent);
    for (const ess of ['character', 'level', 'gameplay', 'qa', 'integration']) {
      expect(agents).toContain(ess);
    }
  });

  it('ne laisse aucune dépendance fantôme après abandon', () => {
    const { plan: out } = arbitratePlan(richPlan(), { max_minutes: 8 });
    const ids = new Set(out.tasks.map((t) => t.task_id));
    for (const t of out.tasks) {
      for (const dep of t.depends_on) expect(ids.has(dep)).toBe(true);
    }
  });

  it('priorité "speed" réduit le périmètre sans budget chiffré', () => {
    const plan = richPlan();
    const { plan: out } = arbitratePlan(plan, { priority: 'speed' });
    expect(out.tasks.length).toBeLessThan(plan.tasks.length);
  });

  it('cible qualité dérivée de la priorité', () => {
    expect(arbitratePlan(richPlan(), { priority: 'quality' }).budget.quality_target).toBe('high');
    expect(arbitratePlan(richPlan(), { priority: 'speed' }).budget.quality_target).toBe('draft');
    expect(arbitratePlan(richPlan(), {}).budget.quality_target).toBe('standard');
  });
});

describe('mémoire d’exécution', () => {
  it('journalise un arbitrage de façon sérialisable', () => {
    const mem = new ExecutionMemory(() => '2026-01-01T00:00:00.000Z');
    const { budget } = arbitratePlan(richPlan(), { max_minutes: 9 });
    mem.recordArbitration(budget);
    const snap = mem.snapshot();
    expect(snap.entries).toHaveLength(1);
    expect(snap.entries[0]!.kind).toBe('arbitration');
    expect(JSON.stringify(snap)).toContain('arbitration');
  });
});

describe('cortex — pipeline arbitré', () => {
  it('planFromPromptArbitrated renvoie plan + budget', async () => {
    const { plan, budget } = await cortex.planFromPromptArbitrated('platformer simple', [], {
      max_minutes: 10,
    });
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(budget.estimate_after.total_minutes).toBeLessThanOrEqual(
      budget.estimate_before.total_minutes,
    );
  });
});
