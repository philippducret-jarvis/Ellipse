import { describe, it, expect } from 'vitest';
import { parseRigSpec, deriveRigUrlFromSprite } from './skeletal2d.js';

describe('skeletal2d', () => {
  it('normalise rig Veloria legacy (bones string[])', () => {
    const rig = parseRigSpec({
      version: 1,
      bones: ['root', 'torso', 'head'],
      pivots: { root: { x: 0.5, y: 0.92 }, torso: { x: 0.5, y: 0.55 }, head: { x: 0.5, y: 0.22 } },
    });
    expect(rig?.bones.length).toBe(3);
    expect(rig?.parts?.[0]?.id).toBe('body');
  });

  it('dérive rig URL depuis atlas', () => {
    const url = deriveRigUrlFromSprite('/workspaces/x/03_assets/hero/06_exports/runtime_atlas.png');
    expect(url).toContain('04_rig/rig.json');
  });
});
