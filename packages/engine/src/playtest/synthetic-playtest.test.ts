import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '@ellipse/shared';
import { runSyntheticPlaytest } from './synthetic-playtest.js';

function miniVeloriaGdl() {
  return GameDefinitionSchema.parse({
    meta: { title: 'T', dimension: '2d', version: '1', genre: 'survivors_like' },
    systems: ['lane_runner', 'wave_spawner', 'auto_attack', 'blessing_draft', 'physics_topdown', 'boss_phases'],
    entities: [
      {
        id: 'player',
        components: [{ transform: { x: 360, y: 900 } }, { health: { max: 8, current: 8 } }],
      },
    ],
    scenes: [
      {
        id: 'arena',
        entities: ['player'],
        layout: {
          width: 720,
          height: 1280,
          ground_y: 1200,
          spawn: { x: 360, y: 900 },
          platforms: [],
          collectibles: [],
          lane_meta: {
            lanes: [
              { id: 'lane_left', center_x: 180 },
              { id: 'lane_center', center_x: 360 },
              { id: 'lane_right', center_x: 540 },
            ],
          },
        },
        veloria: {
          encounters: {
            total_waves: 2,
            blessing_breaks_after_waves: [1],
            waves: [
              { wave: 1, enemies: [{ type: 'shade', lane: 'lane_center', count: 1 }] },
              { wave: 2, enemies: [{ type: 'shade', lane: 'lane_center', count: 1 }] },
            ],
          },
          blessings: [
            { id: 'sacred_edge', label: 'Edge' },
            { id: 'divine_grace', label: 'Grace' },
          ],
        },
      },
    ],
  });
}

describe('synthetic-playtest', () => {
  it('Veloria policy gère draft et produit des victoires', () => {
    const report = runSyntheticPlaytest(miniVeloriaGdl(), { runs: 8, maxFramesPerRun: 8000 });
    expect(report.wins + report.losses).toBeGreaterThan(0);
    expect(report.policy).toBe('veloria_survivor_v2');
  });
});
