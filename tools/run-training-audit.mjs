#!/usr/bin/env node
/**
 * Audit post-training — scores 14 étapes, phase, mémoire, télémétrie, blockers.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_ROOT, PROJECT_ID, PROJECT_SLUG } from './lib/veloria/constants.mjs';

const ROOT = process.cwd();

async function loadModule(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href);
}

async function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return null;
  }
}

async function main() {
  console.log('— Training audit Veloria —\n');

  const {
    GameDefinitionSchema,
    assessAutonomousWorkflow,
    createAutonomousWorkflowRun,
    buildTrainingProgressSnapshot,
    AUTONOMOUS_PRODUCTION_STEPS,
    normalizeGdlForParse,
  } = await loadModule('packages/shared/dist/index.js');

  const { getWorkspaceSnapshot } = await loadModule('packages/orchestrator/dist/workspace-projects.js');
  const { evaluateFullExportGate } = await loadModule('packages/orchestrator/dist/qa/intent-gate.js');
  const { evaluateProjectExportQaGate } = await loadModule('packages/orchestrator/dist/qa/export-gate.js');

  const snapshot = await getWorkspaceSnapshot(join(ROOT, 'workspaces'), PROJECT_ID);
  if (!snapshot) {
    console.error('Snapshot introuvable');
    process.exit(1);
  }

  const raw = await readJson(join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json'));
  let gdl = null;
  if (raw) {
    try {
      gdl = GameDefinitionSchema.parse(normalizeGdlForParse(raw));
    } catch {
      gdl = null;
    }
  }

  const playtest = await readJson(join(WORKSPACE_ROOT, '08_ops', 'manifests', 'synthetic-playtest-report.json'));
  const qaGate = await evaluateProjectExportQaGate(WORKSPACE_ROOT);
  const intentGate = await evaluateFullExportGate(WORKSPACE_ROOT, qaGate, gdl ?? undefined);

  let run = createAutonomousWorkflowRun(PROJECT_ID, 'training-audit');
  run = assessAutonomousWorkflow(
    { snapshot, gdl, playtest, exportBlocked: intentGate.blocked },
    run,
    { scoreAllSteps: true },
  );

  const stepScores = Object.fromEntries(Object.entries(run.steps).map(([k, v]) => [k, v.score]));
  const progress = buildTrainingProgressSnapshot(stepScores);
  const passed = AUTONOMOUS_PRODUCTION_STEPS.filter((s) => run.steps[s.id]?.passed).length;
  const blocked = AUTONOMOUS_PRODUCTION_STEPS.filter((s) => !run.steps[s.id]?.passed).map((s) => ({
    id: s.id,
    score: run.steps[s.id]?.score,
    pass: s.passScore,
    gap: run.steps[s.id]?.gaps[0],
    next_action: run.steps[s.id]?.proposedActions[0]?.handler,
  }));

  const memoryPath = join(WORKSPACE_ROOT, '08_ops', 'telemetry', 'agent-memory.jsonl');
  const trainingPath = join(WORKSPACE_ROOT, '08_ops', 'telemetry', 'agent-training.jsonl');
  const memoryLines = existsSync(memoryPath)
    ? (await readFile(memoryPath, 'utf-8')).trim().split('\n').filter(Boolean).length
    : 0;
  const trainingLines = existsSync(trainingPath)
    ? (await readFile(trainingPath, 'utf-8')).trim().split('\n').filter(Boolean).length
    : 0;

  const autonomousRun = await readJson(join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-autonomous-run.json'));
  const avgScore = Math.round(
    Object.values(stepScores).reduce((a, b) => a + b, 0) / Math.max(Object.keys(stepScores).length, 1),
  );

  const audit = {
    generated_at: new Date().toISOString(),
    project: PROJECT_SLUG,
    phase: progress.current_phase_id,
    phase_scores: progress.phase_scores,
    summary: {
      steps_passed: `${passed}/14`,
      average_score: avgScore,
      export_blocked: intentGate.blocked,
      export_reason: intentGate.reason ?? null,
      qa_gate: qaGate,
      autonomous_status: autonomousRun?.status ?? 'not_run',
      autonomous_loops: autonomousRun?.loops ?? 0,
      memory_entries: memoryLines,
      training_events: trainingLines,
      documents_loaded: snapshot.documents?.length ?? 0,
      assets_count: snapshot.assets?.length ?? 0,
      playtest_win_rate: playtest
        ? Math.round((playtest.wins / Math.max(playtest.wins + playtest.losses, 1)) * 100)
        : null,
    },
    blocked_steps: blocked,
    passed_steps: AUTONOMOUS_PRODUCTION_STEPS.filter((s) => run.steps[s.id]?.passed).map((s) => s.id),
  };

  const outPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-audit-report.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeFile(outPath, JSON.stringify(audit, null, 2), 'utf-8');

  console.log(`Phase        : ${audit.phase}`);
  console.log(`Score moyen  : ${avgScore}/100`);
  console.log(`Étapes OK    : ${passed}/14`);
  console.log(`Export gate  : ${intentGate.blocked ? 'BLOQUÉ — ' + (intentGate.reason ?? '') : 'OK'}`);
  console.log(`Playtest WR  : ${audit.summary.playtest_win_rate ?? 'n/a'}%`);
  console.log(`Run autonome : ${audit.summary.autonomous_status} (${audit.summary.autonomous_loops} boucles)`);
  console.log(`Mémoire      : ${memoryLines} entrées | Training : ${trainingLines} events\n`);

  console.log('Étapes :');
  for (const step of AUTONOMOUS_PRODUCTION_STEPS) {
    const st = run.steps[step.id];
    const mark = st?.passed ? '✓' : '✗';
    console.log(`  ${mark} ${step.id.padEnd(22)} ${st?.score ?? 0}/${step.passScore}`);
  }

  if (blocked.length) {
    console.log('\nBlockers prioritaires :');
    for (const b of blocked.slice(0, 5)) {
      console.log(`  • ${b.id}: ${b.gap} → ${b.next_action ?? '—'}`);
    }
  }

  console.log(`\n✓ Audit → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
