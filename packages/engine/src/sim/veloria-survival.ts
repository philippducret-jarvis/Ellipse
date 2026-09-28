/**
 * Simulation headless de Veloria — lane survival, vagues, bénédictions,
 * hazards, compétences et boss. Le rendu ne fait que lire cet état.
 */
import type { SimEnemy, SimInput, SimWorld } from './world.js';

export type VeloriaAbilitySlot = 0 | 1 | 2 | 3;

export interface VeloriaDraftOption {
  id: string;
  label: string;
  effect?: string;
  rarity?: string;
}

export interface VeloriaSimState {
  laneIndex: number;
  laneCenters: number[];
  laneIds: string[];
  laneLeftHeld: boolean;
  laneRightHeld: boolean;
  waveIndex: number;
  waveNumber: number;
  waveSpawned: boolean;
  draftActive: boolean;
  draftOptions: VeloriaDraftOption[];
  appliedBlessingIds: string[];
  hazardTimerMs: number;
  hazardPhase: 'idle' | 'telegraph' | 'active';
  hazardLaneId: string;
  hazardSeq: number;
  hazardCycleIndex: number;
  autoAttackTimer: number;
  attackCooldown: number;
  runElapsedMs: number;
  runDurationMs: number;
  combo: number;
  ultimateCharge: number;
  skillCooldownsMs: [number, number, number, number];
  guardCharges: number;
  nextAttackCritical: boolean;
  echoZoneTimerMs: number;
  echoZoneTickMs: number;
  echoZoneLaneIndex: number;
  initialSeed: number;
  rngState: number;
}

type HazardScript = {
  telegraph_duration_ms?: number;
  active_duration_ms?: number;
  cooldown_ms?: number;
  pick_lane?: string;
  damage_on_active?: number;
};

type EncounterEnemy = { type: string; lane: string; count: number; variant?: string };

type SceneVeloria = {
  seed?: number;
  run_duration_seconds?: number;
  encounters?: {
    total_waves?: number;
    blessing_breaks_after_waves?: number[];
    waves?: Array<{
      wave: number;
      enemies?: EncounterEnemy[];
      boss?: { type: string; phase_count?: number; spawn_lane: string };
      adds?: EncounterEnemy[];
    }>;
  };
  blessings?: VeloriaDraftOption[];
};

type VeloriaEnemy = SimEnemy & { hp?: number; maxHp?: number; isBoss?: boolean; phase?: number; maxPhase?: number; vy?: number };

const SOFT_CAP = 5;
const DEFAULT_RUN_DURATION_MS = 180_000;
const DEFAULT_VY = 72;
const ENEMY_VY: Record<string, number> = { tomb_hound: 95, gargoyle: 78 };
const SKILL_COOLDOWNS_MS: [number, number, number, number] = [4_000, 7_000, 10_000, 0];

function laneIdToIndex(laneId: string, lanes: { id: string; center_x: number }[]): number {
  const i = lanes.findIndex((l) => l.id === laneId);
  return i >= 0 ? i : Math.min(1, Math.max(0, lanes.length - 1));
}

function sceneVeloria(world: SimWorld): SceneVeloria | null {
  const scene = world.gdl.scenes[world.sceneIndex] as { veloria?: SceneVeloria };
  return scene?.veloria ?? null;
}

function laneMeta(world: SimWorld): { id: string; center_x: number }[] {
  const scene = world.gdl.scenes[world.sceneIndex] as {
    layout?: { lane_meta?: { lanes?: { id: string; center_x: number }[] } };
  };
  return scene?.layout?.lane_meta?.lanes ?? [];
}

function hazardScript(world: SimWorld): HazardScript | null {
  const meta = world.gdl.meta as { hazard_scripts?: Record<string, HazardScript> };
  const sceneId = world.sceneId ?? world.gdl.scenes[world.sceneIndex]?.id ?? '';
  return meta?.hazard_scripts?.[sceneId] ?? meta?.hazard_scripts?.default ?? null;
}

