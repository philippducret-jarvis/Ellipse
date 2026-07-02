#!/usr/bin/env node
/**
 * Veloria — Build HD + moteur Pixi VeloriaEngine (top tier 2.5D).
 *   pnpm veloria:hd
 */
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateFaithfulHdAssets } from './lib/veloria/faithful-hd.mjs';
import { generateVeloriaIntegratedScene } from './lib/veloria/integrated-scene.mjs';
import { buildFaithfulHdPlaybook } from './lib/veloria/faithful-playbook.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildEngineBrowserBundle } from './lib/engine-preview/build-browser-bundle.mjs';
import { WORKSPACE_ROOT, PROJECT_TITLE } from './lib/veloria/constants.mjs';

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VELORIA — HD + VeloriaEngine Pixi (GACHA complet)');
  console.log('═══════════════════════════════════════════════════════\n');

  const t0 = Date.now();
  const manifest = await generateFaithfulHdAssets((s) => console.log('  ·', s));
  const integrated = await generateVeloriaIntegratedScene();
  console.log('  · scène intégrée combat');
  console.log('  · sync GDL depth 2.5D');
  await buildVeloriaGdl();

  const webDir = join(WORKSPACE_ROOT, '07_exports', 'web');
  await mkdir(webDir, { recursive: true });
  console.log('  · bundle @ellipse/engine');
  await buildEngineBrowserBundle(webDir);

  const staticDir = join(process.cwd(), 'tools', 'lib', 'veloria', 'static');
  await copyFile(join(staticDir, 'veloria-engine-preview.js'), join(webDir, 'preview.js'));
  await copyFile(join(staticDir, 'gacha-preview.js'), join(webDir, 'gacha-preview.js'));
  await copyFile(join(staticDir, 'gacha-renderer.js'), join(webDir, 'gacha-renderer.js'));
  await copyFile(join(staticDir, 'veloria-systems.js'), join(webDir, 'veloria-systems.js'));

  const playbookDir = join(WORKSPACE_ROOT, '02_design', 'specs');
  await mkdir(playbookDir, { recursive: true });
  await writeFile(join(playbookDir, 'agent-faithful-hd-playbook.md'), buildFaithfulHdPlaybook(), 'utf-8');

  const opsDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(opsDir, { recursive: true });
  manifest.integrated_scene = integrated.scene;
  manifest.runtime = {
    web: '/workspaces/veloria-veille-des-lames/07_exports/web/preview.html',
    mode: 'veloria_engine_pixi',
    renderer: 'veloria-engine-preview.js',
    depth_engine: '@ellipse/engine',
    legacy_canvas: 'gacha-preview.js',
  };
  await writeFile(join(opsDir, 'faithful-hd-build.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n  Terminé (${dt}s) — VeloriaEngine Pixi + legacy gacha-preview.js`);
  console.log('  Jouer : 07_exports/web/preview.html');
  console.log('  Combat direct : ?start=combat\n');
}

main().catch((err) => {
  console.error('ÉCHEC build Veloria HD:', err);
  process.exit(1);
});
