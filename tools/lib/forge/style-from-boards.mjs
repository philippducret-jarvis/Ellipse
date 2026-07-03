/**
 * STYLE VERROUILLÉ SUR LES PLANCHES — la Forge doit viser la direction
 * artistique du JEU (ses boards), pas un thème générique.
 *
 * Priorité :
 *   1. `02_design/style-bible.json` du workspace — bible curée (palette
 *      canonique des planches + mots de rendu/ambiance). C'est le contrat
 *      d'un vrai studio : les planches donnent les RÈGLES, pas des pixels.
 *   2. Extraction automatique depuis `01_inputs/references/*.png|jpg` :
 *      couleurs dominantes FILTRÉES par saturation/luminosité (les boards
 *      sombres noieraient tout dans le noir sinon).
 *
 * Sortie : { palette:[hex], render?, mood?, negative? } → design.mjs.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from './sharp.mjs';

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Couleurs saillantes d'une planche : dominantes MAIS saturées/lisibles. */
async function salientColors(buf, k = 6) {
  const { data } = await sharp(buf).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 64) continue;
    const { s, l } = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.25 || l < 0.12 || l > 0.92) continue; // ignorer noirs/blancs/gris
    const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
    const e = bins.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2]; e.n++;
    bins.set(key, e);
  }
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, k)
    .map((e) => toHex([e.r / e.n, e.g / e.n, e.b / e.n]));
}

async function extractFromBoards(refsDir) {
  const files = (await readdir(refsDir).catch(() => []))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).slice(0, 6);
  if (!files.length) return null;
  const all = [];
  for (const f of files) {
    try { all.push(...(await salientColors(await readFile(join(refsDir, f)), 4))); } catch { /* board illisible */ }
  }
  if (!all.length) return null;
  // dédupliquer grossièrement (dist RGB < 40)
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const palette = [];
  for (const c of all) {
    if (!palette.some((p) => { const a = rgb(p), b = rgb(c); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 40; })) palette.push(c);
    if (palette.length >= 7) break;
  }
  return { palette, source: 'boards-extraction' };
}

/**
 * Style du workspace : bible curée sinon extraction boards, sinon null
 * (le design retombera sur le thème heuristique).
 */
export async function extractWorkspaceStyle(wsDir) {
  const biblePath = join(wsDir, '02_design', 'style-bible.json');
  if (existsSync(biblePath)) {
    try {
      const bible = JSON.parse(await readFile(biblePath, 'utf8'));
      return { ...bible, source: 'style-bible' };
    } catch { /* bible corrompue → extraction */ }
  }
  const refsDir = join(wsDir, '01_inputs', 'references');
  return extractFromBoards(refsDir);
}
