#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from './lib/forge/sharp.mjs';

const [atlasA, atlasB, atlasC, atlasD, observatory, sanctuary, prologue, boss] = process.argv.slice(2).map((value) => resolve(value));
const inputs = { atlasA, atlasB, atlasC, atlasD, observatory, sanctuary, prologue, boss };
for (const [name, file] of Object.entries(inputs)) {
  if (!file || !existsSync(file)) throw new Error(`Entrée image absente : ${name} (${file ?? 'non fournie'})`);
}

const target = join(process.cwd(), 'examples', 'orbes-astra', 'assets');
await mkdir(target, { recursive: true });

const tiles = await Promise.all([atlasA, atlasB, atlasC, atlasD].map((file) => sharp(file)
  .resize(1024, 1024, { fit: 'fill' })
  .png()
  .toBuffer()));
await sharp({
  create: { width: 2048, height: 2048, channels: 4, background: { r: 7, g: 8, b: 18, alpha: 1 } },
}).composite([
  { input: tiles[0], left: 0, top: 0 },
  { input: tiles[1], left: 1024, top: 0 },
  { input: tiles[2], left: 0, top: 1024 },
  { input: tiles[3], left: 1024, top: 1024 },
]).png({ compressionLevel: 9 }).toFile(join(target, 'keepers-roster-v3.png'));

for (const [source, name] of [
  [observatory, 'astral-observatory-v3.png'],
  [sanctuary, 'astral-sanctuary-v3.png'],
  [prologue, 'astral-prologue-v3.png'],
  [boss, 'void-leviathan-v3.png'],
]) {
  await sharp(source)
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(join(target, name));
}

console.log(`Assets Orbes d'Astra finalisés dans ${target}`);
