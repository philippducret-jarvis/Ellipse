import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildAgentPlaybookMarkdown, buildAgentWorkOrders } from './lib/veloria/agent-playbook.mjs';
import { buildVeloriaPreviewFiles } from './lib/veloria/preview.mjs';
import { exportGachaRuntimeAssets } from './lib/veloria/export-gacha-runtime.mjs';
import { PROJECT_SLUG, WORKSPACE_ROOT } from './lib/veloria/constants.mjs';
import { writeJson } from './lib/veloria/io.mjs';

async function main() {
  console.log('— Assemblage jeu Veloria (GDL + runtime GACHA HD + preview) —\n');

  console.log('▶ Export assets runtime GACHA (combat_sprite, arena_bg, UI)…');
  const gachaManifest = await exportGachaRuntimeAssets();
  console.log(`  ✓ ${Object.keys(gachaManifest.combat_sprites).length} sprites combat`);
  console.log(`  ✓ ${Object.keys(gachaManifest.arena_backgrounds).length} arènes HD\n`);

  const gdl = await buildVeloriaGdl();
  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2), 'utf8');
  console.log('✓ GDL jouable écrit :', gdlPath);

  const exportsDir = join(WORKSPACE_ROOT, '07_exports', 'web');
  await mkdir(exportsDir, { recursive: true });
  const preview = await buildVeloriaPreviewFiles();
  await writeFile(join(exportsDir, 'preview.html'), preview.html, 'utf8');
  await writeFile(join(exportsDir, 'preview.css'), preview.css, 'utf8');
  await writeFile(join(exportsDir, 'preview.js'), preview.js, 'utf8');
  await writeFile(join(exportsDir, 'gacha-renderer.js'), preview.rendererJs, 'utf8');
  await writeFile(join(exportsDir, 'veloria-systems.js'), preview.systemsJs, 'utf8');
  await writeJson(join(exportsDir, 'preview-manifest.json'), {
    title: gdl.meta.title,
    gdl: '../../05_runtime/gdl/veloria.preview.gdl.json',
    orientation: 'portrait',
    resolution: gdl.meta.resolution,
    mode: 'gacha_hd',
    generated_at: new Date().toISOString(),
  });
  console.log('✓ Preview web :', join(exportsDir, 'preview.html'));

  const opsDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  await mkdir(opsDir, { recursive: true });
  await writeFile(join(opsDir, 'agent-playbook.md'), buildAgentPlaybookMarkdown(), 'utf8');
  await writeJson(join(opsDir, 'agent-work-orders.json'), buildAgentWorkOrders());
  console.log('✓ Playbook agents : 08_ops/manifests/agent-playbook.md');

  const wsJson = JSON.parse(await readFile(join(WORKSPACE_ROOT, 'workspace.json'), 'utf8'));
  wsJson.status = 'playable_slice';
  wsJson.updated_at = new Date().toISOString();
  wsJson.preview_url = `/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`;
  wsJson.gdl_url = `/workspaces/${PROJECT_SLUG}/05_runtime/gdl/veloria.preview.gdl.json`;
  await writeFile(join(WORKSPACE_ROOT, 'workspace.json'), JSON.stringify(wsJson, null, 2), 'utf8');

  console.log('\n— Veloria prêt —');
  console.log('  Lancez : pnpm dev:stack');
  console.log(`  Preview : http://localhost:3000/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`);
}

main().catch((err) => {
  console.error('ECHEC build Veloria:', err);
  process.exit(1);
});