function enemySize(type: string, isBoss: boolean): { w: number; h: number; hp: number } {
  if (isBoss) return { w: 80, h: 96, hp: 12 };
  if (type === 'gargoyle') return { w: 52, h: 52, hp: 3 };
  return { w: 48, h: 48, hp: 2 };
}

function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1;
  return normalized || 1;
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return normalizeSeed(hash);
}

function configuredSeed(world: SimWorld): number {
  const meta = world.gdl.meta as { veloria_seed?: number };
  return normalizeSeed(sceneVeloria(world)?.seed ?? meta.veloria_seed ?? hashSeed(world.sceneId || 'veloria'));
}

function nextRandom(v: VeloriaSimState): number {
  v.rngState = (Math.imul(v.rngState, 1664525) + 1013904223) >>> 0;
  return v.rngState / 0x1_0000_0000;
}

function blessingModifiers(v: VeloriaSimState) {
  let dmg = 1;
  let atkSpeed = 1;
  let resistance = 0;
  let pierce = 1;
  let abilityDurationBonusMs = 0;
  for (const id of v.appliedBlessingIds) {
    if (id === 'sacred_edge') {
      dmg += 0.2;
      pierce += 1;
    }
    if (id === 'divine_grace') atkSpeed += 0.15;
    if (id === 'iron_will') resistance += 0.1;
    if (id === 'lunar_echo') abilityDurationBonusMs += 2_000;
    if (id === 'ember_contract') dmg += 0.25;
  }
  return { dmg, atkSpeed, resistance, pierce, abilityDurationBonusMs };
}

function pickHazardLane(
  script: HazardScript,
  lanes: { id: string; center_x: number }[],
  enemies: SimEnemy[],
  seq: number,
  random: () => number,
): { laneId: string; nextSeq: number } {
  const mode = script.pick_lane ?? 'random';
  if (mode === 'all') return { laneId: 'all', nextSeq: seq };
  if (mode === 'sequential') {
    const next = lanes.length ? (seq + 1) % lanes.length : 0;
    return { laneId: lanes[next]?.id ?? 'lane_center', nextSeq: next };
  }
  if (mode === 'most_populated') {
    const counts = lanes.map((l, index) => ({
      id: l.id,
      index,
      n: enemies.filter((e) => e.alive && Math.abs(e.x + e.width / 2 - l.center_x) < 80).length,
    }));
    counts.sort((a, b) => b.n - a.n || a.index - b.index);
    return { laneId: counts[0]?.id ?? 'lane_center', nextSeq: seq };
  }
  if (mode === 'alternating') {
    const laneId = seq % 2 === 0 ? 'lane_left' : 'lane_right';
    return { laneId, nextSeq: seq + 1 };
  }
  if (mode === 'center_first') return { laneId: 'lane_center', nextSeq: seq };
  const idx = Math.floor(random() * Math.max(1, lanes.length));
  return { laneId: lanes[idx]?.id ?? 'lane_center', nextSeq: seq };
}

function markLoss(world: SimWorld, source: string): void {
  if (world.gameOver || world.levelWon) return;
  world.gameOver = true;
  world.levelWon = false;
  world.message = source === 'timeout' ? 'La nuit a englouti la Veille.' : 'Veille rompue.';
  world.events.push({ type: 'lose', x: world.player.x, y: world.player.y, data: { source } });
}

function markWin(world: SimWorld): void {
  if (world.gameOver || world.levelWon) return;
  world.levelWon = true;
  world.gameOver = false;
  world.message = 'Victoire !';
  world.events.push({ type: 'win', x: world.player.x, y: world.player.y, data: { score: world.player.score } });
}

function resetCombo(v: VeloriaSimState): void {
  v.combo = 0;
}

function registerHits(v: VeloriaSimState, count: number): void {
  if (count <= 0) return;
  v.combo += count;
  v.ultimateCharge = Math.min(100, v.ultimateCharge + count * 8);
}

