/**
 * Sert un jeu forgé : pnpm forge:serve -- <game-id> (défaut : le plus récent).
 * POST /iterate {instruction} → dialogue avec la Forge (patch GDL + re-validation).
 */
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { iterateGame } from './lib/forge/iterate.mjs';

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
const wsDir = join(wsRoot, game);
const root = join(wsDir, '05_runtime');

http.createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', `http://localhost:${port}`).pathname;

  // dialogue avec la Forge : modification par prompt, re-validée à l'auto-play
  if (req.method === 'POST' && urlPath === '/iterate') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', async () => {
      try {
        const { instruction } = JSON.parse(body || '{}');
        const r = await iterateGame(wsDir, String(instruction ?? ''));
        res.writeHead(r.ok ? 200 : 422, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(r));
        console.log(`💬 « ${instruction} » → ${r.ok ? `✔ ${r.summary}` : `✗ ${r.error}`}`);
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  const file = urlPath === '/' ? join(root, 'index.html') : join(root, normalize(urlPath).replace(/^([/\\]|\.\.[/\\])+/, ''));
  try {
    await stat(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(port, () => console.log(`▶ ${game} : http://localhost:${port}/ (POST /iterate actif)`));
