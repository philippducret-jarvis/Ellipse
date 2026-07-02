/**
 * Générateur procédural d'`AssetSpec` vectoriels (Lot 3a) — **pur, déterministe, sans GPU**.
 *
 * Cœur du différenciateur « HD sans GPU » : l'IA fournit la famille + la palette (style-lock)
 * + un seed ; ce module synthétise un asset vectoriel (primitives), rendu ensuite en SVG
 * (`renderAssetSpecToSvg`, shared) puis rastérisé à n'importe quelle densité.
 *
 * Aucune I/O, aucun `sharp` : 100 % calculable et testable. Même (famille, palette, seed)
 * → même `AssetSpec` (reproductibilité).
 */
import { AssetSpecSchema, type AssetSpec, type AssetLayer, type Shape } from '@ellipse/shared';

export type AssetFamily = 'character' | 'enemy' | 'prop';

export interface ProceduralSpecInput {
  id: string;
  family: AssetFamily;
  /** Palette de style (style-lock). ≥2 couleurs recommandées. */
  palette: string[];
  seed?: number;
  width?: number;
  height?: number;
}

/** PRNG déterministe (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_PALETTE = ['#5ec7ef', '#9e4f5c', '#f0d9a6', '#35243f'];

function pal(index: number, palette: string[]): string {
  const p = palette.length > 0 ? palette : DEFAULT_PALETTE;
  return `palette:${index % p.length}`;
}

export function generateAssetSpec(input: ProceduralSpecInput): AssetSpec {
  const palette = input.palette.length > 0 ? input.palette : DEFAULT_PALETTE;
  const seed = input.seed ?? 1;
  const w = input.width ?? 64;
  const h = input.height ?? 64;
  const r = rng(seed);

  let layers: AssetLayer[];
  switch (input.family) {
    case 'character':
      layers = characterLayers(w, h, palette, r);
      break;
    case 'enemy':
      layers = enemyLayers(w, h, palette, r);
      break;
    case 'prop':
      layers = propLayers(w, h, palette, r);
      break;
  }

  return AssetSpecSchema.parse({
    id: input.id,
    kind: input.family,
    width: w,
    height: h,
    seed,
    palette,
    layers,
  });
}

function characterLayers(w: number, h: number, palette: string[], r: () => number): AssetLayer[] {
  const cx = w / 2;
  const torsoW = w * (0.34 + r() * 0.08);
  const torsoH = h * 0.42;
  const torsoX = cx - torsoW / 2;
  const torsoY = h * 0.42;
  const headR = w * (0.16 + r() * 0.04);
  const headY = torsoY - headR * 0.7;

  const body: Shape[] = [
    // jambes
    { shape: 'rect', x: torsoX + 2, y: torsoY + torsoH - 2, w: torsoW * 0.35, h: h * 0.16, fill: pal(3, palette) },
    { shape: 'rect', x: cx + 2, y: torsoY + torsoH - 2, w: torsoW * 0.35, h: h * 0.16, fill: pal(3, palette) },
    // torse
    { shape: 'rect', x: torsoX, y: torsoY, w: torsoW, h: torsoH, rx: torsoW * 0.25, fill: pal(0, palette) },
    // bras
    { shape: 'rect', x: torsoX - torsoW * 0.18, y: torsoY + 2, w: torsoW * 0.18, h: torsoH * 0.7, rx: 4, fill: pal(1, palette) },
    { shape: 'rect', x: torsoX + torsoW, y: torsoY + 2, w: torsoW * 0.18, h: torsoH * 0.7, rx: 4, fill: pal(1, palette) },
  ];
  const head: Shape[] = [
    { shape: 'circle', cx, cy: headY, r: headR, fill: pal(2, palette) },
  ];
  const face: Shape[] = [
    { shape: 'circle', cx: cx - headR * 0.4, cy: headY, r: headR * 0.16, fill: '#16131f' },
    { shape: 'circle', cx: cx + headR * 0.4, cy: headY, r: headR * 0.16, fill: '#16131f' },
  ];
  return [
    { id: 'body', shapes: body },
    { id: 'head', shapes: head },
    { id: 'face', shapes: face },
  ];
}

function enemyLayers(w: number, h: number, palette: string[], r: () => number): AssetLayer[] {
  const cx = w / 2;
  const bodyR = w * (0.3 + r() * 0.06);
  const cy = h * 0.55;
  // corps anguleux (losange) + cornes
  const body: Shape[] = [
    {
      shape: 'polygon',
      points: [
        [cx, cy - bodyR],
        [cx + bodyR, cy],
        [cx, cy + bodyR],
        [cx - bodyR, cy],
      ],
      fill: pal(1, palette),
      stroke: '#16131f',
      strokeWidth: 2,
    },
    { shape: 'polygon', points: [[cx - bodyR * 0.6, cy - bodyR], [cx - bodyR * 0.2, cy - bodyR * 1.5], [cx - bodyR * 0.2, cy - bodyR * 0.7]], fill: pal(3, palette) },
    { shape: 'polygon', points: [[cx + bodyR * 0.6, cy - bodyR], [cx + bodyR * 0.2, cy - bodyR * 1.5], [cx + bodyR * 0.2, cy - bodyR * 0.7]], fill: pal(3, palette) },
  ];
  const eyes: Shape[] = [
    { shape: 'circle', cx: cx - bodyR * 0.35, cy, r: bodyR * 0.12, fill: '#f0d9a6' },
    { shape: 'circle', cx: cx + bodyR * 0.35, cy, r: bodyR * 0.12, fill: '#f0d9a6' },
  ];
  return [
    { id: 'body', shapes: body },
    { id: 'eyes', shapes: eyes },
  ];
}

function propLayers(w: number, h: number, palette: string[], r: () => number): AssetLayer[] {
  const cx = w / 2;
  const capR = w * (0.3 + r() * 0.05);
  const capY = h * 0.42;
  const stemW = w * 0.18;
  // champignon (cohérent avec Echoes) : tige + chapeau + pois
  const shapes: Shape[] = [
    { shape: 'rect', x: cx - stemW / 2, y: capY, w: stemW, h: h * 0.4, rx: stemW * 0.3, fill: pal(2, palette) },
    { shape: 'ellipse', cx, cy: capY, rx: capR, ry: capR * 0.7, fill: pal(1, palette) },
    { shape: 'circle', cx: cx - capR * 0.4, cy: capY - capR * 0.1, r: capR * 0.12, fill: pal(2, palette) },
    { shape: 'circle', cx: cx + capR * 0.3, cy: capY + capR * 0.1, r: capR * 0.1, fill: pal(2, palette) },
  ];
  return [{ id: 'prop', shapes }];
}