function takeVeloriaDamage(world: SimWorld, v: VeloriaSimState, amount: number, source: string): void {
  if (amount <= 0 || world.player.invincibleMs > 0 || world.gameOver || world.levelWon) return;
  if (v.guardCharges > 0) {
    v.guardCharges--;
    world.player.invincibleMs = 350;
    world.events.push({ type: 'damage', x: world.player.x, y: world.player.y, data: { source, guarded: true } });
    return;
  }
  const resisted = amount * (1 - blessingModifiers(v).resistance);
  world.player.health = Math.max(0, world.player.health - resisted);
  world.player.invincibleMs = 1_200;
  resetCombo(v);
  world.events.push({
    type: 'damage',
    x: world.player.x,
    y: world.player.y,
    data: { source, health: world.player.health },
  });
  if (world.player.health <= 0) markLoss(world, source);
}

function onBossHit(boss: VeloriaEnemy, damage: number): boolean {
  if (!boss.isBoss || !boss.alive) return false;
  const maxHp = enemySize(boss.kind ?? '', true).hp;
  boss.hp = Math.max(0, (boss.hp ?? maxHp) - damage);
  const maxPhase = Math.max(1, boss.maxPhase ?? 3);
  while ((boss.phase ?? 1) < maxPhase) {
    const nextThreshold = maxHp * (1 - (boss.phase ?? 1) / maxPhase);
    if ((boss.hp ?? 0) > nextThreshold) break;
    boss.phase = (boss.phase ?? 1) + 1;
    boss.vy = Math.min((boss.vy ?? 28) + 8, 52);
  }
  if ((boss.hp ?? 0) <= 0) boss.alive = false;
  return !boss.alive;
}

function makeEnemy(
  type: string,
  lane: string,
  y: number,
  lanes: { id: string; center_x: number }[],
  centers: number[],
  variant?: string,
): SimEnemy {
  const li = laneIdToIndex(lane, lanes);
  const cx = centers[li] ?? 360;
  const size = enemySize(type, false);
  const hp = variant === 'elite' || variant === 'elite_prior' ? size.hp + 1 : size.hp;
  return {
    x: cx - size.w / 2,
    y,
    vx: 0,
    vy: ENEMY_VY[type] ?? DEFAULT_VY,
    width: size.w,
    height: size.h,
    alive: true,
    patrolLeft: cx - 40,
    patrolRight: cx + 40,
    kind: type,
    hp,
    variant,
  };
}

function applyWaveStartBlessings(world: SimWorld, v: VeloriaSimState): void {
  if (v.waveIndex <= 0) return;
  if (v.appliedBlessingIds.includes('divine_grace')) {
    world.player.health = Math.min(world.player.maxHealth, world.player.health + Math.max(1, world.player.maxHealth * 0.01));
  }
  if (v.appliedBlessingIds.includes('iron_will')) v.guardCharges++;
  if (v.appliedBlessingIds.includes('ember_contract')) {
    world.player.health = Math.max(0, world.player.health - world.player.maxHealth * 0.02);
    if (world.player.health <= 0) markLoss(world, 'ember_contract');
  }
}

