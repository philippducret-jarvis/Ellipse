/**
 * Détourage d'images GÉNÉRÉES (pas de planches utilisateur ici).
 *
 * Voie PRINCIPALE : segmentation neuronale locale CPU (isnet via
 * @imgly/background-removal-node + onnxruntime) — la seule méthode fiable :
 * les modèles de diffusion HARMONISENT le costume avec le fond demandé
 * (chevalière verte sur fond vert…), donc tout keying par couleur finit par
 * manger le sujet. Un réseau de saillance s'en moque.
 *
 * Voie de SECOURS (module absent) : chroma key mesuré au pourtour + flood à
 * contrainte de continuité + restauration des trous internes.
 */
import sharp from './sharp.mjs';
import { floodMatte } from '../hd-faithful/matte.mjs';

let removeBackground = null;
try { ({ removeBackground } = await import('@imgly/background-removal-node')); } catch { /* fallback chroma */ }

/** true si la segmentation neuronale locale est disponible. */
export const hasNeuralMatte = () => removeBackground !== null;

/** Couleur médiane du pourtour (anneau de 2 px) — le fond réellement rendu. */
function borderColor(data, w, h) {
  const rs = [], gs = [], bs = [];
  const push = (x, y) => { const p = (y * w + x) * 4; rs.push(data[p]); gs.push(data[p + 1]); bs.push(data[p + 2]); };
  for (let x = 0; x < w; x += 3) { push(x, 0); push(x, 1); push(x, h - 1); push(x, h - 2); }
  for (let y = 0; y < h; y += 3) { push(0, y); push(1, y); push(w - 1, y); push(w - 2, y); }
  const med = (a) => a.sort((m, n) => m - n)[a.length >> 1];
  return { r: med(rs), g: med(gs), b: med(bs) };
}

/** Composantes connexes 4-voisins sur un prédicat → labels + tailles + touche-bord. */
function components(w, h, pred) {
  const seen = new Int32Array(w * h);
  const sizes = [0], touchesBorder = [false];
  let label = 0;
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !pred(i)) continue;
    label++; sizes.push(0); touchesBorder.push(false); stack.push(i); seen[i] = label;
    while (stack.length) {
      const j = stack.pop();
      sizes[label]++;
      const x = j % w, y = (j / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder[label] = true;
      if (x > 0 && !seen[j - 1] && pred(j - 1)) { seen[j - 1] = label; stack.push(j - 1); }
      if (x < w - 1 && !seen[j + 1] && pred(j + 1)) { seen[j + 1] = label; stack.push(j + 1); }
      if (y > 0 && !seen[j - w] && pred(j - w)) { seen[j - w] = label; stack.push(j - w); }
      if (y < h - 1 && !seen[j + w] && pred(j + w)) { seen[j + w] = label; stack.push(j + w); }
    }
  }
  return { seen, sizes, touchesBorder };
}

/**
 * Matte CHROMA robuste :
 *  1. couleur de fond mesurée au pourtour ;
 *  2. flood depuis les bords avec CONTRAINTE DE CONTINUITÉ (on ne traverse pas
 *     les frontières contrastées → pas de fuite à travers le sujet) ;
 *  3. restauration des trous internes (zones transparentes ne touchant pas le
 *     bord = intérieur du sujet mangé par une fuite) ;
 *  4. nettoyage des îlots opaques parasites.
 */
