import { describe, expect, it } from 'vitest';
import { generateLevelLayout } from './level-gen.js';
import { buildSceneFromBoard, checkSceneTraversability, layoutToBoard } from './world-factory.js';

describe('layoutToBoard + world-factory', () => {
  it('convertit un layout level-gen en scène traversable', () => {
    const layout = generateLevelLayout('platformer', 1280, 720);
    const board = layoutToBoard(layout, 'level_test', 'platformer');
    const scene = buildSceneFromBoard(board);
    const merged = { ...scene, layout: { ...scene.layout, ...layout, platforms: layout.platforms } };
    const report = checkSceneTraversability(merged);
    expect(merged.layout?.platforms.length).toBeGreaterThan(0);
    expect(report.ok).toBe(true);
  });
});
