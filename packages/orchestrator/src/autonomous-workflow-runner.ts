/**
 * Exécuteur workflow autonome — score → action → retry → étape suivante.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import {
  GameDefinitionSchema,
  assessAutonomousWorkflow,
  createAutonomousWorkflowRun,
  getAutonomousStep,
  AUTONOMOUS_PRODUCTION_STEPS,
  buildTrainingProgressSnapshot,
  createDefaultNpcRoutinesPack,
  createSurvivorsEnemyAiPack,
  deriveIntentContract,
  INTENT_CONTRACT_PATH,
  normalizeGdlForParse,
  resolveGdlPreviewPath,
  isFlagshipProject,
  type AutonomousWorkflowRun,
  type AutonomousEvalContext,
} from '@ellipse/shared';
import { autoRetouchAssetPack } from '@ellipse/pipeline';
import type { ServerContext } from './routes/context.js';
import { resolveWorkspaceRoot } from './workspace-browser.js';
import { runProjectIteration } from './project-iteration.js';
import { evaluateFullExportGate } from './qa/intent-gate.js';
import { evaluateProjectExportQaGate } from './qa/export-gate.js';
import { AssetPipelineService } from './asset-pipeline/service.js';
import { appendAgentMemory } from './agents/agent-memory.js';
import { appendAgentTrainingEvent } from './agents/agent-training.js';
import { getAssetWorkspaceRoot } from './workspace-scaffold.js';
import { isDeterministicHandler, runDeterministicHandler } from './training/deterministic-handlers.js';
import { buildGenericPreviewBundle } from './export/preview-builder.js';
import { buildVeloriaPreviewBundle } from './export/veloria-preview.js';
import { runVeloriaFidelityPipeline } from './veloria/fidelity-runner.js';

const pipeline = new AssetPipelineService();

const ITERATION_PROMPTS: Record<string, string> = {
  'iterate:design': 'Enrichir le brief : GDD, genre, mécaniques core, contraintes mobile portrait.',
  'iterate:narrative': 'Générer story graph, quêtes principales, lore dark fantasy, patch gdl.narrative.',
  'iterate:narrative_dialogue': 'Écrire dialogues avec triggers scène et branches PNJ.',
  'iterate:animation': 'Compléter rig.json, frame_count, animations idle/run dans GDL player.',
  'iterate:level': 'Assembler scènes : layout, lanes, encounters, collisions, triggers.',
  'iterate:gameplay': 'Déclarer systems[] complets pour le genre, composants joueur/ennemis.',
  'iterate:gameplay_balance': 'Rééquilibrer après playtest : dégâts, vagues, PV joueur.',
  'iterate:enemy_waves': 'Configurer wave_spawner, lane_runner, tables encounters Veloria-like.',
  'iterate:boss_phases': 'Ajouter boss_phases, hazard_scheduler, elites.',
  'iterate:npc': 'Créer entités NPC avec dialogues et quêtes secondaires.',
  'iterate:npc_routines': 'Définir routines PNJ : zones, horaires, états émotionnels dans narrative.',
  'iterate:audio': 'Patch gdl.audio.bgm et sfx jump/hit/collect/victory.',
  'iterate:ui': 'HUD minimal : PV, score, draft UI touches 1-3 si survivors.',
  'iterate:vfx': 'Déclarer vfx hazards, hit sparks, feedback.',
  'iterate:integration': 'Lier meta.asset_atlas, sprites validés, preview runtime.',
};

async function loadGdlFromWorkspace(workspaceRoot: string, slug: string): Promise<unknown | null> {
  const candidates = [
    resolveGdlPreviewPath(workspaceRoot, slug),
    join(workspaceRoot, '05_runtime', 'gdl', 'veloria.preview.gdl.json'),
    join(workspaceRoot, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(await readFile(p, 'utf-8'));
      } catch {
        /* next */
      }
    }
  }
  return null;
}

async function loadPlaytestReport(workspaceRoot: string) {
  const p = join(workspaceRoot, '08_ops', 'manifests', 'synthetic-playtest-report.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, 'utf-8')) as {
      wins: number;
      losses: number;
      avg_score: number;
      avg_health: number;
    };
  } catch {
    return null;
  }
}

