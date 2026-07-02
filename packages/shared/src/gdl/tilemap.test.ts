import { describe, it, expect } from 'vitest';
import { platformsToTileLayer, tileIndexAt, isSolidTile } from './tilemap.js';

describe('tilemap — rasterisation platforms', () => {
  it('platformsToTileLayer remplit les cellules sol', () => {
    const layer = platformsToTileLayer(
      [{ x: 0, y: 128, w: 128, h: 64, type: 'ground' }],
      256,
      256,
      64,
    );
    expect(layer.width).toBe(4);
    expect(layer.height).toBe(4);
    expect(tileIndexAt(layer, 32, 160, 64)).toBe(1);
    expect(isSolidTile(1)).toBe(true);
    expect(tileIndexAt(layer, 200, 32, 64)).toBe(-1);
  });
});
