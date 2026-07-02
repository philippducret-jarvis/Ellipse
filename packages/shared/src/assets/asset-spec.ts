/**
 * AssetSpec — contrat d'asset **vectoriel** (thèse « HD sans GPU », Lot 1F).
 *
 * Un asset est décrit en primitives paramétriques + palette, pas en pixels. Il est rendu
 * en SVG (résolution-indépendant) puis rastérisé à n'importe quelle densité (mobile @1x→@3x)
 * sans perte et **sans GPU**. L'IA (agents, Lot 3) produit ces specs ; la synthèse est
 * déterministe et reproductible (champ `seed`).
 *
 * `renderAssetSpecToSvg` est **pur** (aucune dépendance native) → testable et portable.
 * La rastérisation SVG→PNG (via sharp, CPU) appartient au pipeline/agents.
 */
import { z } from 'zod';

/** Couleur : hex direct (`#rrggbb`) ou référence palette (`palette:0`). */
export const ColorRefSchema = z.string();

const baseStyle = {
  fill: ColorRefSchema.optional(),
  stroke: ColorRefSchema.optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
};

export const ShapeSchema = z.discriminatedUnion('shape', [
  z.object({ shape: z.literal('rect'), x: z.number(), y: z.number(), w: z.number(), h: z.number(), rx: z.number().optional(), ...baseStyle }),
  z.object({ shape: z.literal('circle'), cx: z.number(), cy: z.number(), r: z.number(), ...baseStyle }),
  z.object({ shape: z.literal('ellipse'), cx: z.number(), cy: z.number(), rx: z.number(), ry: z.number(), ...baseStyle }),
  z.object({ shape: z.literal('polygon'), points: z.array(z.tuple([z.number(), z.number()])), ...baseStyle }),
  z.object({ shape: z.literal('path'), d: z.string(), ...baseStyle }),
]);
export type Shape = z.infer<typeof ShapeSchema>;

export const AssetLayerSchema = z.object({
  id: z.string(),
  shapes: z.array(ShapeSchema),
  opacity: z.number().min(0).max(1).optional(),
});
export type AssetLayer = z.infer<typeof AssetLayerSchema>;

export const AssetSpecSchema = z.object({
  id: z.string(),
  kind: z.string(),
  /** Dimensions logiques (unités vectorielles, indépendantes de la densité). */
  width: z.number().positive(),
  height: z.number().positive(),
  palette: z.array(z.string()).default([]),
  layers: z.array(AssetLayerSchema),
  seed: z.number().int().optional(),
  background: ColorRefSchema.optional(),
});
export type AssetSpec = z.infer<typeof AssetSpecSchema>;

/* ── Profils & budgets (perf mobile, Lot 1F/9) ───────────────────────────── */

export type RuntimeProfileId = 'low' | 'mid' | 'high';

export interface TextureBudget {
  /** Densité de rastérisation (≈ devicePixelRatio cible). */
  pixelRatio: number;
  /** Côté max d'une texture rastérisée (px). */
  maxTextureSize: number;
}

export const TEXTURE_BUDGETS: Record<RuntimeProfileId, TextureBudget> = {
  low: { pixelRatio: 1, maxTextureSize: 1024 },
  mid: { pixelRatio: 2, maxTextureSize: 2048 },
  high: { pixelRatio: 3, maxTextureSize: 4096 },
};

/* ── Rendu SVG (pur, déterministe) ───────────────────────────────────────── */

function resolveColor(ref: string | undefined, palette: string[]): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith('palette:')) {
    const idx = Number.parseInt(ref.slice('palette:'.length), 10);
    return palette[idx] ?? '#000000';
  }
  return ref;
}

function styleAttrs(s: Record<string, unknown>, palette: string[]): string {
  const fill = resolveColor(s.fill as string | undefined, palette) ?? 'none';
  const parts = [`fill="${fill}"`];
  const stroke = resolveColor(s.stroke as string | undefined, palette);
  if (stroke) parts.push(`stroke="${stroke}"`);
  if (typeof s.strokeWidth === 'number') parts.push(`stroke-width="${s.strokeWidth}"`);
  if (typeof s.opacity === 'number') parts.push(`opacity="${s.opacity}"`);
  return parts.join(' ');
}

function renderShape(shape: Shape, palette: string[]): string {
  const a = styleAttrs(shape as unknown as Record<string, unknown>, palette);
  switch (shape.shape) {
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}"${
        shape.rx != null ? ` rx="${shape.rx}"` : ''
      } ${a}/>`;
    case 'circle':
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" ${a}/>`;
    case 'ellipse':
      return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" ${a}/>`;
    case 'polygon':
      return `<polygon points="${shape.points.map(([x, y]) => `${x},${y}`).join(' ')}" ${a}/>`;
    case 'path':
      return `<path d="${shape.d}" ${a}/>`;
  }
}

export interface RenderSvgOptions {
  /** Multiplicateur de densité (HD = scale élevé sans régénérer la spec). */
  scale?: number;
}

/** Rend l'`AssetSpec` en SVG (chaîne). Déterministe : même spec → même sortie. */
export function renderAssetSpecToSvg(spec: AssetSpec, opts: RenderSvgOptions = {}): string {
  const scale = opts.scale ?? 1;
  const outW = Math.round(spec.width * scale);
  const outH = Math.round(spec.height * scale);
  const palette = spec.palette;

  const body: string[] = [];
  if (spec.background) {
    const bg = resolveColor(spec.background, palette) ?? '#000000';
    body.push(`<rect x="0" y="0" width="${spec.width}" height="${spec.height}" fill="${bg}"/>`);
  }
  for (const layer of spec.layers) {
    const op = layer.opacity != null ? ` opacity="${layer.opacity}"` : '';
    body.push(`<g id="${layer.id}"${op}>${layer.shapes.map((s) => renderShape(s, palette)).join('')}</g>`);
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" ` +
    `viewBox="0 0 ${spec.width} ${spec.height}">${body.join('')}</svg>`
  );
}
