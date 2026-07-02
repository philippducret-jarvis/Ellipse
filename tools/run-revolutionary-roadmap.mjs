#!/usr/bin/env node
/**
 * Roadmap révolutionnaire — F1 Intent, F2 Corps, F3 Stream, GSG, playtest, Godot export.
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const VELORIA = join(ROOT, 'workspaces', 'veloria-veille-des-lames');

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: false });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exit ${code}`))));
  });
}

async function ensureVeloriaIntentContract() {
  const path = join(VELORIA, '02_design', 'specs', 'intent-contract.json');
  if (existsSync(path)) return;
  const { deriveIntentContract } = await import(
    pathToFileURL(join(ROOT, 'packages/shared/dist/intent/intent-contract.js')).href
  );
  const gdlPath = join(VELORIA, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  let prompt = 'Veloria survivors portrait dark fantasy';
  if (existsSync(gdlPath)) {
    const gdl = JSON.parse(await readFile(gdlPath, 'utf-8'));
    prompt = gdl.meta?.title ?? prompt;
  }
  const contract = deriveIntentContract({
    title: 'Veloria — Veille des Lames',
    prompt,
    genre: 'survivors_like',
    dimension: '2d',
    mechanics: ['lane_runner', 'wave_spawner', 'blessing_draft'],
  });
  await mkdir(join(VELORIA, '02_design', 'specs'), { recursive: true });
  await writeFile(path, JSON.stringify(contract, null, 2), 'utf-8');
  console.log('✓ intent-contract.json Veloria');
}

async function writeRoadmapManifest(results) {
  const out = join(VELORIA, '08_ops', 'manifests', 'revolutionary-roadmap-report.json');
  await mkdir(join(VELORIA, '08_ops', 'manifests'), { recursive: true });
  await writeFile(
    out,
    JSON.stringify({ generated_at: new Date().toISOString(), pillars: ['F1', 'F2', 'F3', 'GSG', 'agents', 'playtest', 'godot'], results }, null, 2),
    'utf-8',
  );
  console.log(`\n✓ Rapport → ${out}`);
}

async function main() {
  const node = process.execPath;
  const results = { steps: [] };

  try {
    await run('npx', ['--yes', 'pnpm', '--filter', '@ellipse/shared', 'build'], 'Build shared');
    results.steps.push({ id: 'shared_build', ok: true });
  } catch (e) {
    results.steps.push({ id: 'shared_build', ok: false, error: String(e) });
  }

  await ensureVeloriaIntentContract();
  results.steps.push({ id: 'f1_intent_contract', ok: true });

  const steps = [
    () => run(process.execPath, [join(ROOT, 'tools/run-mechanics-audit.mjs')], 'Audit mécaniques'),
    () => run('npx', ['--yes', 'pnpm', '--filter', '@ellipse/engine', 'test'], 'Tests engine'),
    () => run('npx', ['--yes', 'pnpm', '--filter', '@ellipse/shared', 'test'], 'Tests shared'),
    () => run('npx', ['--yes', 'pnpm', '--filter', '@ellipse/studio', 'test'], 'Tests studio'),
  ];

  for (const step of steps) {
    try {
      await step();
      results.steps.push({ id: step.name, ok: true });
    } catch (e) {
      console.warn(`⚠ ${e.message}`);
      results.steps.push({ id: 'step', ok: false, error: String(e) });
    }
  }

  await writeRoadmapManifest(results);
  console.log('\n✅ Roadmap révolutionnaire exécutée');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
