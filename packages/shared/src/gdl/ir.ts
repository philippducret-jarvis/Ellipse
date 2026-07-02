/**
 * IR Ellipse — schémas typés du GDL (moteur-agnostique).
 *
 * Remplace les `z.record(z.unknown())` historiques de `entities`/`scenes` par des contrats
 * réels, tout en restant **rétro-compatible** : chaque schéma est `.passthrough()` afin
 * d'accepter les champs additionnels des GDL déjà produits (Echoes, templates, generated/*).
 *
 * Modèle de composant : un composant est un objet « mono-clé » dans un tableau,
 *   ex. `{ transform: { x, y } }`, `{ physics: { gravity } }`.
 * On valide la charge utile des composants connus quand ils sont présents, sans rejeter
 * les composants inconnus (forward-compatibilité du runtime, cf. mechanics.ts).
 */
import { z } from 'zod';
import {
  CameraSpecSchema,
  DepthSpecSchema,
  EntityDepthSchema,
  ParallaxLayerSchema,
} from './depth.js';
import { GdlTilemapSchema } from './tilemap.js';
export {
  GdlTilemapSchema,
  TilemapLayerDataSchema,
  platformsToTileLayer,
  tileIndexAt,
  isSolidTile,
} from './tilemap.js';
export type { GdlTilemap, TilemapLayerData } from './tilemap.js';
export {
  CameraSpecSchema,
  DepthSpecSchema,
  EntityDepthSchema,
  ParallaxLayerSchema,
  ParallaxRepeatSchema,
  DepthModeSchema,
  depthAt,
  scaleAtDepth,
  scaleAtY,
  feetY,
  computeSortKey,
  parallaxOffset,
  laneParallaxShift,
  resolveScrollFactor,
  normalizeParallaxLayers,
  defaultDepthSpecForMode,
} from './depth.js';
export type {
  CameraSpec,
  DepthSpec,
  EntityDepth,
  ParallaxLayer,
  DepthMode,
  BackgroundLike,
} from './depth.js';

export const Vec2Schema = z.object({ x: z.number(), y: z.number() });
export type Vec2 = z.infer<typeof Vec2Schema>;

/* ── Composants ──────────────────────────────────────────────────────────── */

export const TransformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    scale: z.number().optional(),
    rotation: z.number().optional(),
  })
  .passthrough();

/** `body` reste une `string` libre : les templates et le runtime l'utilisent sans contrainte d'enum. */
export const PHYSICS_BODIES = ['dynamic', 'static', 'kinematic'] as const;
export const PhysicsSchema = z
  .object({
    body: z.string().optional(),
    gravity: z.number().optional(),
    friction: z.number().optional(),
  })
  .passthrough();

export const PlatformerControllerSchema = z
  .object({
    move_speed: z.number().optional(),
    jump_force: z.number().optional(),
    coyote_time_ms: z.number().optional(),
    max_jumps: z.number().int().optional(),
  })
  .passthrough();

export const TopdownControllerSchema = z
  .object({
    move_speed: z.number().optional(),
    diagonal: z.boolean().optional(),
  })
  .passthrough();

export const HealthSchema = z
  .object({
    max: z.number(),
    current: z.number().optional(),
  })
  .passthrough();

export const PatrolSchema = z
  .object({
    range: z.number().optional(),
    speed: z.number().optional(),
  })
  .passthrough();

export const CombatSchema = z
  .object({
    damage: z.number().optional(),
    attack_speed: z.number().optional(),
    range: z.number().optional(),
  })
  .passthrough();

export const InventorySchema = z.object({}).passthrough();

/**
 * Composant générique : objet pouvant porter l'une des charges connues (validées si présentes)
 * + n'importe quel autre composant (passthrough). En pratique un seul champ est présent.
 */
export const ComponentSchema = z
  .object({
    transform: TransformSchema.optional(),
    physics: PhysicsSchema.optional(),
    platformer_controller: PlatformerControllerSchema.optional(),
    topdown_controller: TopdownControllerSchema.optional(),
    health: HealthSchema.optional(),
    patrol: PatrolSchema.optional(),
    combat: CombatSchema.optional(),
    inventory: InventorySchema.optional(),
  })
  .passthrough();
export type GameComponent = z.infer<typeof ComponentSchema>;

/* ── Entités ─────────────────────────────────────────────────────────────── */

