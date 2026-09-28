/**
 * Ellipse Studio — lanceur desktop Windows.
 * Démarre l'orchestrator puis ouvre le Studio dans une fenêtre Electron.
 */
import { app, BrowserWindow, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const ORCH_PORT = Number(process.env.ORCHESTRATOR_PORT ?? 4400);
const STUDIO_PORT = Number(process.env.STUDIO_PORT ?? 5173);
const ORCH_URL = `http://127.0.0.1:${ORCH_PORT}`;
const STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}`;

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function spawnService(label, cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    shell: process.platform === 'win32',
    env: { ...process.env, ORCHESTRATOR_PORT: String(ORCH_PORT) },
    stdio: 'pipe',
  });
  child.stdout?.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  children.push(child);
  return child;
}

function waitForUrl(url, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(true);
        else retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) reject(new Error(`Timeout: ${url}`));
      else setTimeout(tick, 1500);
    };
    tick();
  });
}

async function startBackendStack() {
  const pnpm = join(REPO_ROOT, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
  const node = process.execPath;

  if (!existsSync(pnpm)) {
    throw new Error('pnpm introuvable — exécutez pnpm install à la racine du monorepo');
  }

  spawnService('orchestrator', node, [pnpm, '--filter', '@ellipse/orchestrator', 'dev'], REPO_ROOT);
  await waitForUrl(`${ORCH_URL}/health`).catch(() => waitForUrl(ORCH_URL));

  spawnService('studio', node, [pnpm, '--filter', '@ellipse/studio', 'dev', '--', '--port', String(STUDIO_PORT)], REPO_ROOT);
  await waitForUrl(STUDIO_URL);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Ellipse Studio',
    icon: join(__dirname, 'assets', 'ellipse-app.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(STUDIO_URL);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    await startBackendStack();
    createWindow();
  } catch (err) {
    console.error('[ellipse-desktop]', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  for (const c of children) c.kill('SIGTERM');
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const c of children) c.kill('SIGTERM');
});