function chromaMatte(data, w, h, { tol = 80, step = 46 } = {}) {
  const bg = borderColor(data, w, h);
  const distBg = (i) => { const p = i * 4; return Math.hypot(data[p] - bg.r, data[p + 1] - bg.g, data[p + 2] - bg.b); };
  const distPx = (i, j) => { const p = i * 4, q = j * 4; return Math.hypot(data[p] - data[q], data[p + 1] - data[q + 1], data[p + 2] - data[q + 2]); };

  const isBg = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = y * w + x; if (distBg(i) < tol && !isBg[i]) { isBg[i] = 1; stack.push(i); } }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = y * w + x; if (distBg(i) < tol && !isBg[i]) { isBg[i] = 1; stack.push(i); } }
  while (stack.length) {
    const j = stack.pop();
    const x = j % w, y = (j / w) | 0;
    for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
      if (k < 0 || isBg[k]) continue;
      // continuer dans le fond : proche du fond ET transition douce (pas de bord franc)
      if (distBg(k) < tol && distPx(j, k) < step) { isBg[k] = 1; stack.push(k); }
    }
  }
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = isBg[i] ? 0 : 255;

  // trous internes : transparent sans contact bord → restaurer
  const holes = components(w, h, (i) => data[i * 4 + 3] === 0);
  for (let i = 0; i < w * h; i++) {
    const l = holes.seen[i];
    if (l && !holes.touchesBorder[l]) data[i * 4 + 3] = 255;
  }
  // îlots opaques parasites : ne garder que les composantes significatives
  const solids = components(w, h, (i) => data[i * 4 + 3] === 255);
  const biggest = Math.max(...solids.sizes);
  for (let i = 0; i < w * h; i++) {
    const l = solids.seen[i];
    if (l && solids.sizes[l] < Math.max(96, biggest * 0.01)) data[i * 4 + 3] = 0;
  }
  return bg;
}

/** bbox serrée des pixels alpha > seuil, en pixels. */
function tightBBox(data, w, h, thr = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > thr) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Nettoyage post-segmentation : seuil doux + îlots parasites retirés. */
function cleanupAlpha(data, w, h) {
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] < 32) data[i * 4 + 3] = 0;
  const solids = components(w, h, (i) => data[i * 4 + 3] >= 128);
  const biggest = Math.max(...solids.sizes);
  for (let i = 0; i < w * h; i++) {
    const l = solids.seen[i];
    if (l && solids.sizes[l] < Math.max(96, biggest * 0.01)) data[i * 4 + 3] = 0;
  }
}

/**
 * Détoure une image générée → PNG alpha recadré.
 * mode 'auto' (défaut) : segmentation neuronale CPU si dispo, sinon chroma.
 * mode 'chroma' | 'flood' : forcer la voie colorimétrique.
 * @returns {Promise<{png:Buffer, width:number, height:number, coverage:number, matte:string}>}
 */
export async function cutoutGenerated(buf, { tol = 80, targetHeight = null, pad = 0.02, mode = 'auto' } = {}) {
  let data, w, h, matte;
  if (mode === 'auto' && removeBackground) {
    const pngIn = await sharp(buf).png().toBuffer();
    const blob = await removeBackground(new Blob([pngIn], { type: 'image/png' }), { output: { format: 'image/png' } });
    const segBuf = Buffer.from(await blob.arrayBuffer());
    ({ data, info: { width: w, height: h } } = await sharp(segBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
    cleanupAlpha(data, w, h);
    matte = 'isnet';
  } else {
    ({ data, info: { width: w, height: h } } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
    if (mode === 'flood') floodMatte(data, w, h, { tol, edgeFeather: 0 });
    else chromaMatte(data, w, h, { tol });
    matte = mode === 'flood' ? 'flood' : 'chroma';
  }

  const box = tightBBox(data, w, h);
  if (!box) throw new Error('cutout: sujet introuvable après matte (fond trop proche du sujet ?)');

  const px = Math.round(w * pad), py = Math.round(h * pad);
  const ext = {
    left: Math.max(0, box.left - px),
    top: Math.max(0, box.top - py),
    width: Math.min(w - Math.max(0, box.left - px), box.width + 2 * px),
    height: Math.min(h - Math.max(0, box.top - py), box.height + 2 * py),
  };

  let img = sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(ext);
  if (targetHeight) img = img.resize({ height: targetHeight }); // largeur dérivée : jamais d'étirement
  const png = await img.png().toBuffer();
  const meta = await sharp(png).metadata();

  let on = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 24) on++;
  return { png, width: meta.width, height: meta.height, coverage: on / (w * h), matte };
}
