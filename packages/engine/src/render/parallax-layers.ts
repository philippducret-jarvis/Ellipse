/**
 * Parallax2D-like — couches indépendantes du tri Y (Godot Parallax2D / Phaser scrollFactor).
 */
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import {
  normalizeParallaxLayers,
  resolveScrollFactor,
  type BackgroundLike,
  type ParallaxLayer,
} from '@ellipse/shared';

export interface ParallaxStackOptions {
  worldWidth: number;
  worldHeight: number;
  viewWidth: number;
  viewHeight: number;
}

interface LayerEntry {
  spec: ParallaxLayer;
  root: Container;
  sprites: Sprite[];
  scrollFactor: number;
}

export class ParallaxLayerStack {
  readonly root = new Container();
  private entries: LayerEntry[] = [];
  private loaded = false;

  constructor(
    private background: BackgroundLike | undefined,
    private opts: ParallaxStackOptions,
  ) {}

  async load(): Promise<void> {
    this.root.removeChildren();
    this.entries = [];
    const layers = normalizeParallaxLayers(
      this.background,
      this.opts.worldWidth,
      this.opts.worldHeight,
    );

    for (const spec of layers) {
      if (!spec.image) continue;
      let texture: Texture;
      try {
        texture = await Assets.load<Texture>(spec.image);
      } catch {
        continue;
      }

      const scrollFactor = resolveScrollFactor(spec);
      const entryRoot = new Container();
      const sprites: Sprite[] = [];
      const repeat = spec.repeat ?? (scrollFactor < 1 ? 'x' : 'none');
      const alpha = spec.alpha ?? 1;

      if (repeat === 'x' || repeat === 'xy') {
        const tileW = texture.width || this.opts.viewWidth;
        const count = Math.ceil(this.opts.worldWidth / tileW) + 2;
        for (let i = 0; i < count; i++) {
          const s = new Sprite(texture);
          s.x = i * tileW;
          s.y = spec.y ?? 0;
          s.alpha = alpha;
          if (s.width > 0 && this.opts.worldHeight > 0) {
            s.height = this.opts.worldHeight;
            s.width = (texture.width / texture.height) * s.height;
          }
          entryRoot.addChild(s);
          sprites.push(s);
        }
      } else {
        const s = new Sprite(texture);
        s.x = 0;
        s.y = spec.y ?? 0;
        s.alpha = alpha;
        if (scrollFactor >= 0.99) {
          s.width = this.opts.worldWidth;
          s.height = this.opts.worldHeight;
        } else {
          s.width = Math.max(this.opts.worldWidth, texture.width);
          s.height = this.opts.worldHeight;
        }
        entryRoot.addChild(s);
        sprites.push(s);
      }

      this.entries.push({ spec, root: entryRoot, sprites, scrollFactor });
      this.root.addChild(entryRoot);
    }
    this.loaded = true;
  }

  update(camX: number, camY: number, laneShiftX = 0): void {
    if (!this.loaded) return;
    const cx = camX + laneShiftX;
    for (const entry of this.entries) {
      // Compensation dans un parent déjà translaté par −caméra (Godot / Phaser scrollFactor).
      entry.root.x = cx * (1 - entry.scrollFactor);
      entry.root.y = camY * (1 - entry.scrollFactor);
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
    this.entries = [];
    this.loaded = false;
  }
}