function spawnWave(world: SimWorld, v: VeloriaSimState): void {
  const veloria = sceneVeloria(world);
  const lanes = laneMeta(world);
  const wave = veloria?.encounters?.waves?.[v.waveIndex];
  if (!wave) return;

  applyWaveStartBlessings(world, v);
  if (world.gameOver) return;

  const rows: VeloriaEnemy[] = [];
  const yBand = 100;
  if (wave.boss) {
    const li = laneIdToIndex(wave.boss.spawn_lane, lanes);
    const cx = v.laneCenters[li] ?? world.worldWidth / 2;
    const size = enemySize(wave.boss.type, true);
    rows.push({
      x: cx - size.w / 2,
      y: yBand,
      vx: 0,
      vy: 28,
      width: size.w,
      height: size.h,
      alive: true,
      patrolLeft: cx - 20,
      patrolRight: cx + 20,
      kind: wave.boss.type,
      isBoss: true,
      phase: 1,
      maxPhase: wave.boss.phase_count ?? 3,
      hp: size.hp,
      maxHp: size.hp,
    });
    for (const add of wave.adds ?? []) {
      for (let i = 0; i < add.count && rows.length < SOFT_CAP; i++) {
        rows.push(makeEnemy(add.type, add.lane, yBand + 60 + i * 40, lanes, v.laneCenters, add.variant));
      }
    }
  } else {
    for (const group of wave.enemies ?? []) {
      for (let i = 0; i < group.count && rows.length < SOFT_CAP; i++) {
        rows.push(makeEnemy(group.type, group.lane, yBand + i * 36, lanes, v.laneCenters, group.variant));
      }
    }
  }

  world.enemies = rows.slice(0, SOFT_CAP);
  v.waveSpawned = true;
  v.waveNumber = wave.wave ?? v.waveIndex + 1;
}

function setLane(world: SimWorld, v: VeloriaSimState, nextIndex: number): boolean {
  const clamped = Math.max(0, Math.min(v.laneCenters.length - 1, nextIndex));
  if (clamped === v.laneIndex) return false;
  v.laneIndex = clamped;
  if (v.appliedBlessingIds.includes('shadow_step')) v.nextAttackCritical = true;
  const cx = v.laneCenters[v.laneIndex] ?? world.player.x;
  world.player.x = cx - world.player.width / 2;
  return true;
}

/** Déplacement discret, utilisé par les contrôles tactiles et les tests. */
export function moveVeloriaLane(world: SimWorld, direction: -1 | 1): boolean {
  const v = world.veloria;
  if (!v || v.draftActive || world.gameOver || world.levelWon) return false;
  return setLane(world, v, v.laneIndex + direction);
}

function damageEnemy(world: SimWorld, v: VeloriaSimState, enemy: VeloriaEnemy, damage: number): boolean {
  if (!enemy.alive) return false;
  const killed = enemy.isBoss
    ? onBossHit(enemy, damage)
    : (() => {
        enemy.hp = Math.max(0, (enemy.hp ?? 2) - damage);
        if ((enemy.hp ?? 0) <= 0) enemy.alive = false;
        return !enemy.alive;
      })();
  if (killed) {
    world.player.score += enemy.isBoss ? 500 : 50;
    v.ultimateCharge = Math.min(100, v.ultimateCharge + (enemy.isBoss ? 25 : 12));
    world.events.push({
      type: 'enemy_killed',
      x: enemy.x,
      y: enemy.y,
      data: { boss: !!enemy.isBoss, phase: enemy.phase ?? 1 },
    });
  }
  return true;
}

function enemiesByDistance(world: SimWorld, laneIndex?: number): VeloriaEnemy[] {
  const v = world.veloria;
  if (!v) return [];
  const px = world.player.x + world.player.width / 2;
  const py = world.player.y + world.player.height / 2;
  return world.enemies
    .filter((enemy) => {
      if (!enemy.alive) return false;
      if (laneIndex == null) return true;
      const laneX = v.laneCenters[laneIndex] ?? px;
      return Math.abs(enemy.x + enemy.width / 2 - laneX) < 80;
    })
    .map((enemy) => enemy as VeloriaEnemy)
    .sort((a, b) => {
      const da = Math.hypot(a.x + a.width / 2 - px, a.y + a.height / 2 - py);
      const db = Math.hypot(b.x + b.width / 2 - px, b.y + b.height / 2 - py);
      return da - db;
    });
}

