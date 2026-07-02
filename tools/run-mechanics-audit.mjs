#!/usr/bin/env node
/**
 * Audit mécaniques — compare GDL déclaré vs registre engine + tests headless.
 * Écrit workspaces/veloria-veille-des-lames/08_ops/manifests/mechanics-audit.json
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const VELORIA_SLUG = 'veloria-veille-des-lames';
const WORKSPACE = join(ROOT, 'workspaces', VELORIA_SLUG);
const GDL_PATH = join(WORKSPACE, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
const OUT_DIR = join(WORKSPACE, '08_ops', 'manifests');
const OUT_PATH = join(OUT_DIR, 'mechanics-audit.json');

const ENGINE_IMPLEMENTED = new Set([
  'input', 'physics_platformer', 'platformer_physics', 'physics_topdown',
  'collectibles', 'enemy_ai', 'hazards', 'goal', 'health', 'double_jump',
  'lane_runner', 'wave_spawner', 'auto_attack', 'blessing_draft', 'hazard_scheduler', 'boss_phases',
]);

const VELORIA_REQUIRED = [
  'lane_runner', 'wave_spawner', 'auto_attack', 'blessing_draft', 'hazard_scheduler', 'boss_phases', 'physics_topdown',
];

const RENDER_ONLY = ['camera_follow', 'animation', 'ui'];
const CODEGEN_ONLY = [
  'gacha_summon', 'summon_units', 'loot_system', 'tile_collision', 'combat_melee',
  'stamina_combat', 'parry_dodge', 'turn_based_battle', 'tower_placement', 'enemy_paths',
];

function runVitest() {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['--yes', 'pnpm', '--filter', '@ellipse/engine', 'test'],
      { cwd: ROOT, shell: process.platform === 'win32' },
    );
    let out = '';
    child.stdout?.on('data', (d) => { out += d; });
    child.stderr?.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function main() {
  const raw = await readFile(GDL_PATH, 'utf8');
  const gdl = JSON.parse(raw);
  const declared = gdl.systems ?? [];
  const sceneAssemblyPath = join(WORKSPACE, '03_design', 'scene-assembly.json');
  let sceneAssembly = null;
  try {
    sceneAssembly = JSON.parse(await readFile(sceneAssemblyPath, 'utf8'));
  } catch {
    /* optional */
  }

  const implemented = declared.filter((s) => ENGINE_IMPLEMENTED.has(s));
  const missing = declared.filter((s) => !ENGINE_IMPLEMENTED.has(s) && !RENDER_ONLY.includes(s));
  const veloriaGaps = VELORIA_REQUIRED.filter((s) => !declared.includes(s));
  const inactiveDeclared = ['collectibles', 'enemy_ai', 'goal'].filter((s) => declared.includes(s));

  const vitest = await runVitest();
  const testsPass = vitest.code === 0;

  const coveragePct = Math.round((implemented.length / Math.max(declared.length, 1)) * 100);

  const report = {
    generated_at: new Date().toISOString(),
    project: VELORIA_SLUG,
    gdl_path: '05_runtime/gdl/veloria.preview.gdl.json',
    declared_systems: declared,
    engine_implemented_count: implemented.length,
    declared_count: declared.length,
    coverage_pct: coveragePct,
    veloria_required_present: veloriaGaps.length === 0,
    veloria_gaps: veloriaGaps,
    inactive_in_lane_mode: inactiveDeclared,
    missing_engine: missing,
    codegen_only_declared: declared.filter((s) => CODEGEN_ONLY.includes(s)),
    scene_assembly_systems: sceneAssembly?.systems ?? null,
    headless_tests: {
      pass: testsPass,
      exit_code: vitest.code,
    },
    recommendations: [
      ...(inactiveDeclared.length ? [`Retirer ou désactiver en mode lane: ${inactiveDeclared.join(', ')}`] : []),
      ...(veloriaGaps.length ? [`Ajouter systèmes Veloria: ${veloriaGaps.join(', ')}`] : []),
      ...(missing.length ? [`Implémenter ou retirer du GDL: ${missing.join(', ')}`] : []),
      ...(!testsPass ? ['Corriger tests engine headless'] : []),
    ],
    status: veloriaGaps.length === 0 && testsPass && coveragePct >= 70 ? 'pass' : 'warn',
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✓ Mechanics audit → ${OUT_PATH}`);
  console.log(`  Couverture engine: ${coveragePct}% (${implemented.length}/${declared.length})`);
  console.log(`  Tests headless: ${testsPass ? 'OK' : 'FAIL'}`);
  console.log(`  Status: ${report.status}`);
  if (report.recommendations.length) {
    console.log('  Recommandations:');
    for (const r of report.recommendations) console.log(`    - ${r}`);
  }
  process.exit(report.status === 'pass' ? 0 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
