import { describe, it, expect } from 'vitest';
import {
  evaluateAutonomousStep,
  proposeActionsForStep,
  assessAutonomousWorkflow,
  createAutonomousWorkflowRun,
  scoreGdl,
} from './autonomous-production.js';
import { GameDefinitionSchema } from '../index.js';

const baseSnap = {
  project: {
    id: 'p1',
    title: 'Test',
    slug: 'test-game',
    status: 'active' as const,
    source_prompt: 'Dark fantasy survivors',
    dimension: '2d' as const,
    target_runtime: 'ellipse_web_2d' as const,
    camera_mode: 'top_down' as const,
    source_images: [],
    genre: 'survivors_like',
    summary: 'Survival vertical',
  },
  prompts: [{ id: 'pr1', project_id: 'p1', content: 'x', created_by: 't' }],
  documents: [{ id: 'd1', project_id: 'p1', kind: 'gdd', title: 'GDD', status: 'generated' as const, content: '# GDD', payload: {}, created_by: 't' }],
  tasks: [],
  assets: [{ id: 'a1', project_id: 'p1', title: 'Hero', role: 'hero' as const, kind: 'character' as const, status: 'approved' as const }],
  asset_sources: [],
  asset_variants: [],
  asset_outputs: [],
  scenes: [],
  builds: [{ id: 'b1', project_id: 'p1', target: 'web_preview', status: 'ready' as const }],
};

describe('autonomous-production', () => {
  it('score design_brief avec documents', () => {
    const r = evaluateAutonomousStep('design_brief', { snapshot: baseSnap as never });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.passed).toBe(true);
  });

  it('propose actions si asset non validé', () => {
    const snap = {
      ...baseSnap,
      assets: [{ ...baseSnap.assets[0], status: 'concept' as const }],
    };
    const evalR = evaluateAutonomousStep('asset_pipeline', { snapshot: snap as never });
    expect(evalR.passed).toBe(false);
    const actions = proposeActionsForStep('asset_pipeline', evalR);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]?.handler).toContain('asset');
  });

  it('scoreGdl pénalise erreurs', () => {
    const gdl = GameDefinitionSchema.parse({
      meta: { title: 'T', dimension: '2d', version: '1' },
      entities: [{ id: 'player', components: [] }],
      scenes: [{ id: 's1', entities: ['player'] }],
      systems: ['lane_runner', 'wave_spawner', 'physics_topdown'],
    });
    expect(scoreGdl(gdl).score).toBeGreaterThan(50);
  });

  it('assess scoreAllSteps évalue les 14 étapes', () => {
    const gdl = GameDefinitionSchema.parse({
      meta: { title: 'T', dimension: '2d', version: '1', genre: 'survivors_like' },
      entities: [{ id: 'player', components: [] }, { id: 'enemy_1', type: 'enemy', components: [{ patrol: { range: 80, speed: 90 } }] }],
      scenes: [{ id: 's1', entities: ['player'] }],
      systems: ['lane_runner', 'wave_spawner', 'physics_topdown', 'boss_phases'],
      audio: { bgm: 'x', sfx: { jump: 'a', hit: 'b', collect: 'c' } },
    });
    const run = createAutonomousWorkflowRun('p1', 'run-all');
    const assessed = assessAutonomousWorkflow({ snapshot: baseSnap as never, gdl, exportBlocked: false }, run, {
      scoreAllSteps: true,
    });
    expect(assessed.steps.design_brief?.passed).toBe(true);
    expect(assessed.steps.gameplay_systems?.score).toBeGreaterThan(0);
    expect(assessed.steps.export_delivery?.score).toBeGreaterThan(0);
  });
});
