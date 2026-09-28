#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
// 4312 : le 4310 est réservé à Ellisphere (forge:assistant), relayée par l'orchestrateur.
const port = Number(process.env.ORBES_PORT ?? 4312);
const flagship = '/workspaces/orbes-d-astra/07_exports/web/index.html';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
};

http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname);
  if (pathname === '/') {
    response.writeHead(302, { location: flagship });
    response.end();
    return;
  }
  const target = resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(root + sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'content-type': mime[extname(target)] ?? 'application/octet-stream' });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Orbes d'Astra: http://127.0.0.1:${port}${flagship}`);
});
