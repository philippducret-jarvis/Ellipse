import type { GameDefinition } from '../index.js';

export type GameGenre = 'platformer' | 'runner' | 'puzzle' | 'rpg' | 'fighting';

const BASE_META = {
  dimension: '2d' as const,
  resolution: [1280, 720] as [number, number],
  version: '0.1.0',
};

function playerEntity(spriteUrl?: string) {
  return {
    id: 'player',
    type: 'character' as const,
    assets: {
      sprite: spriteUrl ?? '/assets/placeholder_player.png',
      animations: {
        idle: { frames: [0], fps: 1 },
        run: { frames: [0, 1, 2, 3], fps: 10 },
      },
    },
    components: [
      { transform: { x: 100, y: 400, scale: 1 } },
      { physics: { body: 'dynamic', gravity: 980, friction: 0.1 } },
      { platformer_controller: { move_speed: 220, jump_force: 420, coyote_time_ms: 100 } },
      { health: { max: 3, current: 3 } },
    ],
  };
}

export const GAMEPLAY_TEMPLATES: Record<GameGenre, Partial<GameDefinition>> = {
  platformer: {
    meta: { ...BASE_META, title: 'Platformer' },
    systems: ['input', 'platformer_physics', 'tile_collision', 'animation', 'camera_follow', 'ui'],
    entities: [playerEntity()],
    scenes: [{ id: 'level_01', entities: ['player'], background: { color: '#1a1a2e' } }],
    ui: { hud: [{ type: 'health_bar', bind: 'player.health' }] },
  },
  runner: {
    meta: { ...BASE_META, title: 'Runner' },
    systems: ['input', 'runner_physics', 'endless_scroll', 'collision', 'ui'],
    entities: [
      {
        ...playerEntity(),
        components: [
          { transform: { x: 200, y: 500 } },
          { physics: { body: 'dynamic', gravity: 1200 } },
          { runner_controller: { auto_run: true, jump_force: 480, lane_count: 1 } },
          { health: { max: 1, current: 1 } },
        ],
      },
    ],
    scenes: [{ id: 'run_01', entities: ['player'], background: { color: '#16213e' } }],
  },
  puzzle: {
    meta: { ...BASE_META, title: 'Puzzle' },
    systems: ['input', 'grid_puzzle', 'ui'],
    entities: [
      {
        id: 'cursor',
        type: 'prop' as const,
        components: [{ transform: { x: 640, y: 360 } }],
      },
    ],
    scenes: [{ id: 'puzzle_01', entities: ['cursor'], background: { color: '#0f3460' } }],
  },
  rpg: {
    meta: { ...BASE_META, title: 'RPG Exploration' },
    systems: ['input', 'topdown_movement', 'collision', 'dialogue', 'ui'],
    entities: [playerEntity()],
    scenes: [{ id: 'world_01', entities: ['player'], background: { color: '#1a1a2e' } }],
  },
  fighting: {
    meta: { ...BASE_META, title: 'Fighting' },
    systems: ['input', 'fighting_physics', 'hitbox', 'ui'],
    entities: [
      {
        ...playerEntity(),
        components: [
          { transform: { x: 300, y: 450 } },
          { fighting_controller: { moves: ['punch', 'kick', 'block'] } },
          { health: { max: 100, current: 100 } },
        ],
      },
    ],
    scenes: [{ id: 'arena_01', entities: ['player'], background: { color: '#2d132c' } }],
  },
};

export function getGameplayTemplate(genre: string): Partial<GameDefinition> {
  const key = genre as GameGenre;
  return GAMEPLAY_TEMPLATES[key] ?? GAMEPLAY_TEMPLATES.platformer;
}
