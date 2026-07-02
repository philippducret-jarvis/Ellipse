import { rgbToHex } from '../../lot0/color-utils.js';
import { PART_DEFS } from './constants.js';
import type { Bounds, HeroPartSpec, Rgb, RowEnvelope } from './types.js';

export function estimateBackground(data: Buffer, width: number, height: number): Rgb {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const samples = corners.map(([x, y]) => {
    const index = (y * width + x) * 4;
    return {
      r: data[index] ?? 0,
      g: data[index + 1] ?? 0,
      b: data[index + 2] ?? 0,
    };
  });

  return {
    r: samples.reduce((sum, sample) => sum + sample.r, 0) / samples.length,
    g: samples.reduce((sum, sample) => sum + sample.g, 0) / samples.length,
    b: samples.reduce((sum, sample) => sum + sample.b, 0) / samples.length,
  };
}

export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function buildSubjectRgba(data: Buffer, width: number, height: number, background: Rgb): Buffer {
  const out = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const rgb = {
        r: data[index] ?? 0,
        g: data[index + 1] ?? 0,
        b: data[index + 2] ?? 0,
      };
      const luminance = Math.max(rgb.r, rgb.g, rgb.b);
      const dist = colorDistance(rgb, background);

      if (dist < 20 && luminance < 26) continue;

      out[index] = rgb.r;
      out[index + 1] = rgb.g;
      out[index + 2] = rgb.b;
      out[index + 3] = Math.max(32, Math.min(255, Math.round((dist / 120) * 255)));
    }
  }

  return out;
}

export function buildCoreRowEnvelope(data: Buffer, width: number, height: number, alphaFloor = 184): RowEnvelope[] {
  const rowEnvelope = Array.from({ length: height }, () => ({ left: -1, right: -1 }));
  for (let y = 0; y < height; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const a = data[index + 3] ?? 0;
      if (a < alphaFloor) continue;
      if (left === -1) left = x;
      right = x;
    }
    rowEnvelope[y] = { left, right };
  }

  let lastKnown = -1;
  for (let y = 0; y < height; y += 1) {
    if (rowEnvelope[y]!.left !== -1) {
      lastKnown = y;
      continue;
    }
    if (lastKnown !== -1) rowEnvelope[y] = { ...rowEnvelope[lastKnown]! };
  }

  let nextKnown = -1;
  for (let y = height - 1; y >= 0; y -= 1) {
    if (rowEnvelope[y]!.left !== -1) {
      nextKnown = y;
      continue;
    }
    if (nextKnown !== -1) rowEnvelope[y] = { ...rowEnvelope[nextKnown]! };
  }

  return rowEnvelope;
}

export function tightenSubjectRgba(data: Buffer, width: number, height: number, minAlpha = 140): Buffer {
  const rowEnvelope = buildCoreRowEnvelope(data, width, height);
  const out = Buffer.alloc(width * height * 4, 0);
  const margin = 22;

  for (let y = 0; y < height; y += 1) {
    const envelope = rowEnvelope[y]!;
    if (envelope.left === -1) continue;
    const minX = Math.max(0, envelope.left - margin);
    const maxX = Math.min(width - 1, envelope.right + margin);

    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const a = data[index + 3] ?? 0;
      if (a < minAlpha || x < minX || x > maxX) continue;
      out[index] = data[index] ?? 0;
      out[index + 1] = data[index + 1] ?? 0;
      out[index + 2] = data[index + 2] ?? 0;
      out[index + 3] = 255;
    }
  }

  return out;
}

