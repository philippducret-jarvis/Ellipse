#!/usr/bin/env node
/**
 * Run autonome 14 étapes — avance le workflow avec retry jusqu'à completion ou awaiting_human.
 */
import { existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_ROOT, PROJECT_ID } from './lib/veloria/constants.mjs';

const ROOT = process.cwd();
const MAX_LOOPS = Number(process.env.TRAINING_MAX_LOOPS ?? 42);

async function loadModule(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href);
}

async function build() {
  const { spawn } = await import('node:child_process');
  const pnpm = join(ROOT, 'node_modules/pnpm/bin/pnpm.cjs');
  for (const pkg of ['@ellipse/shared', '@ellipse/engine', '@ellipse/pipeline', '@ellipse/orchestrator']) {
    const distMarker =
      pkg === '@ellipse/shared'
        ? join(ROOT, 'packages/shared/dist/index.js')
        : pkg === '@ellipse/engine'
          ? join(ROOT, 'packages/engine/dist/index.js')
          : pkg === '@ellipse/pipeline'
            ? join(ROOT, 'packages/pipeline/dist/index.js')
            : join(ROOT, 'packages/orchestrator/dist/server.js');
    if (existsSync(distMarker)) continue;
    await new Promise((resolve, reject) => {
      console.log(`▶ Build ${pkg}`);
      const child = spawn(process.execPath, [pnpm, '--filter', pkg, 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: false,
      });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${pkg} build failed`))));
    });
  }
}

async function main() {
  console.log('— Training autonomous (workflow 14 étapes) —\n');
  await build();

  const { spawn } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'tools/run-training-prep.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, TRAINING_USE_LLM: process.env.TRAINING_USE_LLM ?? 'false' },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('training prep failed'))));
  });

  const { GameFactoryService } = await loadModule('packages/orchestrator/dist/game-factory/service.js');
  const { MasterAI } = await loadModule('packages/orchestrator/dist/master-ai.js');
  const { advanceAutonomousWorkflow } = await loadModule('packages/orchestrator/dist/autonomous-workflow-runner.js');
  const { findProjectRoot, getUploadDir, getGeneratedDir, getGameWorkspacesDir } = await loadModule(
    'packages/orchestrator/dist/project-paths.js',
  );

  const root = findProjectRoot();
  const ctx = {
    root,
    uploadDir: getUploadDir(root),
    generatedDir: getGeneratedDir(root),
    workspacesDir: getGameWorkspacesDir(root),
    master: new MasterAI({ useQueue: false }),
    factory: new GameFactoryService(getGameWorkspacesDir(root)),
  };

  const runId = `training-${Date.now()}`;
  let run;
  let loops = 0;

  while (loops < MAX_LOOPS) {
    run = await advanceAutonomousWorkflow(ctx, PROJECT_ID, runId, { maxSteps: 1 });
    loops += 1;
    const st = run.steps[run.currentStepId];
    console.log(
      `[${loops}] ${run.status} — step ${run.currentStepId} score ${st?.score ?? '?'} passed=${st?.passed} attempts ${st?.attempts ?? 0}`,
    );
    if (run.status === 'completed') break;
    if (run.status === 'awaiting_human') {
      const blocked = Object.entries(run.steps).filter(([, v]) => !v.passed && v.attempts >= v.maxAttempts);
      if (blocked.length === 0) break;
      break;
    }
  }

  const logPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-autonomous-run.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeFile(
    logPath,
    JSON.stringify(
      {
        run_id: run.runId,
        status: run.status,
        loops,
        current_step: run.currentStepId,
        steps: Object.fromEntries(
          Object.entries(run.steps).map(([k, v]) => [k, { score: v.score, passed: v.passed, attempts: v.attempts }]),
        ),
        finished_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf-8',
  );

  console.log(`\nStatus final : ${run.status} (${loops} boucles)`);
  console.log(`✓ Rapport → ${logPath}`);
  const allPassed = Object.values(run.steps).every((s) => s.passed);
  if (!allPassed && run.status !== 'completed') process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