/** Active Z/X/C/V (0..3). Retourne false si la compétence est indisponible. */
export function activateVeloriaAbility(world: SimWorld, slot: VeloriaAbilitySlot): boolean {
  const v = world.veloria;
  if (!v || v.draftActive || world.gameOver || world.levelWon || v.skillCooldownsMs[slot] > 0) return false;
  const mods = blessingModifiers(v);
  let hitCount = 0;

  if (slot === 0) {
    const targets = enemiesByDistance(world, v.laneIndex).slice(0, Math.max(2, mods.pierce));
    for (const enemy of targets) {
      if (damageEnemy(world, v, enemy, 2 * mods.dmg)) hitCount++;
    }
  } else if (slot === 1) {
    const targets = enemiesByDistance(world).filter((enemy) => {
      const ex = enemy.x + enemy.width / 2;
      const px = world.player.x + world.player.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const py = world.player.y + world.player.height / 2;
      return Math.hypot(ex - px, ey - py) < 340;
    });
    for (const enemy of targets) {
      if (damageEnemy(world, v, enemy, 1.5 * mods.dmg)) hitCount++;
    }
    if (v.appliedBlessingIds.includes('lunar_echo')) {
      v.echoZoneTimerMs = 2_000 + mods.abilityDurationBonusMs;
      v.echoZoneTickMs = 500;
      v.echoZoneLaneIndex = v.laneIndex;
    }
  } else if (slot === 2) {
    v.guardCharges += 2;
    world.player.invincibleMs = Math.max(world.player.invincibleMs, 900);
    world.player.health = Math.min(world.player.maxHealth, world.player.health + world.player.maxHealth * 0.1);
  } else {
    if (v.ultimateCharge < 100) return false;
    v.ultimateCharge = 0;
    for (const enemy of enemiesByDistance(world)) {
      if (damageEnemy(world, v, enemy, 4 * mods.dmg)) hitCount++;
    }
    world.player.invincibleMs = Math.max(world.player.invincibleMs, 1_200);
  }

  v.skillCooldownsMs[slot] = SKILL_COOLDOWNS_MS[slot];
  registerHits(v, hitCount);
  // L'ultime consomme sa jauge entière : ses propres impacts ne doivent pas
  // amorcer immédiatement la prochaine charge.
  if (slot === 3) v.ultimateCharge = 0;
  world.message = slot === 3 ? 'Aurore sacrée !' : `Compétence ${slot + 1}`;
  return true;
}

export function initVeloriaSurvival(world: SimWorld, seed?: number): void {
  if (!world.systems.includes('lane_runner')) {
    world.veloria = null;
    return;
  }
  const veloria = sceneVeloria(world);
  if (!veloria) {
    world.veloria = null;
    return;
  }
  const lanes = laneMeta(world);
  const configuredCenters = lanes.map((l) => l.center_x);
  const configuredIds = lanes.map((l) => l.id);
  const centers = configuredCenters.length
    ? configuredCenters
    : [world.worldWidth * 0.25, world.worldWidth * 0.5, world.worldWidth * 0.75];
  const ids = configuredIds.length ? configuredIds : ['lane_left', 'lane_center', 'lane_right'];
  const initialSeed = normalizeSeed(seed ?? configuredSeed(world));
  world.veloria = {
    laneIndex: Math.floor(centers.length / 2),
    laneCenters: centers,
    laneIds: ids,
    laneLeftHeld: false,
    laneRightHeld: false,
    waveIndex: 0,
    waveNumber: 1,
    waveSpawned: false,
    draftActive: false,
    draftOptions: [],
    appliedBlessingIds: [],
    hazardTimerMs: 0,
    hazardPhase: 'idle',
    hazardLaneId: 'lane_center',
    hazardSeq: 0,
    hazardCycleIndex: -1,
    autoAttackTimer: 0,
    attackCooldown: 0,
    runElapsedMs: 0,
    runDurationMs: Math.max(1_000, (veloria.run_duration_seconds ?? DEFAULT_RUN_DURATION_MS / 1_000) * 1_000),
    combo: 0,
    ultimateCharge: 0,
    skillCooldownsMs: [0, 0, 0, 0],
    guardCharges: 0,
    nextAttackCritical: false,
    echoZoneTimerMs: 0,
    echoZoneTickMs: 0,
    echoZoneLaneIndex: 1,
    initialSeed,
    rngState: initialSeed,
  };
  world.enemies = [];
}

