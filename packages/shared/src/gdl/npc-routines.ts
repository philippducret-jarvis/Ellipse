/**
 * Contrat GDL — routines PNJ (schedules, zones, états).
 */
import { z } from 'zod';

export const NpcScheduleStateSchema = z.object({
  id: z.string(),
  kind: z.enum(['idle', 'walk', 'talk', 'work', 'sleep']).default('idle'),
  zone: z.string().optional(),
  duration_ms: z.number().int().optional(),
  dialogue_id: z.string().optional(),
  animation_clip: z.string().optional(),
});

export const NpcRoutineSchema = z.object({
  npc_id: z.string(),
  label: z.string().optional(),
  default_state: z.string().default('idle'),
  schedule: z.array(NpcScheduleStateSchema).default([]),
  triggers: z
    .array(
      z.object({
        on: z.enum(['enter_zone', 'quest_complete', 'time_of_day', 'player_proximity']),
        ref: z.string(),
        action: z.string(),
      }),
    )
    .default([]),
});

export const NpcRoutinesPackSchema = z.object({
  version: z.string().default('1'),
  npcs: z.array(NpcRoutineSchema).default([]),
});

export type NpcRoutine = z.infer<typeof NpcRoutineSchema>;
export type NpcRoutinesPack = z.infer<typeof NpcRoutinesPackSchema>;

/** Template PNJ hub pour agents narrative/gameplay. */
export function createDefaultNpcRoutinesPack(): NpcRoutinesPack {
  return NpcRoutinesPackSchema.parse({
    version: '1',
    npcs: [
      {
        npc_id: 'npc_merchant',
        label: 'Marchand',
        default_state: 'idle',
        schedule: [
          { id: 'morning_idle', kind: 'idle', zone: 'hub_market', duration_ms: 60000 },
          { id: 'afternoon_talk', kind: 'talk', zone: 'hub_market', dialogue_id: 'dlg_merchant_greet' },
        ],
        triggers: [{ on: 'player_proximity', ref: 'hub_market', action: 'open_dialogue:dlg_merchant_greet' }],
      },
    ],
  });
}

/** Patch GDL narrative avec pack routines. */
export function mergeNpcRoutinesIntoGdl(
  narrative: Record<string, unknown>,
  pack: NpcRoutinesPack,
): Record<string, unknown> {
  return {
    ...narrative,
    npc_routines: pack.npcs,
  };
}
