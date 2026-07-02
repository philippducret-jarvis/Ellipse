/**
 * Veloria — PACKING SPRITESHEET (post-génération).
 *
 * Assemble les frames générées (alpha) en une planche d'animation + atlas JSON que
 * le runtime consomme (state machine). 100% CPU (sharp). En mode PLAN, on ne fait que
 * décrire l'atlas attendu (dimensions, grille) sans images.
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

/** dimensions d'atlas pour une liste de clips (sans générer d'image) — pour le PLAN. */
export function planAtlas(clips, frameW, frameH) {
  const total = clips.reduce((s, c) => s + c.frames, 0);
  const cols = Math.min(8, total);
  const rows = Math.ceil(total / cols);
  let idx = 0;
  const clipMap = {};
  for (const c of clips) { clipMap[c.name] = { start: idx, frames: c.frames, fps: c.fps }; idx += c.frames; }
  return { frameW, frameH, cols, rows, total, clips: clipMap };
}

/** assemble réellement les frames en une planche (mode EXECUTE). */
export async function packSheet(frameBuffers, clips, frameW, frameH, outPath) {
  const atlas = planAtlas(clips, frameW, frameH);
  const W = atlas.cols * frameW, H = atlas.rows * frameH;
  const comp = [];
  for (let i = 0; i < frameBuffers.length; i++) {
    const buf = await sharp(frameBuffers[i]).resize(frameW, frameH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comp.push({ input: buf, left: (i % atlas.cols) * frameW, top: Math.floor(i / atlas.cols) * frameH });
  }
  await mkdir(dirname(outPath), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp).png().toFile(outPath);
  return { ...atlas, sheet: outPath, width: W, height: H };
}

export { sharp };
