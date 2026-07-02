#!/usr/bin/env node
/**
 * Echoes — build scène INTÉGRÉE + moteur 2.5D (@ellipse/engine).
 *   pnpm echoes:hd
 */
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateEchoesIntegratedScene } from './lib/seed-echoes/integrated-scene.mjs';
import { buildScenePack } from './lib/level-01/scene-pack.mjs';
import { buildEngineBrowserBundle } from './lib/engine-preview/build-browser-bundle.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm');

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ECHOES — Scène INTÉGRÉE + moteur 2.5D');
  console.log('  Parallax2D · YSort · GDL depth · @ellipse/engine');
  console.log('═══════════════════════════════════════════════════════\n');

  const t0 = Date.now();
  const manifest = await generateEchoesIntegratedScene();

  console.log('  · sync GDL depth (scene-pack)');
  await buildScenePack();

  const webDir = join(WS, '07_exports', 'web');
  await mkdir(webDir, { recursive: true });
  await copyFile(
    join(WS, '03_assets', 'integrated', 'integrated-manifest.json'),
    join(webDir, 'integrated-manifest.json'),
  );
  await copyFile(join(webDir, 'integrated-manifest.json'), join(webDir, 'faithful-manifest.json'));

  console.log('  · bundle @ellipse/engine navigateur');
  await buildEngineBrowserBundle(webDir);

  const runtimeSrc = join(ROOT, 'tools', 'lib', 'seed-echoes', 'static', 'preview', 'engine-preview.js');
  const legacySrc = join(ROOT, 'tools', 'lib', 'seed-echoes', 'static', 'preview', 'integrated-runtime.js');
  await copyFile(runtimeSrc, join(webDir, 'preview.js'));
  await copyFile(legacySrc, join(webDir, 'integrated-runtime.js'));
  await copyFile(
    join(ROOT, 'tools', 'lib', 'hd-faithful', 'depth-runtime.mjs'),
    join(webDir, 'depth-runtime.mjs'),
  );

  const opsDir = join(WS, '08_ops', 'manifests');
  await mkdir(opsDir, { recursive: true });
  manifest.runtime = {
    web: '/workspaces/echoes-of-the-mushroom-realm/07_exports/web/preview.html',
    mode: 'ellipse_engine_25d',
    renderer: 'engine-preview.js',
    depth_engine: '@ellipse/engine',
  };
  await writeFile(join(opsDir, 'integrated-scene-build.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n  Terminé (${dt}s) — ${manifest.actors.length} acteurs · playfield ${manifest.level.width}px`);
  console.log('  Renderer : @ellipse/engine (Parallax2D + YSort)');
  console.log('  Legacy   : integrated-runtime.js?legacy=1');
  console.log('  Jouer    : 07_exports/web/preview.html\n');
}

main().catch((err) => {
  console.error('ÉCHEC build scène intégrée Echoes:', err);
  process.exit(1);
});