export const AnimationClipSchema = z
  .object({
    frames: z.array(z.number().int()),
    fps: z.number(),
  })
  .passthrough();

export const EntityLayerSchema = z
  .object({
    url: z.string(),
    offsetY: z.number().optional(),
  })
  .passthrough();

export const EntityAssetsSchema = z
  .object({
    sprite: z.string().optional(),
    frame_count: z.number().int().optional(),
    animations: z.record(AnimationClipSchema).optional(),
    layers: z.array(EntityLayerSchema).optional(),
  })
  .passthrough();
export type EntityAssets = z.infer<typeof EntityAssetsSchema>;

export const EntitySchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    assets: EntityAssetsSchema.optional(),
    depth: EntityDepthSchema.optional(),
    components: z.array(ComponentSchema).default([]),
  })
  .passthrough();
export type Entity = z.infer<typeof EntitySchema>;

/* ── Scène ───────────────────────────────────────────────────────────────── */

export const BackgroundSchema = z
  .object({
    color: z.string().optional(),
    image: z.string().optional(),
    alpha: z.number().optional(),
    tint: z.string().optional(),
    mode: z.string().optional(),
    layers: z.array(ParallaxLayerSchema).optional(),
  })
  .passthrough();
export type SceneBackground = z.infer<typeof BackgroundSchema>;

export const PlatformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    type: z.enum(['ground', 'platform', 'moving']),
  })
  .passthrough();

/** Miroir Zod de `LevelLayout` (cf. level-gen.ts), permissif sur les extensions. */
export const GdlLayoutSchema = z
  .object({
    width: z.number(),
    height: z.number(),
    ground_y: z.number(),
    spawn: Vec2Schema,
    platforms: z.array(PlatformSchema),
    collectibles: z.array(
      z.object({ x: z.number(), y: z.number(), type: z.string() }).passthrough(),
    ),
    enemies: z
      .array(
        z
          .object({
            x: z.number(),
            y: z.number(),
            w: z.number().optional(),
            h: z.number().optional(),
            patrol: z.number().optional(),
            speed: z.number().optional(),
            kind: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    goal: Vec2Schema.optional(),
    checkpoints: z
      .array(z.object({ x: z.number(), y: z.number(), label: z.string() }).passthrough())
      .optional(),
    hazards: z
      .array(
        z
          .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), kind: z.string() })
          .passthrough(),
      )
      .optional(),
    zones: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string(),
            x: z.number(),
            y: z.number(),
            w: z.number(),
            h: z.number(),
            theme: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    tilemap: GdlTilemapSchema.optional(),
  })
  .passthrough();
export type GdlLayout = z.infer<typeof GdlLayoutSchema>;

/** Transition vers une autre scène (multi-scènes — consommé au Lot 1D). */
export const SceneTransitionSchema = z
  .object({
    trigger: z.string().optional(),
    to_scene: z.string(),
  })
  .passthrough();

export const SceneSchema = z
  .object({
    id: z.string(),
    entities: z.array(z.string()).default([]),
    background: BackgroundSchema.optional(),
    depth: DepthSpecSchema.optional(),
    camera: CameraSpecSchema.optional(),
    layout: GdlLayoutSchema.optional(),
    spawn: Vec2Schema.optional(),
    transitions: z.array(SceneTransitionSchema).optional(),
  })
  .passthrough();
export type Scene = z.infer<typeof SceneSchema>;

/* ── Systèmes ────────────────────────────────────────────────────────────── */

/**
 * Catalogue des systèmes connus. `SystemSchema` reste une `string` car le runtime
 * ajoute des systèmes dynamiquement (cf. mechanics.ts : `double_jump`, `collectibles`, …).
 * `isKnownSystem` sert aux warnings de validation, pas à rejeter.
 */
export const KNOWN_SYSTEMS = [
  'input',
  'platformer_physics',
  'physics_platformer',
  'physics_topdown',
  'tile_collision',
  'animation',
  'camera_follow',
  'ui',
  'collectibles',
  'double_jump',
  'enemy_ai',
  'combat_melee',
  'hazards',
  'goal',
  'health',
  // Veloria survivors-like
  'lane_runner',
  'wave_spawner',
  'auto_attack',
  'blessing_draft',
  'hazard_scheduler',
  'boss_phases',
] as const;

export const SystemSchema = z.string();

export function isKnownSystem(system: string): boolean {
  return (KNOWN_SYSTEMS as readonly string[]).includes(system);
}
