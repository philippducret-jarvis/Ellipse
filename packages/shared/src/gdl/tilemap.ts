/**
 * Tilemap GDL — grille indexée + pont depuis layout.platforms.
 */
import { z } from 'zod';

export const TilemapLayerDataSchema = z
  .object({
    id: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    data: z.array(z.number().int()),
    collision: z.boolean().optional(),
    visible: z.boolean().optional(),
  })
  .passthrough();
export type TilemapLayerData = z.infer<typeof TilemapLayerDataSchema>;

export const GdlTilemapSchema = z
  .object({
    tileset: z.string(),
    tile_size: z.number().int().positive().default(64),
    layers: z.array(TilemapLayerDataSchema).default([]),
  })
  .passthrough();
export type GdlTilemap = z.infer<typeof GdlTilemapSchema>;

export interface PlatformLike {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: string;
}

/** Rasterise platforms AABB → couche collision (index 1 = sol solide). */
export function platformsToTileLayer(
  platforms: PlatformLike[],
  worldWidth: number,
  worldHeight: number,
  tileSize = 64,
  layerId = 'collision',
): TilemapLayerData {
  const cols = Math.ceil(worldWidth / tileSize);
  const rows = Math.ceil(worldHeight / tileSize);
  const data = new Array(cols * rows).fill(-1);

  for (const plat of platforms) {
    const x0 = Math.max(0, Math.floor(plat.x / tileSize));
    const y0 = Math.max(0, Math.floor(plat.y / tileSize));
    const x1 = Math.min(cols - 1, Math.ceil((plat.x + plat.w) / tileSize));
    const y1 = Math.min(rows - 1, Math.ceil((plat.y + plat.h) / tileSize));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        data[ty * cols + tx] = plat.type === 'ground' ? 1 : 2;
      }
    }
  }

  return { id: layerId, width: cols, height: rows, data, collision: true, visible: true };
}

export function tileIndexAt(layer: TilemapLayerData, worldX: number, worldY: number, tileSize: number): number {
  const tx = Math.floor(worldX / tileSize);
  const ty = Math.floor(worldY / tileSize);
  if (tx < 0 || ty < 0 || tx >= layer.width || ty >= layer.height) return -1;
  return layer.data[ty * layer.width + tx] ?? -1;
}

export function isSolidTile(index: number): boolean {
  return index > 0;
}
