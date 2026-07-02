/**
 * QA CPU de la Forge — portes de qualité mesurables, sans GPU.
 *
 * Un asset généré n'entre dans le jeu que s'il passe :
 *   - conformité palette : deltaE (CIE76, espace Lab) des couleurs dominantes
 *     vs la bible de style du jeu ;
 *   - netteté : variance du laplacien (rejette les rendus flous/ratés) ;
 *   - couverture : le sujet détouré occupe une fraction plausible du cadre ;
 *   - résolution minimale.
 *
 * Score 0–100 ; en dessous du seuil l'orchestrateur re-génère (seed suivant).
 */
import sharp from './sharp.mjs';

function rgb2lab(r, g, b) {
  let [x, y, z] = [r / 255, g / 255, b / 255].map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const X = (x * 0.4124 + y * 0.3576 + z * 0.1805) / 0.95047;
  const Y = x * 0.2126 + y * 0.7152 + z * 0.0722;
  const Z = (x * 0.0193 + y * 0.1192 + z * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hex2rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Couleurs dominantes (quantification 4 bits/canal sur vignette 48px, pondérée alpha). */
export async function dominantColors(buf, k = 8) {
  const { data, info } = await sharp(buf).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 64) continue; // ignorer le transparent
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = bins.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2]; e.n++;
    bins.set(key, e);
  }
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, k)
    .map((e) => ({ rgb: [e.r / e.n | 0, e.g / e.n | 0, e.b / e.n | 0], weight: e.n }));
}

/** deltaE moyen pondéré des dominantes vs palette (hex[]). 0 = parfait. */
export async function paletteDistance(buf, paletteHex) {
  const pal = paletteHex.map((h) => rgb2lab(...hex2rgb(h)));
  const dom = await dominantColors(buf);
  if (!dom.length) return 100;
  let sum = 0, wsum = 0;
  for (const d of dom) {
    const lab = rgb2lab(...d.rgb);
    sum += Math.min(...pal.map((p) => deltaE(lab, p))) * d.weight;
    wsum += d.weight;
  }
  return sum / wsum;
}

/** Netteté : variance du laplacien sur vignette grise. Faible = flou. */
export async function sharpness(buf) {
  const { data, info } = await sharp(buf).resize(128, 128, { fit: 'inside' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
    sum += lap; sq += lap * lap; n++;
  }
  const mean = sum / n;
  return sq / n - mean * mean;
}

/** Fraction de pixels opaques (après détourage). */
export async function alphaCoverage(buf) {
  const { data } = await sharp(buf).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let on = 0, n = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] > 64) on++; n++; }
  return on / n;
}

/**
 * Porte QA complète. kind: 'character' (détouré) | 'decor' (plein cadre).
 * @returns {Promise<{score:number, pass:boolean, metrics:object, reasons:string[]}>}
 */
export async function assess(buf, { palette = [], kind = 'character', minWidth = 512, threshold = 55 } = {}) {
  const meta = await sharp(buf).metadata();
  const reasons = [];
  const metrics = { width: meta.width, height: meta.height };

  metrics.sharpness = await sharpness(buf);
  const sharpScore = Math.min(1, metrics.sharpness / 120); // <120 = suspect de flou
  if (sharpScore < 0.35) reasons.push(`flou (laplacien ${metrics.sharpness.toFixed(0)})`);

  let paletteScore = 1;
  if (palette.length) {
    metrics.paletteDeltaE = await paletteDistance(buf, palette);
    paletteScore = Math.max(0, 1 - metrics.paletteDeltaE / 55); // deltaE>55 = hors direction artistique
    if (paletteScore < 0.3) reasons.push(`hors palette (deltaE ${metrics.paletteDeltaE.toFixed(1)})`);
  }

  let coverageScore = 1;
  if (kind === 'character') {
    metrics.coverage = await alphaCoverage(buf);
    coverageScore = metrics.coverage > 0.12 && metrics.coverage < 0.92 ? 1 : 0.2;
    if (coverageScore < 1) reasons.push(`couverture sujet anormale (${(metrics.coverage * 100).toFixed(0)}%)`);
  }

  const resOk = (meta.width ?? 0) >= minWidth;
  if (!resOk) reasons.push(`résolution ${meta.width}px < ${minWidth}px`);

  const score = Math.round(100 * (0.35 * sharpScore + 0.35 * paletteScore + 0.2 * coverageScore + 0.1 * (resOk ? 1 : 0)));
  return { score, pass: score >= threshold, metrics, reasons };
}

/** Génère + QA + retry : la brique standard « asset validé ou rien ». */
export async function generateValidated(generateFn, spec, qaOpts, { attempts = 3 } = {}) {
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const out = await generateFn({ ...spec, seed: (spec.seed ?? 1) + i * 7919 });
    const report = await assess(out.buf, qaOpts);
    if (!best || report.score > best.report.score) best = { ...out, report };
    if (report.pass) return best;
  }
  return best; // meilleur effort, report.pass=false signale l'échec en manifest
}
