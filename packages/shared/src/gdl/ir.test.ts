import { describe, it, expect } from 'vitest';
import {
  ComponentSchema,
  EntitySchema,
  SceneSchema,
  GdlLayoutSchema,
  isKnownSystem,
} from './ir.js';
import { GameDefinitionSchema } from '../index.js';
import { PLATFORMER_TEMPLATE } from '../templates/platformer.js';

describe('IR — composants', () => {
  it('valide un transform mono-clé', () => {
    expect(ComponentSchema.parse({ transform: { x: 1, y: 2 } }).transform?.x).toBe(1);
  });

  it('accepte un composant inconnu (forward-compat)', () => {
    const c = ComponentSchema.parse({ patrol: { range: 120, speed: 80 }, custom_flag: true });
    expect(c.patrol?.range).toBe(120);
    expect((c as Record<string, unknown>).custom_flag).toBe(true);
  });

  it('rejette un health sans max', () => {
    expect(() => ComponentSchema.parse({ health: { current: 3 } })).toThrow();
  });
});

describe('IR — entité', () => {
  it('parse le joueur Echoes (sprite + animations + composants)', () => {
    const e = EntitySchema.parse({
      id: 'player',
      type: 'character',
      assets: {
        sprite: '/ref/hero_echo_front.png',
        frame_count: 1,
        animations: { idle: { frames: [0], fps: 1 } },
      },
      components: [
        { transform: { x: 96, y: 560, scale: 1 } },
        { physics: { body: 'dynamic', gravity: 980, friction: 0.1 } },
        { platformer_controller: { move_speed: 230, jump_force: 430, coyote_time_ms: 100 } },
        { health: { max: 3, current: 3 } },
      ],
    });
    expect(e.id).toBe('player');
    expect(e.components).toHaveLength(4);
    expect(e.assets?.animations?.idle?.fps).toBe(1);
  });
});

describe('IR — scène avec layout complet (Echoes level_01)', () => {
  it('parse layout + zones + hazards + checkpoints', () => {
    const layout = GdlLayoutSchema.parse({
      width: 1280,
      height: 720,
      ground_y: 632,
      spawn: { x: 96, y: 560 },
      platforms: [{ x: 0, y: 632, w: 420, h: 88, type: 'ground' }],
      collectibles: [{ x: 430, y: 482, type: 'spore' }],
      checkpoints: [{ x: 104, y: 556, label: 'Reveil' }],
      hazards: [{ x: 468, y: 638, w: 76, h: 18, kind: 'spikes' }],
      zones: [{ id: 'awakening', label: 'Reveil', x: 0, y: 0, w: 320, h: 720, theme: 'origin' }],
      goal: { x: 1192, y: 548 },
    });
    expect(layout.zones?.[0]?.id).toBe('awakening');

    const scene = SceneSchema.parse({
      id: 'level_01',
      entities: ['player'],
      background: { color: '#120f18', image: '/ref/board.png', alpha: 0.62 },
      layout,
      spawn: { x: 96, y: 560 },
    });
    expect(scene.entities).toEqual(['player']);
    expect(scene.layout?.platforms[0]?.type).toBe('ground');
  });
});

describe('IR — profondeur 2.5D', () => {
  it('parse background.layers + scene.depth + camera', () => {
    const scene = SceneSchema.parse({
      id: 'level_01',
      entities: ['player'],
      background: {
        color: '#120f18',
        layers: [
          { id: 'far', image: '/far.png', scroll_factor: 0.18 },
          { id: 'playfield', image: '/play.png', scroll_factor: 1 },
        ],
      },
      depth: { mode: 'side_scroll', sort_key: 'feet_y', ground_y: 632 },
      camera: { mode: 'follow_horizontal', bounds: 'clamp' },
      layout: { width: 2304, height: 720, ground_y: 632, spawn: { x: 96, y: 560 }, platforms: [], collectibles: [] },
    });
    expect(scene.background?.layers).toHaveLength(2);
    expect(scene.depth?.mode).toBe('side_scroll');
    expect(scene.camera?.mode).toBe('follow_horizontal');
  });
});

describe('IR — rétro-compatibilité GameDefinition', () => {
  it('le template platformer reste valide', () => {
    expect(() => GameDefinitionSchema.parse(PLATFORMER_TEMPLATE)).not.toThrow();
  });

  it('isKnownSystem distingue connus/inconnus', () => {
    expect(isKnownSystem('platformer_physics')).toBe(true);
    expect(isKnownSystem('totally_made_up')).toBe(false);
  });
});
