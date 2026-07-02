#!/usr/bin/env node
/**
 * Build @ellipse/engine bundle navigateur → workspace 07_exports/web/engine/
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

export async function buildEngineBrowserBundle(targetWebDir) {
  execSync('pnpm --filter @ellipse/shared build', { cwd: ROOT, stdio: 'inherit' });
  execSync('pnpm --filter @ellipse/engine build', { cwd: ROOT, stdio: 'inherit' });
  execSync('pnpm --filter @ellipse/engine build:browser', { cwd: ROOT, stdio: 'inherit' });

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
