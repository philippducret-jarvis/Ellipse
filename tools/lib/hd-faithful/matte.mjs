/**
 * Moteur de découpe HD FIDÈLE — partagé entre tous les jeux Ellipse (agnostique).
 *
 * Principe : la planche concept EST l'art HD. On découpe l'entité et on la détoure
 * par un matte « feather » qui préserve le personnage intégral (y compris costumes
 * sombres) et fond les bords dans le décor. 100% CPU (sharp), déterministe, no-GPU.
 *
 * Utilisé par Veloria (gacha vertical) ET Echoes (side-scroller). Seules changent
 * les planches, la table de crops et la palette.
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

export function smooth(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function cropWH(crop) {
  return { cw: crop.w ?? crop.width, ch: crop.h ?? crop.height };
}

/** Matte feather : garde le perso, fond les bords, suppression douce du fond sombre.
 *  Option bgColor=[r,g,b] : retire aussi un fond clair/neutre (planches sur fond taupe). */
export function featherMatte(data, w, h, o = {}) {
  const { top = 0.12, bottom = 0.05, side = 0.07, darkFloor = 26, darkSoft = 70, tlText = false,
    bgColor = null, bgTol = 64, textErase = null, vignette = false, darkKeep = 0.35,
    alphaClean = null, centerKeepW = 1 } = o;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const fx = x / w, fy = y / h;
      const aL = smooth(0, side * 1.25, fx);
      const aR = smooth(0, side, 1 - fx);
      const aT = smooth(0, top, fy);
      const aB = smooth(0, bottom, 1 - fy);
      let a = Math.min(aL, aR, aT, aB);
      if (tlText) {
        const tl = smooth(0.34, 0.12, fx) * smooth(0.34, 0.1, fy);
        a *= 1 - 0.85 * tl;
      }
      // Efface des boîtes (légende/titres de planche) avec bord doux.
      if (textErase) {
        for (const bx of textErase) {
          const f = bx.feather ?? 0.03;
          const inX = smooth(bx.x0 - f, bx.x0 + f, fx) * smooth(bx.x1 + f, bx.x1 - f, fx);
          const inY = smooth(bx.y0 - f, bx.y0 + f, fy) * smooth(bx.y1 + f, bx.y1 - f, fy);
          a *= 1 - inX * inY;
        }
      }
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const centerKeep = smooth(0.42, 0.5, Math.min(fx, 1 - fx)) * centerKeepW;
      let darkA = smooth(darkFloor, darkSoft, lum);
      darkA = Math.max(darkA, centerKeep);
      a *= darkKeep + (1 - darkKeep) * darkA;
      if (vignette) {
        // fondu elliptique : efface les coins (fond de planche résiduel) sans toucher le centre
        const dx = (fx - 0.5) / 0.5, dy = (fy - 0.5) / 0.5;
        const d = Math.sqrt(dx * dx * 0.9 + dy * dy * 0.72);
        a *= smooth(1.16, 0.8, d);
      }
      if (bgColor) {
        // distance au fond clair → fond proche = transparent (sauf centre)
        const dist = Math.abs(r - bgColor[0]) + Math.abs(g - bgColor[1]) + Math.abs(b - bgColor[2]);
        const keepFg = Math.max(centerKeep, smooth(bgTol * 0.6, bgTol * 1.6, dist));
        a *= keepFg;
      }
      if (alphaClean) a = smooth(alphaClean[0], alphaClean[1], a); // écrase le résidu de boîte, garde la figure
      data[i + 3] = Math.round(255 * a);
    }
  }
  return data;
}

/** Flood-fill matte : retire un FOND UNIFORME connecté aux bords (idéal fond clair/taupe
 *  des planches « character sheet »). Préserve le sujet même sombre. + feather des bords. */
