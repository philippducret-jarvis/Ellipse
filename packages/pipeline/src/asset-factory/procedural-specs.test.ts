import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { AssetSpecSchema, renderAssetSpecToSvg } from '@ellipse/shared';
import { generateAssetSpec, type AssetFamily } from './procedural-specs.js';
import { rasterizeAssetSpecToPng } from './rasterize.js';

const ECHOES_PALETTE = ['#5ec7ef', '#9e4f5c', '#f0d9a6', '#35243f'];

describe('procedural-specs — génération d’AssetSpec', () => {
  it.each(['character', 'enemy', 'prop'] as AssetFamily[])(
    'produit un AssetSpec valide pour la famille %s',
    (family) => {
      const spec = generateAssetSpec({ id: `${family}_1`, family, palette: ECHOES_PALETTE, seed: 7 });
      expect(() => AssetSpecSchema.parse(spec)).not.toThrow();
      expect(spec.kind).toBe(family);
      expect(spec.layers.length).toBeGreaterThan(0);
      expect(spec.palette).toEqual(ECHOES_PALETTE);
    },
  );

  it('est déterministe : même seed → même spec', () => {
    const a = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 42 });
    const b = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 42 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('le seed change la géométrie', () => {
    const a = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 1 });
    const b = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 2 });
    expect(JSON.stringify(a.layers)).not.toBe(JSON.stringify(b.layers));
  });

  it('rend un SVG HD à toute densité (style-lock palette)', () => {
    const spec = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 7 });
    const svg = renderAssetSpecToSvg(spec, { scale: 3 });
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain('width="192"');
    expect(svg).toContain('#5ec7ef'); // palette résolue
  });

  it('tolère une palette vide (fallback)', () => {
    const spec = generateAssetSpec({ id: 'x', family: 'prop', palette: [], seed: 3 });
    expect(spec.palette.length).toBeGreaterThan(0);
  });
});

describe('rasterize — boucle HD sans GPU (AssetSpec → PNG CPU)', () => {
  it('rastérise un PNG aux dimensions de la densité demandée', async () => {
    const spec = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 7 });
    const png = await rasterizeAssetSpecToPng(spec, { scale: 2 });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(spec.width * 2); // 128
    expect(meta.height).toBe(spec.height * 2);
  });

  it('le profil "high" produit une densité supérieure au profil "low"', async () => {
    const spec = generateAssetSpec({ id: 'hero', family: 'character', palette: ECHOES_PALETTE, seed: 7 });
    const low = await sharp(await rasterizeAssetSpecToPng(spec, { profile: 'low' })).metadata();
    const high = await sharp(await rasterizeAssetSpecToPng(spec, { profile: 'high' })).metadata();
    expect(high.width!).toBeGreaterThan(low.width!);
  });
});
