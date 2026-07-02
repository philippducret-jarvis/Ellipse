#!/usr/bin/env node
/**
 * Re-raffine uniquement les assets en échec QA (refine-all-report.json).
 */
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ALL_ASSETS } from './lib/veloria/data.mjs';
import { WORKSPACE_ROOT } from './lib/veloria/constants.mjs';
import { refineAsset } from './lib/veloria/universal-refinement.mjs';
import { writeJson } from './lib/veloria/io.mjs';

async function main() {
  const reportPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'refine-all-report.json');
  let failedKeys = [];
  try {
    const prev = JSON.parse(await readFile(reportPath, 'utf8'));
    failedKeys = prev.assets.filter((a) => a.passed === false).map((a) => a.key);
  } catch {
    console.error('Lancez d’abord pnpm veloria:refine-all');
    process.exit(1);
  }

  if (!failedKeys.length) {
    console.log('Aucun asset en échec QA.');
    return;
  }

  const targets = ALL_ASSETS.filter((a) => failedKeys.includes(a.key));
  console.log(`═══ Veloria Refine Failed — ${targets.length} assets ═══\n`);

  const results = [];
  for (const asset of targets) {
    process.stdout.write(`  ▸ ${asset.title.padEnd(28)}`);
    try {
      const r = await refineAsset(asset);
      const iou = r.qa?.diff?.iou ?? r.qa?.diff?.iou ?? '—';
      const passed = r.qa?.passed ?? r.qa?.diff?.passed;
      console.log(` → ${r.method ?? '?'} IoU ${iou} ${passed ? '✓' : '✗'}`);
      results.push({
        key: asset.key,
        title: asset.title,
        role: asset.role,
        method: r.method,
        iou,
        passed,
        error: null,
      });
    } catch (err) {
      console.log(` FAIL ${err.message}`);
      results.push({ key: asset.key, title: asset.title, passed: false, error: err.message });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const out = {
    pipeline: 'refine-failed',
    generated_at: new Date().toISOString(),
    retried: targets.length,
    now_passed: passed,
    still_failed: results.filter((r) => !r.passed).length,
    assets: results,
  };

  const outDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'refine-failed-report.json'), out);

  console.log(`\n✓ ${passed}/${targets.length} corrigés — rapport refine-failed-report.json`);

  if (passed < targets.length) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
