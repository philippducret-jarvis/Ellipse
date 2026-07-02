import { describe, it, expect } from 'vitest';
import {
  depthAt,
  scaleAtDepth,
  scaleAtY,
  feetY,
  computeSortKey,
  parallaxOffset,
  laneParallaxShift,
  resolveScrollFactor,
  normalizeParallaxLayers,
  defaultDepthSpecForMode,
} from './depth.js';

describe('depth — profondeur 2.5D', () => {
  it('depthAt interpole horizon → sol', () => {
    expect(depthAt(110, 110, 620)).toBe(0);
    expect(depthAt(620, 110, 620)).toBe(1);
    expect(depthAt(365, 110, 620)).toBeCloseTo(0.5, 1);
  });

  it('scaleAtY agrandit vers le sol (lanes Veloria)', () => {
    expect(scaleAtY(110, 110, 620, [0.5, 1.12])).toBeCloseTo(0.5, 2);
    expect(scaleAtY(620, 110, 620, [0.5, 1.12])).toBeCloseTo(1.12, 2);
  });

  it('feetY + computeSortKey — tri Y-sort Godot/Phaser', () => {
    const fy = feetY(400, 80, 0.92);
    expect(fy).toBeCloseTo(473.6, 1);
    expect(computeSortKey(fy)).toBe(fy);
    expect(computeSortKey(fy, 200, { sort_key: 'feet_y_skew', sort_skew: 0.01 })).toBeCloseTo(fy + 2, 1);
  });

  it('parallaxOffset — scroll_factor Phaser', () => {
    expect(parallaxOffset(100, 0, 0)).toEqual({ x: 100, y: 0 });
    expect(parallaxOffset(100, 0, 1)).toEqual({ x: 0, y: 0 });
    expect(parallaxOffset(100, 50, 0.25)).toEqual({ x: 75, y: 37.5 });
  });

  it('resolveScrollFactor accepte alias parallax legacy', () => {
    expect(resolveScrollFactor({ id: 'far', image: 'x', scroll_factor: 0.2 })).toBe(0.2);
    expect(resolveScrollFactor({ id: 'far', image: 'x', parallax: 0.42 })).toBe(0.42);
  });

  it('normalizeParallaxLayers depuis background.layers ou image unique', () => {
    const multi = normalizeParallaxLayers(
      {
        layers: [
          { id: 'far', image: '/far.png', scroll_factor: 0.2 },
          { id: 'play', image: '/play.png', scroll_factor: 1 },
        ],
      },
      2304,
      720,
    );
    expect(multi).toHaveLength(2);

    const single = normalizeParallaxLayers({ image: '/bg.png', alpha: 0.8 }, 1280, 720);
    expect(single[0]?.scroll_factor).toBe(1);
    expect(single[0]?.alpha).toBe(0.8);
  });

  it('defaultDepthSpecForMode — lane_perspective Veloria', () => {
    const spec = defaultDepthSpecForMode('lane_perspective', { ground_y: 973 });
    expect(spec.horizon_y).toBe(110);
    expect(spec.scale_range).toEqual([0.5, 1.12]);
  });
});
