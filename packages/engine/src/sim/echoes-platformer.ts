import type { GameDefinition } from '@ellipse/shared';

export const ECHOES_FIXED_STEP_MS = 1_000 / 60;

export type EchoesStatus = 'playing' | 'game_over' | 'victory';
export type EchoesWeapon = 'echo_blade' | 'longsword' | 'spore_hammer';
export type EchoesEnemyKind =
  | 'sporeling'
  | 'rampore'
  | 'porteur_sporeal'
  | 'chevalier_fongique'
  | 'moussu_furieux'
  | 'root_guardian_boss';

export interface EchoesInput {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  dodgePressed: boolean;
  interactPressed: boolean;
}

export const EMPTY_ECHOES_INPUT: Readonly<EchoesInput> = Object.freeze({
  moveX: 0,
  jumpHeld: false,
  jumpPressed: false,
  attackPressed: false,
  dodgePressed: false,
  interactPressed: false,
});

export interface EchoesRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EchoesPlatform extends EchoesRect {
  type: string;
}

export interface EchoesHazard extends EchoesRect {
  kind: string;
}

export interface EchoesCheckpoint {
  id: string;
  x: number;
  y: number;
  label: string;
  reached: boolean;
}

export interface EchoesCollectible {
  id: string;
  x: number;
  y: number;
  type: string;
  collected: boolean;
}

export interface EchoesZone extends EchoesRect {
  id: string;
  label: string;
}

export interface EchoesPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: -1 | 1;
  grounded: boolean;
  hp: number;
  maxHp: number;
  invulnerableMs: number;
  coyoteMs: number;
  jumpBufferMs: number;
  attackMs: number;
  attackCooldownMs: number;
  combo: number;
  comboWindowMs: number;
  dodgeMs: number;
  dodgeCooldownMs: number;
  weapon: EchoesWeapon;
  score: number;
  spores: number;
  memoryShards: number;
  rootEssence: number;
}

export type EchoesEnemyState = 'patrol' | 'charge' | 'windup' | 'recover' | 'defeated';

export interface EchoesEnemy {
  id: string;
  kind: EchoesEnemyKind;
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  w: number;
  h: number;
  patrol: number;
  speed: number;
  facing: -1 | 1;
  hp: number;
  maxHp: number;
  alive: boolean;
  invulnerableMs: number;
  attackCooldownMs: number;
  state: EchoesEnemyState;
  stateMs: number;
  phase: 1 | 2 | 3;
}

export interface EchoesProjectile {
  id: number;
  owner: 'enemy' | 'boss';
  kind: 'spore' | 'root_wave' | 'toxic_cloud';
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  ttlMs: number;
  damage: number;
}

export type EchoesEventType =
  | 'jump'
  | 'attack'
  | 'dodge'
  | 'player_hurt'
  | 'enemy_hurt'
  | 'enemy_defeated'
  | 'collect'
  | 'checkpoint'
  | 'weapon_chosen'
  | 'boss_engaged'
  | 'boss_phase'
  | 'boss_attack'
  | 'boss_defeated'
  | 'goal_locked'
  | 'respawn'
  | 'game_over'
  | 'victory';

export interface EchoesEvent {
  type: EchoesEventType;
  x?: number;
  y?: number;
  data?: Record<string, string | number | boolean>;
}

export interface EchoesEnemySpawn {
  x: number;
  y: number;
  kind: EchoesEnemyKind | string;
  patrol?: number;
  speed?: number;
  hp?: number;
}

export interface EchoesLevelConfig {
  width: number;
  height: number;
  groundY: number;
  gravity?: number;
  runSpeed?: number;
  jumpSpeed?: number;
  playerMaxHp?: number;
  spawn: { x: number; y: number };
  platforms: EchoesPlatform[];
  hazards: EchoesHazard[];
  checkpoints: Omit<EchoesCheckpoint, 'reached'>[];
  collectibles: Omit<EchoesCollectible, 'id' | 'collected'>[];
  enemies: EchoesEnemySpawn[];
  zones: EchoesZone[];
  goal: EchoesRect;
}

export interface EchoesWorld {
  width: number;
  height: number;
  groundY: number;
  gravity: number;
  runSpeed: number;
  jumpSpeed: number;
  status: EchoesStatus;
  elapsedMs: number;
  accumulatorMs: number;
  rngState: number;
  nextProjectileId: number;
  player: EchoesPlayer;
  spawn: { x: number; y: number };
  platforms: EchoesPlatform[];
  hazards: EchoesHazard[];
  checkpoints: EchoesCheckpoint[];
  collectibles: EchoesCollectible[];
  enemies: EchoesEnemy[];
  projectiles: EchoesProjectile[];
  zones: EchoesZone[];
  goal: EchoesRect;
  activeZoneId: string;
  lastCheckpointId: string | null;
  selectedWeapon: Exclude<EchoesWeapon, 'echo_blade'> | null;
  bossEngaged: boolean;
  bossDefeated: boolean;
  goalNoticeCooldownMs: number;
  events: EchoesEvent[];
}

