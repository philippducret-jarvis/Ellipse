import { app, BrowserWindow, shell } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(APP_DIR, 'game');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
};

let server;

function startGameServer() {
  return new Promise((resolveServer, reject) => {
    server = http.createServer(async (request, response) => {
      const rawPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const relativePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
      const target = resolve(GAME_DIR, relativePath);
      if (target !== GAME_DIR && !target.startsWith(GAME_DIR + sep)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      try {
        const info = await stat(target);
        if (!info.isFile()) throw new Error('Not a file');
        response.writeHead(200, {
          'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
          'cache-control': 'no-cache',
        });
        createReadStream(target).pipe(response);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveServer(server.address().port));
  });
}

function createGameWindow(port) {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: "Orbes d'Astra",
    icon: join(GAME_DIR, 'assets', 'app-icon-512.png'),
    backgroundColor: '#050410',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(async () => {
  const port = await startGameServer();
  createGameWindow(port);
});

app.on('window-all-closed', () => {
  server?.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => server?.close());
