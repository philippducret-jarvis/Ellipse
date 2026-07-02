/**
 * RIG SQUELETTAL PAPER-DOLL — l'anti « frame-par-frame ».
 *
 * On ne génère JAMAIS les frames d'animation une à une (identité instable) :
 * on découpe UNE A-pose générée+détourée en pièces (tête, torse, bras, cuisses,
 * tibias), chacune pivotant autour de son articulation dans une hiérarchie
 * d'os. L'animation est 100% procédurale (clips.mjs) → cohérence parfaite,
 * fichiers légers, clips retargetables entre personnages.
 *
 * rigType 'humanoid' : 8 pièces. rigType 'monopart' : 1 pièce (créatures),
 * animée par squash/stretch/lunge — robuste pour tout ennemi non humanoïde.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from './sharp.mjs';

// Carte de proportions humanoïde — fractions de la bbox serrée de l'A-pose.
// box = zone de découpe (chevauchements volontaires : pas de trou aux joints) ;
// pivot = articulation, en fractions de la bbox globale ; z = ordre de dessin.
const HUMANOID = [
  { id: 'armFar',    box: { x: 0.00, y: 0.16, w: 0.40, h: 0.46 }, pivot: { x: 0.34, y: 0.22 }, parent: 'torso', z: 0 },
  { id: 'thighFar',  box: { x: 0.26, y: 0.50, w: 0.26, h: 0.28 }, pivot: { x: 0.42, y: 0.54 }, parent: 'root',  z: 1 },
  { id: 'shinFar',   box: { x: 0.26, y: 0.73, w: 0.26, h: 0.27 }, pivot: { x: 0.41, y: 0.76 }, parent: 'thighFar', z: 2 },
  { id: 'torso',     box: { x: 0.24, y: 0.13, w: 0.52, h: 0.45 }, pivot: { x: 0.50, y: 0.54 }, parent: 'root',  z: 3 },
  { id: 'head',      box: { x: 0.22, y: 0.00, w: 0.56, h: 0.22 }, pivot: { x: 0.50, y: 0.19 }, parent: 'torso', z: 4 },
  { id: 'thighNear', box: { x: 0.48, y: 0.50, w: 0.26, h: 0.28 }, pivot: { x: 0.58, y: 0.54 }, parent: 'root',  z: 5 },
  { id: 'shinNear',  box: { x: 0.48, y: 0.73, w: 0.26, h: 0.27 }, pivot: { x: 0.59, y: 0.76 }, parent: 'thighNear', z: 6 },
  { id: 'armNear',   box: { x: 0.60, y: 0.16, w: 0.40, h: 0.46 }, pivot: { x: 0.66, y: 0.22 }, parent: 'torso', z: 7 },
];

async function slicePart(srcPng, meta, part, outDir, prefix) {
  const ext = {
    left: Math.round(part.box.x * meta.width),
    top: Math.round(part.box.y * meta.height),
    width: Math.min(meta.width - Math.round(part.box.x * meta.width), Math.round(part.box.w * meta.width)),
    height: Math.min(meta.height - Math.round(part.box.y * meta.height), Math.round(part.box.h * meta.height)),
  };
  const file = `${prefix}.${part.id}.png`;
  await sharp(srcPng).extract(ext).png().toFile(join(outDir, file));
  return {
    id: part.id, file, z: part.z, parent: part.parent,
    // position de la pièce et de son pivot, en px de la bbox d'origine
    x: ext.left, y: ext.top, w: ext.width, h: ext.height,
    pivot: { x: Math.round(part.pivot.x * meta.width), y: Math.round(part.pivot.y * meta.height) },
  };
}

/**
 * Découpe l'A-pose détourée en rig humanoïde → part PNGs + <id>.rig.json.
 * @param {Buffer|string} aposePng PNG détouré (bbox serrée)
 */
export async function buildHumanoidRig(aposePng, outDir, { id, sourceFile = null } = {}) {
  await mkdir(outDir, { recursive: true });
  const meta = await sharp(aposePng).metadata();
  const parts = [];
  for (const p of HUMANOID) parts.push(await slicePart(aposePng, meta, p, outDir, id));
  const rig = {
    version: 'forge-rig-1', type: 'humanoid', id, source: sourceFile,
    frame: { w: meta.width, h: meta.height },
    anchor: { x: 0.5, y: 1.0 }, // pieds — le runtime pose l'ancre au sol
    root: { x: Math.round(0.5 * meta.width), y: Math.round(0.54 * meta.height) },
    parts: parts.sort((a, b) => a.z - b.z),
  };
  await writeFile(join(outDir, `${id}.rig.json`), JSON.stringify(rig, null, 2), 'utf8');
  return rig;
}

/** Rig mono-pièce (créatures) : le PNG entier, animé squash/stretch/lunge. */
export async function buildMonopartRig(png, outDir, { id, sourceFile = null } = {}) {
  await mkdir(outDir, { recursive: true });
  const meta = await sharp(png).metadata();
  const file = `${id}.body.png`;
  await sharp(png).png().toFile(join(outDir, file));
  const rig = {
    version: 'forge-rig-1', type: 'monopart', id, source: sourceFile,
    frame: { w: meta.width, h: meta.height },
    anchor: { x: 0.5, y: 1.0 },
    root: { x: Math.round(0.5 * meta.width), y: Math.round(0.6 * meta.height) },
    parts: [{ id: 'body', file, z: 0, parent: 'root', x: 0, y: 0, w: meta.width, h: meta.height, pivot: { x: Math.round(0.5 * meta.width), y: Math.round(0.6 * meta.height) } }],
  };
  await writeFile(join(outDir, `${id}.rig.json`), JSON.stringify(rig, null, 2), 'utf8');
  return rig;
}
