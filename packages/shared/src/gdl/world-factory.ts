/**
 * World factory (Lot 6) — convertit un *board* de niveau en `Scene` GDL jouable.
 *
 * board (biome + ancres + modules) → layout (plateformes, collectibles, hazards, zones,
 * spawn/goal/checkpoints) → `SceneSchema` valide. Pur, déterministe, vérifiable.
 * `checkSceneTraversability` donne un verdict de cohérence (gate QA scène, Lot 6).
 */
import { z } from 'zod';
import { SceneSchema, type Scene, type GdlLayout } from './ir.js';

export const LevelModuleSchema = z.object({
  /** Position de départ de la rangée de plateformes (x). */
  x: z.number(),
  /** Hauteur de la rangée (y du dessus). */
  y: z.number(),
  width: z.number(),
  kind: z.enum(['ground', 'platform']).default('platform'),
  collectible: z.string().optional(),
});

export const LevelBoardSchema = z.object({
  id: z.string(),
  biome: z.string().default('default'),
  width: z.number().default(1280),
  height: z.number().default(720),
  background_image: z.string().optional(),
  modules: z.array(LevelModuleSchema).default([]),
  hazards: z
    .array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), kind: z.string() }))
    .default([]),
  checkpoints: z.array(z.object({ x: z.number(), y: z.number(), label: z.string() })).default([]),
  zones: z
    .array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number(), theme: z.string().optional() }))
    .default([]),
});
export type LevelBoard = z.infer<typeof LevelBoardSchema>;

/** Convertit un layout procédural (`level-gen`) en board world-factory. */
export function layoutToBoard(
  layout: {
    width: number;
    height: number;
    hazards?: LevelBoard['hazards'];
    checkpoints?: LevelBoard['checkpoints'];
    zones?: LevelBoard['zones'];
    platforms: { x: number; y: number; w: number; type: string }[];
  },
  id = 'level_01',
  biome = 'generated',
): LevelBoard {
  return {
    id,
    biome,
    width: layout.width,
    height: layout.height,
    modules: layout.platforms
      .filter((p) => p.type !== 'ground')
      .map((p) => ({
        x: p.x,
        y: p.y,
        width: p.w,
        kind: (p.type === 'ground' ? 'ground' : 'platform') as 'ground' | 'platform',
      })),
    hazards: layout.hazards ?? [],
    checkpoints: layout.checkpoints ?? [],
    zones: layout.zones ?? [],
  };
}

export function buildSceneFromBoard(input: unknown): Scene {
  const board = LevelBoardSchema.parse(input);
  const groundY = board.height - 80;

  const platforms: GdlLayout['platforms'] = [
    { x: 0, y: groundY, w: board.width, h: 80, type: 'ground' },
    ...board.modules.map((m) => ({ x: m.x, y: m.y, w: m.width, h: 24, type: m.kind })),
  ];

  const collectibles = board.modules
    .filter((m) => m.collectible)
    .map((m) => ({ x: m.x + m.width / 2, y: m.y - 28, type: m.collectible! }));

  const spawn = { x: 96, y: groundY - 72 };
  const goal = { x: board.width - 96, y: groundY - 64 };

  const layout: GdlLayout = {
    width: board.width,
    height: board.height,
    ground_y: groundY,
    spawn,
    platforms,
    collectibles,
    hazards: board.hazards,
    checkpoints: board.checkpoints,
    zones: board.zones,
    goal,
  };

  return SceneSchema.parse({
    id: board.id,
    entities: ['player'],
    background: board.background_image
      ? { image: board.background_image, alpha: 0.6 }
      : { color: '#120f18' },
    layout,
    spawn,
  });
}

export interface TraversabilityReport {
  ok: boolean;
  warnings: string[];
}

/**
 * Vérifie qu'une scène est plausible : sol présent, goal présent, et chaque plateforme
 * élevée reste à portée de saut d'un support inférieur (sol ou plateforme plus basse).
 * `maxRise` = hauteur de saut max (px).
 */
export function checkSceneTraversability(scene: Scene, maxRise = 240): TraversabilityReport {
  const warnings: string[] = [];
  const layout = scene.layout;
  if (!layout) return { ok: false, warnings: ['Scène sans layout'] };
  if (!layout.platforms.some((p) => p.type === 'ground')) warnings.push('Aucun sol (ground)');
  if (!layout.goal) warnings.push('Aucun goal');

  for (const p of layout.platforms) {
    if (p.type === 'ground') continue;
    // Supports = sol + plateformes plus basses (y plus grand). Plus petit dénivelé positif.
    const supports = [layout.ground_y, ...layout.platforms.filter((q) => q !== p && q.y > p.y).map((q) => q.y)];
    const nearestRise = Math.min(...supports.map((y) => y - p.y));
    if (nearestRise > maxRise) {
      warnings.push(`Plateforme hors de portée de saut (${Math.round(nearestRise)}px) à x=${p.x}`);
    }
  }
  return { ok: warnings.length === 0, warnings };
}
