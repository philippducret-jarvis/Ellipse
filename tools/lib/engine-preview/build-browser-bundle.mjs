#!/usr/bin/env node
/**
 * Build @ellipse/engine bundle navigateur → workspace 07_exports/web/engine/
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

function runPnpm(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && /pnpm(?:\.c?js)?$/iu.test(npmExecPath)) {
    execFileSync(process.execPath, [npmExecPath, ...args], { cwd: ROOT, stdio: 'inherit' });
    return;
  }
  const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
  execFileSync(corepack, ['pnpm', ...args], { cwd: ROOT, stdio: 'inherit' });
}

export async function buildEngineBrowserBundle(targetWebDir) {
  runPnpm(['--filter', '@ellipse/shared', 'build']);
  runPnpm(['--filter', '@ellipse/engine', 'build']);

  const engineDir = join(targetWebDir, 'engine');
  await mkdir(engineDir, { recursive: true });
  const src = join(ROOT, 'packages', 'engine', 'dist-browser', 'ellipse-engine.js');
  await copyFile(src, join(engineDir, 'ellipse-engine.js'));
  return join(engineDir, 'ellipse-engine.js');
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const out = process.argv[2];
  if (!out) {
    console.error('Usage: node build-browser-bundle.mjs <targetWebDir>');
    process.exit(1);
  }
  buildEngineBrowserBundle(out).then((p) => console.log('Bundle:', p));
}
