/**
 * Contrat GDL — IA ennemis (patrol, vagues, boss, aggro).
 */
import { z } from 'zod';

export const PatrolSpecSchema = z.object({
  range: z.number().default(120),
  speed: z.number().default(80),
  axis: z.enum(['x', 'y', 'both']).default('x'),
});

export const EnemyArchetypeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  hp: z.number().default(1),
  damage: z.number().default(1),
  speed: z.number().default(100),
  patrol: PatrolSpecSchema.optional(),
  aggro_range: z.number().optional(),
  loot_table: z.string().optional(),
});

export const WaveSpecSchema = z.object({
  wave: z.number().int(),
  enemies: z.array(
    z.object({
      type: z.string(),
      lane: z.string().optional(),
      count: z.number().int().default(1),
    }),
  ),
  boss: z
    .object({
      type: z.string(),
      phase_count: z.number().int().default(2),
      spawn_lane: z.string().optional(),
    })
    .optional(),
});

export const EnemyAiPackSchema = z.object({
  version: z.string().default('1'),
  archetypes: z.array(EnemyArchetypeSchema).default([]),
  waves: z.array(WaveSpecSchema).default([]),
  global: z
    .object({
      max_simultaneous: z.number().int().default(5),
      spawn_interval_ms: z.number().int().default(800),
    })
    .optional(),
});

export type EnemyAiPack = z.infer<typeof EnemyAiPackSchema>;

/** Template Veloria-like pour agents gameplay/level. */
export function createSurvivorsEnemyAiPack(): EnemyAiPack {
  return EnemyAiPackSchema.parse({
    version: '1',
    global: { max_simultaneous: 5, spawn_interval_ms: 900 },
    archetypes: [
      { id: 'shade', label: 'Shade', hp: 1, speed: 90, patrol: { range: 0, speed: 0, axis: 'x' } },
      { id: 'elite_knight', label: 'Elite', hp: 3, speed: 70, aggro_range: 200 },
    ],
    waves: [
      { wave: 1, enemies: [{ type: 'shade', lane: 'lane_center', count: 3 }] },
      { wave: 2, enemies: [{ type: 'shade', lane: 'lane_left', count: 2 }, { type: 'shade', lane: 'lane_right', count: 2 }] },
    ],
  });
}

/** Composant patrol pour entity GDL. */
export function patrolComponent(spec: z.infer<typeof PatrolSpecSchema>): Record<string, unknown> {
  return { patrol: spec };
}
