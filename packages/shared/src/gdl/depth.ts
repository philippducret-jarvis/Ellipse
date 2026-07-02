/**
 * Contrat profondeur 2.5D — parité Godot (Parallax2D + YSort) / Phaser (scrollFactor + depth).
 * Math pure (sans rendu) : consommée par @ellipse/engine, agents Level/Decor, previews.
 */
import { z } from 'zod';

export const DepthModeSchema = z.enum([
  'side_scroll',
  'lane_perspective',
  'top_down_axis',
  'flat',
]);
export type DepthMode = z.infer<typeof DepthModeSchema>;

export const ParallaxRepeatSchema = z.enum(['none', 'x', 'xy']);

export const ParallaxLayerSchema = z
  .object({
    id: z.string(),
    image: z.string(),
    /** 0 = fixe caméra, 1 = monde, >1 = premier plan (Phaser scrollFactor). */
    scroll_factor: z.number().min(0).max(2).optional(),
    /** Alias legacy (scene-pack Echoes). */
    parallax: z.number().min(0).max(2).optional(),
    alpha: z.number().min(0).max(1).optional(),
    repeat: ParallaxRepeatSchema.optional(),
    sort_group: z.enum(['background', 'world', 'foreground']).optional(),
    y: z.number().optional(),
    tint: z.string().optional(),
  })
  .passthrough();
export type ParallaxLayer = z.infer<typeof ParallaxLayerSchema>;

export const DepthSpecSchema = z
  .object({
    mode: DepthModeSchema.default('side_scroll'),
    sort_key: z.enum(['feet_y', 'feet_y_skew']).default('feet_y'),
    sort_skew: z.number().optional(),
    horizon_y: z.number().optional(),
    ground_y: z.number().optional(),
    scale_range: z.tuple([z.number(), z.number()]).optional(),
    feet_offset: z.number().min(0).max(1).optional(),
    lane_parallax_shift: z.number().optional(),
  })
  .passthrough();
export type DepthSpec = z.infer<typeof DepthSpecSchema>;

export const CameraSpecSchema = z
  .object({
    mode: z.enum(['follow_horizontal', 'follow_target', 'fixed', 'top_down']).optional(),
    follow: z.string().optional(),
    bounds: z.union([z.boolean(), z.literal('clamp'), z.literal('none')]).optional(),
    smoothing: z.number().min(0).max(1).optional(),
    dead_zone: z.object({ x: z.number(), y: z.number() }).optional(),
  })
  .passthrough();
export type CameraSpec = z.infer<typeof CameraSpecSchema>;

export const EntityDepthSchema = z
  .object({
    plane: z.string().optional(),
    feet_offset: z.number().min(0).max(1).optional(),
    parallax_group: z.string().nullable().optional(),
    sort_bias: z.number().optional(),
  })
  .passthrough();
export type EntityDepth = z.infer<typeof EntityDepthSchema>;

export interface BackgroundLike {
  color?: string;
  image?: string;
  alpha?: number;
  layers?: ParallaxLayer[];
}

/** scroll_factor canonique ; `parallax` legacy = même sémantique. */
export function resolveScrollFactor(layer: ParallaxLayer): number {
  if (typeof layer.scroll_factor === 'number') return layer.scroll_factor;
  if (typeof layer.parallax === 'number') return layer.parallax;
  return 1;
}

/** Normalise background GDL → liste de couches parallax triées (back → front). */
export function normalizeParallaxLayers(
  bg: BackgroundLike | undefined,
  fallbackWidth: number,
  fallbackHeight: number,
): ParallaxLayer[] {
  if (!bg) return [];
  if (Array.isArray(bg.layers) && bg.layers.length > 0) {
    return bg.layers.map((l) => ParallaxLayerSchema.parse(l));
  }
  if (bg.image) {
    return [
      {
        id: 'background',
        image: bg.image,
        scroll_factor: 1,
        alpha: bg.alpha ?? 1,
        sort_group: 'world' as const,
      },
    ];
  }
  return [];
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Profondeur normalisée 0 (horizon) → 1 (sol). */
export function depthAt(y: number, horizonY: number, groundY: number): number {
  const span = groundY - horizonY;
  if (span <= 0) return 0.5;
  return clamp01((y - horizonY) / span);
}

export function scaleAtDepth(depth: number, scaleRange: [number, number] = [0.5, 1.12]): number {
  const [minS, maxS] = scaleRange;
  return minS + (maxS - minS) * clamp01(depth);
}

export function scaleAtY(
  y: number,
  horizonY: number,
  groundY: number,
  scaleRange?: [number, number],
): number {
  return scaleAtDepth(depthAt(y, horizonY, groundY), scaleRange);
}

/** Y du pied pour tri (Godot YSort — origine bas sprite). */
export function feetY(entityY: number, height: number, feetOffset = 0.92): number {
  return entityY + height * feetOffset;
}

/** Clé de tri painter (Phaser setDepth). */
export function computeSortKey(
  feetYValue: number,
  feetX?: number,
  spec?: Pick<DepthSpec, 'sort_key' | 'sort_skew'>,
  bias = 0,
): number {
  if (spec?.sort_key === 'feet_y_skew' && typeof feetX === 'number') {
    const skew = spec.sort_skew ?? 0.001;
    return feetYValue + feetX * skew + bias;
  }
  return feetYValue + bias;
}

/** Offset parallax couche = position caméra × (1 − scroll_factor). */
export function parallaxOffset(
  camX: number,
  camY: number,
  scrollFactor: number,
): { x: number; y: number } {
  return {
    x: camX * (1 - scrollFactor),
    y: camY * (1 - scrollFactor),
  };
}

/** Décalage horizontal arène selon lane (Veloria). */
export function laneParallaxShift(
  laneIndex: number,
  laneCount: number,
  strength = 22,
): number {
  if (laneCount <= 1) return 0;
  const center = (laneCount - 1) / 2;
  return (laneIndex - center) * strength;
}

export function defaultDepthSpecForMode(
  mode: DepthMode,
  layout?: { ground_y?: number; height?: number },
): DepthSpec {
  const groundY = layout?.ground_y ?? layout?.height ?? 720;
  if (mode === 'lane_perspective') {
    return {
      mode,
      sort_key: 'feet_y',
      horizon_y: 110,
      ground_y: groundY,
      scale_range: [0.5, 1.12],
      feet_offset: 0.92,
      lane_parallax_shift: 22,
    };
  }
  if (mode === 'top_down_axis') {
    return { mode, sort_key: 'feet_y_skew', sort_skew: 0.002, ground_y: groundY, feet_offset: 0.85 };
  }
  if (mode === 'flat') {
    return { mode, sort_key: 'feet_y', feet_offset: 1 };
  }
  return { mode: 'side_scroll', sort_key: 'feet_y', ground_y: groundY, feet_offset: 0.92 };
}
