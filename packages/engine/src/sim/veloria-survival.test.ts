import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema, type GameDefinition } from '@ellipse/shared';
import { createWorld, type SimInput } from './world.js';
import { stepSimulation } from './systems.js';
import {
  activateVeloriaAbility,
  computeVeloriaBlessingModifiers,
  moveVeloriaLane,
  resetVeloriaRun,
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
            { id: 'sacred_edge', label: 'Tranchant sacré', effect: '+20% dégâts et perforation' },
            { id: 'divine_grace', label: 'Grâce divine', effect: '+15% cadence et soin de vague' },
            { id: 'iron_will', label: 'Volonté de fer', effect: 'Résistance et garde' },
            { id: 'shadow_step', label: 'Pas d\'ombre', effect: 'Prochaine attaque critique' },
            { id: 'lunar_echo', label: 'Écho lunaire', effect: 'Zone lunaire prolongée' },
            { id: 'ember_contract', label: 'Contrat de braise', effect: 'Puissance contre vitalité' },
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

  it('ne répète pas un changement de voie tant que la touche reste enfoncée', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    w.veloria!.laneIndex = 0;

    tick(w, 1, { left: false, right: true, jump: false });
    expect(w.veloria!.laneIndex).toBe(1);
    tick(w, 20, { left: false, right: true, jump: false });
    expect(w.veloria!.laneIndex).toBe(1);

    tick(w, 1, NO_INPUT);
    tick(w, 1, { left: false, right: true, jump: false });
    expect(w.veloria!.laneIndex).toBe(2);
  });

  it('expose le même déplacement discret aux contrôles tactiles', () => {
    const w = createWorld(makeVeloriaGdl());
    expect(moveVeloriaLane(w, -1)).toBe(true);
    expect(w.veloria!.laneIndex).toBe(0);
    expect(moveVeloriaLane(w, -1)).toBe(false);
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

  it('applique des seuils de phases boss effectifs', () => {
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
    boss.vy = 0;
    w.veloria!.ultimateCharge = 100;
    expect(activateVeloriaAbility(w, 3)).toBe(true);
    expect(boss.hp).toBe(8);
    expect(boss.phase).toBe(2);
    expect(boss.alive).toBe(true);
  });
});

describe('veloria-survival — run lifecycle', () => {
  it('fait perdre exclusivement à la fin des 180 secondes', () => {
    const w = createWorld(makeVeloriaGdl());
    expect(w.veloria!.runDurationMs).toBe(180_000);
    w.veloria!.runElapsedMs = w.veloria!.runDurationMs - 8;

    stepSimulation(w, 16, NO_INPUT);

    expect(w.gameOver).toBe(true);
    expect(w.levelWon).toBe(false);
    expect(w.events.filter((event) => event.type === 'lose')).toHaveLength(1);
    expect(w.events.some((event) => event.type === 'win')).toBe(false);
  });

  it('ne déclenche pas une victoire dans la frame d\'une brèche fatale', () => {
    const gdl = makeVeloriaGdl();
    gdl.systems = gdl.systems.filter((system) => system !== 'blessing_draft' && system !== 'hazard_scheduler');
    const w = createWorld(gdl);
    tick(w, 1);
    w.player.health = 1;
    w.enemies[0]!.y = 1_180;

    stepSimulation(w, 16, NO_INPUT);

    expect(w.gameOver).toBe(true);
    expect(w.levelWon).toBe(false);
    expect(w.events.map((event) => event.type)).toContain('lose');
    expect(w.events.map((event) => event.type)).not.toContain('win');
  });

  it('gagne exclusivement après la dernière vague', () => {
    const gdl = makeVeloriaGdl();
    gdl.systems = gdl.systems.filter((system) => system !== 'blessing_draft');
    const veloria = (gdl.scenes[0] as unknown as { veloria: { encounters: { total_waves: number; waves: unknown[] } } }).veloria;
    veloria.encounters.total_waves = 1;
    veloria.encounters.waves = [{ wave: 1, enemies: [{ type: 'shade', lane: 'lane_center', count: 1 }] }];
    const w = createWorld(gdl);
    tick(w, 1);
    w.enemies[0]!.alive = false;

    stepSimulation(w, 16, NO_INPUT);

    expect(w.levelWon).toBe(true);
    expect(w.gameOver).toBe(false);
    expect(w.events.filter((event) => event.type === 'win')).toHaveLength(1);
    expect(w.events.some((event) => event.type === 'lose')).toBe(false);
  });

  it('réinitialise entièrement une run et conserve sa graine', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    const seed = w.veloria!.initialSeed;
    w.player.health = 1;
    w.player.score = 650;
    w.gameOver = true;
    w.veloria!.waveIndex = 1;
    w.veloria!.combo = 12;
    w.veloria!.ultimateCharge = 100;
    w.veloria!.appliedBlessingIds.push('sacred_edge');

    resetVeloriaRun(w);

    expect(w.gameOver).toBe(false);
    expect(w.levelWon).toBe(false);
    expect(w.player.health).toBe(w.player.maxHealth);
    expect(w.player.score).toBe(0);
    expect(w.enemies).toHaveLength(0);
    expect(w.veloria!.waveIndex).toBe(0);
    expect(w.veloria!.combo).toBe(0);
    expect(w.veloria!.ultimateCharge).toBe(0);
    expect(w.veloria!.appliedBlessingIds).toEqual([]);
    expect(w.veloria!.initialSeed).toBe(seed);
  });
});

