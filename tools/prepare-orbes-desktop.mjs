#!/usr/bin/env node
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const source = join(root, 'workspaces', 'orbes-d-astra', '07_exports', 'web');
const target = join(root, 'apps', 'orbes-astra-desktop', 'game');

if (!target.startsWith(join(root, 'apps', 'orbes-astra-desktop'))) {
  throw new Error('Cible desktop hors du dossier autorisé');
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Export autonome préparé : ${target}`);
