import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { produceAssetFamily, produceAssetCast } from './asset-family.js';

const PALETTE = ['#5ec7ef', '#9e4f5c', '#f0d9a6', '#35243f'];
const dirs: string[] = [];
async function tmp(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'ellipse-asset-'));
  dirs.push(d);
  return d;
}
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

describe('AssetFamilyPipeline', () => {
  it('produit un PNG réel pour un héros (mid profile)', async () => {
    const out = await tmp();
    const res = await produceAssetFamily({ id: 'hero', family: 'character', palette: PALETTE, seed: 7, outputDir: out, profile: 'mid' });
    await stat(res.pngPath); // existe
    const meta = await sharp(res.pngPath).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(res.width * 2); // mid = pixelRatio 2
  });

  it('produit un cast cohérent (même palette) en une passe', async () => {
    const out = await tmp();
    const cast = await produceAssetCast(
      [
        { id: 'hero', family: 'character' },
        { id: 'sporeling', family: 'enemy' },
        { id: 'mushroom', family: 'prop' },
      ],
      { palette: PALETTE, outputDir: out, profile: 'low' },
    );
    expect(cast).toHaveLength(3);
    for (const a of cast) {
      expect(a.spec.palette).toEqual(PALETTE);
      await stat(a.pngPath);
    }
  });
});
