/**
 * Découpe CV des boards (Lot 3b — finition) — segmentation CPU des images fournies, **sans GPU**.
 *
 * Deux primitives sur `sharp` :
 *  - `cutSprite` : recadre une image sur son contenu (trim du bord uniforme/transparent).
 *  - `sliceBoardGrid` : découpe une planche (sheet/board) en cellules nommées, chacune recadrée.
 *
 * Cas d'usage Echoes : `cast_exploration_sheet`, `enemy_family_board`, `main_cast_board`…
 * → assets individuels exportés en PNG, prêts pour atlas/animation.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export interface CutResult {
  path: string;
  width: number;
  height: number;
}

/** Recadre une image sur son contenu (supprime le bord uniforme / transparent). */
export async function cutSprite(srcPath: string, outPath: string, threshold = 10): Promise<CutResult> {
  await mkdir(dirOf(outPath), { recursive: true });
  const buf = await sharp(srcPath).ensureAlpha().trim({ threshold }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  await sharp(buf).toFile(outPath);
  return { path: outPath, width: meta.width ?? 0, height: meta.height ?? 0 };
}

export interface SliceGridInput {
  srcPath: string;
  outputDir: string;
  rows: number;
  cols: number;
  /** Noms des cellules (ligne par ligne). À défaut : `cell_{r}_{c}`. */
  names?: string[];
  /** Recadrer chaque cellule sur son contenu. */
  trim?: boolean;
}

export interface SliceGridResult {
  cells: CutResult[];
}

/** Découpe une planche en grille `rows × cols`, chaque cellule exportée (et recadrée si `trim`). */
export async function sliceBoardGrid(input: SliceGridInput): Promise<SliceGridResult> {
  await mkdir(input.outputDir, { recursive: true });
  const img = sharp(input.srcPath).ensureAlpha();
  const meta = await img.metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const cellW = Math.floor(W / input.cols);
  const cellH = Math.floor(H / input.rows);

  const cells: CutResult[] = [];
  let i = 0;
  for (let r = 0; r < input.rows; r++) {
    for (let c = 0; c < input.cols; c++) {
      const name = input.names?.[i] ?? `cell_${r}_${c}`;
      const outPath = join(input.outputDir, `${name}.png`);
      // 1ʳᵉ passe : extraction de la cellule. 2ᵉ passe : trim (sharp n'aime pas extract+trim chaînés).
      let out = await sharp(input.srcPath)
        .ensureAlpha()
        .extract({ left: c * cellW, top: r * cellH, width: cellW, height: cellH })
        .png()
        .toBuffer();
      if (input.trim) out = await sharp(out).trim({ threshold: 10 }).png().toBuffer();
      const m = await sharp(out).metadata();
      await sharp(out).toFile(outPath);
      cells.push({ path: outPath, width: m.width ?? cellW, height: m.height ?? cellH });
      i++;
    }
  }
  return { cells };
}

function dirOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i >= 0 ? p.slice(0, i) : '.';
}
