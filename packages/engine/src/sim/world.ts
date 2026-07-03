/**
 * Cœur de simulation Ellipse — état du monde, **sans dépendance au rendu (Pixi)**.
 *
 * `createWorld(gdl)` reconstruit l'état jouable à partir du GDL typé et charge la 1ʳᵉ scène.
 * Le monde porte **toutes les scènes** (`applyScene` charge la scène courante) → multi-scènes
 * + transitions + checkpoints (Lot 1D). Toute la logique vit dans `systems.ts` ; le rendu
 * (engine/index.ts) ne fait que lire ce `SimWorld`.
 */
import type { GameDefinition } from '@ellipse/shared';
import { initVeloriaSurvival, type VeloriaSimState } from './veloria-survival.js';

export const PLAYER_SIZE = 64;
export const DEFAULT_GRAVITY = 980;
export const DEFAULT_JUMP_FORCE = 420;
export const DEFAULT_MOVE_SPEED = 220;

/** Genres pour lesquels des ennemis par défaut sont engendrés si le layout n'en fournit pas. */
export const ENEMY_GENRES = ['platformer', 'runner', 'fighting', 'rpg'];

export interface SimAABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SimPlatform extends SimAABB {
  type: string;
}

export interface SimPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  health: number;
  maxHealth: number;
  score: number;
  invincibleMs: number;
  facing: 1 | -1;
  /** Sauts aériens consommés (double_jump). */
  airJumps?: number;
}

export interface SimEnemy {
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  alive: boolean;
  patrolLeft: number;
  patrolRight: number;
  kind?: string;
  hp?: number;
  isBoss?: boolean;
  phase?: number;
  maxPhase?: number;
  vy?: number;
  variant?: string;
}

export interface SimCollectible {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  type: string;
}

export interface SimHazard extends SimAABB {
  kind: string;
}

export interface SimCheckpoint {
  x: number;
  y: number;
  label: string;
  reached: boolean;
}

export interface SimInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  up?: boolean;
  down?: boolean;
}

/** Événement game-feel émis par la sim (consommé par audio/FX/caméra, Lot 8). */
export type SimEventType =
  | 'jump'
  | 'collect'
  | 'enemy_killed'
  | 'damage'
  | 'checkpoint'
  | 'scene_change'
  | 'win'
  | 'lose';

export interface SimEvent {
  type: SimEventType;
  x?: number;
  y?: number;
  data?: Record<string, unknown>;
}

export interface SimWorld {
  gdl: GameDefinition;
  systems: string[];
  genre: string;
  worldWidth: number;
  worldHeight: number;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  // Scène courante
  sceneIndex: number;
  sceneId: string;
  sceneCount: number;
  sceneJustChanged: boolean;
  spawnX: number;
  spawnY: number;
  player: SimPlayer;
  platforms: SimPlatform[];
  enemies: SimEnemy[];
  collectibles: SimCollectible[];
  goal: SimAABB | null;
  hazards: SimHazard[];
  checkpoints: SimCheckpoint[];
  lastCheckpoint: { x: number; y: number } | null;
  gameOver: boolean;
  levelWon: boolean;
  message: string;
  messageTimer: number;
  /** Événements game-feel de la frame courante (vidés à chaque `stepSimulation`). */
  events: SimEvent[];
  /** État survivors Veloria (lane_runner + scene.veloria). */
  veloria: VeloriaSimState | null;
}

interface PlayerConfig {
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  maxHealth: number;
  transformSpawn: { x: number; y: number } | null;
}

function readPlayerConfig(gdl: GameDefinition): PlayerConfig {
  const playerEntity = gdl.entities.find((e) => e.id === 'player');
  const cfg: PlayerConfig = {
    gravity: DEFAULT_GRAVITY,
    jumpForce: DEFAULT_JUMP_FORCE,
    moveSpeed: DEFAULT_MOVE_SPEED,
    maxHealth: 3,
    transformSpawn: null,
  };
  for (const c of playerEntity?.components ?? []) {
    if (c.physics?.gravity != null) cfg.gravity = c.physics.gravity;
    if (c.platformer_controller?.jump_force != null) cfg.jumpForce = c.platformer_controller.jump_force;
    if (c.platformer_controller?.move_speed != null) cfg.moveSpeed = c.platformer_controller.move_speed;
    if (c.transform && (c.transform.x != null || c.transform.y != null)) {
      cfg.transformSpawn = { x: c.transform.x ?? 100, y: c.transform.y ?? 0 };
    }
    if (c.health?.max != null) cfg.maxHealth = c.health.max;
  }
  return cfg;
}

/**
 * Charge la scène `idx` dans le monde : plateformes, collectibles, ennemis, goal, hazards,
 * checkpoints, et repositionne le joueur au spawn. Préserve health/score (transition de niveau).
 * `applyTransform` n'est vrai qu'au tout premier chargement (la position du composant joueur
 * ne s'applique qu'à la scène initiale).
 */
