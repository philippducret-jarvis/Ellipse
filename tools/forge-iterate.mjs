/**
 * Dialogue avec un jeu forgé :
 *   pnpm forge:iterate -- <game-id> "rends le héros plus rapide"
 * Patch GDL + re-validation auto-play de toute la campagne.
 */
import { join } from 'node:path';
import { iterateGame } from './lib/forge/iterate.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [id, ...rest] = args;
const instruction = rest.join(' ').trim();

if (!id || !instruction) {
  console.error('Usage : pnpm forge:iterate -- <game-id> "ta demande de modification"');
  process.exit(1);
}

const r = await iterateGame(join(process.cwd(), 'workspaces', id), instruction);
if (r.ok) {
  console.log(`✔ ${r.summary}`);
  console.log(`  Re-validé : bot vainqueur sur toute la campagne (${r.autoplay.kills} kills, ${r.autoplay.deaths} morts).`);
} else {
  console.error(`✗ ${r.error}`);
  process.exit(1);
}
