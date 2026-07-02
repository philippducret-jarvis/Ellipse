import { copyFile, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildVeloriaPrepPack } from './lib/veloria/index.mjs';
import { ENEMIES, BOSSES, ALL_ASSETS, ENVIRONMENTS } from './lib/veloria/data.mjs';
import { produceRefinedHeroPack } from './lib/veloria/hero-refinement.mjs';
import { produceAllRefinedCombatants } from './lib/veloria/enemy-refinement.mjs';
import { produceHdPack } from './lib/veloria/hd-factory.mjs';
import { HEROES } from './lib/veloria/data.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildVeloriaPreviewFiles } from './lib/veloria/preview.mjs';
import { buildRoadmapArtifacts } from './lib/veloria/roadmap.mjs';
import { writeJson } from './lib/veloria/io.mjs';
import { WORKSPACE_ROOT, PROJECT_SLUG } from './lib/veloria/constants.mjs';
import { ALL_LEVELS } from './lib/veloria/levels.mjs';
import { HAZARD_SCRIPTS } from './lib/veloria/hazards/index.mjs';

async function wireRegistry(results) {
  const regPath = join(WORKSPACE_ROOT, '03_assets', 'registry', 'generated-assets-hd.json');
  let reg = { assets: [] };
  try {
    reg = JSON.parse(await readFile(regPath, 'utf8'));
  } catch {
    /* */
  }
  for (const r of results) {
    const idx = reg.assets.findIndex((a) => a.id === r.asset.key);
    const entry = {
      id: r.asset.key,
      asset_id: r.asset.id,
      family: r.asset.role,
      pack_root: r.asset.pack_root,
      atlas: r.atlasUrl ?? r.manifest?.atlas?.url,
      frame_count: r.frameCount,
      source: r.manifest?.method ?? 'sprint_cde',
    };
    if (idx >= 0) reg.assets[idx] = { ...reg.assets[idx], ...entry };
    else reg.assets.push(entry);
  }
  reg.generated_at = new Date().toISOString();
  reg.sprints = { c: true, d: true, e: true };
  await writeJson(regPath, reg);
}

async function main() {
  console.log('═══ Veloria Sprints C + D + E ═══\n');

  console.log('▶ Prep (planches, 6 niveaux, specs)');
  await buildVeloriaPrepPack();

  console.log('\n▶ Sprint C — Ennemis + boss Bourreau (hybrid planche)');
  const combatants = [...ENEMIES, ...BOSSES];
  const combatResults = await produceAllRefinedCombatants(combatants);
  for (const r of combatResults) {
    console.log(`  ✓ ${r.asset.title} — ${r.frameCount} frames (${r.manifest.method})`);
  }

  console.log('\n▶ Héroïnes Sprint B (refresh)');
  const heroResults = [];
  for (const hero of HEROES) {
    heroResults.push(await produceRefinedHeroPack(hero));
  }

  console.log('\n▶ Sprint D — Environnements HD tileables (6 arènes)');
  const envResults = [];
  for (const env of ENVIRONMENTS.filter((e) => e.key !== 'pavillon_veilles')) {
    const asset = ALL_ASSETS.find((a) => a.key === env.key) ?? env;
    if (asset.pack_root) {
      envResults.push(await produceHdPack({ ...asset, role: 'environment' }));
      console.log(`  ✓ ${env.title}`);
    }
  }

  const otherAssets = ALL_ASSETS.filter(
    (a) => a.pack_root && !['hero', 'enemy', 'boss', 'environment'].includes(a.role),
  );
  for (const asset of otherAssets) {
    await produceHdPack(asset);
  }

  await wireRegistry([...combatResults, ...heroResults, ...envResults]);

  console.log('\n▶ Sprint E — GDL + preview runtime (lane/waves/blessings)');
  const gdl = await buildVeloriaGdl();
  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2));

  const exportsDir = join(WORKSPACE_ROOT, '07_exports', 'web');
  await mkdir(exportsDir, { recursive: true });
  const preview = await buildVeloriaPreviewFiles();
  await writeFile(join(exportsDir, 'preview.html'), preview.html, 'utf8');
  await writeFile(join(exportsDir, 'preview.css'), preview.css, 'utf8');
  await writeFile(join(exportsDir, 'preview.js'), preview.js, 'utf8');
  await writeFile(join(exportsDir, 'veloria-systems.js'), preview.systemsJs, 'utf8');
  await writeJson(join(exportsDir, 'preview-manifest.json'), {
    title: gdl.meta.title,
    gdl: '../../05_runtime/gdl/veloria.preview.gdl.json',
    orientation: 'portrait',
    resolution: gdl.meta.resolution,
    scenes: gdl.scenes.length,
    systems: gdl.systems,
    generated_at: new Date().toISOString(),
  });

  await writeJson(join(WORKSPACE_ROOT, '02_design', 'specs', 'arena-hazard-scripts.json'), {
    generated_at: new Date().toISOString(),
    scripts: HAZARD_SCRIPTS,
    levels: ALL_LEVELS.map((l) => ({ key: l.key, hazard: l.layout.hazard.id, title: l.title })),
  });

  await writeJson(join(WORKSPACE_ROOT, '08_ops', 'manifests', 'sprint-cde-report.json'), {
    sprint_c: { combatants: combatResults.length, method: 'board_hybrid_sprint_c' },
    sprint_d: { arenas: ALL_LEVELS.length, environments: envResults.length, hazard_scripts: Object.keys(HAZARD_SCRIPTS).length },
    sprint_e: { systems: gdl.systems, scenes: gdl.scenes.length },
    generated_at: new Date().toISOString(),
  });

  const roadmap = await buildRoadmapArtifacts(29, { sprintBComplete: true, sprintsCDEComplete: true });

  console.log('\n═══ Sprints C+D+E terminés ═══');
  console.log(`  Scènes GDL    : ${gdl.scenes.length}`);
  console.log(`  Systèmes      : ${gdl.systems.join(', ')}`);
  console.log(`  Roadmap       : ${roadmap.completion_pct}%`);
  console.log(`\nPreview : http://localhost:3000/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`);
}

main().catch((e) => {
  console.error('ECHEC:', e);
  process.exit(1);
});
