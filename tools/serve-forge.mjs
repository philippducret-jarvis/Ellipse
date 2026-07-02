/** Sert un jeu forgé : pnpm forge:serve -- <game-id> (défaut : le plus récent). */
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css; charset=utf-8',
};
const port = Number(process.env.FORGE_PORT ?? 4300);
const wsRoot = resolve(process.cwd(), 'workspaces');

async function pickGame() {
  const arg = process.env.FORGE_SERVE_GAME || process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (arg) return arg;
  const dirs = [];
  for (const d of await readdir(wsRoot)) {
    try {
      const s = await stat(join(wsRoot, d, '05_runtime', 'game.gdl.json'));
      dirs.push({ d, t: s.mtimeMs });
    } catch {}
  }
  if (!dirs.length) throw new Error('Aucun jeu forgé (aucun workspaces/*/05_runtime/game.gdl.json).');
  return dirs.sort((a, b) => b.t - a.t)[0].d;
}

const game = await pickGame();
const root = join(wsRoot, game, '05_runtime');

http.createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', `http://localhost:${port}`).pathname;
  const file = urlPath === '/' ? join(root, 'index.html') : join(root, normalize(urlPath).replace(/^([/\\]|\.\.[/\\])+/, ''));
  try {
    await stat(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(port, () => console.log(`▶ ${game} : http://localhost:${port}/`));
