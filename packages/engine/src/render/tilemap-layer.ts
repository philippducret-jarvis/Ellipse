/**
 * TilemapLayer — rendu Pixi depuis GDL layout.tilemap (parité Tiled simplifié).
 */
import { Assets, Container, Sprite, Texture, Rectangle } from 'pixi.js';
import type { GdlTilemap, TilemapLayerData } from '@ellipse/shared';

export interface TilemapLayerOptions {
  tilemap: GdlTilemap;
  /** Couche visible à dessiner (défaut : première non-collision-only). */
  layerId?: string;
  /** Masquer les rectangles platform debug quand tilemap présent. */
  alpha?: number;
}

export class TilemapLayer {
  readonly root = new Container();
  private built = false;

  constructor(private opts: TilemapLayerOptions) {}

  async load(): Promise<void> {
    this.root.removeChildren();
    const { tilemap } = this.opts;
    const tileSize = tilemap.tile_size ?? 64;
    let texture: Texture;
    try {
      texture = await Assets.load<Texture>(tilemap.tileset);
    } catch {
      this.built = true;
      return;
    }

    const colsInSheet = Math.max(1, Math.floor(texture.width / tileSize));
    const layer =
      tilemap.layers.find((l) => l.id === this.opts.layerId) ??
      tilemap.layers.find((l) => l.visible !== false && !l.collision) ??
      tilemap.layers[0];
    if (!layer) {
      this.built = true;
      return;
    }

    this.buildLayer(layer, texture, tileSize, colsInSheet);
    this.root.alpha = this.opts.alpha ?? 1;
    this.built = true;
  }

  private buildLayer(layer: TilemapLayerData, sheet: Texture, tileSize: number, colsInSheet: number): void {
    for (let ty = 0; ty < layer.height; ty++) {
      for (let tx = 0; tx < layer.width; tx++) {
        const idx = layer.data[ty * layer.width + tx] ?? -1;
        if (idx < 0) continue;
        const col = idx % colsInSheet;
        const row = Math.floor(idx / colsInSheet);
        const frame = new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize);
        const tileTex = new Texture({ source: sheet.source, frame });
        const tile = new Sprite(tileTex);
        tile.x = tx * tileSize;
        tile.y = ty * tileSize;
        tile.width = tileSize;
        tile.height = tileSize;
        this.root.addChild(tile);
      }
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
    this.built = false;
  }
}
