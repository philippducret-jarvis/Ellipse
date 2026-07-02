#!/usr/bin/env node
/** Enregistre Veloria dans game_factory DB si orchestrator/db disponible. */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();

function runScript(name) {
  return new Promise((resolve, reject) => {
    const path = join(ROOT, 'tools', name);
    const child = spawn(process.execPath, [path], { cwd: ROOT, stdio: 'inherit' });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} failed`))));
  });
}

async function main() {
  console.log('Seed Veloria workspace + catalog…');
  await runScript('create-veloria.mjs');
  console.log('Veloria prêt — ouvrir Studio avec slug veloria-veille-des-lames');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