function runPath(workspaceRoot: string, runId: string): string {
  return join(workspaceRoot, '08_ops', 'workflow-runs', `${runId}.json`);
}

export async function loadAutonomousRun(workspaceRoot: string, runId: string): Promise<AutonomousWorkflowRun | null> {
  try {
    return JSON.parse(await readFile(runPath(workspaceRoot, runId), 'utf-8')) as AutonomousWorkflowRun;
  } catch {
    return null;
  }
}

async function persistTrainingSnapshot(workspaceRoot: string, run: AutonomousWorkflowRun): Promise<void> {
  const stepScores = Object.fromEntries(Object.entries(run.steps).map(([k, v]) => [k, v.score]));
  const snapshot = buildTrainingProgressSnapshot(stepScores);
  const manifestPath = join(workspaceRoot, '08_ops', 'manifests', 'training-roadmap.json');
  await mkdir(join(workspaceRoot, '08_ops', 'manifests'), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({ ...snapshot, workflow_run_id: run.runId, workflow_status: run.status }, null, 2),
  );
  await appendAgentTrainingEvent(workspaceRoot, {
    event: 'phase_recommend',
    phase_id: snapshot.current_phase_id,
    run_id: run.runId,
    detail: `phase_scores=${JSON.stringify(snapshot.phase_scores)}`,
  });
}

async function logStepScores(workspaceRoot: string, run: AutonomousWorkflowRun): Promise<void> {
  for (const [stepId, st] of Object.entries(run.steps)) {
    if (st.score <= 0) continue;
    await appendAgentTrainingEvent(workspaceRoot, {
      event: 'step_score',
      step_id: stepId,
      score: st.score,
      run_id: run.runId,
      detail: st.passed ? 'passed' : st.detailFr,
    });
  }
}

async function saveRun(workspaceRoot: string, run: AutonomousWorkflowRun): Promise<void> {
  const dir = join(workspaceRoot, '08_ops', 'workflow-runs');
  await mkdir(dir, { recursive: true });
  await writeFile(runPath(workspaceRoot, run.runId), JSON.stringify(run, null, 2));
}

async function buildEvalContext(ctx: ServerContext, projectId: string): Promise<AutonomousEvalContext> {
  const snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');
  const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
  const raw = await loadGdlFromWorkspace(workspaceRoot, snap.project.slug);
  let gdl = null;
  if (raw) {
    try {
      gdl = GameDefinitionSchema.parse(normalizeGdlForParse(raw));
    } catch {
      gdl = null;
    }
  }
  const playtest = await loadPlaytestReport(workspaceRoot);
  const qaGate = await evaluateProjectExportQaGate(workspaceRoot);
  const intentGate = await evaluateFullExportGate(workspaceRoot, qaGate, gdl ?? undefined);
  return {
    snapshot: snap,
    gdl,
    playtest,
    exportBlocked: intentGate.blocked,
  };
}