export function floodMatte(data, w, h, o = {}) {
  const { tol = 60, edgeFeather = 0.05 } = o;
  // seed = moyenne des 4 coins
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  let sr = 0, sg = 0, sb = 0;
  for (const c of corners) { sr += data[c]; sg += data[c + 1]; sb += data[c + 2]; }
  sr /= 4; sg /= 4; sb /= 4;
  const isBg = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + w - 1); }
  while (stack.length) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    const p = idx * 4;
    const dist = Math.abs(data[p] - sr) + Math.abs(data[p + 1] - sg) + Math.abs(data[p + 2] - sb);
    if (dist > tol * 3) continue; // bord du sujet → stop
    isBg[idx] = 1;
    const x = idx % w, y = (idx / w) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }
  // alpha + feather de bord léger
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let a = isBg[idx] ? 0 : 1;
      if (a > 0 && edgeFeather > 0) {
        const fx = x / w, fy = y / h;
        a = Math.min(a, smooth(0, edgeFeather, fx), smooth(0, edgeFeather, 1 - fx), smooth(0, edgeFeather, fy), smooth(0, edgeFeather, 1 - fy) + 0.3);
      }
      data[idx * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
    }
  }
  return data;
}

export async function extractRegion(board, crop) {
  const meta = await sharp(board).metadata();
  const W = meta.width, H = meta.height;
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.max(0, Math.round(crop.x * W)),
    top: Math.max(0, Math.round(crop.y * H)),
    width: Math.min(W, Math.round(cw * W)),
    height: Math.min(H, Math.round(ch * H)),
  };
  return sharp(board).extract(ext).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Découpe une entité d'une planche → PNG détouré fidèle (alpha). */
export async function cutoutSprite(board, crop, outPath, { matte = {}, maxW = 380, flip = false, mode = 'feather' } = {}) {
  const { data, info } = await extractRegion(board, crop);
  if (mode === 'flood') floodMatte(data, info.width, info.height, matte);
  else featherMatte(data, info.width, info.height, matte);
  await mkdir(dirname(outPath), { recursive: true });
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: Math.min(maxW, info.width), withoutEnlargement: true })
    .sharpen({ sigma: 0.5 });
  if (flip) img = img.flop();
  await img.png().toFile(outPath);
  return { path: outPath, w: Math.min(maxW, info.width), h: Math.round((Math.min(maxW, info.width) / info.width) * info.height) };
}

/** Couche de parallaxe : bande horizontale d'une scène de planche, traitée par profondeur. */
export async function buildParallaxLayer(board, crop, outPath, { width, height, brightness = 1, blur = 0, alpha = 1 } = {}) {
  const meta = await sharp(board).metadata();
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.round(crop.x * meta.width),
    top: Math.round(crop.y * meta.height),
    width: Math.round(cw * meta.width),
    height: Math.round(ch * meta.height),
  };
  await mkdir(dirname(outPath), { recursive: true });
  let img = sharp(board).extract(ext).resize(width, height, { fit: 'cover', position: 'centre' }).modulate({ brightness });
  if (blur > 0) img = img.blur(blur);
  if (alpha < 1) img = img.ensureAlpha(alpha);
  await img.png().toFile(outPath);
  return { path: outPath, width, height };
}

/** Compose une scène plein écran (fond fidèle + voile sombre) pour un jeu 2,5D. */
export async function buildScene(board, crop, outPath, { width, height, brightness = 0.85, overlaySvg = null } = {}) {
  const meta = await sharp(board).metadata();
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.round(crop.x * meta.width),
    top: Math.round(crop.y * meta.height),
    width: Math.round(cw * meta.width),
    height: Math.round(ch * meta.height),
  };
  const base = await sharp(board).extract(ext).resize(width, height, { fit: 'cover' }).modulate({ brightness }).toBuffer();
  await mkdir(dirname(outPath), { recursive: true });
  const composite = overlaySvg ? [{ input: Buffer.from(overlaySvg), blend: 'over' }] : [];
  await sharp(base).composite(composite).png().toFile(outPath);
  return { path: outPath, width, height };
}

export { sharp };
