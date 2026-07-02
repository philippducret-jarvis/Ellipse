/**

 * Systèmes survivors-like Veloria — parité avec tools/lib/veloria/static/veloria-systems.js

 */

import type { SimEnemy, SimInput, SimWorld } from './world.js';



export interface VeloriaSimState {

  laneIndex: number;

  laneCenters: number[];

  laneIds: string[];

  waveIndex: number;

  waveNumber: number;

  waveSpawned: boolean;

  draftActive: boolean;

  draftOptions: { id: string; label: string }[];

  appliedBlessingIds: string[];

  hazardTimerMs: number;

  hazardPhase: 'idle' | 'telegraph' | 'active';

  hazardLaneId: string;

  hazardSeq: number;

  autoAttackTimer: number;

  attackCooldown: number;

}



type HazardScript = {

  telegraph_duration_ms?: number;

  active_duration_ms?: number;

  cooldown_ms?: number;

  pick_lane?: string;

  damage_on_active?: number;

};



type SceneVeloria = {

  encounters?: {

    total_waves?: number;

    blessing_breaks_after_waves?: number[];

    waves?: Array<{

      wave: number;

      enemies?: Array<{ type: string; lane: string; count: number; variant?: string }>;

      boss?: { type: string; phase_count?: number; spawn_lane: string };

      adds?: Array<{ type: string; lane: string; count: number }>;

    }>;

  };

  blessings?: Array<{ id: string; label: string }>;

};



const SOFT_CAP = 5;

const ENEMY_VY: Record<string, number> = { tomb_hound: 95, gargoyle: 78 };

const DEFAULT_VY = 72;



function laneIdToIndex(laneId: string, lanes: { id: string; center_x: number }[]): number {

  const i = lanes.findIndex((l) => l.id === laneId);

  return i >= 0 ? i : 1;

}



function sceneVeloria(world: SimWorld): SceneVeloria | null {

  const scene = world.gdl.scenes[world.sceneIndex] as { veloria?: SceneVeloria };

  return scene?.veloria ?? null;

}



function laneMeta(world: SimWorld) {

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



function enemySize(type: string, isBoss: boolean) {

  if (isBoss) return { w: 80, h: 96, hp: 12 };

  if (type === 'gargoyle') return { w: 52, h: 52, hp: 3 };

  return { w: 48, h: 48, hp: 2 };

}



function blessingModifiers(v: VeloriaSimState) {

  let dmg = 1;

  let atkSpeed = 1;

  for (const id of v.appliedBlessingIds) {

    if (id === 'sacred_edge') dmg += 0.2;

    if (id === 'divine_grace') atkSpeed += 0.15;

    if (id === 'ember_contract') dmg += 0.25;

  }

  return { dmg, atkSpeed };

}



function pickHazardLane(

  script: HazardScript,

  lanes: { id: string; center_x: number }[],

  enemies: SimEnemy[],

  seq: number,

): { laneId: string; nextSeq: number } {

  const mode = script.pick_lane ?? 'random';

  if (mode === 'all') return { laneId: 'all', nextSeq: seq };

  if (mode === 'sequential') {

    const next = lanes.length ? (seq + 1) % lanes.length : 0;

    return { laneId: lanes[next]?.id ?? 'lane_center', nextSeq: next };

  }

  if (mode === 'most_populated') {

    const counts = lanes.map((l) => ({

      id: l.id,

      n: enemies.filter((e) => e.alive && Math.abs(e.x + e.width / 2 - l.center_x) < 80).length,

    }));

    counts.sort((a, b) => b.n - a.n);

    return { laneId: counts[0]?.id ?? 'lane_center', nextSeq: seq };

  }

  if (mode === 'alternating') {

    const laneId = seq % 2 === 0 ? 'lane_left' : 'lane_right';

    return { laneId, nextSeq: seq + 1 };

  }

  if (mode === 'center_first') return { laneId: 'lane_center', nextSeq: seq };

  const idx = Math.floor(Math.random() * Math.max(1, lanes.length));

  return { laneId: lanes[idx]?.id ?? 'lane_center', nextSeq: seq };

}



function hazardDamagesPlayer(v: VeloriaSimState, playerLaneId: string): boolean {

  if (v.hazardPhase !== 'active') return false;

  if (v.hazardLaneId === 'all') return true;

  return v.hazardLaneId === playerLaneId;

}



function onBossHit(boss: SimEnemy & { hp?: number; phase?: number; maxPhase?: number; vy?: number }, damage: number): void {

  if (!boss.isBoss) return;

  boss.hp = (boss.hp ?? 12) - damage;

  const maxPhase = boss.maxPhase ?? 3;

  const threshold = maxPhase ? (boss.hp ?? 0) / (12 / maxPhase) : 4;

  if ((boss.hp ?? 0) <= threshold && (boss.phase ?? 1) < maxPhase) {

    boss.phase = (boss.phase ?? 1) + 1;

    boss.hp = (boss.hp ?? 0) + 2;

    boss.vy = Math.min((boss.vy ?? 28) + 8, 48);

  }

  if ((boss.hp ?? 0) <= 0) boss.alive = false;

}



export function initVeloriaSurvival(world: SimWorld): void {

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

  const centers = lanes.map((l) => l.center_x);

  const ids = lanes.map((l) => l.id);

  world.veloria = {

    laneIndex: Math.min(1, Math.max(0, centers.length - 1)),

    laneCenters: centers.length ? centers : [world.worldWidth * 0.25, world.worldWidth * 0.5, world.worldWidth * 0.75],

    laneIds: ids.length ? ids : ['lane_left', 'lane_center', 'lane_right'],

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

    autoAttackTimer: 0,

    attackCooldown: 0,

  };

  world.enemies = [];

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

  };

}