async function executeHandler(
  ctx: ServerContext,
  projectId: string,
  handler: string,
  workspaceRoot: string,
  slug: string,
): Promise<void> {
  const snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');

  if (handler.startsWith('iterate:')) {
    const useLlm = process.env.TRAINING_USE_LLM === 'true';
    if (!useLlm && isDeterministicHandler(handler)) {
      const result = await runDeterministicHandler(
        handler,
        workspaceRoot,
        slug,
        snap.project.title,
        snap.project.genre,
      );
      if (!result.ok) throw new Error(result.detail);
      return;
    }
    if (handler === 'iterate:enemy_waves' || handler === 'iterate:boss_phases') {
      const pack = createSurvivorsEnemyAiPack();
      const specPath = join(workspaceRoot, '02_design', 'specs', 'enemy-ai-pack.json');
      await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
      await writeFile(specPath, JSON.stringify(pack, null, 2));
    }
    if (handler === 'iterate:npc_routines' || handler === 'iterate:npc') {
      const pack = createDefaultNpcRoutinesPack();
      const specPath = join(workspaceRoot, '02_design', 'specs', 'npc-routines.json');
      await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
      await writeFile(specPath, JSON.stringify(pack, null, 2));
    }
    const prompt = ITERATION_PROMPTS[handler] ?? `Exécuter ${handler} pour le projet.`;
    await runProjectIteration(ctx, projectId, prompt, []);
    return;
  }

  if (handler === 'intent:derive') {
    const contract = deriveIntentContract({
      title: snap.project.title,
      prompt: snap.project.source_prompt ?? snap.project.title,
      genre: snap.project.genre,
      dimension: snap.project.dimension === '3d' ? '3d' : '2d',
      mechanics: [],
    });
    const path = join(workspaceRoot, INTENT_CONTRACT_PATH);
    await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
    await writeFile(path, JSON.stringify(contract, null, 2));
    return;
  }

  if (handler === 'asset:pipeline' || handler.startsWith('asset:stage:')) {
    if (isFlagshipProject(slug) || isFlagshipProject(projectId)) {
      await runVeloriaFidelityPipeline(ctx.root, { force: process.env.FORCE_FIDELITY === '1' });
      return;
    }
    const stageId = handler === 'asset:pipeline' ? '02_cutouts' : (handler.replace('asset:stage:', '') as '02_cutouts');
    for (const asset of snap.assets.slice(0, 3)) {
      await pipeline.runStage(projectId, asset.id, stageId as '02_cutouts');
      if (handler === 'asset:pipeline') {
        await pipeline.runStage(projectId, asset.id, '03_cleanup');
        await pipeline.runStage(projectId, asset.id, '07_qa');
      }
    }
    return;
  }

  if (handler === 'asset:retouch') {
    if (isFlagshipProject(slug) || isFlagshipProject(projectId)) {
      await runVeloriaFidelityPipeline(ctx.root, { force: true });
      return;
    }
    for (const asset of snap.assets.slice(0, 5)) {
      const packRoot = getAssetWorkspaceRoot(snap.project, asset);
      await autoRetouchAssetPack(packRoot, asset.role);
    }
    return;
  }

  if (handler === 'qa:playtest') {
    const result = await runDeterministicHandler(handler, workspaceRoot, slug, snap.project.title, snap.project.genre);
    if (!result.ok) throw new Error(result.detail);
    return;
  }

  if (handler === 'export:gate_check') {
    const qaGate = await evaluateProjectExportQaGate(workspaceRoot);
    const raw = await loadGdlFromWorkspace(workspaceRoot, slug);
    const gdl = raw ? GameDefinitionSchema.safeParse(raw).data : undefined;
    const gate = await evaluateFullExportGate(workspaceRoot, qaGate, gdl);
    if (gate.blocked) throw new Error(gate.reason ?? 'Export gate bloquée');
    return;
  }

  if (handler === 'export:preview') {
    const qaGate = await evaluateProjectExportQaGate(workspaceRoot);
    const raw = await loadGdlFromWorkspace(workspaceRoot, slug);
    const gdl = raw ? GameDefinitionSchema.safeParse(raw).data : undefined;
    const gate = await evaluateFullExportGate(workspaceRoot, qaGate, gdl);
    if (gate.blocked) throw new Error(gate.reason ?? 'Export gate bloquée');
    if (isFlagshipProject(slug) || isFlagshipProject(projectId)) {
      await buildVeloriaPreviewBundle(workspaceRoot, slug, snap.project.title);
    } else {
      await buildGenericPreviewBundle(workspaceRoot, slug, snap.project.title);
    }
    return;
  }

  if (handler === 'gdl:validate_fix') {
    await runProjectIteration(ctx, projectId, 'Corriger erreurs GDL : entités, scènes, systems manquants.', []);
    return;
  }

  throw new Error(`Handler inconnu: ${handler}`);
}

