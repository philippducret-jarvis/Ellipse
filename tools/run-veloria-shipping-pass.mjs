#!/usr/bin/env node
/**
 * Passe shipping — stage 08 inpaint CPU sur assets IoU < 0.72 + re-QA.
 */
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ALL_ASSETS } from './lib/veloria/data.mjs';
import { WORKSPACE_ROOT } from './lib/veloria/constants.mjs';
import { runStage08ForAsset, SHIPPING_IOU } from './lib/veloria/stage-08-inpaint.mjs';
import { refineAsset } from './lib/veloria/universal-refinement.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { writeJson } from './lib/veloria/io.mjs';

async function loadNeedsShipping() {
  const reportPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'refine-all-report.json');
  try {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    return report.assets.filter((a) => (a.iou ?? 0) < SHIPPING_IOU).map((a) => a.key);
  } catch {
    return ALL_ASSETS.filter((a) => a.pack_root).map((a) => a.key);
  }
}

async function main() {
  const keys = await loadNeedsShipping();
  const targets = ALL_ASSETS.filter((a) => keys.includes(a.key));

  console.log(`═══ Veloria Shipping Pass — stage 08 (seuil IoU ${SHIPPING_IOU}) ═══`);
  console.log(`▶ ${targets.length} asset(s) sous shipping\n`);

  const results = [];
  for (const asset of targets) {
    process.stdout.write(`  ▸ ${asset.title.padEnd(28)}`);
    if (asset.role === 'environment') {
      try {
        const r = await refineAsset(asset);
        const iou = r.qa?.diff?.iou ?? 0;
        console.log(` refine IoU ${iou} ${iou >= SHIPPING_IOU ? '✓ shipping' : '→ stage 08'}`);
        if (iou < SHIPPING_IOU) {
          const s8 = await runStage08ForAsset(asset);
          console.log(`    stage08 IoU ${s8.iou} ${s8.shipping_ready ? '✓' : '✗'}`);
          results.push({ key: asset.key, ...s8 });
        } else {
          results.push({ key: asset.key, iou, shipping_ready: true, method: r.method });
        }
      } catch (err) {
        console.log(` FAIL ${err.message}`);
        results.push({ key: asset.key, error: err.message, shipping_ready: false });
      }
    } else {
      const s8 = await runStage08ForAsset(asset);
      if (s8.skipped) {
        console.log(` skip (déjà shipping IoU ${s8.iou})`);
      } else {
        console.log(` IoU ${s8.iou} ${s8.shipping_ready ? '✓ shipping' : '✗'}`);
      }
      results.push({ key: asset.key, ...s8 });
    }
  }

  await buildVeloriaGdl();

  const shipping = results.filter((r) => r.shipping_ready || (r.iou ?? 0) >= SHIPPING_IOU).length;
  const report = {
    pipeline: 'shipping-pass',
    shipping_iou: SHIPPING_IOU,
    generated_at: new Date().toISOString(),
    stats: { total: targets.length, shipping_ready: shipping, below_threshold: targets.length - shipping },
    assets: results,
  };

  const outDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'shipping-pass-report.json'), report);

  console.log(`\n✓ ${shipping}/${targets.length} shipping-ready — shipping-pass-report.json`);
  if (shipping < targets.length) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
