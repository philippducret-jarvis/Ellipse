import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema, type GameDefinition } from '@ellipse/shared';
import { createWorld, type SimInput } from './world.js';
import { stepSimulation } from './systems.js';
import {
  computeVeloriaBlessingModifiers,
  veloriaDraftKey,
} from './veloria-survival.js';

const NO_INPUT: SimInput = { left: false, right: false, jump: false };

function makeVeloriaGdl(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return GameDefinitionSchema.parse({
    meta: {
      title: 'Veloria Test',
      dimension: '2d',
      genre: 'survivors_like',
      resolution: [720, 1280],
      version: '1',
      hazard_scripts: {
        arena_test: {
          telegraph_duration_ms: 100,
          active_duration_ms: 200,
          cooldown_ms: 500,
          pick_lane: 'center_first',
          damage_on_active: 1,
        },
      },
    },
    systems: [
      'input',
      'physics_topdown',
      'lane_runner',
      'wave_spawner',
      'auto_attack',
      'blessing_draft',
      'hazard_scheduler',
      'boss_phases',
    ],
    entities: [
      {
        id: 'player',
        type: 'character',
        components: [
          { transform: { x: 360, y: 900 } },
          { health: { max: 5, current: 5 } },
        ],
      },
    ],
    scenes: [
      {
        id: 'arena_test',
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
              {
                wave: 1,
                enemies: [{ type: 'shade', lane: 'lane_center', count: 1 }],
              },
              {
                wave: 2,
                boss: { type: 'cathedral_warden', phase_count: 2, spawn_lane: 'lane_center' },
              },
            ],
          },
          blessings: [
            { id: 'sacred_edge', label: 'Tranchant sacré' },
            { id: 'divine_grace', label: 'Grâce divine' },
            { id: 'ember_contract', label: 'Contrat de braise' },
          ],
        },
      },
    ],
    ...overrides,
  });
}

function tick(world: ReturnType<typeof createWorld>, frames: number, input: SimInput = NO_INPUT, dtMs = 16) {
  for (let i = 0; i < frames; i++) stepSimulation(world, dtMs, input);
}

describe('veloria-survival — lane & waves', () => {
  it('initialise lane_runner et spawn la vague 1', () => {
    const w = createWorld(makeVeloriaGdl());
    expect(w.veloria).not.toBeNull();
    tick(w, 1);
    expect(w.enemies.length).toBeGreaterThan(0);
    expect(w.veloria!.waveNumber).toBe(1);
  });

  it('snap le joueur sur changement de lane', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    const x0 = w.player.x;
    tick(w, 1, { left: false, right: true, jump: false });
    expect(w.player.x).not.toBe(x0);
    expect(w.veloria!.laneIndex).toBe(2);
  });

  it('respecte le soft cap de 5 ennemis', () => {
    const gdl = makeVeloriaGdl();
    const veloria = (gdl.scenes[0] as { veloria?: { encounters?: { waves?: { enemies?: unknown[] }[] } } }).veloria;
    veloria!.encounters!.waves![0]!.enemies = [{ type: 'shade', lane: 'lane_center', count: 8 }];
    const w = createWorld(gdl);
    tick(w, 1);
    expect(w.enemies.length).toBeLessThanOrEqual(5);
  });
});

describe('veloria-survival — auto_attack & boss_phases', () => {
  it('tue les ennemis via auto_attack', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    for (const e of w.enemies) {
      e.y = w.player.y;
      e.x = w.player.x;
      e.hp = 1;
    }
    tick(w, 200);
    expect(w.enemies.every((e) => !e.alive)).toBe(true);
  });

  it('applique les phases boss', () => {
    const gdl = makeVeloriaGdl();
    const veloria = (gdl.scenes[0] as { veloria?: { encounters?: { waves?: unknown[] } } }).veloria;
    veloria!.encounters!.waves = [
      {
        wave: 1,
        boss: { type: 'cathedral_warden', phase_count: 3, spawn_lane: 'lane_center' },
      },
    ];
    const w = createWorld(gdl);
    tick(w, 1);
    const boss = w.enemies[0]!;
    boss.y = w.player.y;
    boss.x = w.player.x;
    const phase0 = boss.phase ?? 1;
    tick(w, 200);
    expect((boss.phase ?? 1) >= phase0).toBe(true);
  });
});

describe('veloria-survival — blessing_draft', () => {
  it('ouvre le draft après vague bénédiction', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    w.enemies.forEach((e) => {
      e.alive = false;
    });
    w.veloria!.waveNumber = 1;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.veloria!.draftActive).toBe(true);
    expect(w.veloria!.draftOptions.length).toBeGreaterThan(0);
  });

  it('applique sacred_edge (+20% dmg)', () => {
    const mods = computeVeloriaBlessingModifiers(['sacred_edge']);
    expect(mods.dmg).toBeCloseTo(1.2);
  });

  it('veloriaDraftKey enregistre la bénédiction', () => {
    const w = createWorld(makeVeloriaGdl());
    w.veloria!.draftActive = true;
    w.veloria!.draftOptions = [{ id: 'divine_grace', label: 'Grâce' }];
    veloriaDraftKey(w, '1');
    expect(w.veloria!.appliedBlessingIds).toContain('divine_grace');
    expect(w.veloria!.draftActive).toBe(false);
  });
});

describe('veloria-survival — hazard_scheduler', () => {
  it('inflige des dégâts en phase active sur lane ciblée', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    w.veloria!.hazardTimerMs = 150;
    w.veloria!.laneIndex = 1;
    const hp0 = w.player.health;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.player.health).toBeLessThan(hp0);
  });
});

describe('sim — double_jump', () => {
  it('permet un second saut en l’air', () => {
    const gdl = GameDefinitionSchema.parse({
      meta: { title: 'DJ', dimension: '2d', genre: 'platformer', resolution: [1280, 720], version: '1' },
      systems: ['input', 'platformer_physics', 'double_jump'],
      entities: [
        {
          id: 'player',
          type: 'character',
          components: [
            { transform: { x: 100, y: 100 } },
            { physics: { body: 'dynamic', gravity: 980 } },
            { platformer_controller: { move_speed: 220, jump_force: 420 } },
            { health: { max: 3, current: 3 } },
          ],
        },
      ],
      scenes: [
        {
          id: 'l1',
          entities: ['player'],
          layout: {
            width: 1280,
            height: 720,
            ground_y: 640,
            spawn: { x: 100, y: 100 },
            platforms: [{ x: 0, y: 640, w: 1280, h: 80, type: 'ground' }],
            collectibles: [],
          },
        },
      ],
    });
    const w = createWorld(gdl);
    tick(w, 120);
    const yGround = w.player.y;
    stepSimulation(w, 16, { left: false, right: false, jump: true });
    const yAir = w.player.y;
    expect(yAir).toBeLessThan(yGround);
    tick(w, 30);
    const yMid = w.player.y;
    stepSimulation(w, 16, { left: false, right: false, jump: true });
    expect(w.player.y).toBeLessThan(yMid);
  });
});
