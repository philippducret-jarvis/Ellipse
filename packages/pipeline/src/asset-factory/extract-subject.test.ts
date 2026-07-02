import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { extractSubject } from './extract-subject.js';

const dirs: string[] = [];
afterAll(async () => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))) as unknown as void);

describe('extractSubject — détourage par remplissage de fond', () => {
  it('retire le fond uni et garde le sujet central', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ellipse-extract-'));
    dirs.push(dir);
    // Fond bleu uni + disque rouge central (le sujet ne touche pas le bord).
    const src = join(dir, 'src.png');
    await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 20, g: 30, b: 200, alpha: 255 } } })
      .composite([
        { input: Buffer.from('<svg width="200" height="200"><circle cx="100" cy="100" r="55" fill="#d83a2a"/></svg>'), left: 0, top: 0 },
      ])
      .png()
      .toFile(src);

    const res = await extractSubject(src, join(dir, 'out.png'), { tolerance: 60 });
    // Le fond (majorité de l'image) doit être retiré.
    expect(res.removedRatio).toBeGreaterThan(0.4);
    // Le sujet recadré est plus petit que l'original.
    expect(res.width).toBeLessThan(180);
    expect(res.width).toBeGreaterThan(60);

    // Le centre du sprite reste opaque (sujet préservé).
    const { data, info } = await sharp(join(dir, 'out.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cx = Math.floor(info.width / 2);
    const cy = Math.floor(info.height / 2);
    const alphaCenter = data[(cy * info.width + cx) * info.channels + 3];
    expect(alphaCenter).toBeGreaterThan(200);
  });
});
