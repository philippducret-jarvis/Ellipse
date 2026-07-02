/**
 * Scène intégrée depuis planches — board_master, sans matte ni découpe sprite.
 *
 * Principe : la planche EST la scène. On extrait des bandes/zones entières,
 * on les assemble en panorama jouable ; la collision reste en JSON (layout GDL).
 * Les « acteurs » sont des régions de planche conservées avec leur contexte visuel.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sharp } from './matte.mjs';

function cropWH(crop) {
  return { cw: crop.w ?? crop.width, ch: crop.h ?? crop.height };
}

export async function extractBoardRegion(boardPath, crop, outPath, { width, height, fit = 'cover', position = 'centre' } = {}) {
  const meta = await sharp(boardPath).metadata();
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.max(0, Math.round(crop.x * meta.width)),
    top: Math.max(0, Math.round(crop.y * meta.height)),
    width: Math.min(meta.width, Math.round(cw * meta.width)),
    height: Math.min(meta.height, Math.round(ch * meta.height)),
  };
  await mkdir(dirname(outPath), { recursive: true });
  let pipe = sharp(boardPath).extract(ext);
  if (width && height) pipe = pipe.resize(width, height, { fit, position });
  await pipe.png().toFile(outPath);
  const outMeta = await sharp(outPath).metadata();
  return { path: outPath, width: outMeta.width ?? width, height: outMeta.height ?? height };
}

/** Assemble horizontalement des segments de planche → panorama niveau. */
export async function stitchBoardPanorama(boardPath, segments, outPath, { targetWidth, targetHeight }) {
  const slices = [];
  for (const seg of segments) {
    const buf = await extractBoardRegion(boardPath, seg.crop, join(dirname(outPath), `_slice_${seg.id}.png`), {
      width: Math.round(targetWidth * seg.widthFrac),
      height: targetHeight,
      fit: 'cover',
      position: seg.position ?? 'centre',
    });
    slices.push({ id: seg.id, ...buf });
  }
  const inputs = [];
  let x = 0;
  for (const s of slices) {
    inputs.push({ input: s.path, left: x, top: 0 });
    x += s.width;
  }
  await mkdir(dirname(outPath), { recursive: true });
  await sharp({
    create: { width: targetWidth, height: targetHeight, channels: 4,
      background: { r: 18, g: 15, b: 24, alpha: 255 } },
  }).composite(inputs).png().toFile(outPath);
  return { path: outPath, width: targetWidth, height: targetHeight, segments: slices.map(({ id, width, height }) => ({ id, width, height })) };
}

/** Parallax dérivé du playfield (pas une seconde planche). */
export async function deriveParallaxFromPlayfield(playfieldPath, outPath, { brightness = 0.5, blur = 6 } = {}) {
  await mkdir(dirname(outPath), { recursive: true });
  let pipe = sharp(playfieldPath).modulate({ brightness });
  if (blur > 0) pipe = pipe.blur(blur);
  await pipe.png().toFile(outPath);
  const meta = await sharp(outPath).metadata();
  return { path: outPath, width: meta.width, height: meta.height };
}

/** Glow de premier plan (spores/lampes) extrait du playfield intégré. */
export async function extractForegroundGlow(playfieldPath, outPath) {
  const { data, info } = await sharp(playfieldPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = Math.max(r, g, b);
      const isSpore = b > 88 && g > 65;
      const isLamp = lum > 115 && r > 95;
      const isAccent = r > 95 && g < 105 && b < 115;
      if (!isSpore && !isLamp && !isAccent) data[i + 3] = 0;
    }
  }
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
  return { path: outPath, width, height };
}

/** Acteur = région de planche conservée telle quelle (contexte inclus). */
export async function extractBoardActor(boardPath, crop, outPath, { maxH = 280 } = {}) {
  const meta = await sharp(boardPath).metadata();
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.max(0, Math.round(crop.x * meta.width)),
    top: Math.max(0, Math.round(crop.y * meta.height)),
    width: Math.min(meta.width, Math.round(cw * meta.width)),
    height: Math.min(meta.height, Math.round(ch * meta.height)),
  };
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(boardPath).extract(ext)
    .resize({ height: maxH, withoutEnlargement: false })
    .sharpen({ sigma: 0.35 })
    .png()
    .toFile(outPath);
  const outMeta = await sharp(outPath).metadata();
  return { path: outPath, w: outMeta.width ?? maxH, h: outMeta.height ?? maxH };
}

export async function writeIntegratedManifest(outPath, manifest) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