/** Réinitialise intégralement une run sans recréer l'engine Pixi. */
export function resetVeloriaRun(world: SimWorld, seed?: number): void {
  const previousSeed = world.veloria?.initialSeed;
  world.gameOver = false;
  world.levelWon = false;
  world.message = '';
  world.messageTimer = 0;
  world.events = [];
  world.player.health = world.player.maxHealth;
  world.player.score = 0;
  world.player.invincibleMs = 0;
  world.player.vx = 0;
  world.player.vy = 0;
  initVeloriaSurvival(world, seed ?? previousSeed ?? configuredSeed(world));
  const v = world.veloria;
  if (v) {
    const cx = v.laneCenters[v.laneIndex] ?? world.spawnX;
    world.player.x = cx - world.player.width / 2;
    world.player.y = world.spawnY;
  }
}

function stepEchoZone(world: SimWorld, v: VeloriaSimState, dtMs: number): void {
  if (v.echoZoneTimerMs <= 0) return;
  v.echoZoneTimerMs = Math.max(0, v.echoZoneTimerMs - dtMs);
  v.echoZoneTickMs -= dtMs;
  if (v.echoZoneTickMs > 0) return;
  v.echoZoneTickMs += 500;
  let hitCount = 0;
  for (const enemy of enemiesByDistance(world, v.echoZoneLaneIndex)) {
    if (damageEnemy(world, v, enemy, 0.5 * blessingModifiers(v).dmg)) hitCount++;
  }
  registerHits(v, hitCount);
}