/** Avance le workflow : évalue, exécute action si nécessaire, retry jusqu'au passage. */
export async function advanceAutonomousWorkflow(
  ctx: ServerContext,
  projectId: string,
  runId?: string,
  opts: { maxSteps?: number; actionId?: string } = {},
): Promise<AutonomousWorkflowRun> {
  const snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');
  const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
  const slug = snap.project.slug;

  const id = runId ?? uuidv4();
  let run = (await loadAutonomousRun(workspaceRoot, id)) ?? createAutonomousWorkflowRun(projectId, id);
  if (!run.startedAt) run.startedAt = new Date().toISOString();
  run.status = 'running';

  const maxSteps = opts.maxSteps ?? 1;
  let stepsDone = 0;

  while (stepsDone < maxSteps && run.status !== 'completed' && run.status !== 'awaiting_human') {
    const evalCtx = await buildEvalContext(ctx, projectId);
    run = assessAutonomousWorkflow(evalCtx, run, { scoreAllSteps: true });

    const stepId = run.currentStepId;
    const st = run.steps[stepId];
    if (!st || st.passed) {
      const next = AUTONOMOUS_PRODUCTION_STEPS.find((s) => !run.steps[s.id]?.passed);
      if (!next) {
        run.status = 'completed';
        break;
      }
      run.currentStepId = next.id;
      stepsDone++;
      continue;
    }

    if (st.attempts >= st.maxAttempts) {
      run.status = 'awaiting_human';
      await appendAgentMemory(workspaceRoot, {
        agent: getAutonomousStep(stepId).ownerAgent,
        kind: 'failure',
        subject: stepId,
        detail: st.detailFr,
      });
      break;
    }

    const action = opts.actionId
      ? st.proposedActions.find((a) => a.id === opts.actionId) ?? st.proposedActions[0]
      : st.proposedActions[0];

    if (!action) {
      st.status = 'awaiting_human';
      run.status = 'awaiting_human';
      break;
    }

    st.attempts += 1;
    st.status = 'running';
    st.lastAction = action.id;
    await saveRun(workspaceRoot, run);

    try {
      await executeHandler(ctx, projectId, action.handler, workspaceRoot, slug);
      st.lastError = undefined;
    } catch (err) {
      st.lastError = err instanceof Error ? err.message : String(err);
      await appendAgentMemory(workspaceRoot, {
        agent: getAutonomousStep(stepId).ownerAgent,
        kind: 'failure',
        subject: `${stepId}:${action.id}`,
        detail: st.lastError,
      });
    }

    const evalCtx2 = await buildEvalContext(ctx, projectId);
    run = assessAutonomousWorkflow(evalCtx2, run, { scoreAllSteps: true });
    const stAfter = run.steps[stepId];
    if (stAfter?.passed) {
      await appendAgentMemory(workspaceRoot, {
        agent: getAutonomousStep(stepId).ownerAgent,
        kind: 'success',
        subject: stepId,
        detail: `Score ${stAfter.score}/${stAfter.passScore}`,
      });
      await appendAgentTrainingEvent(workspaceRoot, {
        event: 'drill_pass',
        step_id: stepId,
        score: stAfter.score,
        run_id: run.runId,
        detail: action.id,
      });
    }
    await saveRun(workspaceRoot, run);
    stepsDone++;
  }

  const manifestPath = join(workspaceRoot, '08_ops', 'manifests', 'autonomous-workflow-report.json');
  await mkdir(join(workspaceRoot, '08_ops', 'manifests'), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        run_id: run.runId,
        status: run.status,
        current_step: run.currentStepId,
        integrable_count: run.integrableArtifacts.length,
        steps: Object.fromEntries(
          Object.entries(run.steps).map(([k, v]) => [
            k,
            { score: v.score, pass: v.passScore, passed: v.passed, status: v.status, attempts: v.attempts },
          ]),
        ),
        updated_at: run.updatedAt,
      },
      null,
      2,
    ),
  );

  await logStepScores(workspaceRoot, run);
  await persistTrainingSnapshot(workspaceRoot, run);

  return run;
}

/** Évalue sans exécuter — pour affichage Studio. */
export async function assessAutonomousWorkflowForProject(
  ctx: ServerContext,
  projectId: string,
  runId?: string,
): Promise<AutonomousWorkflowRun> {
  const snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');
  const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
  const id = runId ?? 'assessment';
  let run = (await loadAutonomousRun(workspaceRoot, id)) ?? createAutonomousWorkflowRun(projectId, id);
  const evalCtx = await buildEvalContext(ctx, projectId);
  run = assessAutonomousWorkflow(evalCtx, run);
  if (id === 'assessment') {
    run = assessAutonomousWorkflow(evalCtx, run, { scoreAllSteps: true });
    await logStepScores(workspaceRoot, run);
    await persistTrainingSnapshot(workspaceRoot, run);
    return run;
  }
  await saveRun(workspaceRoot, run);
  return run;
}
