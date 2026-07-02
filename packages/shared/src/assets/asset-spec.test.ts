import { describe, it, expect } from 'vitest';
import {
  AssetSpecSchema,
  renderAssetSpecToSvg,
  TEXTURE_BUDGETS,
  type AssetSpec,
} from './asset-spec.js';

const HERO: AssetSpec = AssetSpecSchema.parse({
  id: 'hero',
  kind: 'character',
  width: 64,
  height: 64,
  seed: 42,
  palette: ['#5ec7ef', '#9e4f5c'],
  background: undefined,
  layers: [
    {
      id: 'body',
      shapes: [
        { shape: 'rect', x: 16, y: 16, w: 32, h: 40, rx: 6, fill: 'palette:0' },
        { shape: 'circle', cx: 32, cy: 12, r: 10, fill: 'palette:1', stroke: '#000000', strokeWidth: 2 },
      ],
    },
  ],
});

describe('AssetSpec — rendu SVG vectoriel', () => {
  it('produit un SVG valide avec viewBox logique', () => {
    const svg = renderAssetSpecToSvg(HERO);
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain('width="64"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<circle');
  });

  it('résout les références palette', () => {
    const svg = renderAssetSpecToSvg(HERO);
    expect(svg).toContain('fill="#5ec7ef"'); // palette:0
    expect(svg).toContain('fill="#9e4f5c"'); // palette:1
  });

  it('HD sans GPU : scale change la taille de sortie, pas le viewBox (résolution-indépendant)', () => {
    const svg3x = renderAssetSpecToSvg(HERO, { scale: 3 });
    expect(svg3x).toContain('width="192"'); // 64 * 3
    expect(svg3x).toContain('height="192"');
    expect(svg3x).toContain('viewBox="0 0 64 64"'); // inchangé → aucune perte
  });

  it('déterministe : même spec → même SVG', () => {
    expect(renderAssetSpecToSvg(HERO)).toBe(renderAssetSpecToSvg(HERO));
  });

  it('budgets de texture par profil', () => {
    expect(TEXTURE_BUDGETS.low.pixelRatio).toBe(1);
    expect(TEXTURE_BUDGETS.high.maxTextureSize).toBeGreaterThan(TEXTURE_BUDGETS.low.maxTextureSize);
  });
});
