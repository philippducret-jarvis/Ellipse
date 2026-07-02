/**
 * Pipeline Veloria complet : prep → assets HD → jeu → roadmap.
 */
import { execSync } from 'node:child_process';
import { buildVeloriaPrepPack } from './lib/veloria/index.mjs';

async function main() {
  console.log('═══ Veloria — pipeline complet ═══\n');

  console.log('▶ Étape 1/4 — Prep (planches, specs, crops)');
  await buildVeloriaPrepPack();

  console.log('\n▶ Étape 2/4 — Assets HD (pipeline 03-06)');
  execSync('node ./tools/generate-veloria-assets.mjs', { stdio: 'inherit', cwd: process.cwd() });

  console.log('\n▶ Étape 3/4 — Assemblage jeu (GDL + preview)');
  execSync('node ./tools/build-veloria-game.mjs', { stdio: 'inherit', cwd: process.cwd() });

  console.log('\n▶ Étape 4/4 — Roadmap status');
  const { buildRoadmapArtifacts } = await import('./lib/veloria/roadmap.mjs');
  const r = await buildRoadmapArtifacts(29);
  console.log(`\n═══ Terminé — ${r.completion_pct}% roadmap ═══`);
  console.log('Preview : http://localhost:3000/workspaces/veloria-veille-des-lames/07_exports/web/preview.html');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