export function stepVeloriaSurvival(world: SimWorld, dtMs: number, input: SimInput): void {
  const v = world.veloria;
  if (!v || v.draftActive || world.gameOver || world.levelWon) return;
  const safeDtMs = Math.max(0, dtMs);
  const dt = safeDtMs / 1_000;
  const p = world.player;
  const veloria = sceneVeloria(world);
  const mods = blessingModifiers(v);

  v.runElapsedMs = Math.min(v.runDurationMs, v.runElapsedMs + safeDtMs);
  if (v.runElapsedMs >= v.runDurationMs) {
    markLoss(world, 'timeout');
    return;
  }

  for (let i = 0; i < v.skillCooldownsMs.length; i++) {
    v.skillCooldownsMs[i] = Math.max(0, v.skillCooldownsMs[i] - safeDtMs);
  }

  const pressLeft = input.left && !v.laneLeftHeld;
  const pressRight = input.right && !v.laneRightHeld;
  if (pressLeft && !pressRight) setLane(world, v, v.laneIndex - 1);
  if (pressRight && !pressLeft) setLane(world, v, v.laneIndex + 1);
  v.laneLeftHeld = input.left;
  v.laneRightHeld = input.right;
  const cx = v.laneCenters[v.laneIndex] ?? p.x;
  p.x = cx - p.width / 2;
  p.vx = 0;
  p.vy = 0;

  if (!v.waveSpawned) spawnWave(world, v);
  if (world.gameOver) return;

  if (world.systems.includes('auto_attack')) {
    v.autoAttackTimer += dt;
    v.attackCooldown = Math.max(0, v.attackCooldown - dt);
    const atkInterval = 0.55 / mods.atkSpeed;
    if (v.autoAttackTimer >= atkInterval && v.attackCooldown <= 0) {
      v.autoAttackTimer = 0;
      v.attackCooldown = 0.4 / mods.atkSpeed;
      const targets = enemiesByDistance(world, v.laneIndex).filter((enemy) => {
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const px = p.x + p.width / 2;
        const py = p.y + p.height / 2;
        return Math.hypot(ex - px, ey - py) < 260;
      }).slice(0, mods.pierce);
      const critical = v.nextAttackCritical;
      let hitCount = 0;
      for (const enemy of targets) {
        if (damageEnemy(world, v, enemy, mods.dmg * (critical ? 2 : 1))) hitCount++;
      }
      if (hitCount > 0) {
        registerHits(v, hitCount);
        v.nextAttackCritical = false;
      }
    }
  }

  stepEchoZone(world, v, safeDtMs);

  const groundY =
    (world.gdl.scenes[world.sceneIndex] as { layout?: { ground_y?: number } })?.layout?.ground_y ??
    world.worldHeight - 80;
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    enemy.y += (enemy.vy ?? DEFAULT_VY) * dt;
    if (enemy.y + enemy.height > groundY - 8) {
      enemy.alive = false;
      takeVeloriaDamage(world, v, enemy.isBoss ? 2 : 1, enemy.isBoss ? 'boss_breach' : 'enemy_breach');
      if (world.gameOver) return;
    }
  }

  if (world.systems.includes('hazard_scheduler')) {
    const script = hazardScript(world);
    if (script) {
      v.hazardTimerMs += safeDtMs;
      const tele = script.telegraph_duration_ms ?? 1_400;
      const active = script.active_duration_ms ?? 3_200;
      const cd = script.cooldown_ms ?? 6_000;
      const cycle = tele + active + cd;
      const cycleIndex = Math.floor(v.hazardTimerMs / cycle);
      const t = v.hazardTimerMs % cycle;
      if (cycleIndex !== v.hazardCycleIndex) {
        v.hazardCycleIndex = cycleIndex;
        const pick = pickHazardLane(script, laneMeta(world), world.enemies, v.hazardSeq, () => nextRandom(v));
        v.hazardLaneId = pick.laneId;
        v.hazardSeq = pick.nextSeq;
      }
      if (t < tele) v.hazardPhase = 'telegraph';
      else if (t < tele + active) v.hazardPhase = 'active';
      else v.hazardPhase = 'idle';
      const playerLaneId = v.laneIds[v.laneIndex] ?? 'lane_center';
      if (v.hazardPhase === 'active' && (v.hazardLaneId === 'all' || v.hazardLaneId === playerLaneId)) {
        takeVeloriaDamage(world, v, script.damage_on_active ?? 1, 'hazard');
        if (world.gameOver) return;
      }
    }
  }

  const allDead = world.enemies.length > 0 && world.enemies.every((e) => !e.alive);
  if (!allDead || !v.waveSpawned) return;
  const breaks = veloria?.encounters?.blessing_breaks_after_waves ?? [3, 6, 9];
  if (world.systems.includes('blessing_draft') && breaks.includes(v.waveNumber)) {
    const pool = (veloria?.blessings ?? []).filter((b) => !v.appliedBlessingIds.includes(b.id));
    if (pool.length > 0) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom(v) * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      v.draftActive = true;
      v.draftOptions = pool.slice(0, 3).map((b) => ({ ...b }));
      world.message = 'Bénédiction — touche 1/2/3';
      return;
    }
  }

  v.waveIndex++;
  v.waveSpawned = false;
  const total = veloria?.encounters?.total_waves ?? 12;
  if (v.waveIndex >= total) markWin(world);
}

export function veloriaDraftKey(world: SimWorld, key: string): boolean {
  const v = world.veloria;
  if (!v?.draftActive || world.gameOver || world.levelWon) return false;
  const idx = key === '1' ? 0 : key === '2' ? 1 : key === '3' ? 2 : -1;
  const pick = v.draftOptions[idx];
  if (!pick) return false;
  if (!v.appliedBlessingIds.includes(pick.id)) v.appliedBlessingIds.push(pick.id);
  v.draftActive = false;
  v.draftOptions = [];
  v.waveIndex++;
  v.waveSpawned = false;
  world.message = '';
  const total = sceneVeloria(world)?.encounters?.total_waves ?? 12;
  if (v.waveIndex >= total) markWin(world);
  return true;
}

/** Exposé pour tests et HUD de debug. */
export function computeVeloriaBlessingModifiers(appliedIds: string[]) {
  return blessingModifiers({ appliedBlessingIds: appliedIds } as VeloriaSimState);
}
