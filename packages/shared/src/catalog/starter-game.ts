/**
 * T8 — Générateur de jeu de départ : `buildStarterGdl(preset)` → **GDL valide et jouable**.
 *
 * Transforme n'importe quel preset (issu du wizard / `derivePreset`) en un `GameDefinition`
 * runnable par le moteur. Les systèmes du preset sont conservés en `meta.declared_systems`
 * (intention), tandis que le GDL active les systèmes **réellement implémentés** selon la
 * perspective → tout jeu créé est immédiatement prévisualisable, quel que soit le genre.
 */
import { GameDefinitionSchema, type GameDefinition } from '../index.js';
import { buildSceneFromBoard } from '../gdl/world-factory.js';
import type { ProductionPreset, ArtStyle, DifficultyBand } from './game-types.js';

/** Systèmes effectivement supportés par le runtime ECS aujourd'hui. */
const SIDE_SYSTEMS = ['input', 'physics_platformer', 'tile_collision', 'collectibles', 'enemy_ai', 'camera_follow', 'hazards', 'goal'];
const TOPDOWN_SYSTEMS = ['input', 'physics_topdown', 'collectibles', 'enemy_ai', 'goal'];

const PALETTES: Partial<Record<ArtStyle, string[]>> = {
  pixel: ['#1a1a2e', '#0f3460', '#e94560', '#f0d9a6'],
  dark_fantasy: ['#16131f', '#35243f', '#5a3a72', '#9e4f5c', '#5ec7ef'],
  cyberpunk: ['#0d0221', '#ff2a6d', '#05d9e8', '#d1f7ff'],
  anime: ['#2b2d42', '#ef476f', '#ffd166', '#06d6a0'],
  noir: ['#0a0a0a', '#3a3a3a', '#9a9a9a', '#e0e0e0'],
  low_poly: ['#1d3557', '#457b9d', '#a8dadc', '#f1faee'],
};
const DEFAULT_PALETTE = ['#12121a', '#5a3a72', '#5ec7ef', '#f0d9a6'];

function healthFor(d: DifficultyBand): number {
  return d === 'casual' ? 5 : d === 'standard' ? 3 : d === 'hardcore' ? 2 : 1;
}
function enemyCountFor(d: DifficultyBand): number {
  return d === 'casual' ? 1 : d === 'standard' ? 3 : d === 'hardcore' ? 5 : 6;
}

/** Une perspective top-down/iso utilise la physique top-down ; sinon platformer (preview). */
function isTopdown(preset: ProductionPreset): boolean {
  return preset.perspective === 'top_down' || preset.perspective === 'isometric';
}

export interface StarterGdlOptions {
  title?: string;
  palette?: string[];
  /** Chemins d'assets déjà générés (sprite héros, fond…). */
  heroSprite?: string;
  backgroundImage?: string;
}

export function buildStarterGdl(preset: ProductionPreset, opts: StarterGdlOptions = {}): GameDefinition {
  const topdown = isTopdown(preset);
  const palette = opts.palette ?? PALETTES[preset.art_style] ?? DEFAULT_PALETTE;
  const activeSystems = topdown ? TOPDOWN_SYSTEMS : SIDE_SYSTEMS;
  const controller = topdown
    ? { topdown_controller: { move_speed: 200, diagonal: true } }
    : { platformer_controller: { move_speed: 220, jump_force: 430, coyote_time_ms: 100 } };

  // Scène jouable depuis un board standard (plateformes, collectibles, goal).
  const scene = buildSceneFromBoard({
    id: 'level_01',
    biome: preset.game_type,
    modules: [
      { x: 320, y: 520, width: 160, collectible: 'pickup' },
      { x: 600, y: 460, width: 140, collectible: 'pickup' },
      { x: 880, y: 500, width: 160, collectible: 'pickup' },
    ],
    background_image: opts.backgroundImage,
  });

  // Ennemis selon difficulté + boucle combat.
  const wantsEnemies = preset.systems.includes('enemy_ai') || preset.game_type !== 'idle_incremental';
  if (wantsEnemies && scene.layout) {
    const n = enemyCountFor(preset.difficulty);
    const groundY = scene.layout.ground_y;
    scene.layout.enemies = Array.from({ length: n }, (_, i) => ({
      x: 400 + i * Math.floor(700 / Math.max(1, n)),
      y: groundY - 40,
      kind: 'enemy',
      patrol: 80,
      speed: 60 + i * 8,
    }));
  }

  return GameDefinitionSchema.parse({
    meta: {
      title: opts.title ?? preset.game_type,
      dimension: preset.dimension,
      genre: preset.game_type,
      resolution: [1280, 720],
      version: '0.1.0',
      // Intention complète (modules + systèmes déclarés) — pour les agents / la suite de prod.
      declared_systems: preset.systems,
      mechanic_modules: preset.mechanic_modules,
    } as Record<string, unknown>,
    style: { palette, dimension: preset.dimension, mood: preset.game_type },
    systems: activeSystems,
    entities: [
      {
        id: 'player',
        type: 'character',
        assets: opts.heroSprite ? { sprite: opts.heroSprite, frame_count: 1 } : {},
        components: [
          { transform: { x: 96, y: 560 } },
          { physics: { body: 'dynamic', gravity: topdown ? 0 : 980 } },
          controller,
          { health: { max: healthFor(preset.difficulty), current: healthFor(preset.difficulty) } },
        ],
      },
    ],
    scenes: [scene],
  });
}