describe('veloria-survival — compétences, combo et ultime', () => {
  it('applique les dégâts de voie, le combo et le cooldown de Z', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    const enemy = w.enemies[0]!;
    enemy.x = w.player.x;
    enemy.y = w.player.y;
    enemy.vy = 0;
    enemy.hp = 8;

    expect(activateVeloriaAbility(w, 0)).toBe(true);
    expect(enemy.hp).toBe(6);
    expect(w.veloria!.combo).toBe(1);
    expect(w.veloria!.ultimateCharge).toBeGreaterThan(0);
    expect(w.veloria!.skillCooldownsMs[0]).toBe(4_000);
    expect(activateVeloriaAbility(w, 0)).toBe(false);
  });

  it('accorde soin, invincibilité et deux gardes avec C', () => {
    const w = createWorld(makeVeloriaGdl());
    w.player.health = 3;

    expect(activateVeloriaAbility(w, 2)).toBe(true);

    expect(w.player.health).toBeCloseTo(3.5);
    expect(w.player.invincibleMs).toBe(900);
    expect(w.veloria!.guardCharges).toBe(2);
    expect(w.veloria!.skillCooldownsMs[2]).toBe(10_000);
  });

  it('refuse V avant 100%, puis consomme la jauge et frappe toute l\'arène', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    const enemy = w.enemies[0]!;
    enemy.hp = 8;
    enemy.vy = 0;

    expect(activateVeloriaAbility(w, 3)).toBe(false);
    w.veloria!.ultimateCharge = 100;
    expect(activateVeloriaAbility(w, 3)).toBe(true);

    expect(w.veloria!.ultimateCharge).toBe(0);
    expect(enemy.hp).toBe(4);
    expect(w.player.invincibleMs).toBe(1_200);
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
    expect(mods.pierce).toBe(2);
  });

  it('calcule les six bénédictions et arme le critique de shadow_step', () => {
    const ids = ['sacred_edge', 'divine_grace', 'iron_will', 'shadow_step', 'lunar_echo', 'ember_contract'];
    const mods = computeVeloriaBlessingModifiers(ids);
    expect(mods.dmg).toBeCloseTo(1.45);
    expect(mods.atkSpeed).toBeCloseTo(1.15);
    expect(mods.resistance).toBeCloseTo(0.1);
    expect(mods.pierce).toBe(2);
    expect(mods.abilityDurationBonusMs).toBe(2_000);

    const w = createWorld(makeVeloriaGdl());
    w.veloria!.appliedBlessingIds.push('shadow_step');
    expect(moveVeloriaLane(w, -1)).toBe(true);
    expect(w.veloria!.nextAttackCritical).toBe(true);
  });

  it('applique soin, garde et coût de braise au début d\'une vague ultérieure', () => {
    const w = createWorld(makeVeloriaGdl());
    w.player.health = 3;
    w.veloria!.waveIndex = 1;
    w.veloria!.waveSpawned = false;
    w.veloria!.appliedBlessingIds.push('divine_grace', 'iron_will', 'ember_contract');

    stepSimulation(w, 16, NO_INPUT);

    expect(w.player.health).toBeCloseTo(3.9);
    expect(w.veloria!.guardCharges).toBe(1);
  });

  it('produit un draft déterministe et conserve les textes d\'effet', () => {
    const a = createWorld(makeVeloriaGdl());
    const b = createWorld(makeVeloriaGdl());
    tick(a, 1);
    tick(b, 1);
    a.enemies.forEach((enemy) => {
      enemy.alive = false;
    });
    b.enemies.forEach((enemy) => {
      enemy.alive = false;
    });

    stepSimulation(a, 16, NO_INPUT);
    stepSimulation(b, 16, NO_INPUT);

    expect(a.veloria!.draftOptions).toEqual(b.veloria!.draftOptions);
    expect(a.veloria!.draftOptions).toHaveLength(3);
    expect(a.veloria!.draftOptions.every((option) => Boolean(option.effect))).toBe(true);
  });

  it('veloriaDraftKey enregistre la bénédiction', () => {
    const w = createWorld(makeVeloriaGdl());
    w.veloria!.draftActive = true;
    w.veloria!.draftOptions = [{ id: 'divine_grace', label: 'Grâce' }];
    expect(veloriaDraftKey(w, '4')).toBe(false);
    expect(veloriaDraftKey(w, '1')).toBe(true);
    expect(w.veloria!.appliedBlessingIds).toContain('divine_grace');
    expect(w.veloria!.draftActive).toBe(false);
  });

  it('retire du prochain tirage les bénédictions déjà acquises', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    w.veloria!.appliedBlessingIds.push('sacred_edge');
    w.enemies.forEach((enemy) => {
      enemy.alive = false;
    });

    stepSimulation(w, 16, NO_INPUT);

    expect(w.veloria!.draftOptions.map((option) => option.id)).not.toContain('sacred_edge');
  });

  it('ne bloque pas la run si le pool de bénédictions est épuisé', () => {
    const w = createWorld(makeVeloriaGdl());
    tick(w, 1);
    w.veloria!.appliedBlessingIds.push(
      'sacred_edge',
      'divine_grace',
      'iron_will',
      'shadow_step',
      'lunar_echo',
      'ember_contract',
    );
    w.enemies.forEach((enemy) => {
      enemy.alive = false;
    });

    stepSimulation(w, 16, NO_INPUT);

    expect(w.veloria!.draftActive).toBe(false);
    expect(w.veloria!.waveIndex).toBe(1);
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
