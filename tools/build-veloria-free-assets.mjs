/**
 * Veloria — génération GRATUITE des figures (héroïnes + ennemis) via backend keyless.
 *
 * Voie 100% gratuite, sans GPU : génère chaque personnage en HD (free-client) sur fond
 * plat, détoure proprement (flood matte → transparent), recadre. Sortie consommée par le
 * runtime (remplace les « cartes encadrées »). `pnpm veloria:free`.
 *
 *   pnpm veloria:free                 # héroïnes + ennemis
 *   pnpm veloria:free -- --only=hero  # ciblé
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import STYLE from './lib/veloria-forge/style-bible.mjs';
import { HEROES, ENEMIES, ARENAS } from './lib/veloria-forge/prompts.mjs';
import { generate as freeGen } from './lib/veloria-forge/free-client.mjs';
import { floodMatte } from './lib/hd-faithful/matte.mjs';
const require = createRequire(import.meta.url);
const sharp = require('../packages/pipeline/node_modules/sharp');

const WS = join(process.cwd(), 'workspaces', 'veloria-veille-des-lames');
const OUT = join(WS, '03_assets', 'forge', 'free');
const ASSET_BASE = '/workspaces/veloria-veille-des-lames/03_assets/forge/free';

function figPrompt(subject, palette) {
  const pal = (palette ?? []).map((k) => (STYLE.palette[k] ? k.replace(/_/g, ' ') : k)).join(', ');
  return [
    'masterpiece, best quality, ultra detailed, dark fantasy premium gacha character art',
    'cinematic chiaroscuro, cool shadow ambient, warm gold rim light, painterly, sharp focus',
    subject, `color palette: ${pal}`,
    'full body, head to toe, standing, centered, single character, isolated on flat plain white background, studio key art, no scenery, no text, no border',
  ].join(', ');
}
function scenePrompt(subject, mood) {
  return [
    'masterpiece, best quality, ultra detailed dark fantasy environment art, cinematic, atmospheric depth, volumetric light, painterly',
    subject, `${mood} atmosphere`,
    'vertical mobile game background, gothic, moody, no characters, no people, no text, no ui, wide establishing shot, depth of field',
  ].join(', ');
}
function hashSeed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 2_000_000; }

function trimBox(data, w, h) {
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 28) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (maxX < minX) return { left: 0, top: 0, width: w, height: h };
  const p = 8;
  const left = Math.max(0, minX - p), top = Math.max(0, minY - p);
  return { left, top, width: Math.min(w - left, maxX - minX + 2 * p), height: Math.min(h - top, maxY - minY + 2 * p) };
}

async function cutClean(jpegBuf, outPath, maxW) {
  const { data, info } = await sharp(jpegBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodMatte(data, info.width, info.height, { tol: 46, edgeFeather: 0.016 });
  const box = trimBox(data, info.width, info.height);
  const raw = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const cropped = await raw.extract(box).toBuffer();
  const w = Math.min(maxW, box.width);
  await sharp(cropped, { raw: { width: box.width, height: box.height, channels: 4 } })
    .resize({ width: w, withoutEnlargement: true }).sharpen({ sigma: 0.4 }).png().toFile(outPath);
  return { w, h: Math.round((w / box.width) * box.height) };
}

// reconstruit le manifest depuis TOUS les PNG présents sur disque (jamais de perte sur --only)
async function rebuildManifest() {
  const manifest = { game: 'veloria-veille-des-lames', backend: 'free-keyless', generatedAt: new Date().toISOString(), heroes: {}, enemies: {} };
  manifest.arenas = {};
  const BUCKET = { hero: 'heroes', enemy: 'enemies', arena: 'arenas' };
  let files = []; try { files = await readdir(OUT); } catch { /* none */ }
  for (const f of files) {
    const m = /^(hero|enemy|arena)_(.+)\.png$/.exec(f); if (!m) continue;
    const meta = await sharp(join(OUT, f)).metadata().catch(() => null); if (!meta) continue;
    manifest[BUCKET[m[1]]][m[2]] = { asset: `${ASSET_BASE}/${f}`, w: meta.width, h: meta.height };
  }
  await writeFile(join(OUT, 'free-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

async function run(only) {
  await mkdir(OUT, { recursive: true });
  if (process.argv.includes('--manifest-only')) return rebuildManifest();
  const tasks = [];
  if (!only || only === 'hero') for (const [key, h] of Object.entries(HEROES)) tasks.push({ prefix: 'hero', key, subject: h.subject, palette: h.palette, W: 832, H: 1216, maxW: 480 });
  if (!only || only === 'enemy') for (const [key, e] of Object.entries(ENEMIES)) tasks.push({ prefix: 'enemy', key, subject: e.subject, palette: e.palette, W: 832, H: e.boss ? 1216 : 1088, maxW: e.boss ? 460 : 420 });
  if (!only || only === 'arena') for (const [key, a] of Object.entries(ARENAS)) tasks.push({ prefix: 'arena', key, subject: a.subject, mood: a.mood, scene: true, W: 768, H: 1280, maxW: 768 });

  for (const t of tasks) {
    const out = join(OUT, `${t.prefix}_${t.key}.png`);
    process.stdout.write(`· ${t.prefix} ${t.key} … `);
    try {
      const prompt = t.scene ? scenePrompt(t.subject, t.mood) : figPrompt(t.subject, t.palette);
      const buf = await freeGen(prompt, { width: t.W, height: t.H, seed: hashSeed(t.prefix + t.key) });
      if (t.scene) { await sharp(buf).resize(t.maxW).png().toFile(out); console.log(`ok (décor ${t.maxW}px)`); }
      else { const r = await cutClean(buf, out, t.maxW); console.log(`ok (${r.w}×${r.h})`); }
    } catch (e) { console.log('ÉCHEC', e.message); }
  }
  return rebuildManifest();
}

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
run(only).then((m) => console.log('free assets:', Object.keys(m.heroes).length, 'héros,', Object.keys(m.enemies).length, 'ennemis,', Object.keys(m.arenas || {}).length, 'arènes →', 'free-manifest.json'))
  .catch((e) => { console.error(e); process.exit(1); });
