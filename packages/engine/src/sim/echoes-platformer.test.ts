import { describe, expect, it } from 'vitest';
import {
  ECHOES_FIXED_STEP_MS,
  EMPTY_ECHOES_INPUT,
  advanceEchoesWorld,
  createEchoesWorld,
  drainEchoesEvents,
  echoesBoss,
  retryEchoesWorld,
  type EchoesInput,
  type EchoesLevelConfig,
  type EchoesWorld,
} from './echoes-platformer.js';

function level(overrides: Partial<EchoesLevelConfig> = {}): EchoesLevelConfig {
  return {
    width: 2_304,
    height: 720,
    groundY: 632,
    spawn: { x: 96, y: 560 },
    platforms: [{ x: 0, y: 632, w: 2_304, h: 88, type: 'ground' }],
    hazards: [],
    checkpoints: [],
    collectibles: [],
    enemies: [],
    zones: [{ id: 'awakening', label: 'Réveil', x: 0, y: 0, w: 2_304, h: 720 }],
    goal: { x: 2_240, y: 548, w: 44, h: 84 },
    ...overrides,
  };
}

function input(patch: Partial<EchoesInput> = {}): EchoesInput {
  return { ...EMPTY_ECHOES_INPUT, ...patch };
}

function advance(world: EchoesWorld, durationMs: number, frameMs: number, held: Partial<EchoesInput> = {}): void {
  let elapsed = 0;
  while (elapsed + 1e-6 < durationMs) {
    const dt = Math.min(frameMs, durationMs - elapsed);
    advanceEchoesWorld(world, dt, input(held));
    elapsed += dt;
  }
}