export function applyScene(world: SimWorld, idx: number, applyTransform = false): void {
  const gdl = world.gdl;
  const scene = gdl.scenes[idx];
  const layout = scene?.layout;
  const { worldWidth, worldHeight } = world;

  world.sceneIndex = idx;
  world.sceneId = scene?.id ?? `scene_${idx}`;

  // Spawn
  let spawnX = 100;
  let spawnY = worldHeight - 80 - PLAYER_SIZE;
  if (layout?.spawn) {
    spawnX = layout.spawn.x;
    spawnY = layout.spawn.y;
  }
  const cfg = readPlayerConfig(gdl);
  if (applyTransform && cfg.transformSpawn) {
    spawnX = cfg.transformSpawn.x;
    spawnY = cfg.transformSpawn.y;
  }
  world.spawnX = spawnX;
  world.spawnY = spawnY;
  world.player.x = spawnX;
  world.player.y = spawnY;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.grounded = false;

  // Plateformes
  world.platforms =
    layout?.platforms?.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, type: p.type })) ?? [
      { x: 0, y: worldHeight - 80, w: worldWidth, h: 80, type: 'ground' },
    ];

  // Collectibles
  world.collectibles = (layout?.collectibles ?? []).map((col) => ({
    x: col.x - 8,
    y: col.y - 8,
    width: 16,
    height: 16,
    collected: false,
    type: col.type,
  }));

  // Goal
  world.goal = layout?.goal ? { x: layout.goal.x, y: layout.goal.y, w: 32, h: 64 } : null;

  // Hazards
  world.hazards = (layout?.hazards ?? []).map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h, kind: h.kind }));

  // Checkpoints
  world.checkpoints = (layout?.checkpoints ?? []).map((cp) => ({
    x: cp.x,
    y: cp.y,
    label: cp.label,
    reached: false,
  }));
  world.lastCheckpoint = null;

  // Ennemis : data-driven si fournis, sinon défauts par genre
  const groundY = layout?.ground_y ?? worldHeight - 80;
  if (layout?.enemies && layout.enemies.length > 0) {
    world.enemies = layout.enemies.map((e) => {
      const range = e.patrol ?? 80;
      const extended = e as typeof e & {
        hp?: number;
        isBoss?: boolean;
        phase?: number;
        maxPhase?: number;
        variant?: string;
      };
      return {
        x: e.x,
        y: e.y,
        vx: e.speed ?? 80,
        width: e.w ?? 40,
        height: e.h ?? 40,
        alive: true,
        patrolLeft: e.x - range,
        patrolRight: e.x + range,
        kind: e.kind,
        hp: extended.hp,
        isBoss: extended.isBoss,
        phase: extended.phase,
        maxPhase: extended.maxPhase,
        variant: extended.variant,
      };
    });
  } else if (ENEMY_GENRES.includes(world.genre)) {
    world.enemies = [500, 850, 1100].map((x) => ({
      x,
      y: groundY - 32,
      vx: 80,
      width: 40,
      height: 40,
      alive: true,
      patrolLeft: x - 80,
      patrolRight: x + 80,
    }));
  } else {
    world.enemies = [];
  }

  initVeloriaSurvival(world);
}

export function createWorld(gdl: GameDefinition): SimWorld {
  const [worldWidth, worldHeight] = gdl.meta.resolution ?? [1280, 720];
  const genre = gdl.meta.genre ?? 'platformer';
  const cfg = readPlayerConfig(gdl);

  const world: SimWorld = {
    gdl,
    systems: gdl.systems ?? [],
    genre,
    worldWidth,
    worldHeight,
    gravity: cfg.gravity,
    jumpForce: cfg.jumpForce,
    moveSpeed: cfg.moveSpeed,
    sceneIndex: 0,
    sceneId: 'scene_0',
    sceneCount: gdl.scenes.length,
    sceneJustChanged: false,
    spawnX: 100,
    spawnY: worldHeight - 80 - PLAYER_SIZE,
    player: {
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      grounded: false,
      health: cfg.maxHealth,
      maxHealth: cfg.maxHealth,
      score: 0,
      invincibleMs: 0,
      facing: 1,
    },
    platforms: [],
    enemies: [],
    collectibles: [],
    goal: null,
    hazards: [],
    checkpoints: [],
    lastCheckpoint: null,
    gameOver: false,
    levelWon: false,
    message: '',
    messageTimer: 0,
    events: [],
    veloria: null,
  };

  applyScene(world, 0, true);
  return world;
}

/** Index de la scène suivante : transition explicite (trigger goal) puis fallback séquentiel. */
export function nextSceneIndex(world: SimWorld): number {
  const scene = world.gdl.scenes[world.sceneIndex];
  const transitions = scene?.transitions ?? [];
  for (const t of transitions) {
    if (!t.trigger || t.trigger === 'goal') {
      const target = world.gdl.scenes.findIndex((s) => s.id === t.to_scene);
      if (target >= 0) return target;
    }
  }
  const seq = world.sceneIndex + 1;
  return seq < world.sceneCount ? seq : -1;
}
