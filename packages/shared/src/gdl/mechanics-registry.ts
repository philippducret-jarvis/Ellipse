/**
 * Registre unique — systèmes GDL réellement exécutés par @ellipse/engine.
 * Source de vérité pour library-plan, validate GDL et audit mécaniques.
 */
export const ENGINE_IMPLEMENTED_SYSTEMS = [
  'input',
  'physics_platformer',
  'platformer_physics',
  'physics_topdown',
  'collectibles',
  'enemy_ai',
  'hazards',
  'goal',
  'health',
  'double_jump',
  // Veloria survivors
  'lane_runner',
  'wave_spawner',
  'auto_attack',
  'blessing_draft',
  'hazard_scheduler',
  'boss_phases',
] as const;

export type EngineImplementedSystem = (typeof ENGINE_IMPLEMENTED_SYSTEMS)[number];

export const VELORIA_SYSTEMS = [
  'lane_runner',
  'wave_spawner',
  'auto_attack',
  'blessing_draft',
  'hazard_scheduler',
  'boss_phases',
] as const;

export function isEngineImplementedSystem(id: string): boolean {
  return (ENGINE_IMPLEMENTED_SYSTEMS as readonly string[]).includes(id);
}

/** Systèmes déclarés codegen mais non branchés au runtime (audit). */
export const CODEGEN_ONLY_SYSTEMS = [
  'gacha_summon',
  'summon_units',
  'loot_system',
  'stamina_combat',
  'parry_dodge',
  'turn_based_battle',
  'tower_placement',
  'enemy_paths',
  'idle_production',
  'prestige',
  'skill_tree',
  'falling_blocks',
  'line_clear',
  'grid_match',
  'deck_system',
  'card_effects',
  'horde_spawner',
  'tile_collision',
  'camera_follow',
  'combat_melee',
] as const;
