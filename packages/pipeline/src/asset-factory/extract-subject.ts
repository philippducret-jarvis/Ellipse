/**
 * Détourage CPU d'un sujet (sans GPU, sans modèle) — extraction propre depuis une concept-art.
 *
 * Principe : suppression du fond par **remplissage depuis les bords** sur pixels bruts (RGBA).
 * On rend transparents les pixels connectés au bord et proches de la couleur de fond ; le sujet
 * central (couleurs distinctes, bords nets) est préservé. Puis recadrage sur le contenu + mise à
 * l'échelle jeu. Bien meilleur qu'un crop rectangulaire pour isoler un héros/objet centré.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ExtractSubjectOptions {
  /** Tolérance couleur vs fond (0-255 par canal, distance euclidienne). */
  tolerance?: number;
  /** Recadrer le sujet sur un sous-rectangle d'abord. */
  box?: { left: number; top: number; width: number; height: number };
  /** Hauteur cible du sprite final (px). */
  targetHeight?: number;
  /** Adoucissement des bords (alpha feather), px. */
  feather?: number;
}

export interface ExtractSubjectResult {
  path: string;
  width: number;
  height: number;
  /** % de pixels rendus transparents (indicateur de fond retiré). */
  removedRatio: number;
}

function colorDist(d: Buffer, i: number, r: number, g: number, b: number): number {
  const dr = d[i]! - r;
  const dg = d[i + 1]! - g;
  const db = d[i + 2]! - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function extractSubject(
  srcPath: string,
  outPath: string,
  opts: ExtractSubjectOptions = {},
): Promise<ExtractSubjectResult> {
  const tol = opts.tolerance ?? 72;
  let pipeline = sharp(srcPath).ensureAlpha();
  if (opts.box) pipeline = pipeline.extract(opts.box);

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const channels = info.channels; // 4
  const px = (x: number, y: number) => (y * width + x) * channels;

  // Couleur de fond = moyenne des 4 coins.
  const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
  let br = 0, bg = 0, bb = 0;
  for (const c of corners) { br += data[c]!; bg += data[c + 1]!; bb += data[c + 2]!; }
  br /= 4; bg /= 4; bb /= 4;

  // Flood-fill depuis les bords à travers les pixels proches du fond.
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const pushIf = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < width; x++) { pushIf(x, 0); pushIf(x, height - 1); }
  for (let y = 0; y < height; y++) { pushIf(0, y); pushIf(width - 1, y); }

  let removed = 0;
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const i = px(x, y);
    if (colorDist(data, i, br, bg, bb) > tol) continue; // bord du sujet : on s'arrête
    data[i + 3] = 0; // fond → transparent
    removed++;
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }

  let out = sharp(data, { raw: { width, height, channels } }).png();
  // Recadrage sur le contenu restant.
  out = out.trim({ threshold: 1 });
  if (opts.targetHeight) {
    out = out.resize({ height: opts.targetHeight, fit: 'inside', withoutEnlargement: false });
  }
  if (opts.feather) out = out.blur(0.4 * opts.feather);

  const buf = await out.png().toBuffer();
  const meta = await sharp(buf).metadata();
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);

  return {
    path: outPath,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    removedRatio: removed / (width * height),
  };
}
