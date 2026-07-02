#!/usr/bin/env node
/**
 * Cycle d'entraînement complet — prep → assess → autonomous → audit.
 * Objectif : 14/14 étapes passed (mode déterministe, sans LLM).
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_ROOT, PROJECT_ID } from './lib/veloria/constants.mjs';

const ROOT = process.cwd();

async function runScript(name) {
  const { spawn } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'tools', name)], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, TRAINING_USE_LLM: 'false', TRAINING_MAX_LOOPS: '20' },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} exit ${code}`))));
  });
}

async function loadModule(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  CYCLE ENTRAÎNEMENT ELLipse — Veloria');
  console.log('═══════════════════════════════════════════\n');

  const { spawn } = await import('node:child_process');
  const sharedDist = join(ROOT, 'packages/shared/dist/index.js');
  const engineDist = join(ROOT, 'packages/engine/dist/index.js');
  const orchDist = join(ROOT, 'packages/orchestrator/dist/autonomous-workflow-runner.js');
  if (!existsSync(sharedDist) || !existsSync(engineDist) || !existsSync(orchDist)) {
    await new Promise((resolve, reject) => {
      const child = spawn('npx', ['--yes', 'pnpm', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
      child.on('close', (c) => (c === 0 ? resolve() : reject(new Error('pnpm build'))));
    });
  }

  await runScript('run-training-prep.mjs');
  await runScript('run-training-assess.mjs');

  try {
    await runScript('run-autonomous-production.mjs');
  } catch {
    console.warn('⚠ Run autonome partiel — audit final pour score réel');
  }

  await runScript('run-training-audit.mjs');

  const audit = JSON.parse(await readFile(join(WORKSPACE_ROOT, '08_ops/manifests/training-audit-report.json'), 'utf-8'));
  const passed = audit.passed_steps?.length ?? 0;
  const summary = {
    generated_at: new Date().toISOString(),
    steps_passed: `${passed}/14`,
    average_score: audit.summary?.average_score,
    phase: audit.phase,
    playtest_win_rate: audit.summary?.playtest_win_rate,
    export_blocked: audit.summary?.export_blocked,
  };
  await writeFile(
    join(WORKSPACE_ROOT, '08_ops/manifests/training-cycle-summary.json'),
    JSON.stringify(summary, null, 2),
  );

  console.log('\n═══════════════════════════════════════════');
  console.log(`  RÉSULTAT : ${passed}/14 étapes — score ${summary.average_score}/100`);
  console.log(`  Phase    : ${summary.phase}`);
  console.log(`  Playtest : ${summary.playtest_win_rate ?? 'n/a'}% win rate`);
  console.log('═══════════════════════════════════════════\n');

  if (passed < 14) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
