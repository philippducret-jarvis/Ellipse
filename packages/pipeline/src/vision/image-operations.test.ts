import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { segmentWithFloodFill, retouchEnhance } from './image-operations.js';

describe('image-operations', () => {
  it('segment flood-fill produit un cutout alpha', async () => {
    const work = join(tmpdir(), `ellipse-img-op-${Date.now()}`);
    await mkdir(work, { recursive: true });
    const src = join(work, 'ref.png');
    await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 20, g: 10, b: 30, alpha: 255 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 24, height: 40, channels: 4, background: { r: 200, g: 50, b: 80, alpha: 255 } },
          })
            .png()
            .toBuffer(),
          left: 20,
          top: 12,
        },
      ])
      .png()
      .toFile(src);

    const outDir = join(work, '02_cutouts');
    const result = await segmentWithFloodFill(src, outDir);
    expect(result.ok).toBe(true);
    expect(result.operation).toBe('segment_floodfill');
    expect(result.outputs.some((p) => p.endsWith('cutout-alpha.png'))).toBe(true);
  });

  it('enhance modifie une image existante', async () => {
    const work = join(tmpdir(), `ellipse-enhance-${Date.now()}`);
    await mkdir(work, { recursive: true });
    const img = join(work, 'sil.png');
    await sharp({
      create: { width: 32, height: 48, channels: 4, background: { r: 100, g: 80, b: 120, alpha: 255 } },
    })
      .png()
      .toFile(img);

    const result = await retouchEnhance(img);
    expect(result.ok).toBe(true);
    expect(result.operation).toBe('retouch_enhance');
  });
});