const PLAYER_W = 42;
const PLAYER_H = 72;
const MAX_FRAME_MS = 250;

const ENEMY_TUNING: Record<EchoesEnemyKind, { w: number; h: number; hp: number; speed: number }> = {
  sporeling: { w: 42, h: 42, hp: 2, speed: 64 },
  rampore: { w: 54, h: 40, hp: 3, speed: 74 },
  porteur_sporeal: { w: 48, h: 58, hp: 3, speed: 48 },
  chevalier_fongique: { w: 48, h: 70, hp: 5, speed: 54 },
  moussu_furieux: { w: 58, h: 68, hp: 6, speed: 48 },
  root_guardian_boss: { w: 112, h: 122, hp: 30, speed: 36 },
};

function enemyKind(value: string): EchoesEnemyKind {
  if (value in ENEMY_TUNING) return value as EchoesEnemyKind;
  return 'sporeling';
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function rectsOverlap(a: EchoesRect, b: EchoesRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerRect(player: EchoesPlayer): EchoesRect {
  return { x: player.x, y: player.y, w: player.w, h: player.h };
}

function enemyRect(enemy: EchoesEnemy): EchoesRect {
  return { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
}

function emit(world: EchoesWorld, event: EchoesEvent): void {
  world.events.push(event);
}

function nextRandom(world: EchoesWorld): number {
  let x = world.rngState || 0x6d2b79f5;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rngState = x >>> 0;
  return world.rngState / 0x1_0000_0000;
}

function createEnemy(
  spawn: EchoesEnemySpawn,
  index: number,
  platforms: EchoesPlatform[],
  groundY: number,
): EchoesEnemy {
  const kind = enemyKind(spawn.kind);
  const tuning = ENEMY_TUNING[kind];
  const hp = Math.max(1, finite(spawn.hp, tuning.hp));
  const speed = Math.max(0, finite(spawn.speed, tuning.speed));
  const centerX = spawn.x + tuning.w / 2;
  const surfaceY = platforms
    .filter((platform) => centerX >= platform.x && centerX <= platform.x + platform.w && platform.y >= spawn.y)
    .reduce((nearest, platform) => Math.min(nearest, platform.y), groundY);
  const y = surfaceY - tuning.h;
  return {
    id: `${kind}-${index}`,
    kind,
    x: spawn.x,
    y,
    originX: spawn.x,
    originY: y,
    vx: speed,
    w: tuning.w,
    h: tuning.h,
    patrol: Math.max(0, finite(spawn.patrol, 80)),
    speed,
    facing: -1,
    hp,
    maxHp: hp,
    alive: true,
    invulnerableMs: 0,
    attackCooldownMs: 700 + index * 73,
    state: 'patrol',
    stateMs: 0,
    phase: 1,
  };
}

export function createEchoesWorld(config: EchoesLevelConfig, seed = 0x4543484f): EchoesWorld {
  const world: EchoesWorld = {
    width: config.width,
    height: config.height,
    groundY: config.groundY,
    gravity: Math.max(100, finite(config.gravity, 1_650)),
    runSpeed: Math.max(80, finite(config.runSpeed, 265)),
    jumpSpeed: Math.max(180, finite(config.jumpSpeed, 620)),
    status: 'playing',
    elapsedMs: 0,
    accumulatorMs: 0,
    rngState: seed >>> 0,
    nextProjectileId: 1,
    player: {
      x: config.spawn.x,
      y: config.spawn.y,
      vx: 0,
      vy: 0,
      w: PLAYER_W,
      h: PLAYER_H,
      facing: config.spawn.x > config.width / 2 ? -1 : 1,
      grounded: false,
      hp: Math.max(1, finite(config.playerMaxHp, 5)),
      maxHp: Math.max(1, finite(config.playerMaxHp, 5)),
      invulnerableMs: 0,
      coyoteMs: 0,
      jumpBufferMs: 0,
      attackMs: 0,
      attackCooldownMs: 0,
      combo: 0,
      comboWindowMs: 0,
      dodgeMs: 0,
      dodgeCooldownMs: 0,
      weapon: 'echo_blade',
      score: 0,
      spores: 0,
      memoryShards: 0,
      rootEssence: 0,
    },
    spawn: { ...config.spawn },
    platforms: config.platforms.map((platform) => ({ ...platform })),
    hazards: config.hazards.map((hazard) => ({ ...hazard })),
    checkpoints: config.checkpoints.map((checkpoint) => ({ ...checkpoint, reached: false })),
    collectibles: config.collectibles.map((collectible, index) => ({
      ...collectible,
      id: `${collectible.type}-${index}`,
      collected: false,
    })),
    enemies: config.enemies.map((spawn, index) => createEnemy(spawn, index, config.platforms, config.groundY)),
    projectiles: [],
    zones: config.zones.map((zone) => ({ ...zone })),
    goal: { ...config.goal },
    activeZoneId: config.zones[0]?.id ?? 'awakening',
    lastCheckpointId: null,
    selectedWeapon: null,
    bossEngaged: false,
    bossDefeated: false,
    goalNoticeCooldownMs: 0,
    events: [],
  };
  return world;
}

interface EchoesLayoutLike {
  width?: number;
  height?: number;
  ground_y?: number;
  spawn?: { x?: number; y?: number };
  platforms?: Array<{ x?: number; y?: number; w?: number; h?: number; type?: string }>;
  hazards?: Array<{ x?: number; y?: number; w?: number; h?: number; kind?: string }>;
  checkpoints?: Array<{ id?: string; x?: number; y?: number; label?: string }>;
  collectibles?: Array<{ x?: number; y?: number; type?: string }>;
  enemies?: Array<{ x?: number; y?: number; kind?: string; patrol?: number; speed?: number; hp?: number }>;
  zones?: Array<{ id?: string; label?: string; x?: number; y?: number; w?: number; h?: number }>;
  goal?: { x?: number; y?: number; w?: number; h?: number };
}

export function echoesLevelConfigFromGdl(gdl: GameDefinition): EchoesLevelConfig {
  const resolution = gdl.meta.resolution ?? [1280, 720];
  const scene = gdl.scenes[0];
  const layout = (scene?.layout ?? {}) as EchoesLayoutLike;
  const width = finite(layout.width, resolution[0]);
  const height = finite(layout.height, resolution[1]);
  const groundY = finite(layout.ground_y, height - 88);
  const playerEntity = gdl.entities.find((entity) => entity.id === 'player') as {
    components?: Array<{
      physics?: { gravity?: number };
      platformer_controller?: { move_speed?: number; jump_force?: number };
      health?: { max?: number };
    }>;
  } | undefined;
  const components = playerEntity?.components ?? [];
  const physics = components.find((component) => component.physics)?.physics;
  const controller = components.find((component) => component.platformer_controller)?.platformer_controller;
  const health = components.find((component) => component.health)?.health;
  const spawn = {
    x: finite(layout.spawn?.x, 96),
    y: finite(layout.spawn?.y, groundY - PLAYER_H),
  };
  const platforms = (layout.platforms ?? []).map((platform) => ({
    x: finite(platform.x, 0),
    y: finite(platform.y, groundY),
    w: finite(platform.w, 64),
    h: finite(platform.h, 20),
    type: platform.type ?? 'platform',
  }));
  if (!platforms.length) platforms.push({ x: 0, y: groundY, w: width, h: height - groundY, type: 'ground' });

  return {
    width,
    height,
    groundY,
    gravity: finite(physics?.gravity, 1_650),
    runSpeed: finite(controller?.move_speed, 265),
    jumpSpeed: finite(controller?.jump_force, 620),
    playerMaxHp: finite(health?.max, 5),
    spawn,
    platforms,
    hazards: (layout.hazards ?? []).map((hazard) => {
      const h = finite(hazard.h, 16);
      const rawY = finite(hazard.y, groundY);
      return {
        x: finite(hazard.x, 0),
        y: rawY >= groundY ? groundY - h : rawY,
        w: finite(hazard.w, 32),
        h,
        kind: hazard.kind ?? 'spore_spikes',
      };
    }),
    checkpoints: (layout.checkpoints ?? []).map((checkpoint, index) => ({
      id: checkpoint.id ?? `checkpoint-${index}`,
      x: finite(checkpoint.x, spawn.x),
      y: finite(checkpoint.y, spawn.y),
      label: checkpoint.label ?? `Écho ${index + 1}`,
    })),
    collectibles: (layout.collectibles ?? []).map((collectible) => ({
      x: finite(collectible.x, 0),
      y: finite(collectible.y, groundY - 32),
      type: collectible.type ?? 'spore',
    })),
    enemies: (layout.enemies ?? []).map((enemy) => ({
      x: finite(enemy.x, width * 0.6),
      y: finite(enemy.y, groundY - 40),
      kind: enemy.kind ?? 'sporeling',
      patrol: finite(enemy.patrol, 80),
      speed: finite(enemy.speed, ENEMY_TUNING[enemyKind(enemy.kind ?? '')].speed),
      hp: enemy.hp,
    })),
    zones: (layout.zones ?? []).map((zone, index) => ({
      id: zone.id ?? `zone-${index}`,
      label: zone.label ?? `Zone ${index + 1}`,
      x: finite(zone.x, index * width),
      y: finite(zone.y, 0),
      w: finite(zone.w, width),
      h: finite(zone.h, height),
    })),
    goal: {
      x: finite(layout.goal?.x, width - 64),
      y: finite(layout.goal?.y, groundY - 84),
      w: finite(layout.goal?.w, 44),
      h: finite(layout.goal?.h, 84),
    },
  };
}

export function createEchoesWorldFromGdl(gdl: GameDefinition, seed?: number): EchoesWorld {
  return createEchoesWorld(echoesLevelConfigFromGdl(gdl), seed);
}

export function advanceEchoesWorld(world: EchoesWorld, dtMs: number, input: EchoesInput): EchoesWorld {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return world;
  world.accumulatorMs += Math.min(dtMs, MAX_FRAME_MS);
  let firstStep = true;
  while (world.accumulatorMs + 1e-7 >= ECHOES_FIXED_STEP_MS) {
    const fixedInput: EchoesInput = firstStep
      ? input
      : {
          ...input,
          jumpPressed: false,
          attackPressed: false,
          dodgePressed: false,
          interactPressed: false,
        };
    stepFixed(world, ECHOES_FIXED_STEP_MS, fixedInput);
    world.accumulatorMs -= ECHOES_FIXED_STEP_MS;
    firstStep = false;
  }
  return world;
}

function stepFixed(world: EchoesWorld, dtMs: number, input: EchoesInput): void {
  if (world.status !== 'playing') return;
  const dt = dtMs / 1_000;
  world.elapsedMs += dtMs;
  world.goalNoticeCooldownMs = Math.max(0, world.goalNoticeCooldownMs - dtMs);

  tickPlayerTimers(world.player, dtMs);
  if (input.jumpPressed) world.player.jumpBufferMs = 120;

  handleWeaponChoice(world, input);
  handleDodge(world, input);
  handleAttack(world, input);
  movePlayer(world, dt, input);
  if (world.status !== 'playing') return;
  updateEnemies(world, dt, dtMs);
  if (world.status !== 'playing') return;
  updateProjectiles(world, dt, dtMs);
  if (world.status !== 'playing') return;
  updateInteractions(world);
}

function tickPlayerTimers(player: EchoesPlayer, dtMs: number): void {
  player.invulnerableMs = Math.max(0, player.invulnerableMs - dtMs);
  player.coyoteMs = Math.max(0, player.coyoteMs - dtMs);
  player.jumpBufferMs = Math.max(0, player.jumpBufferMs - dtMs);
  player.attackMs = Math.max(0, player.attackMs - dtMs);
  player.attackCooldownMs = Math.max(0, player.attackCooldownMs - dtMs);
  player.comboWindowMs = Math.max(0, player.comboWindowMs - dtMs);
  player.dodgeMs = Math.max(0, player.dodgeMs - dtMs);
  player.dodgeCooldownMs = Math.max(0, player.dodgeCooldownMs - dtMs);
  if (player.comboWindowMs <= 0 && player.attackMs <= 0) player.combo = 0;
}

function handleDodge(world: EchoesWorld, input: EchoesInput): void {
  const player = world.player;
  if (!input.dodgePressed || player.dodgeCooldownMs > 0 || player.attackMs > 0) return;
  const inputDirection = Math.sign(input.moveX) as -1 | 0 | 1;
  if (inputDirection) player.facing = inputDirection;
  player.dodgeMs = 180;
  player.dodgeCooldownMs = 850;
  player.invulnerableMs = Math.max(player.invulnerableMs, 260);
  player.vx = player.facing * 620;
  emit(world, { type: 'dodge', x: player.x, y: player.y });
}

function attackStats(player: EchoesPlayer): { damage: number; range: number; cooldown: number } {
  const comboBonus = player.combo === 3 ? 1 : 0;
  if (player.weapon === 'spore_hammer') return { damage: 3 + comboBonus, range: 94, cooldown: 410 };
  if (player.weapon === 'longsword') return { damage: 2 + comboBonus, range: 106, cooldown: 245 };
  return { damage: 1 + comboBonus, range: 82, cooldown: 280 };
}

function handleAttack(world: EchoesWorld, input: EchoesInput): void {
  const player = world.player;
  if (!input.attackPressed || player.attackCooldownMs > 0 || player.dodgeMs > 0) return;
  player.combo = player.comboWindowMs > 0 ? ((player.combo % 3) + 1) : 1;
  player.comboWindowMs = 520;
  const stats = attackStats(player);
  player.attackMs = Math.min(230, stats.cooldown * 0.7);
  player.attackCooldownMs = stats.cooldown;
  const attackBox: EchoesRect = {
    x: player.facing > 0 ? player.x + player.w - 4 : player.x - stats.range + 4,
    y: player.y + 8,
    w: stats.range,
    h: player.h - 12,
  };
  emit(world, {
    type: 'attack',
    x: attackBox.x,
    y: attackBox.y,
    data: { combo: player.combo, weapon: player.weapon },
  });
  for (const enemy of world.enemies) {
    if (!enemy.alive || enemy.invulnerableMs > 0 || !rectsOverlap(attackBox, enemyRect(enemy))) continue;
    damageEnemy(world, enemy, stats.damage);
  }
}

function damageEnemy(world: EchoesWorld, enemy: EchoesEnemy, damage: number): void {
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.invulnerableMs = enemy.kind === 'root_guardian_boss' ? 120 : 90;
  enemy.state = enemy.kind === 'root_guardian_boss' ? enemy.state : 'recover';
  enemy.stateMs = enemy.kind === 'root_guardian_boss' ? enemy.stateMs : 110;
  emit(world, { type: 'enemy_hurt', x: enemy.x, y: enemy.y, data: { id: enemy.id, damage, hp: enemy.hp } });
  if (enemy.hp > 0) return;
  enemy.alive = false;
  enemy.state = 'defeated';
  world.player.score += enemy.kind === 'root_guardian_boss' ? 2_500 : 150;
  emit(world, { type: 'enemy_defeated', x: enemy.x, y: enemy.y, data: { id: enemy.id, kind: enemy.kind } });
  if (enemy.kind === 'root_guardian_boss') {
    world.bossDefeated = true;
    world.player.rootEssence += 1;
    world.projectiles = world.projectiles.filter((projectile) => projectile.owner !== 'boss');
    emit(world, { type: 'boss_defeated', x: enemy.x, y: enemy.y });
  }
}

function movePlayer(world: EchoesWorld, dt: number, input: EchoesInput): void {
  const player = world.player;
  const wasGrounded = player.grounded;
  if (wasGrounded) player.coyoteMs = 100;

  const move = Math.max(-1, Math.min(1, input.moveX));
  if (player.dodgeMs <= 0) {
    const target = move * world.runSpeed;
    const acceleration = player.grounded ? 2_100 : 1_350;
    const delta = Math.max(-acceleration * dt, Math.min(acceleration * dt, target - player.vx));
    player.vx += delta;
    if (move === 0) player.vx *= Math.max(0, 1 - 11 * dt);
    if (move !== 0) player.facing = move < 0 ? -1 : 1;
  }

  if (player.jumpBufferMs > 0 && (wasGrounded || player.coyoteMs > 0) && player.dodgeMs <= 0) {
    player.vy = -world.jumpSpeed;
    player.grounded = false;
    player.coyoteMs = 0;
    player.jumpBufferMs = 0;
    emit(world, { type: 'jump', x: player.x, y: player.y });
  }
  if (!input.jumpHeld && player.vy < -190) player.vy += world.gravity * dt * 1.75;

  const previousX = player.x;
  player.x += player.vx * dt;
  player.x = Math.max(0, Math.min(world.width - player.w, player.x));
  for (const platform of world.platforms) {
    if (!rectsOverlap(playerRect(player), platform)) continue;
    if (player.vx > 0 && previousX + player.w <= platform.x + 4) player.x = platform.x - player.w;
    else if (player.vx < 0 && previousX >= platform.x + platform.w - 4) player.x = platform.x + platform.w;
  }

  const previousY = player.y;
  const previousBottom = previousY + player.h;
  player.vy += world.gravity * dt;
  player.y += player.vy * dt;
  player.grounded = false;
  let landingY = Number.POSITIVE_INFINITY;
  for (const platform of world.platforms) {
    const horizontal = player.x + player.w > platform.x + 2 && player.x < platform.x + platform.w - 2;
    if (!horizontal || player.vy < 0) continue;
    if (previousBottom <= platform.y + 5 && player.y + player.h >= platform.y && platform.y < landingY) {
      landingY = platform.y;
    }
  }
  if (Number.isFinite(landingY)) {
    player.y = landingY - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  if (player.y > world.height + 120) {
    hurtPlayer(world, 1, -player.facing * 80, true);
    if (world.status === 'playing') respawnAtCheckpoint(world, false);
  }
}

function updateEnemies(world: EchoesWorld, dt: number, dtMs: number): void {
  const player = world.player;
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    enemy.invulnerableMs = Math.max(0, enemy.invulnerableMs - dtMs);
    enemy.attackCooldownMs = Math.max(0, enemy.attackCooldownMs - dtMs);
    enemy.stateMs = Math.max(0, enemy.stateMs - dtMs);
    const dx = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
    enemy.facing = dx < 0 ? -1 : 1;

    if (enemy.kind === 'root_guardian_boss') {
      updateBoss(world, enemy, dx, dt, dtMs);
      continue;
    }
    if (enemy.state === 'recover' && enemy.stateMs > 0) continue;
    enemy.state = 'patrol';

    if (enemy.kind === 'rampore' && Math.abs(dx) < 230 && Math.abs(player.y - enemy.y) < 80) {
      enemy.state = 'charge';
      enemy.vx = enemy.facing * enemy.speed * 2.7;
    } else if (enemy.kind === 'porteur_sporeal') {
      enemy.vx = Math.sign(enemy.vx || 1) * enemy.speed * 0.45;
      if (enemy.attackCooldownMs <= 0 && Math.abs(dx) < 460) {
        spawnProjectile(world, enemy, 'spore', enemy.facing * 250, -32, 1);
        enemy.attackCooldownMs = 1_450;
      }
    } else if (enemy.kind === 'moussu_furieux' && enemy.attackCooldownMs <= 0) {
      enemy.vx = (nextRandom(world) < 0.5 ? -1 : 1) * enemy.speed * (1.2 + nextRandom(world));
      enemy.attackCooldownMs = 620 + nextRandom(world) * 580;
    } else if (Math.abs(enemy.vx) < 1) {
      enemy.vx = enemy.speed;
    }

    enemy.x += enemy.vx * dt;
    const left = enemy.originX - enemy.patrol;
    const right = enemy.originX + enemy.patrol;
    if (enemy.x <= left) {
      enemy.x = left;
      enemy.vx = Math.abs(enemy.vx || enemy.speed);
    } else if (enemy.x >= right) {
      enemy.x = right;
      enemy.vx = -Math.abs(enemy.vx || enemy.speed);
    }

    if (rectsOverlap(playerRect(player), enemyRect(enemy))) {
      const stomp = player.vy > 120 && player.y + player.h <= enemy.y + enemy.h * 0.58;
      if (stomp) {
        damageEnemy(world, enemy, 2);
        player.vy = -world.jumpSpeed * 0.56;
      } else {
        hurtPlayer(world, 1, -enemy.facing * 240);
      }
    }
  }
}

function updateBoss(world: EchoesWorld, boss: EchoesEnemy, dx: number, dt: number, dtMs: number): void {
  const bossZone = world.zones.find((zone) =>
    zone.id === 'boss_arena' || (boss.originX >= zone.x && boss.originX < zone.x + zone.w)
  );
  const playerCenter = world.player.x + world.player.w / 2;
  const insideBossZone = bossZone
    ? playerCenter >= bossZone.x && playerCenter <= bossZone.x + bossZone.w
    : Math.abs(dx) <= Math.max(320, boss.patrol + 220);
  if (!world.bossEngaged && insideBossZone) {
    world.bossEngaged = true;
    emit(world, { type: 'boss_engaged', x: boss.x, y: boss.y });
  }
  if (!world.bossEngaged) return;

  const ratio = boss.hp / boss.maxHp;
  const nextPhase: 1 | 2 | 3 = ratio > 0.7 ? 1 : ratio > 0.3 ? 2 : 3;
  if (nextPhase !== boss.phase) {
    boss.phase = nextPhase;
    boss.state = 'recover';
    boss.stateMs = 420;
    boss.attackCooldownMs = 360;
    emit(world, { type: 'boss_phase', x: boss.x, y: boss.y, data: { phase: nextPhase } });
  }

  if (boss.state === 'windup') {
    if (boss.stateMs <= 0) resolveBossAttack(world, boss);
    return;
  }
  if (boss.state === 'recover' && boss.stateMs > 0) return;
  boss.state = 'patrol';
  const desiredDistance = boss.phase === 1 ? 115 : 175;
  if (Math.abs(dx) > desiredDistance) boss.x += Math.sign(dx) * boss.speed * (boss.phase === 3 ? 1.45 : 1) * dt;
  const arenaLeft = bossZone ? bossZone.x + 24 : Math.max(0, boss.originX - Math.max(220, boss.patrol));
  const arenaRight = bossZone
    ? bossZone.x + bossZone.w - 24
    : Math.min(world.width, boss.originX + Math.max(220, boss.patrol) + boss.w);
  boss.x = Math.max(arenaLeft, Math.min(arenaRight - boss.w, boss.x));
  if (rectsOverlap(playerRect(world.player), enemyRect(boss))) hurtPlayer(world, 1, -boss.facing * 300);

  if (boss.attackCooldownMs <= 0) {
    boss.state = 'windup';
    boss.stateMs = boss.phase === 3 ? 330 : 480;
    boss.attackCooldownMs = boss.phase === 1 ? 1_350 : boss.phase === 2 ? 1_080 : 830;
    emit(world, { type: 'boss_attack', x: boss.x, y: boss.y, data: { phase: boss.phase, telegraph: true } });
  }
  void dtMs;
}

function resolveBossAttack(world: EchoesWorld, boss: EchoesEnemy): void {
  boss.state = 'recover';
  boss.stateMs = boss.phase === 3 ? 250 : 360;
  const direction = boss.facing;
  if (boss.phase === 1) {
    const swipe: EchoesRect = {
      x: direction > 0 ? boss.x + boss.w * 0.55 : boss.x - 135,
      y: boss.y + boss.h * 0.38,
      w: 150,
      h: boss.h * 0.55,
    };
    if (rectsOverlap(playerRect(world.player), swipe)) hurtPlayer(world, 2, direction * 360);
  } else if (boss.phase === 2) {
    spawnProjectile(world, boss, 'spore', direction * 285, -120, 1);
    spawnProjectile(world, boss, 'spore', direction * 330, -35, 1);
    spawnProjectile(world, boss, 'toxic_cloud', direction * 180, 20, 1);
  } else {
    spawnProjectile(world, boss, 'root_wave', direction * 440, 0, 2);
    spawnProjectile(world, boss, 'root_wave', -direction * 340, 0, 2);
    spawnProjectile(world, boss, 'spore', direction * 320, -135, 1);
  }
  emit(world, { type: 'boss_attack', x: boss.x, y: boss.y, data: { phase: boss.phase, telegraph: false } });
}

function spawnProjectile(
  world: EchoesWorld,
  enemy: EchoesEnemy,
  kind: EchoesProjectile['kind'],
  vx: number,
  vy: number,
  damage: number,
): void {
  const large = kind === 'root_wave';
  world.projectiles.push({
    id: world.nextProjectileId++,
    owner: enemy.kind === 'root_guardian_boss' ? 'boss' : 'enemy',
    kind,
    x: enemy.x + enemy.w / 2,
    y: large ? world.groundY - 30 : enemy.y + enemy.h * 0.4,
    vx,
    vy,
    w: large ? 72 : kind === 'toxic_cloud' ? 46 : 22,
    h: large ? 30 : kind === 'toxic_cloud' ? 46 : 22,
    ttlMs: large ? 1_600 : 2_600,
    damage,
  });
}

function updateProjectiles(world: EchoesWorld, dt: number, dtMs: number): void {
  const survivors: EchoesProjectile[] = [];
  for (const projectile of world.projectiles) {
    projectile.ttlMs -= dtMs;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.kind === 'spore') projectile.vy += 175 * dt;
    const hit = rectsOverlap(playerRect(world.player), projectile);
    if (hit) hurtPlayer(world, projectile.damage, Math.sign(projectile.vx) * 210);
    if (!hit && projectile.ttlMs > 0 && projectile.x > -100 && projectile.x < world.width + 100) survivors.push(projectile);
  }
  world.projectiles = survivors;
}

function hurtPlayer(world: EchoesWorld, damage: number, knockbackX: number, force = false): void {
  const player = world.player;
  if (!force && player.invulnerableMs > 0) return;
  player.hp = Math.max(0, player.hp - damage);
  player.invulnerableMs = 900;
  player.vx = knockbackX;
  player.vy = -250;
  emit(world, { type: 'player_hurt', x: player.x, y: player.y, data: { damage, hp: player.hp } });
  if (player.hp > 0) return;
  world.status = 'game_over';
  emit(world, { type: 'game_over', x: player.x, y: player.y });
}

function updateInteractions(world: EchoesWorld): void {
  const player = world.player;
  const pBox = playerRect(player);
  for (const hazard of world.hazards) {
    if (rectsOverlap(pBox, hazard)) hurtPlayer(world, 1, player.x < hazard.x ? -230 : 230);
    if (world.status !== 'playing') return;
  }

  for (const checkpoint of world.checkpoints) {
    if (checkpoint.reached) continue;
    const trigger = { x: checkpoint.x - 30, y: checkpoint.y - 45, w: 60, h: 90 };
    if (!rectsOverlap(pBox, trigger)) continue;
    checkpoint.reached = true;
    world.lastCheckpointId = checkpoint.id;
    player.hp = player.maxHp;
    emit(world, { type: 'checkpoint', x: checkpoint.x, y: checkpoint.y, data: { id: checkpoint.id, label: checkpoint.label } });
  }

  for (const collectible of world.collectibles) {
    if (collectible.collected || collectible.type === 'weapon_echo') continue;
    if (collectible.type === 'root_essence' && !world.bossDefeated) continue;
    const trigger = { x: collectible.x - 14, y: collectible.y - 18, w: 28, h: 36 };
    if (!rectsOverlap(pBox, trigger)) continue;
    collectible.collected = true;
    player.score += 50;
    if (collectible.type === 'memory_shard') player.memoryShards += 1;
    else if (collectible.type === 'root_essence') player.rootEssence += 1;
    else player.spores += 1;
    emit(world, { type: 'collect', x: collectible.x, y: collectible.y, data: { type: collectible.type } });
  }

  const centerX = player.x + player.w / 2;
  const zone = world.zones.find((candidate) => centerX >= candidate.x && centerX < candidate.x + candidate.w);
  if (zone) world.activeZoneId = zone.id;

  if (rectsOverlap(pBox, world.goal)) {
    if (!world.bossDefeated) {
      if (world.goalNoticeCooldownMs <= 0) {
        world.goalNoticeCooldownMs = 1_200;
        emit(world, { type: 'goal_locked', x: world.goal.x, y: world.goal.y });
      }
    } else {
      world.status = 'victory';
      player.score += 1_000;
      emit(world, { type: 'victory', x: player.x, y: player.y, data: { score: player.score } });
    }
  }
}

function handleWeaponChoice(world: EchoesWorld, input: EchoesInput): void {
  if (!input.interactPressed || world.selectedWeapon) return;
  const altars = world.collectibles
    .filter((collectible) => collectible.type === 'weapon_echo')
    .sort((a, b) => a.x - b.x);
  const playerCenter = world.player.x + world.player.w / 2;
  let nearest: EchoesCollectible | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const altar of altars) {
    const distance = Math.hypot(playerCenter - altar.x, world.player.y + world.player.h / 2 - altar.y);
    if (distance < nearestDistance) {
      nearest = altar;
      nearestDistance = distance;
    }
  }
  if (!nearest || nearestDistance > 118) return;
  const index = altars.indexOf(nearest);
  const selected: Exclude<EchoesWeapon, 'echo_blade'> = index <= 0 ? 'longsword' : 'spore_hammer';
  chooseEchoesWeapon(world, selected, nearest);
}

export function chooseEchoesWeapon(
  world: EchoesWorld,
  selected: Exclude<EchoesWeapon, 'echo_blade'>,
  source?: EchoesCollectible,
): boolean {
  if (world.selectedWeapon || world.status !== 'playing') return false;
  const altars = world.collectibles
    .filter((collectible) => collectible.type === 'weapon_echo')
    .sort((a, b) => a.x - b.x);
  const chosen = source ?? altars[selected === 'longsword' ? 0 : Math.min(1, altars.length - 1)];
  world.selectedWeapon = selected;
  world.player.weapon = selected;
  for (const altar of altars) altar.collected = true;
  emit(world, {
    type: 'weapon_chosen',
    x: chosen?.x ?? world.player.x,
    y: chosen?.y ?? world.player.y,
    data: { weapon: selected },
  });
  return true;
}

function respawnPosition(world: EchoesWorld): { x: number; y: number } {
  const checkpoint = world.checkpoints.find((candidate) => candidate.id === world.lastCheckpointId);
  return checkpoint ? { x: checkpoint.x, y: checkpoint.y } : { ...world.spawn };
}

function respawnAtCheckpoint(world: EchoesWorld, restoreHealth: boolean): void {
  const position = respawnPosition(world);
  const player = world.player;
  player.x = position.x;
  player.y = position.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.invulnerableMs = 1_200;
  if (restoreHealth) player.hp = player.maxHp;
  world.projectiles = [];
  emit(world, { type: 'respawn', x: player.x, y: player.y, data: { checkpoint: world.lastCheckpointId ?? 'spawn' } });
}

export function retryEchoesWorld(world: EchoesWorld): void {
  if (world.status !== 'game_over') return;
  world.status = 'playing';
  respawnAtCheckpoint(world, true);
  for (const enemy of world.enemies) {
    if (enemy.kind === 'root_guardian_boss' && world.bossDefeated) continue;
    enemy.x = enemy.originX;
    enemy.y = enemy.originY;
    enemy.hp = enemy.maxHp;
    enemy.alive = true;
    enemy.state = 'patrol';
    enemy.stateMs = 0;
    enemy.attackCooldownMs = 700;
    enemy.invulnerableMs = 0;
    enemy.phase = 1;
  }
  world.bossEngaged = false;
}

export function restartEchoesWorld(world: EchoesWorld): void {
  const config: EchoesLevelConfig = {
    width: world.width,
    height: world.height,
    groundY: world.groundY,
    gravity: world.gravity,
    runSpeed: world.runSpeed,
    jumpSpeed: world.jumpSpeed,
    playerMaxHp: world.player.maxHp,
    spawn: { ...world.spawn },
    platforms: world.platforms.map((platform) => ({ ...platform })),
    hazards: world.hazards.map((hazard) => ({ ...hazard })),
    checkpoints: world.checkpoints.map(({ reached: _reached, ...checkpoint }) => checkpoint),
    collectibles: world.collectibles.map(({ id: _id, collected: _collected, ...collectible }) => collectible),
    enemies: world.enemies.map((enemy) => ({
      x: enemy.originX,
      y: enemy.originY,
      kind: enemy.kind,
      patrol: enemy.patrol,
      speed: enemy.speed,
      hp: enemy.maxHp,
    })),
    zones: world.zones.map((zone) => ({ ...zone })),
    goal: { ...world.goal },
  };
  const fresh = createEchoesWorld(config, world.rngState);
  Object.assign(world, fresh);
}

export function drainEchoesEvents(world: EchoesWorld): EchoesEvent[] {
  return world.events.splice(0, world.events.length);
}

export function echoesBoss(world: EchoesWorld): EchoesEnemy | null {
  return world.enemies.find((enemy) => enemy.kind === 'root_guardian_boss') ?? null;
}