describe('Echoes specialized platformer simulation', () => {
  it('produces the same movement at 60, 30 and 20 FPS', () => {
    const worlds = [60, 30, 20].map(() => createEchoesWorld(level(), 42));
    const frameTimes = [1_000 / 60, 1_000 / 30, 1_000 / 20];
    worlds.forEach((world, index) => advance(world, 1_500, frameTimes[index], { moveX: 1 }));
    expect(worlds[1].player.x).toBeCloseTo(worlds[0].player.x, 5);
    expect(worlds[2].player.x).toBeCloseTo(worlds[0].player.x, 5);
    expect(worlds[0].elapsedMs).toBeCloseTo(1_500, 5);
  });

  it('buffers a jump but never retriggers it from a held input', () => {
    const world = createEchoesWorld(level());
    advance(world, 100, ECHOES_FIXED_STEP_MS);
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input({ jumpHeld: true, jumpPressed: true }));
    const jumpEvents = drainEchoesEvents(world).filter((event) => event.type === 'jump');
    expect(jumpEvents).toHaveLength(1);
    advance(world, 250, ECHOES_FIXED_STEP_MS, { jumpHeld: true });
    expect(drainEchoesEvents(world).filter((event) => event.type === 'jump')).toHaveLength(0);
    expect(world.player.grounded).toBe(false);
  });

  it('locks exactly one board-authored weapon altar', () => {
    const world = createEchoesWorld(level({
      collectibles: [
        { x: 130, y: 590, type: 'weapon_echo' },
        { x: 300, y: 590, type: 'weapon_echo' },
      ],
    }));
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input({ interactPressed: true }));
    expect(world.selectedWeapon).toBe('longsword');
    expect(world.player.weapon).toBe('longsword');
    expect(world.collectibles.filter((item) => item.type === 'weapon_echo' && item.collected)).toHaveLength(2);
    expect(drainEchoesEvents(world).filter((event) => event.type === 'weapon_chosen')).toHaveLength(1);
  });

  it('applies the chosen weapon damage through a real attack hitbox', () => {
    const world = createEchoesWorld(level({
      enemies: [{ x: 170, y: 590, kind: 'sporeling', patrol: 0, speed: 0 }],
    }));
    world.player.weapon = 'longsword';
    world.selectedWeapon = 'longsword';
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input({ attackPressed: true }));
    expect(world.enemies[0].alive).toBe(false);
    expect(world.player.score).toBe(150);
    expect(drainEchoesEvents(world).some((event) => event.type === 'enemy_defeated')).toBe(true);
  });

  it('changes the Root Guardian through the three canonical health phases', () => {
    const world = createEchoesWorld(level({
      enemies: [{ x: 1_704, y: 510, kind: 'root_guardian_boss', patrol: 0, speed: 0 }],
    }));
    world.player.x = 1_500;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    const boss = echoesBoss(world)!;
    expect(world.bossEngaged).toBe(true);
    expect(boss.phase).toBe(1);
    boss.hp = 20;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(boss.phase).toBe(2);
    boss.hp = 8;
    advanceEchoesWorld(world, 500, input());
    expect(boss.phase).toBe(3);
    expect(drainEchoesEvents(world).filter((event) => event.type === 'boss_phase').map((event) => event.data?.phase)).toEqual([2, 3]);
  });

  it('keeps the exit locked until the Guardian is defeated', () => {
    const world = createEchoesWorld(level());
    world.player.x = 2_240;
    world.player.y = 548;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(world.status).toBe('playing');
    expect(drainEchoesEvents(world).some((event) => event.type === 'goal_locked')).toBe(true);
    world.bossDefeated = true;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(world.status).toBe('victory');
    expect(drainEchoesEvents(world).some((event) => event.type === 'victory')).toBe(true);
  });

  it('activates checkpoints and retries from the latest one', () => {
    const world = createEchoesWorld(level({
      checkpoints: [{ id: 'ruins', x: 500, y: 560, label: 'Ruines' }],
    }));
    world.player.x = 500;
    world.player.y = 560;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(world.lastCheckpointId).toBe('ruins');
    world.player.hp = 1;
    world.player.y = 900;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(world.status).toBe('game_over');
    retryEchoesWorld(world);
    expect(world.status).toBe('playing');
    expect(world.player.hp).toBe(world.player.maxHp);
    expect(world.player.x).toBe(500);
    expect(world.player.y).toBe(560);
  });

  it('gives dodge invulnerability and a deterministic cooldown', () => {
    const world = createEchoesWorld(level());
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input({ moveX: 1, dodgePressed: true }));
    expect(world.player.dodgeMs).toBeGreaterThan(0);
    expect(world.player.invulnerableMs).toBeGreaterThan(0);
    const firstCooldown = world.player.dodgeCooldownMs;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input({ moveX: -1, dodgePressed: true }));
    expect(world.player.dodgeCooldownMs).toBeLessThan(firstCooldown);
  });

  it('replays seeded ranged enemy behavior exactly', () => {
    const config = level({
      enemies: [
        { x: 420, y: 574, kind: 'porteur_sporeal', patrol: 60, speed: 48 },
        { x: 650, y: 564, kind: 'moussu_furieux', patrol: 80, speed: 52 },
      ],
    });
    const a = createEchoesWorld(config, 12345);
    const b = createEchoesWorld(config, 12345);
    advance(a, 2_400, 1_000 / 60, { moveX: 1 });
    advance(b, 2_400, 1_000 / 20, { moveX: 1 });
    const snapshot = (world: EchoesWorld) => ({
      rng: world.rngState,
      player: [world.player.x, world.player.y, world.player.hp],
      enemies: world.enemies.map((enemy) => [enemy.x, enemy.vx, enemy.attackCooldownMs]),
      projectiles: world.projectiles.map((projectile) => [projectile.kind, projectile.x, projectile.y, projectile.ttlMs]),
    });
    expect(snapshot(b)).toEqual(snapshot(a));
  });

  it('never allows victory and defeat at the same time', () => {
    const world = createEchoesWorld(level());
    world.bossDefeated = true;
    world.player.hp = 1;
    world.player.x = world.goal.x;
    world.player.y = world.height + 200;
    advanceEchoesWorld(world, ECHOES_FIXED_STEP_MS, input());
    expect(world.status).toBe('game_over');
    expect(drainEchoesEvents(world).some((event) => event.type === 'victory')).toBe(false);
  });
});