export function findOpaqueBounds(data: Buffer, width: number, height: number, alphaCutoff = 24): Bounds {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if ((data[index + 3] ?? 0) < alphaCutoff) continue;
      found = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) return { x: 0, y: 0, width, height };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function clampBounds(bounds: Bounds, width: number, height: number, padding: number): Bounds {
  const x = Math.max(0, bounds.x - padding);
  const y = Math.max(0, bounds.y - padding);
  const right = Math.min(width, bounds.x + bounds.width + padding);
  const bottom = Math.min(height, bounds.y + bounds.height + padding);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export function countOpaquePixels(data: Buffer): number {
  let count = 0;
  for (let index = 3; index < data.length; index += 4) {
    if ((data[index] ?? 0) > 16) count += 1;
  }
  return count;
}

export function buildPartRgba(
  cropped: Buffer,
  width: number,
  height: number,
  partId: (typeof PART_DEFS)[number]['id'],
  yStart: number,
  yEnd: number,
  rowEnvelope?: RowEnvelope[],
): Buffer {
  const out = Buffer.alloc(width * height * 4, 0);
  const top = Math.floor(height * yStart);
  const bottom = Math.ceil(height * yEnd);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const a = cropped[index + 3] ?? 0;
      if (a < 16) continue;

      const r = cropped[index] ?? 0;
      const g = cropped[index + 1] ?? 0;
      const b = cropped[index + 2] ?? 0;
      const envelope = rowEnvelope?.[y];

      if (partId === 'cloak') {
        const isRedCloak = r > 70 && r > g * 1.12 && r > b * 1.15;
        if (!isRedCloak) continue;
        if (envelope && envelope.left !== -1) {
          const minX = Math.max(0, envelope.left - 64);
          const maxX = Math.min(width - 1, envelope.right + 64);
          if (x < minX || x > maxX) continue;
        }
      } else if (partId === 'glow') {
        const isGlow = b > 85 && (g > 65 || r > 45);
        if (!isGlow) continue;
        if (envelope && envelope.left !== -1) {
          const minX = Math.max(0, envelope.left - 72);
          const maxX = Math.min(width - 1, envelope.right + 72);
          if (x < minX || x > maxX) continue;
        }
      } else if (y < top || y >= bottom) {
        continue;
      }

      out[index] = r;
      out[index + 1] = g;
      out[index + 2] = b;
      out[index + 3] = a;
    }
  }

  return out;
}

export function buildPaletteFromRaw(data: Buffer): string[] {
  const picks = new Set<string>();
  const stride = Math.max(4, Math.floor(data.length / 96) * 4);
  for (let index = 0; index < data.length; index += stride) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const a = data[index + 3] ?? 0;
    if (a < 20) continue;
    picks.add(rgbToHex(r, g, b));
    if (picks.size >= 8) break;
  }
  return [...picks];
}

export function toDimension(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  return fallback;
}

export function buildQaReport({
  background,
  bounds,
  cropWidth,
  cropHeight,
  croppedRaw,
  parts,
}: {
  background: Rgb;
  bounds: Bounds;
  cropWidth: number;
  cropHeight: number;
  croppedRaw: Buffer;
  parts: HeroPartSpec[];
}) {
  const subjectCoverage = countOpaquePixels(croppedRaw) / (cropWidth * cropHeight);
  return {
    source: 'ellipse-hero-runtime-pack-v1',
    crop: bounds,
    palette: buildPaletteFromRaw(croppedRaw),
    background_estimate: rgbToHex(background.r, background.g, background.b),
    subject_coverage: Number(subjectCoverage.toFixed(4)),
    parts: parts.map((part) => ({
      id: part.id,
      pixel_count: part.pixelCount,
      coverage: Number((part.pixelCount / (cropWidth * cropHeight)).toFixed(4)),
    })),
    blockers: [
      ...(subjectCoverage < 0.12 ? ['Subject coverage is suspiciously low.'] : []),
      ...(parts.find((part) => part.id === 'head' && part.pixelCount < 2000) ? ['Head extraction is too small for a reliable rig.'] : []),
      ...(parts.find((part) => part.id === 'cloak' && part.pixelCount < 3000) ? ['Red cloak overlay was not extracted strongly enough.'] : []),
    ],
    warnings: [
      'This local workflow assumes a dark isolated background.',
      'Occluded limbs are not hallucinated or repaired in this pass.',
      'Final production animation still benefits from external segmentation and cleanup tooling.',
    ],
  };
}
