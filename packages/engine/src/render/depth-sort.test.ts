import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { applyDepthSort, sortKeyForEntity } from './depth-sort.js';

describe('depth-sort — Y-sort runtime', () => {
  it('tri plus bas = devant (zIndex plus grand)', () => {
    const far = new Container();
    const near = new Container();
    applyDepthSort(
      [
        { display: far, x: 10, y: 100, width: 40, height: 80, visible: true },
        { display: near, x: 10, y: 400, width: 40, height: 80, visible: true },
      ],
      { mode: 'side_scroll', sort_key: 'feet_y', feet_offset: 0.92 },
    );
    expect(near.zIndex).toBeGreaterThan(far.zIndex);
  });

  it('sortKeyForEntity respecte feet_offset entité', () => {
    const a = sortKeyForEntity(
      { display: new Container(), x: 0, y: 200, width: 50, height: 100, depth: { feet_offset: 1 } },
      { mode: 'side_scroll', sort_key: 'feet_y' },
    );
    const b = sortKeyForEntity(
      { display: new Container(), x: 0, y: 200, width: 50, height: 100, depth: { feet_offset: 0.5 } },
      { mode: 'side_scroll', sort_key: 'feet_y' },
    );
    expect(a).toBeGreaterThan(b);
  });
});
