import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.ECHOES_PREVIEW_PORT ?? 4173);
const workspaceRoot = resolve(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.md': 'text/markdown; charset=utf-8',
};

function resolveRequestPath(urlPath) {
  if (urlPath === '/' || urlPath === '') {
    return join(workspaceRoot, '07_exports', 'web', 'preview.html');
  }

  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  return join(workspaceRoot, safePath);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${port}`}`);
  const filePath = resolveRequestPath(requestUrl.pathname);

  if (!filePath.startsWith(workspaceRoot) || !existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    res.writeHead(302, { location: '/07_exports/web/preview.html' });
    res.end();
    return;
  }

  res.writeHead(200, {
    'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });

  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(
    JSON.stringify(
      {
        status: 'listening',
        port,
        workspaceRoot,
        previewUrl: `http://localhost:${port}/07_exports/web/preview.html`,
      },
      null,
      2,
    ),
  );
});
