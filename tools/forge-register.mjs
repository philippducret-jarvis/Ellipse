/**
 * Ré-enregistre des jeux DÉJÀ forgés dans le Studio (sans re-générer) :
 *   pnpm forge:register -- <game-id>            # un workspace
 *   pnpm forge:register -- --all                # tous ceux qui ont un forge-build.json
 *   pnpm forge:register -- --all --runtime      # + rafraîchit les fichiers runtime
 */
import { existsSync } from 'node:fs';
import { copyFile, readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerForgedGame } from './lib/forge/workspace.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces');
const RUNTIME_SRC = join(dirname(fileURLToPath(import.meta.url)), 'lib', 'forge', 'runtime');
const RUNTIME_FILES = ['index.html', 'main.js', 'logic.js', 'render.js', 'skeleton.js', 'campaign.js', 'audio.js'];
const args = process.argv.slice(2).filter((a) => a !== '--');
const refreshRuntime = args.includes('--runtime');

async function registerOne(id) {
  const wsDir = join(WS, id);
  const gdlPath = join(wsDir, '05_runtime', 'game.gdl.json');
  const reportPath = join(wsDir, 'forge-build.json');
  if (!existsSync(gdlPath)) throw new Error(`${id}: pas de 05_runtime/game.gdl.json (jeu non forgé)`);
  if (refreshRuntime) {
    for (const f of RUNTIME_FILES) await copyFile(join(RUNTIME_SRC, f), join(wsDir, '05_runtime', f));
  }
  const gdl = JSON.parse(await readFile(gdlPath, 'utf8'));
  const report = existsSync(reportPath) ? JSON.parse(await readFile(reportPath, 'utf8')) : null;
  const reg = await registerForgedGame(wsDir, id, { gdl, prompt: report?.prompt ?? null, report });
  console.log(`✔ ${id} — workspace ${reg.created ? 'enregistré' : 'renforcé'}${refreshRuntime ? ' (runtime rafraîchi)' : ''} → ${reg.previewUrl}`);
}

const ids = args.includes('--all')
  ? (await readdir(WS, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && existsSync(join(WS, e.name, 'forge-build.json')))
      .map((e) => e.name)
  : args.filter((a) => !a.startsWith('--'));

if (!ids.length) {
  console.error('Usage : pnpm forge:register -- <game-id> | --all');
  process.exit(1);
}
for (const id of ids) await registerOne(id);
