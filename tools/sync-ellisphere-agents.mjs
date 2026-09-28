#!/usr/bin/env node
/** Synchronise les cellules d'agents spécialisées qu'Ellisphere peut auditer. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const CELLS = [
  {
    id: 'orbes-d-astra',
    title: "Orbes d'Astra",
    runtime: 'merge_drop_engine',
    rebuild: 'pnpm orbes:build',
    verify: ['pnpm --filter @ellipse/engine test -- src/sim/merge-drop.test.ts', 'pnpm forge:brain-smoke'],
    criticalFiles: [
      'examples/orbes-astra/game.js',
      'examples/orbes-astra/styles.css',
      'packages/engine/src/merge-drop/merge-drop-engine.ts',
      'packages/engine/src/sim/merge-drop.ts',
      'tools/build-orbes-astra.mjs',
    ],
    visualTarget: 'portrait mobile premium, bulles de Gardiens, observatoire céleste et invocation cinématique',
  },
  {
    id: 'veloria-veille-des-lames',
    title: 'Veloria — Veille des Lames',
    runtime: 'veloria_engine',
    rebuild: 'pnpm veloria:hd',
    verify: ['pnpm --filter @ellipse/engine test -- src/sim/veloria-survival.test.ts', 'pnpm veloria:verify-hd'],
    criticalFiles: [
      'packages/engine/src/veloria/veloria-engine.ts',
      'packages/engine/src/veloria/veloria-hud.ts',
      'packages/engine/src/veloria/veloria-screens.ts',
      'packages/engine/src/sim/veloria-survival.ts',
      'tools/build-veloria-hd.mjs',
    ],
    visualTarget: 'survivors fantasy vertical, trois voies, cadre gothique doré, héroïne et attaques lisibles',
  },
  {
    id: 'echoes-of-the-mushroom-realm',
    title: 'Echoes of the Mushroom Realm',
    runtime: 'echoes_platformer_engine',
    rebuild: 'pnpm echoes:hd',
    verify: ['pnpm --filter @ellipse/engine test -- src/sim/echoes-platformer.test.ts', 'pnpm echoes:validate'],
    criticalFiles: [
      'packages/engine/src/echoes/echoes-engine.ts',
      'packages/engine/src/sim/echoes-platformer.ts',
      'tools/lib/echoes/gdl-assembler.mjs',
      'tools/lib/echoes/preview.mjs',
      'tools/build-echoes-hd.mjs',
    ],
    visualTarget: 'metroidvania fongique HD, silhouettes rouges, profondeur de parallaxe et spores lumineuses',
  },
];

const ROLES = [
  { id: 'producer', owns: ['scope', 'runtime_authority', 'release_gate'] },
  { id: 'art_direction', owns: ['canonical_boards', 'palette', 'composition', 'visual_acceptance'] },
  { id: 'animation', owns: ['state_machine', 'motion_readability', 'vfx_timing'] },
  { id: 'gameplay_programming', owns: ['simulation', 'input', 'runtime_integration'] },
  { id: 'ui', owns: ['hud', 'menus', 'touch_targets', 'accessibility'] },
  { id: 'qa', owns: ['tests', 'browser_matrix', 'asset_urls', 'honest_status'] },
  { id: 'build_release', owns: ['deterministic_build', 'manifest', 'single_runtime_export'] },
];

for (const cell of CELLS) {
  const missing = cell.criticalFiles.filter((file) => !existsSync(join(ROOT, file)));
  const manifest = {
    generated_at: new Date().toISOString(),
    contract_version: '1.0.0',
    authority: 'Ellisphere',
    workspace: cell.id,
    title: cell.title,
    runtime: cell.runtime,
    protected_from_generic_forge: true,
    status: missing.length ? 'blocked' : 'operational',
    visual_target: cell.visualTarget,
    cell: ROLES,
    handoffs: [
      { from: 'art_direction', to: 'animation', requires: ['approved silhouette', 'motion-safe layers'] },
      { from: 'animation', to: 'gameplay_programming', requires: ['state ids', 'pivots', 'timings'] },
      { from: 'gameplay_programming', to: 'ui', requires: ['observable state', 'input contract'] },
      { from: 'ui', to: 'qa', requires: ['screen matrix', 'touch map', 'reduced-motion path'] },
      { from: 'qa', to: 'build_release', requires: ['passing tests', 'zero missing URL', 'remaining gates'] },
    ],
    commands: { rebuild: cell.rebuild, verify: cell.verify },
    critical_files: cell.criticalFiles,
    missing_critical_files: missing,
    release_policy: {
      playable_hd_requires: ['specialized runtime', 'deterministic simulation', 'browser smoke', 'asset provenance'],
      commercial_ready_requires: ['golden screenshot approval', 'target-device performance', 'human playtest', 'audio and store compliance'],
      automated_agents_may_not_self_certify_commercial_ready: true,
    },
  };
  const dir = join(ROOT, 'workspaces', cell.id, '08_ops', 'manifests');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'ellisphere-team.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`${cell.title}: ${manifest.status}${missing.length ? ` (${missing.length} fichier(s) manquant(s))` : ''}`);
}
