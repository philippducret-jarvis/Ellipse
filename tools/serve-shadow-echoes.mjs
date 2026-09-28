import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../workspaces/shadow-echoes');
const prefix = '/workspaces/shadow-echoes/';
const port = Number(process.env.SHADOW_ECHOES_PORT ?? 4314);
const types = {'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if(path === '/') {res.writeHead(302, {location: `${prefix}07_exports/web/citadel.html`}); res.end(); return;}
    if(!path.startsWith(prefix)) {res.writeHead(404); res.end(); return;}
    const file = resolve(root, path.slice(prefix.length));
    if(!file.startsWith(root + sep)) {res.writeHead(403); res.end(); return;}
    const info = await stat(file);
    if(!info.isFile()) {res.writeHead(404); res.end(); return;}
    res.writeHead(200, {'content-type': types[extname(file)] ?? 'application/octet-stream', 'content-length': info.size, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff'});
    createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch {res.writeHead(404); res.end('Fichier introuvable');}
}).listen(port, '127.0.0.1', () => console.log(`Shadow Echoes — atelier des mythiques : http://127.0.0.1:${port}/`));
