#!/usr/bin/env node
/**
 * Raffinement batch — 29 packs Veloria + gate QA + registre + GDL.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildVeloriaPrepPack } from './lib/veloria/index.mjs';
import { ALL_ASSETS } from './lib/veloria/data.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './lib/veloria/constants.mjs';
import { refineAllAssets } from './lib/veloria/universal-refinement.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { writeJson } from './lib/veloria/io.mjs';
import { SILHOUETTE_GATE } from './lib/veloria/pixel-diff-gate.mjs';

const wsUrl = (rel) => `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;

async function wireRegistry(results) {
  const registry = results
    .filter((r) => r.manifest || r.atlasUrl)
    .map((r) => ({
      key: r.asset.key,
      title: r.asset.title,
      role: r.asset.role,
      method: r.method ?? r.manifest?.method ?? r.qa?.method,
      atlas_url: r.atlasUrl ?? r.manifest?.atlas?.url,
      iou: r.qa?.diff?.iou ?? r.qa?.diff?.iou ?? null,
      passed: r.qa?.diff?.passed ?? r.qa?.passed ?? null,
    }));
  await writeJson(join(WORKSPACE_ROOT, '03_assets', 'registry', 'generated-assets-hd.json'), {
    generated_at: new Date().toISOString(),
    refine_all: true,
    gate: SILHOUETTE_GATE,
    assets: registry,
  });
  return registry;
}

async function wireGdl(results) {
  const gdl = await buildVeloriaGdl();
  const atlasByKey = Object.fromEntries(
    results.filter((r) => r.asset?.key && (r.atlasUrl || r.manifest?.atlas?.url)).map((r) => [r.asset.key, r.atlasUrl ?? r.manifest.atlas.url]),
  );

  if (gdl.meta) {
    gdl.meta.asset_atlas = { ...(gdl.meta.asset_atlas ?? {}), ...atlasByKey };
  }

  const player = gdl.entities?.find((e) => e.id === 'player');
  if (player && atlasByKey.aureline) {
    const pack = results.find((r) => r.asset?.key === 'aureline');
    player.assets = {
      ...(player.assets ?? {}),
      sprite: atlasByKey.aureline,
      frame_count: pack?.manifest?.frame_count ?? pack?.frameCount ?? 11,
    };
  }

  for (const scene of gdl.scenes ?? []) {
    const envKey = scene.id?.replace('arena_', '') ?? scene.background?.key;
    if (envKey && atlasByKey[envKey]) {
      scene.background = { ...scene.background, image: atlasByKey[envKey], alpha: 0.85 };
    }
  }

  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2));
  return gdlPath;
}

async function main() {
  console.log('═══ Veloria Refine All — 29 packs + QA gate ═══\n');

  console.log('▶ Prep planches + cutouts');
  await buildVeloriaPrepPack();

  const packs = ALL_ASSETS.filter((a) => a.pack_root);
  console.log(`\n▶ Raffinement ${packs.length} packs (universal-refinement)\n`);

  const results = await refineAllAssets(packs, (asset) => {
    process.stdout.write(`  ▸ ${asset.title.padEnd(28)}`);
  });

  for (const r of results) {
    if (r.failed) {
      console.log(` FAIL — ${r.error}`);
    } else if (r.skipped) {
      console.log(` skip (${r.reason})`);
    } else {
      const iou = r.qa?.diff?.iou ?? r.qa?.diff?.iou ?? '—';
      const method = r.method ?? r.qa?.method ?? r.manifest?.method ?? '?';
      console.log(` → ${method} (IoU ${iou})`);
    }
  }

  const passed = results.filter((r) => r.qa?.passed !== false && r.qa?.diff?.passed !== false && !r.failed && !r.skipped);
  const failed = results.filter((r) => r.failed || r.qa?.passed === false || r.qa?.diff?.passed === false);
  const shippingReady = results.filter((r) => (r.qa?.diff?.iou ?? 0) >= 0.72);

  await wireRegistry(results);
  const gdlPath = await wireGdl(results);

  const report = {
    pipeline: 'refine-all',
    generated_at: new Date().toISOString(),
    gate: SILHOUETTE_GATE,
    stats: {
      total: packs.length,
      refined: results.filter((r) => !r.skipped && !r.failed).length,
      passed_qa: passed.length,
      failed_qa: failed.length,
      shipping_ready: shippingReady.length,
    },
    assets: results.map((r) => ({
      key: r.asset?.key,
      title: r.asset?.title,
      role: r.asset?.role,
      method: r.method ?? r.manifest?.method,
      iou: r.qa?.diff?.iou ?? null,
      passed: r.qa?.diff?.passed ?? r.qa?.passed ?? null,
      shipping_ready: (r.qa?.diff?.iou ?? 0) >= 0.72,
      error: r.error ?? null,
    })),
    gdl: gdlPath.replace(/\\/g, '/'),
  };

  const outDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'refine-all-report.json'), report);

  console.log(`\n✓ ${report.stats.refined}/${report.stats.total} raffinés — QA pass: ${report.stats.passed_qa} — shipping: ${report.stats.shipping_ready}/${report.stats.total}`);
  console.log(`  Rapport : 08_ops/manifests/refine-all-report.json`);
  console.log(`  GDL     : ${gdlPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
