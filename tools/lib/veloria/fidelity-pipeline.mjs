#!/usr/bin/env node
/**
 * Pipeline fidélité photo Veloria — prep → refine 29 packs → shipping IoU ≥ 0.72 → GDL atlas → preview.
 * Point d'entrée unique pour livraison autonome fidèle aux planches concept.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { buildVeloriaPrepPack } from './index.mjs';
import { verifyVeloriaShippingFidelity, SHIPPING_IOU } from './verify-shipping.mjs';
import { WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';

const ROOT = process.cwd();

function runScript(scriptName, env = {}) {
  return new Promise((resolve, reject) => {
    const path = join(ROOT, 'tools', scriptName);
    const child = spawn(process.execPath, [path], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('close', (code) => {
      if (code === 0 || code === 2) resolve(code);
      else reject(new Error(`${scriptName} failed (${code})`));
    });
  });
}

/**
 * @param {object} [options]
 * @param {boolean} [options.skipPrep]
 * @param {boolean} [options.skipRefine]
 * @param {boolean} [options.skipShipping]
 * @param {boolean} [options.skipBuild]
 * @param {boolean} [options.force] — ignore cache reports
 */
export async function runVeloriaHdFidelityPipeline(options = {}) {
  const started = Date.now();
  const steps = [];

  if (!options.skipPrep) {
    console.log('▶ [1/5] Prep planches + références + specs');
    const prep = await buildVeloriaPrepPack();
    steps.push({ step: 'prep', ok: true, detail: `${prep.references.copied} références` });
  }

  const refineReport = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'refine-all-report.json');
  const needsRefine =
    options.force ||
    !existsSync(refineReport) ||
    process.env.FORCE_FIDELITY === '1';

  if (!options.skipRefine && needsRefine) {
    console.log('\n▶ [2/5] Raffinement HD 29 packs (board hybrid + QA gate)');
    const code = await runScript('run-veloria-refine-all.mjs');
    steps.push({ step: 'refine-all', ok: code === 0, exit_code: code });
  } else if (!options.skipRefine) {
    console.log('▶ [2/5] Raffinement — cache OK (FORCE_FIDELITY=1 pour relancer)');
    steps.push({ step: 'refine-all', ok: true, skipped: true });
  }

  if (!options.skipShipping) {
    console.log('\n▶ [3/5] Shipping pass — stage 08 inpaint CPU (IoU < 0.72)');
    const code = await runScript('run-veloria-shipping-pass.mjs');
    steps.push({ step: 'shipping-pass', ok: code === 0 || code === 2, exit_code: code });
  }

  if (!options.skipBuild) {
    console.log('\n▶ [4/5] Assemblage GDL + atlases runtime + preview jouable');
    await runScript('build-veloria-game.mjs');
    steps.push({ step: 'build-game', ok: true });
  }

  console.log('\n▶ [5/5] Vérification fidélité shipping');
  let fidelity = await verifyVeloriaShippingFidelity();

  if (!fidelity.ready && !options.skipShipping) {
    console.log('\n▶ Relance shipping pass (2e passe)…');
    await runScript('run-veloria-shipping-pass.mjs');
    await runScript('build-veloria-game.mjs');
    fidelity = await verifyVeloriaShippingFidelity();
  }

  const report = {
    pipeline: 'veloria-hd-fidelity',
    shipping_iou: SHIPPING_IOU,
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    steps,
    fidelity,
    ready: fidelity.ready,
  };

  const outDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'fidelity-pipeline-report.json'), report);

  console.log(
    `\n✓ Fidélité : ${fidelity.stats.shipping_ready}/${fidelity.stats.total} shipping-ready (IoU ≥ ${SHIPPING_IOU})`,
  );

  return report;
}

async function main() {
  console.log('═══ Veloria HD Fidelity Pipeline ═══\n');
  const report = await runVeloriaHdFidelityPipeline({
    force: process.env.FORCE_FIDELITY === '1',
  });
  if (!report.ready) {
    console.error('\n✗ Fidélité shipping incomplète — voir fidelity-pipeline-report.json');
    process.exit(1);
  }
  console.log('\n✓ Veloria fidèle aux planches — prêt shipping');
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('fidelity-pipeline.mjs');
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
