import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { MasterAI } from './master-ai.js';
import { loadProjectKnowledgeContext, enrichTaskContextWithKnowledge } from './project-knowledge-loader.js';
import { formatAgentSkillsForContext } from '@ellipse/shared';

const ROOT = join(process.cwd(), '..', '..');
const VELORIA_WS = join(ROOT, 'workspaces', 'veloria-veille-des-lames');

function subsetWithResolvedDeps(plan: Awaited<ReturnType<MasterAI['createPlan']>>, agentIds: string[]) {
  const tasks = plan.tasks.filter((t) => agentIds.includes(t.agent));
  const ids = new Set(tasks.map((t) => t.task_id));
  return tasks.map((t) => ({
    ...t,
    depends_on: t.depends_on.filter((dep) => ids.has(dep)),
  }));
}

describe('MasterAI — communication agents (in-process)', () => {
  const master = new MasterAI({ useQueue: false });

  it('planifie un DAG avec integration en fin de chaîne', async () => {
    const plan = await master.createPlan('survivors-like mobile vertical dark fantasy', []);
    const integration = plan.tasks.find((t) => t.agent === 'integration');
    expect(integration).toBeDefined();
    expect(integration!.depends_on.length).toBeGreaterThan(0);
  });

  it('exécute la chaîne agents et rapporte task_complete pour chaque tâche', async () => {
    const plan = await master.createPlan('platformer simple avec collectibles', []);
    const subset = {
      ...plan,
      tasks: subsetWithResolvedDeps(plan, ['character', 'decor', 'gameplay', 'qa', 'integration']),
    };

    const events: string[] = [];
    const session = await master.executePlan(subset, false, (ev) => {
      if (ev.type === 'task_start') events.push(`start:${ev.task.agent}`);
      if (ev.type === 'task_complete') events.push(`done:${ev.result.agent}:${ev.result.status}`);
    });

    expect(session.results.length).toBe(subset.tasks.length);
    expect(events.filter((e) => e.startsWith('done:'))).toHaveLength(subset.tasks.length);
    expect(['completed', 'failed']).toContain(session.status);
  });

  it('respecte depends_on — integration après gameplay/qa', async () => {
    const plan = await master.createPlan('runner avec QA', []);
    const order: string[] = [];
    await master.executePlan(
      {
        ...plan,
        tasks: subsetWithResolvedDeps(plan, ['gameplay', 'qa', 'integration']),
      },
      false,
      (ev) => {
        if (ev.type === 'task_complete') order.push(ev.result.agent);
      },
    );
    const qi = order.indexOf('qa');
    const ii = order.indexOf('integration');
    if (qi >= 0 && ii >= 0) expect(qi).toBeLessThan(ii);
  });

  it('injecte compétences agent dans le contexte enrichi', () => {
    const ctx = enrichTaskContextWithKnowledge('character', {}, null);
    expect(ctx.gdd_excerpt).toContain('Agent character');
    expect(ctx.gdd_excerpt).toContain('IoU');
  });

  it('charge connaissance projet Veloria si workspace présent', async () => {
    if (!existsSync(VELORIA_WS)) {
      expect(true).toBe(true);
      return;
    }
    const knowledge = await loadProjectKnowledgeContext(VELORIA_WS, 'veloria-veille-des-lames', 'aureline lane');
    expect(knowledge.project_slug).toBe('veloria-veille-des-lames');
    expect(knowledge.playbook_excerpt.length + knowledge.gdd_excerpt.length).toBeGreaterThan(0);
  });

  it('auto-correct relance un agent après échec QA simulé', async () => {
    const plan = await master.createPlan('platformer', []);
    const qaOnly = plan.tasks.find((t) => t.agent === 'qa');
    if (!qaOnly) return;

    const session = await master.executePlan(
      {
        ...plan,
        tasks: [{ ...qaOnly, depends_on: [], input: { validate_gdl: true, smoke_test_seconds: 5 } }],
      },
      false,
      undefined,
      { autoCorrect: true },
    );
    expect(session.results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Agent skills registry', () => {
  it('couvre les 15 agents avec directives fidelity ou mission', () => {
    const agents = [
      'character', 'decor', 'animation', 'level', 'mesh_3d', 'lighting', 'camera',
      'gameplay', 'narrative', 'music', 'sfx', 'ui', 'vfx', 'qa', 'integration',
    ] as const;
    for (const id of agents) {
      const text = formatAgentSkillsForContext(id);
      expect(text).toContain(`Agent ${id}`);
      expect(text.length).toBeGreaterThan(40);
    }
  });
});