function spawnWave(world: SimWorld, v: VeloriaSimState): void {

  const veloria = sceneVeloria(world);

  const lanes = laneMeta(world);

  const wave = veloria?.encounters?.waves?.[v.waveIndex];

  if (!wave) return;



  const rows: SimEnemy[] = [];

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

    });

    for (const add of wave.adds ?? []) {

      for (let i = 0; i < add.count && rows.length < SOFT_CAP; i++) {

        rows.push(makeEnemy(add.type, add.lane, yBand + 60 + i * 40, lanes, v.laneCenters));

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



export function stepVeloriaSurvival(world: SimWorld, dtMs: number, input: SimInput): void {

  const v = world.veloria;

  if (!v || v.draftActive) return;



  const dt = dtMs / 1000;

  const p = world.player;

  const veloria = sceneVeloria(world);

  const mods = blessingModifiers(v);

  const hasAutoAttack = world.systems.includes('auto_attack');

  const hasBossPhases = world.systems.includes('boss_phases');



  if (input.left) v.laneIndex = Math.max(0, v.laneIndex - 1);

  if (input.right) v.laneIndex = Math.min(v.laneCenters.length - 1, v.laneIndex + 1);

  const cx = v.laneCenters[v.laneIndex] ?? p.x;

  p.x = cx - p.width / 2;

  p.vx = 0;

  p.vy = 0;



  if (!v.waveSpawned) spawnWave(world, v);



  if (hasAutoAttack) {

    v.autoAttackTimer += dt;

    v.attackCooldown = Math.max(0, v.attackCooldown - dt);

    const atkInterval = 0.55 / mods.atkSpeed;

    if (v.autoAttackTimer >= atkInterval && v.attackCooldown <= 0) {

      v.autoAttackTimer = 0;

      v.attackCooldown = 0.4;

      for (const enemy of world.enemies) {

        if (!enemy.alive) continue;

        const ex = enemy.x + enemy.width / 2;

        const ey = enemy.y + enemy.height / 2;

        const px = p.x + p.width / 2;

        const py = p.y + p.height / 2;

        if (Math.hypot(ex - px, ey - py) < 220) {

          const damage = mods.dmg;

          if (hasBossPhases && enemy.isBoss) {

            onBossHit(enemy, damage);

            if (!enemy.alive) {

              p.score += 500;

              world.events.push({ type: 'enemy_killed', x: enemy.x, y: enemy.y });

            }

          } else {

            const e = enemy as SimEnemy & { hp?: number; isBoss?: boolean };

            e.hp = (e.hp ?? 2) - damage;

            if (e.hp <= 0) {

              enemy.alive = false;

              p.score += e.isBoss ? 500 : 50;

              world.events.push({ type: 'enemy_killed', x: enemy.x, y: enemy.y });

            }

          }

        }

      }

    }

  }



  const groundY =

    (world.gdl.scenes[world.sceneIndex] as { layout?: { ground_y?: number } })?.layout?.ground_y ??

    world.worldHeight - 80;



  for (const enemy of world.enemies) {

    if (!enemy.alive) continue;

    const vy = enemy.vy ?? DEFAULT_VY;

    enemy.y += vy * dt;

    if (enemy.y + enemy.height > groundY - 8) {

      enemy.alive = false;

      const dmg = enemy.isBoss ? 2 : 1;

      p.health -= dmg;

      world.events.push({ type: 'damage', x: p.x, y: p.y, data: { health: p.health } });

      if (p.health <= 0) {

        world.gameOver = true;

        world.events.push({ type: 'lose', x: p.x, y: p.y });

      }

    }

  }



  if (world.systems.includes('hazard_scheduler')) {

    const script = hazardScript(world);

    if (script) {

      v.hazardTimerMs += dtMs;

      const tele = script.telegraph_duration_ms ?? 1400;

      const active = script.active_duration_ms ?? 3200;

      const cd = script.cooldown_ms ?? 6000;

      const cycle = tele + active + cd;

      const t = v.hazardTimerMs % cycle;

      if (t < tele) v.hazardPhase = 'telegraph';

      else if (t < tele + active) v.hazardPhase = 'active';

      else v.hazardPhase = 'idle';

      if (t < 50) {

        const pick = pickHazardLane(script, laneMeta(world), world.enemies, v.hazardSeq);

        v.hazardLaneId = pick.laneId;

        v.hazardSeq = pick.nextSeq;

      }

      const playerLaneId = v.laneIds[v.laneIndex] ?? 'lane_center';

      if (hazardDamagesPlayer(v, playerLaneId) && p.invincibleMs <= 0) {

        p.health -= script.damage_on_active ?? 1;

        p.invincibleMs = 1200;

        world.events.push({ type: 'damage', x: p.x, y: p.y, data: { source: 'hazard' } });

        if (p.health <= 0) {

          world.gameOver = true;

          world.events.push({ type: 'lose', x: p.x, y: p.y });

        }

      }

    }

  }



  const allDead = world.enemies.length > 0 && world.enemies.every((e) => !e.alive);

  if (allDead && v.waveSpawned) {

    const breaks = veloria?.encounters?.blessing_breaks_after_waves ?? [3, 6, 9];

    if (world.systems.includes('blessing_draft') && breaks.includes(v.waveNumber)) {

      const pool = veloria?.blessings ?? [];

      v.draftActive = true;

      v.draftOptions = pool.slice(0, 3).map((b) => ({ id: b.id, label: b.label }));

      world.message = 'Bénédiction — touche 1/2/3';

      return;

    }

    v.waveIndex++;

    v.waveSpawned = false;

    const total = veloria?.encounters?.total_waves ?? 12;

    if (v.waveIndex >= total) {

      world.levelWon = true;

      world.message = 'Victoire !';

      world.events.push({ type: 'win', x: p.x, y: p.y, data: { score: p.score } });

    }

  }

}



export function veloriaDraftKey(world: SimWorld, key: string): void {
  const v = world.veloria;
  if (!v?.draftActive) return;
  const idx = key === '1' ? 0 : key === '2' ? 1 : key === '3' ? 2 : -1;
  const pick = v.draftOptions[idx];
  if (!pick) return;
  v.appliedBlessingIds.push(pick.id);
  v.draftActive = false;
  v.draftOptions = [];
  v.waveIndex++;
  v.waveSpawned = false;
  world.message = '';
  const total = sceneVeloria(world)?.encounters?.total_waves ?? 12;
  if (v.waveIndex >= total) {
    world.levelWon = true;
    world.message = 'Victoire !';
    world.events.push({ type: 'win', x: world.player.x, y: world.player.y, data: { score: world.player.score } });
  }
}



/** Exposé pour tests — calcule les modificateurs depuis les bénédictions appliquées. */

export function computeVeloriaBlessingModifiers(appliedIds: string[]) {

  return blessingModifiers({ appliedBlessingIds: appliedIds } as VeloriaSimState);

}


