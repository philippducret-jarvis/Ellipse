import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { colorDistance, rgbToHex } from './color-utils.js';

export type ElementLabel = 'head' | 'torso' | 'base' | 'accent';

export interface ExtractedElement {
  id: string;
  label: ElementLabel;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
  path: string;
  url: string;
  prominence: number;
}

export interface ExtractElementsInput {
  sourcePath: string;
  outputDir: string;
  sessionId: string;
  analysisSize?: number;
}

export interface ExtractElementsResult {
  palette: string[];
  elements: ExtractedElement[];
  subjectBounds: { x: number; y: number; width: number; height: number };
  backgroundColor: string;
}

const BANDS: { label: ElementLabel; yStart: number; yEnd: number }[] = [
  { label: 'head', yStart: 0, yEnd: 0.32 },
  { label: 'torso', yStart: 0.28, yEnd: 0.68 },
  { label: 'base', yStart: 0.62, yEnd: 1 },
];

async function estimateBackground(rgba: Buffer, w: number, h: number): Promise<{ r: number; g: number; b: number }> {
  const samples: { r: number; g: number; b: number }[] = [];
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  for (const [x, y] of corners) {
    const i = (y * w + x) * 4;
    samples.push({ r: rgba[i]!, g: rgba[i + 1]!, b: rgba[i + 2]! });
  }
  return {
    r: samples.reduce((s, c) => s + c.r, 0) / samples.length,
    g: samples.reduce((s, c) => s + c.g, 0) / samples.length,
    b: samples.reduce((s, c) => s + c.b, 0) / samples.length,
  };
}

function buildAlphaMask(
  rgba: Buffer,
  w: number,
  h: number,
  bg: { r: number; g: number; b: number },
  yMin: number,
  yMax: number,
  threshold: number,
): Buffer {
  const out = Buffer.alloc(w * h * 4, 0);
  for (let y = yMin; y < yMax; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = rgba[i]!;
      const g = rgba[i + 1]!;
      const b = rgba[i + 2]!;
      const dist = colorDistance(r, g, b, bg.r, bg.g, bg.b);
      if (dist > threshold) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = Math.min(255, Math.round((dist / 120) * 255));
      }
    }
  }
  return out;
}

export async function extractImageElements(input: ExtractElementsInput): Promise<ExtractElementsResult> {
  const size = input.analysisSize ?? 256;
  const sessionDir = join(input.outputDir, input.sessionId, 'lot0');
  await mkdir(sessionDir, { recursive: true });

  const meta = await sharp(input.sourcePath).rotate().metadata();
  const srcW = meta.width ?? size;
  const srcH = meta.height ?? size;

  const normalized = await sharp(input.sourcePath)
    .rotate()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: rgba, info } = normalized;
  const w = info.width;
  const h = info.height;
  const bg = await estimateBackground(rgba, w, h);
  const bgHex = rgbToHex(bg.r, bg.g, bg.b);

  const palette = new Set<string>();
  palette.add(bgHex);

  const stats = await sharp(input.sourcePath).rotate().stats();
  if (stats.dominant) {
    palette.add(rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b));
  }

  const elements: ExtractedElement[] = [];
  let accentCount = 0;

  for (const band of BANDS) {
    const yMin = Math.floor(h * band.yStart);
    const yMax = Math.ceil(h * band.yEnd);
    const mask = buildAlphaMask(rgba, w, h, bg, yMin, yMax, 28);

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (let y = yMin; y < yMax; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (mask[i + 3]! > 40) {
          sumR += mask[i]!;
          sumG += mask[i + 1]!;
          sumB += mask[i + 2]!;
          count++;
        }
      }
    }

    if (count < 20) continue;

    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;
    const color = rgbToHex(avgR, avgG, avgB);
    palette.add(color);

    const prominence = Math.min(1, colorDistance(avgR, avgG, avgB, bg.r, bg.g, bg.b) / 140);

    const filename = `element_${band.label}.png`;
    const path = join(sessionDir, filename);

    await sharp(mask, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: 0, top: yMin, width: w, height: yMax - yMin })
      .png()
      .toFile(path);

    elements.push({
      id: band.label,
      label: band.label,
      color,
      bounds: {
        x: 0,
        y: Math.round((yMin / h) * srcH),
        width: srcW,
        height: Math.round(((yMax - yMin) / h) * srcH),
      },
      path,
      url: `/generated/${input.sessionId}/lot0/${filename}`,
      prominence,
    });
  }

  const grid = 4;
  const cellW = Math.floor(w / grid);
  const cellH = Math.floor(h / grid);
  const cellScores: { cx: number; cy: number; score: number; color: string }[] = [];

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      const x0 = gx * cellW;
      const y0 = gy * cellH;
      for (let y = y0; y < y0 + cellH && y < h; y++) {
        for (let x = x0; x < x0 + cellW && x < w; x++) {
          const i = (y * w + x) * 4;
          sr += rgba[i]!;
          sg += rgba[i + 1]!;
          sb += rgba[i + 2]!;
          n++;
        }
      }
      if (n === 0) continue;
      const mr = sr / n;
      const mg = sg / n;
      const mb = sb / n;
      const score = colorDistance(mr, mg, mb, bg.r, bg.g, bg.b);
      cellScores.push({ cx: gx, cy: gy, score, color: rgbToHex(mr, mg, mb) });
    }
  }

  cellScores.sort((a, b) => b.score - a.score);
  for (const cell of cellScores.slice(0, 2)) {
    if (cell.score < 45 || accentCount >= 2) break;
    accentCount++;
    const x0 = cell.cx * cellW;
    const y0 = cell.cy * cellH;
    const mask = buildAlphaMask(rgba, w, h, bg, y0, y0 + cellH, 35);
    const filename = `element_accent_${accentCount}.png`;
    const path = join(sessionDir, filename);
    palette.add(cell.color);

    await sharp(mask, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: x0, top: y0, width: cellW, height: cellH })
      .png()
      .toFile(path);

    elements.push({
      id: `accent_${accentCount}`,
      label: 'accent',
      color: cell.color,
      bounds: {
        x: Math.round((x0 / w) * srcW),
        y: Math.round((y0 / h) * srcH),
        width: Math.round((cellW / w) * srcW),
        height: Math.round((cellH / h) * srcH),
      },
      path,
      url: `/generated/${input.sessionId}/lot0/${filename}`,
      prominence: Math.min(1, cell.score / 160),
    });
  }

  const subjectBounds = { x: 0, y: 0, width: srcW, height: srcH };

  return {
    palette: [...palette].slice(0, 8),
    elements,
    subjectBounds,
    backgroundColor: bgHex,
  };
}
