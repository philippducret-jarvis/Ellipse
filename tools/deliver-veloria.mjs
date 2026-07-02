#!/usr/bin/env node
/**
 * Mission finale Ellipse — livrer Veloria fidèle aux planches concept (IoU shipping ≥ 0.72).
 *
 * Pipeline : prep → refine 29 packs → shipping pass → GDL atlas → preview → training 14/14
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  PROJECT_ID,
  PROJECT_SLUG,
  PROJECT_TITLE,
  WORKSPACE_ROOT,
} from './lib/veloria/constants.mjs';
import { runVeloriaHdFidelityPipeline } from './lib/veloria/fidelity-pipeline.mjs';
import { verifyVeloriaShippingFidelity, SHIPPING_IOU } from './lib/veloria/verify-shipping.mjs';

const ROOT = process.cwd();
const ORCH_PORT = Number(process.env.ORCHESTRATOR_PORT ?? 4400);
const FLAGSHIP_PREVIEW = `http://localhost:${ORCH_PORT}/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`;

function runNodeScript(scriptName, env = {}) {
  return new Promise((resolve, reject) => {
    const path = join(ROOT, 'tools', scriptName);
    const child = spawn(process.execPath, [path], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${scriptName} failed (${code})`))));
  });
}

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

async function ensureBuild() {
  for (const pkg of ['shared', 'engine', 'orchestrator']) {
    const marker = join(ROOT, 'packages', pkg, 'dist', 'index.js');
    if (existsSync(marker)) continue;
    await new Promise((resolve, reject) => {
      const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
      const cwd = join(ROOT, 'packages', pkg);
      if (!existsSync(tsc)) {
        resolve();
        return;
      }
      spawn(process.execPath, [tsc], { cwd, stdio: 'inherit' }).on('close', (c) =>
        c === 0 ? resolve() : reject(new Error(`build ${pkg} failed`)),
      );
    });
  }
}

async function runAutonomousIfNeeded() {
  const auditPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-audit-report.json');
  const existing = await readJson(auditPath);
  if (existing?.summary?.steps_passed === '14/14' && !process.env.FORCE_DELIVER) {
    console.log('▶ Training déjà au vert (14/14) — skip cycle (FORCE_DELIVER=1 pour relancer)');
    return existing;
  }
  console.log('▶ Cycle training autonome (14 étapes)…');
  await runNodeScript('run-training-cycle.mjs', { TRAINING_USE_LLM: process.env.TRAINING_USE_LLM ?? 'false' });
  return readJson(auditPath);
}

async function writeDeliverableManifest(audit, fidelity, previewExists) {
  const fidelityReady = fidelity?.ready === true;
  const trainingReady = audit?.summary?.steps_passed === '14/14';
  const status = fidelityReady && trainingReady && previewExists ? 'ready' : 'partial';

  const manifest = {
    generated_at: new Date().toISOString(),
    mission: 'ellipse_flagship_delivery',
    game: {
      id: PROJECT_ID,
      slug: PROJECT_SLUG,
      title: PROJECT_TITLE,
      genre: 'survivors_like',
      dimension: '2d',
      orientation: 'portrait',
    },
    deliverable: {
      status,
      fidelity_ready: fidelityReady,
      shipping_iou_threshold: SHIPPING_IOU,
      shipping_ready: `${fidelity?.stats?.shipping_ready ?? 0}/${fidelity?.stats?.total ?? 29}`,
      preview_url: `/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`,
      gdl_url: `/workspaces/${PROJECT_SLUG}/05_runtime/gdl/veloria.preview.gdl.json`,
      local_preview: FLAGSHIP_PREVIEW,
      playtest: audit?.playtest ?? null,
      training: audit?.summary ?? null,
      phase: audit?.phase ?? null,
      fidelity: fidelity?.stats ?? null,
    },
    commands: {
      play: `pnpm dev:stack puis ouvrir ${FLAGSHIP_PREVIEW}`,
      rebuild: 'pnpm deliver:veloria',
      force_fidelity: 'FORCE_FIDELITY=1 pnpm deliver:veloria',
      studio: `http://localhost:5173/?project=${PROJECT_ID}`,
    },
  };

  const outPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'flagship-deliverable.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeFile(outPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ELLIPSE — Livraison Veloria (fidélité photo HD)');
  console.log('  Planches → 29 packs IoU ≥ 0.72 → jeu jouable');
  console.log('═══════════════════════════════════════════════\n');

  if (!existsSync(WORKSPACE_ROOT)) {
    console.log('▶ Création workspace Veloria…');
    await runNodeScript('create-veloria.mjs');
  }

  console.log('▶ Pipeline fidélité HD (prep → refine → shipping → GDL → preview)…\n');
  let fidelityReport;
  try {
    fidelityReport = await runVeloriaHdFidelityPipeline({
      force: process.env.FORCE_FIDELITY === '1' || process.env.FORCE_DELIVER === '1',
    });
  } catch (err) {
    console.warn('⚠ Pipeline fidélité partiel:', err.message);
    fidelityReport = { fidelity: await verifyVeloriaShippingFidelity(), ready: false };
  }

  const previewPath = join(WORKSPACE_ROOT, '07_exports', 'web', 'preview.html');
  const previewExists = existsSync(previewPath);

  await ensureBuild();
  const audit = await runAutonomousIfNeeded();
  const fidelity = fidelityReport?.fidelity ?? (await verifyVeloriaShippingFidelity());
  const manifest = await writeDeliverableManifest(audit, fidelity, previewExists);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  VELORIA — RÉSULTAT LIVRAISON');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Titre      : ${PROJECT_TITLE}`);
  console.log(`  Statut     : ${manifest.deliverable.status}`);
  console.log(`  Fidélité   : ${fidelity.stats.shipping_ready}/${fidelity.stats.total} IoU ≥ ${SHIPPING_IOU}`);
  console.log(`  Training   : ${audit?.summary?.steps_passed ?? '?'} · phase ${audit?.phase ?? '?'}`);
  console.log(`  Preview    : ${FLAGSHIP_PREVIEW}`);
  console.log('═══════════════════════════════════════════════\n');

  if (manifest.deliverable.status !== 'ready') {
    console.warn('⚠ Livraison incomplète — relancez : FORCE_FIDELITY=1 pnpm deliver:veloria');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('ECHEC livraison Veloria:', err);
  process.exit(1);
});
