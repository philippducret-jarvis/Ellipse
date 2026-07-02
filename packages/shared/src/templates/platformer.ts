import type { GameDefinition } from '../index.js';

export function createEmptyGDL(title: string, dimension: '2d' | '3d' = '2d'): GameDefinition {
  return {
    meta: {
      title,
      dimension,
      resolution: dimension === '2d' ? [1280, 720] : [1920, 1080],
      version: '0.1.0',
    },
    entities: [],
    scenes: [],
    systems: ['input'],
  };
}

export const PLATFORMER_TEMPLATE: GameDefinition = {
  meta: {
    title: 'Generated Platformer',
    dimension: '2d',
    resolution: [1280, 720],
    version: '0.1.0',
  },
  style: {
    mood: 'arcade',
    palette: ['#1a1a2e', '#e94560'],
  },
  systems: [
    'input',
    'platformer_physics',
    'tile_collision',
    'animation',
    'camera_follow',
    'ui',
  ],
  entities: [
    {
      id: 'player',
      type: 'character',
      assets: { sprite: 'assets/player.png' },
      components: [
        { transform: { x: 100, y: 400 } },
        { physics: { body: 'dynamic', gravity: 980 } },
        { platformer_controller: { move_speed: 200, jump_force: 420 } },
      ],
    },
  ],
  scenes: [
    {
      id: 'level_01',
      entities: ['player'],
      background: { color: '#1a1a2e' },
    },
  ],
};
