#!/usr/bin/env node
/**
 * Évalue le workflow autonome 14 étapes sans exécuter d'actions (score + phase training).
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

async function maybeBuildShared() {
  const distIndex = join(ROOT, 'packages/shared/dist/index.js');
  if (existsSync(distIndex)) return;
  const { spawn } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'node_modules/pnpm/bin/pnpm.cjs'), '--filter', '@ellipse/shared', 'build'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('shared build failed'))));
  });
}

async function loadGdl(workspaceRoot) {
  const candidates = [
    join(workspaceRoot, '05_runtime', 'gdl', 'veloria.preview.gdl.json'),
    join(workspaceRoot, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(await readFile(p, 'utf-8'));
    } catch {
      /* next */
    }
  }
  return null;
}

async function loadPlaytest(workspaceRoot) {
  const p = join(workspaceRoot, '08_ops', 'manifests', 'synthetic-playtest-report.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, 'utf-8'));
  } catch {
    return null;
  }
}

async function main() {
  console.log('— Training assess (14 étapes, sans exécution) —\n');
  await maybeBuildShared();

  const {
    GameDefinitionSchema,
    assessAutonomousWorkflow,
    createAutonomousWorkflowRun,
    buildTrainingProgressSnapshot,
    buildTrainingRoadmapManifest,
    AUTONOMOUS_PRODUCTION_STEPS,
    normalizeGdlForParse,
  } = await loadModule('packages/shared/dist/index.js');

  const { getWorkspaceSnapshot } = await loadModule('packages/orchestrator/dist/workspace-projects.js');

  const workspacesDir = join(ROOT, 'workspaces');
  const snapshot = await getWorkspaceSnapshot(workspacesDir, PROJECT_ID);
  if (!snapshot) {
    console.error(`Snapshot introuvable pour ${PROJECT_SLUG} (${PROJECT_ID})`);
    process.exit(1);
  }

  const raw = await loadGdl(WORKSPACE_ROOT);
  let gdl = null;
  if (raw) {
    try {
      gdl = GameDefinitionSchema.parse(normalizeGdlForParse(raw));
    } catch {
      gdl = null;
    }
  }

  const playtest = await loadPlaytest(WORKSPACE_ROOT);
  const exportBlocked = false;

  let run = createAutonomousWorkflowRun(PROJECT_ID, 'training-assess');
  run = assessAutonomousWorkflow({ snapshot, gdl, playtest, exportBlocked }, run, { scoreAllSteps: true });

  const stepScores = Object.fromEntries(Object.entries(run.steps).map(([k, v]) => [k, v.score]));
  const progress = buildTrainingProgressSnapshot(stepScores);
  const manifest = {
    ...buildTrainingRoadmapManifest(),
    progress,
    assessment: {
      run_id: run.runId,
      steps: Object.fromEntries(
        Object.entries(run.steps).map(([k, v]) => [
          k,
          { score: v.score, pass: v.passScore, passed: v.passed, detail: v.detailFr },
        ]),
      ),
    },
  };

  const outPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-roadmap.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`Phase courante : ${progress.current_phase_id}`);
  console.log(`Prochaines drills : ${progress.next_drills.join(', ') || 'aucune'}\n`);
  for (const step of AUTONOMOUS_PRODUCTION_STEPS) {
    const st = run.steps[step.id];
    if (!st) continue;
    const mark = st.passed ? '✓' : '○';
    console.log(`  ${mark} ${step.id.padEnd(22)} ${st.score}/${st.passScore} — ${st.detailFr.slice(0, 60)}`);
  }
  console.log(`\n✓ Manifest → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
