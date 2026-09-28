#!/usr/bin/env node
/** Build reproductible du runtime spécialisé Echoes. */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateEchoesFaithfulHd } from './lib/seed-echoes/faithful-hd.mjs';
import { buildEchoesGdl, ECHOES_RUNTIME_MODE } from './lib/echoes/gdl-assembler.mjs';
import { buildEchoesPreviewFiles } from './lib/echoes/preview.mjs';
import { buildEngineBrowserBundle } from './lib/engine-preview/build-browser-bundle.mjs';

const ROOT = process.cwd();
const SLUG = 'echoes-of-the-mushroom-realm';
const WS = join(ROOT, 'workspaces', SLUG);
const PREVIEW_URL = `/workspaces/${SLUG}/07_exports/web/preview.html`;
const GDL_URL = `/workspaces/${SLUG}/05_runtime/gdl/echoes.preview.gdl.json`;

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ECHOES — RUNTIME SPÉCIALISÉ HD');
  console.log('  Menu canonique · platformer · boss · armes · tactile');
  console.log('═══════════════════════════════════════════════════════');
  const startedAt = Date.now();

  const faithful = await generateEchoesFaithfulHd();
  console.log(`  · ${faithful.sprites.length} sprites et playfield fidèle reconstruits`);

  const gdl = buildEchoesGdl();
  const gdlDir = join(WS, '05_runtime', 'gdl');
  await mkdir(gdlDir, { recursive: true });
  await writeFile(join(gdlDir, 'echoes.preview.gdl.json'), `${JSON.stringify(gdl, null, 2)}\n`, 'utf8');
  console.log('  · GDL spécialisé synchronisé');

  const webDir = join(WS, '07_exports', 'web');
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });
  const preview = buildEchoesPreviewFiles();
  await Promise.all([
    writeFile(join(webDir, 'preview.html'), preview.html, 'utf8'),
    writeFile(join(webDir, 'index.html'), preview.html, 'utf8'),
    writeFile(join(webDir, 'preview.css'), preview.css, 'utf8'),
    writeFile(join(webDir, 'preview.js'), preview.js, 'utf8'),
  ]);
  await buildEngineBrowserBundle(webDir);
  const generatedAt = new Date().toISOString();
  await writeFile(join(webDir, 'preview-manifest.json'), `${JSON.stringify({
    generated_at: generatedAt,
    title: 'Echoes of the Mushroom Realm',
    slug: SLUG,
    flagship: true,
    mode: ECHOES_RUNTIME_MODE,
    preview_url: PREVIEW_URL,
    gdl: '../../05_runtime/gdl/echoes.preview.gdl.json',
    resolution: [1280, 720],
    orientation: 'landscape',
    legacy_forge_shipping: false,
  }, null, 2)}\n`, 'utf8');
  console.log('  · export web atomique et bundle Pixi reconstruits');

  const workspacePath = join(WS, 'workspace.json');
  const workspace = JSON.parse(await readFile(workspacePath, 'utf8'));
  workspace.title = 'Echoes of the Mushroom Realm';
  workspace.status = 'playable_hd';
  workspace.dimension = '2.5d';
  workspace.genre = 'action_platformer';
  workspace.runtime = ECHOES_RUNTIME_MODE;
  workspace.camera_mode = 'side_scroll_cinematic';
  workspace.preview_url = PREVIEW_URL;
  workspace.gdl_url = GDL_URL;
  workspace.updated_at = generatedAt;
  delete workspace.forge;
  delete workspace.experience;
  delete workspace.legacy_preview_url;
  await writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`, 'utf8');

  const required = [
    join(webDir, 'preview.html'),
    join(webDir, 'preview.css'),
    join(webDir, 'preview.js'),
    join(webDir, 'engine', 'ellipse-engine.js'),
    join(gdlDir, 'echoes.preview.gdl.json'),
    join(WS, '03_assets', 'faithful', 'menu_keyart.jpeg'),
    join(WS, '03_assets', 'faithful', 'playfield.png'),
    join(WS, '03_assets', 'faithful', 'hero.png'),
    join(WS, '03_assets', 'faithful', 'boss_root_guardian.png'),
  ];
  const checks = required.map((path) => ({ id: path.slice(WS.length + 1).replaceAll('\\', '/'), status: existsSync(path) ? 'pass' : 'fail' }));
  checks.push(
    { id: 'runtime_specialized', status: gdl.meta.runtime === ECHOES_RUNTIME_MODE ? 'pass' : 'fail' },
    { id: 'fixed_step_simulation', status: gdl.systems.includes('fixed_step_simulation') ? 'pass' : 'fail' },
    { id: 'boss_three_phases', status: gdl.meta.echoes.boss_phases.length === 3 ? 'pass' : 'fail' },
    { id: 'legacy_forge_absent_from_export', status: !existsSync(join(webDir, 'main.js')) ? 'pass' : 'fail' },
  );
  const passed = checks.filter((check) => check.status === 'pass').length;
  const verification = {
    generated_at: generatedAt,
    status: passed === checks.length ? 'pass' : 'fail',
    summary: { passed, total: checks.length },
    checks,
  };
  const opsDir = join(WS, '08_ops', 'manifests');
  await mkdir(opsDir, { recursive: true });
  await Promise.all([
    writeFile(join(opsDir, 'priority-hd-verification.json'), `${JSON.stringify(verification, null, 2)}\n`, 'utf8'),
    writeFile(join(opsDir, 'faithful-hd-build.json'), `${JSON.stringify({
      ...faithful,
      generated_at: generatedAt,
      runtime: { mode: ECHOES_RUNTIME_MODE, preview_url: PREVIEW_URL, gdl_url: GDL_URL },
      verification: verification.summary,
    }, null, 2)}\n`, 'utf8'),
    writeFile(join(opsDir, 'flagship-deliverable.json'), `${JSON.stringify({
      generated_at: generatedAt,
      game: { slug: SLUG, title: 'Echoes of the Mushroom Realm', genre: 'action_platformer', dimension: '2.5d' },
      deliverable: {
        status: 'playable_hd',
        commercial_ready: false,
        checks: `${passed}/${checks.length}`,
        preview_url: PREVIEW_URL,
        gdl_url: GDL_URL,
        runtime: ECHOES_RUNTIME_MODE,
        remaining_release_gates: [
          'golden screenshots composed in a real browser',
          'side-by-side art-direction approval',
          'touch, gamepad and performance validation on target devices',
          'final music and sound design mix',
        ],
      },
    }, null, 2)}\n`, 'utf8'),
  ]);

  if (verification.status !== 'pass') throw new Error(`Gate Echoes refusé (${passed}/${checks.length})`);
  console.log(`  · gate statique ${passed}/${checks.length}`);
  console.log(`  Terminé en ${((Date.now() - startedAt) / 1000).toFixed(1)} s — ${PREVIEW_URL}`);
}

main().catch((error) => {
  console.error('ÉCHEC build Echoes HD:', error);
  process.exitCode = 1;
});
