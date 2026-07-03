import type { GameType, ProductionPreset } from './game-types.js';
import { derivePreset, GAME_TYPES, getGameType } from './game-types.js';

export interface SubtypeBaseLibrary {
  asset_families: string[];
  systems: string[];
  animation_clips: string[];
  environment_kits: string[];
  content_units: string[];
  qa_gates: string[];
  object_blueprints?: string[];
  room_templates?: string[];
  event_hooks?: string[];
  ui_surfaces?: string[];
  audio_cues?: string[];
}

export interface SubtypeProductionLibrary {
  asset_families: string[];
  object_blueprints: string[];
  room_templates: string[];
  event_hooks: string[];
  systems: string[];
  animation_clips: string[];
  environment_kits: string[];
  ui_surfaces: string[];
  audio_cues: string[];
  content_units: string[];
  qa_gates: string[];
}

export interface GameSubtype {
  id: string;
  game_type: string;
  label: string;
  intent_keywords: string[];
  design_pillars: string[];
  base_library: SubtypeBaseLibrary;
}

export interface ProcedureStep {
  id: string;
  label: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  owner_agents: string[];
}

export interface GameCreationProcedure {
  game_type: string;
  subtype: Pick<GameSubtype, 'id' | 'label' | 'design_pillars'>;
  type_chain: string[];
  libraries: SubtypeProductionLibrary;
  steps: ProcedureStep[];
  backlog_templates: { id: string; domain: string; output: string; owner_agent: string }[];
}

const COMMON_QA = ['readable first screen', 'clear objective', 'runtime smoke test', 'mobile performance'];
const COMMON_UI_SURFACES = ['hud', 'pause_menu', 'settings_panel', 'result_screen'];
const COMMON_AUDIO_CUES = ['ui_confirm', 'ui_cancel', 'hit_impact', 'pickup_chime', 'objective_stinger'];

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function ownerForAssetFamily(family: string): string {
  if (family.includes('ui') || family.includes('icon') || family.includes('card')) return 'ui';
  if (family.includes('fx') || family.includes('bullet') || family.includes('projectile')) return 'vfx';
  if (
    family.includes('tile') ||
    family.includes('bg') ||
    family.includes('background') ||
    family.includes('scene') ||
    family.includes('stage') ||
    family.includes('terrain') ||
    family.includes('dungeon') ||
    family.includes('track')
  ) return 'decor';
  return 'character';
}

function mapBlueprints(gameType: GameType | undefined): string[] {
  const mapKind = gameType?.library.map_kind;
  const systems = gameType?.library.systems ?? [];
  const assets = gameType?.library.asset_families ?? [];
  const blueprints = ['obj_game_controller', 'obj_player_spawn', 'obj_camera_controller', 'obj_goal_marker'];

  if (assets.some((a) => a.includes('enemy') || a.includes('horde'))) blueprints.push('obj_enemy_base', 'obj_enemy_spawner');
  if (assets.some((a) => a.includes('boss'))) blueprints.push('obj_boss_controller', 'obj_boss_gate');
  if (assets.some((a) => a.includes('npc') || a.includes('character'))) blueprints.push('obj_npc', 'obj_dialogue_trigger');
  if (assets.some((a) => a.includes('tower'))) blueprints.push('obj_tower_slot', 'obj_tower_unit');
  if (assets.some((a) => a.includes('card'))) blueprints.push('obj_card', 'obj_card_slot');
  if (assets.some((a) => a.includes('vehicle'))) blueprints.push('obj_vehicle', 'obj_checkpoint');
  if (assets.some((a) => a.includes('note'))) blueprints.push('obj_note', 'obj_judgement_line');
  if (assets.some((a) => a.includes('unit') || a.includes('fighter'))) blueprints.push('obj_unit', 'obj_targeting_cursor');

  if (systems.includes('gacha_summon')) blueprints.push('obj_banner', 'obj_summon_result');
  if (systems.includes('inventory')) blueprints.push('obj_inventory_item', 'obj_pickup');
  if (systems.includes('dialogue')) blueprints.push('obj_dialogue_runner');
  if (systems.includes('crafting')) blueprints.push('obj_resource_node', 'obj_crafting_station');
  if (systems.includes('build_placement')) blueprints.push('obj_build_preview', 'obj_building');
  if (systems.includes('wave_spawner') || systems.includes('horde_spawner')) blueprints.push('obj_wave_director');
  if (systems.includes('turn_based_battle')) blueprints.push('obj_turn_manager', 'obj_battle_participant');
  if (systems.includes('grid_match')) blueprints.push('obj_grid_cell', 'obj_match_piece');
  if (systems.includes('falling_blocks')) blueprints.push('obj_falling_piece', 'obj_grid_board');
  if (systems.includes('hotspots')) blueprints.push('obj_hotspot', 'obj_cursor');
  if (systems.includes('deck_system')) blueprints.push('obj_deck', 'obj_discard_pile');
  if (systems.includes('idle_production')) blueprints.push('obj_generator', 'obj_upgrade_button');

  if (mapKind === 'tilemap') blueprints.push('obj_tile_collision_layer', 'obj_room_transition');
  if (mapKind === 'grid' || mapKind === 'isometric_grid') blueprints.push('obj_grid_controller', 'obj_grid_cursor');
  if (mapKind === 'track') blueprints.push('obj_track_segment', 'obj_finish_line');
  if (mapKind === 'endless') blueprints.push('obj_spawn_chunk', 'obj_despawn_zone');
  if (mapKind === 'graph') blueprints.push('obj_node_map', 'obj_route_choice');
  if (mapKind === 'arena') blueprints.push('obj_arena_bounds', 'obj_hazard_zone');

  return uniq(blueprints);
}

function roomTemplates(gameType: GameType | undefined): string[] {
  const mapKind = gameType?.library.map_kind;
  const loops = gameType?.core_loops ?? [];
  const rooms = ['rm_boot', 'rm_first_playable', 'rm_results'];

  if (mapKind === 'tilemap') rooms.push('rm_tilemap_start', 'rm_combat_room', 'rm_goal_room');
  if (mapKind === 'grid') rooms.push('rm_grid_tutorial', 'rm_grid_challenge', 'rm_grid_reward');
  if (mapKind === 'isometric_grid') rooms.push('rm_isometric_hub', 'rm_build_area', 'rm_economy_review');
  if (mapKind === 'graph') rooms.push('rm_node_map', 'rm_event_node', 'rm_boss_or_choice_node');
  if (mapKind === 'scene_graph') rooms.push('rm_scene_intro', 'rm_interaction_scene', 'rm_resolution_scene');
  if (mapKind === 'endless') rooms.push('rm_endless_intro', 'rm_escalation_loop', 'rm_boss_break');
  if (mapKind === 'arena') rooms.push('rm_arena_intro', 'rm_wave_arena', 'rm_reward_room');
  if (mapKind === 'track') rooms.push('rm_track_start', 'rm_track_loop', 'rm_finish_review');

  if (loops.includes('narrative')) rooms.push('rm_dialogue_scene', 'rm_story_branch');
  if (loops.includes('management')) rooms.push('rm_management_hub', 'rm_upgrade_shop');
  if (loops.includes('exploration')) rooms.push('rm_safe_hub', 'rm_discovery_room');
  if (loops.includes('survival')) rooms.push('rm_pressure_wave', 'rm_recovery_break');

  return uniq(rooms);
}

function eventHooks(gameType: GameType | undefined): string[] {
  const systems = gameType?.library.systems ?? [];
  const hooks = ['on_game_start', 'on_player_spawn', 'on_objective_complete', 'on_player_death', 'on_scene_exit'];

  if (systems.some((s) => s.includes('physics') || s.includes('movement'))) hooks.push('on_collision_enter', 'on_grounded_changed');
  if (systems.includes('enemy_ai')) hooks.push('on_enemy_alert', 'on_enemy_defeated');
  if (systems.includes('boss_phases')) hooks.push('on_boss_phase_change', 'on_boss_defeated');
  if (systems.includes('collectibles') || systems.includes('inventory') || systems.includes('loot_system')) hooks.push('on_item_pickup', 'on_inventory_changed');
  if (systems.includes('gacha_summon')) hooks.push('on_banner_open', 'on_pull_started', 'on_pull_resolved', 'on_pity_changed');
  if (systems.includes('wave_spawner') || systems.includes('horde_spawner')) hooks.push('on_wave_start', 'on_wave_clear', 'on_elite_spawn');
  if (systems.includes('turn_based_battle') || systems.includes('turn_system')) hooks.push('on_turn_start', 'on_action_selected', 'on_turn_end');
  if (systems.includes('dialogue') || systems.includes('branching_choices')) hooks.push('on_dialogue_start', 'on_choice_selected', 'on_dialogue_end');
  if (systems.includes('crafting')) hooks.push('on_recipe_selected', 'on_craft_complete');
  if (systems.includes('build_placement')) hooks.push('on_build_preview', 'on_build_confirmed');
  if (systems.includes('deck_system')) hooks.push('on_card_draw', 'on_card_played', 'on_deck_shuffle');
  if (systems.includes('rhythm_input')) hooks.push('on_beat', 'on_note_hit', 'on_note_miss');
  if (systems.includes('vehicle_physics')) hooks.push('on_lap_complete', 'on_checkpoint_passed');
  if (systems.includes('idle_production')) hooks.push('on_tick_income', 'on_prestige');

  return uniq(hooks);
}

function animationClips(gameType: GameType | undefined): string[] {
  const perspective = gameType?.perspectives[0];
  const systems = gameType?.library.systems ?? [];
  const assets = gameType?.library.asset_families ?? [];
  const clips = ['idle', 'hurt', 'death'];

  if (perspective === 'side') clips.push('run', 'jump', 'fall', 'land');
  if (perspective === 'top_down' || perspective === 'isometric') clips.push('walk_4dir', 'turn', 'interact');
  if (systems.some((s) => s.includes('combat') || s.includes('shooting') || s.includes('battle'))) clips.push('attack', 'attack_2', 'cast', 'victory');
  if (systems.includes('stamina_combat')) clips.push('dodge', 'parry', 'guard_break');
  if (systems.includes('gacha_summon')) clips.push('portrait_idle', 'summon_reveal', 'rarity_burst');
  if (systems.includes('wave_spawner') || systems.includes('horde_spawner')) clips.push('level_up', 'pickup_magnet');
  if (systems.includes('turn_based_battle')) clips.push('battle_idle', 'skill_cast', 'ultimate');
  if (systems.includes('rhythm_input')) clips.push('note_hit', 'combo_pulse');
  if (systems.includes('vehicle_physics')) clips.push('drive', 'drift', 'crash');
  if (assets.some((a) => a.includes('building') || a.includes('tower'))) clips.push('construct', 'upgrade', 'destroyed');
  if (assets.some((a) => a.includes('card'))) clips.push('card_hover', 'card_play', 'card_discard');

  return uniq(clips);
}

function environmentKits(gameType: GameType | undefined): string[] {
  const mapKind = gameType?.library.map_kind;
  const family = gameType?.family;
  const kits = ['starter_scene', 'collision_shapes', 'goal_marker'];

  if (mapKind === 'tilemap') kits.push('tile_collision_set', 'decor_prop_set', 'transition_gate');
  if (mapKind === 'grid') kits.push('grid_board', 'cell_highlights', 'grid_obstacles');
  if (mapKind === 'isometric_grid') kits.push('isometric_tiles', 'placement_footprints', 'z_sort_layers');
  if (mapKind === 'graph') kits.push('node_map', 'route_lines', 'event_cards');
  if (mapKind === 'scene_graph') kits.push('painted_background', 'hotspot_overlay', 'foreground_occluders');
  if (mapKind === 'endless') kits.push('chunk_pool', 'parallax_strip', 'spawn_markers');
  if (mapKind === 'arena') kits.push('arena_bounds', 'hazard_telegraphs', 'reward_overlay');
  if (mapKind === 'track') kits.push('track_tiles', 'lap_markers', 'speed_lines');

  if (family === 'rpg') kits.push('quest_hub', 'loot_reward_space');
  if (family === 'strategy') kits.push('tactical_grid_overlay', 'command_panel_space');
  if (family === 'narrative') kits.push('dialogue_backdrop', 'choice_panel_space');
  if (family === 'simulation') kits.push('management_overview', 'resource_nodes');

  return uniq(kits);
}

function uiSurfaces(gameType: GameType | undefined): string[] {
  const systems = gameType?.library.systems ?? [];
  const loops = gameType?.core_loops ?? [];
  const ui = [...COMMON_UI_SURFACES, 'objective_tracker'];

  if (systems.some((s) => s.includes('health') || s.includes('combat') || s.includes('battle'))) ui.push('health_bars', 'combat_feedback');
  if (systems.includes('inventory')) ui.push('inventory_panel');
  if (systems.includes('dialogue')) ui.push('dialogue_box', 'choice_panel');
  if (systems.includes('gacha_summon')) ui.push('summon_banner', 'roster_screen', 'rarity_reveal');
  if (systems.includes('skill_tree') || systems.includes('upgrade_tree')) ui.push('skill_tree_screen');
  if (systems.includes('wave_spawner') || systems.includes('horde_spawner')) ui.push('wave_counter', 'level_up_draft');
  if (systems.includes('turn_based_battle') || systems.includes('turn_system')) ui.push('turn_order_bar', 'action_menu');
  if (systems.includes('deck_system')) ui.push('hand_bar', 'draw_pile_panel');
  if (systems.includes('economy') || loops.includes('management')) ui.push('resource_bar', 'shop_or_build_panel');
  if (systems.includes('rhythm_input')) ui.push('combo_meter', 'judgement_lane');
  if (systems.includes('vehicle_physics')) ui.push('lap_timer', 'speedometer');
  if (systems.includes('idle_production')) ui.push('production_panel', 'prestige_panel');

  return uniq(ui);
}

function audioCues(gameType: GameType | undefined): string[] {
  const systems = gameType?.library.systems ?? [];
  const loops = gameType?.core_loops ?? [];
  const cues = [...COMMON_AUDIO_CUES, 'ambient_loop', gameType?.library.audio_profile ?? 'default_audio_profile'];

  if (loops.includes('combat')) cues.push('attack_swing', 'damage_taken', 'enemy_defeat');
  if (loops.includes('exploration')) cues.push('footstep_soft', 'discovery_chime');
  if (loops.includes('puzzle')) cues.push('puzzle_select', 'puzzle_success', 'puzzle_error');
  if (loops.includes('management')) cues.push('currency_tick', 'upgrade_unlock');
  if (loops.includes('narrative')) cues.push('dialogue_advance', 'choice_confirm', 'story_stinger');
  if (systems.includes('gacha_summon')) cues.push('banner_open', 'pull_roll', 'ssr_reveal');
  if (systems.includes('boss_phases')) cues.push('boss_intro', 'phase_transition', 'boss_defeat');
  if (systems.includes('wave_spawner') || systems.includes('horde_spawner')) cues.push('wave_start', 'wave_clear');
  if (systems.includes('rhythm_input')) cues.push('beat_tick', 'perfect_hit', 'combo_break');
  if (systems.includes('vehicle_physics')) cues.push('engine_loop', 'drift_squeal', 'lap_complete');
  if (systems.includes('idle_production')) cues.push('income_tick', 'prestige_burst');

  return uniq(cues);
}

function contentUnits(gameType: GameType | undefined): string[] {
  const loops = gameType?.core_loops ?? [];
  const units = ['spawn', 'tutorial_prompt', 'challenge', 'reward', 'exit'];

  if (loops.includes('combat')) units.push('training_enemy', 'elite_encounter', 'boss_or_finale');
  if (loops.includes('exploration')) units.push('safe_hub', 'landmark', 'secret_pickup');
  if (loops.includes('puzzle')) units.push('rule_teach', 'constraint_twist', 'solution_payoff');
  if (loops.includes('narrative')) units.push('inciting_dialogue', 'choice_point', 'consequence_scene');
  if (loops.includes('management')) units.push('economy_intro', 'upgrade_decision', 'production_review');
  if (loops.includes('rhythm')) units.push('beat_tutorial', 'combo_section', 'final_phrase');
  if (loops.includes('racing')) units.push('track_start', 'overtake_section', 'finish_line');
  if (loops.includes('survival')) units.push('wave_1_teach', 'pressure_spike', 'recovery_break');

  return uniq(units);
}

function qaGates(gameType: GameType | undefined): string[] {
  const gates = [...COMMON_QA];
  const mapKind = gameType?.library.map_kind;
  const loops = gameType?.core_loops ?? [];

  if (mapKind === 'tilemap') gates.push('tile collision clarity');
  if (mapKind === 'grid' || mapKind === 'isometric_grid') gates.push('grid selection clarity');
  if (mapKind === 'graph') gates.push('node progression consistency');
  if (mapKind === 'endless') gates.push('spawn curve sanity');
  if (mapKind === 'arena') gates.push('arena readability');
  if (mapKind === 'track') gates.push('track boundary clarity');
  if (loops.includes('combat')) gates.push('combat fairness');
  if (loops.includes('puzzle')) gates.push('solution solvability');
  if (loops.includes('management')) gates.push('economy sanity');
  if (loops.includes('narrative')) gates.push('choice readability');

  return uniq(gates);
}

function defaultLibraryForGameType(gameType: GameType | undefined): SubtypeProductionLibrary {
  return {
    asset_families: uniq(gameType?.library.asset_families ?? ['hero', 'enemies', 'props', 'ui_kit', 'fx']),
    object_blueprints: mapBlueprints(gameType),
    room_templates: roomTemplates(gameType),
    event_hooks: eventHooks(gameType),
    systems: uniq(gameType?.library.systems ?? ['input', 'camera_follow', 'goal']),
    animation_clips: animationClips(gameType),
    environment_kits: environmentKits(gameType),
    ui_surfaces: uiSurfaces(gameType),
    audio_cues: audioCues(gameType),
    content_units: contentUnits(gameType),
    qa_gates: qaGates(gameType),
  };
}

function defaultSubtypeForGameType(gameType: GameType | undefined, fallbackId: string): GameSubtype {
  return {
    id: `${gameType?.id ?? fallbackId}_default`,
    game_type: gameType?.id ?? fallbackId,
    label: gameType ? `${gameType.label} standard` : 'Generic production subtype',
    intent_keywords: [],
    design_pillars: gameType
      ? ['preserve the game fantasy', `respect the ${gameType.library.map_kind} structure`, 'ship a coherent first playable']
      : ['keep the first playable coherent', 'preserve the prompt intent', 'grow through validated work orders'],
    base_library: defaultLibraryForGameType(gameType),
  };
}

export const GAME_SUBTYPES: GameSubtype[] = [
  {
    id: 'platformer_precision',
    game_type: 'platformer',
    label: 'Precision platformer',
    intent_keywords: ['celeste', 'precision', 'dash', 'hard jumps', 'platformer'],
    design_pillars: ['tight jump arcs', 'readable hazards', 'checkpoint rhythm'],
    base_library: {
      asset_families: ['hero', 'tileset', 'hazards', 'collectibles', 'parallax_bg', 'checkpoint'],
      systems: ['physics_platformer', 'tile_collision', 'hazards', 'checkpoint_system', 'camera_follow'],
      animation_clips: ['idle', 'run', 'jump', 'fall', 'land', 'dash', 'hurt', 'death'],
      environment_kits: ['starter_tileset', 'hazard_set', 'foreground_depth', 'checkpoint_props'],
      content_units: ['tutorial_gap', 'rhythm_jump_room', 'hazard_room', 'goal_gate'],
      qa_gates: [...COMMON_QA, 'jump reachability', 'checkpoint spacing'],
    },
  },
  {
    id: 'souls_boss_gate',
    game_type: 'souls_like_2d',
    label: 'Souls boss-gate slice',
    intent_keywords: ['elden ring', 'dark souls', 'souls', 'boss', 'bonfire', 'parry', 'dodge'],
    design_pillars: ['punitive but fair combat', 'strong boss silhouette', 'safe checkpoint before escalation'],
    base_library: {
      asset_families: ['hero', 'bosses', 'enemies', 'weapons', 'checkpoint_bonfire', 'tileset', 'parallax_bg', 'hit_fx'],
      systems: ['physics_platformer', 'stamina_combat', 'parry_dodge', 'lock_on', 'boss_phases', 'bonfire_checkpoints'],
      animation_clips: ['idle', 'run', 'jump', 'attack_1', 'attack_2', 'parry', 'dodge', 'hurt', 'death', 'boss_tell', 'boss_attack'],
      environment_kits: ['ashen_ruins', 'boss_gate', 'foreground_occluders', 'grave_hazards', 'bonfire_checkpoint'],
      content_units: ['approach_room', 'training_enemy', 'hazard_read', 'checkpoint', 'boss_gate'],
      qa_gates: [...COMMON_QA, 'combat fairness', 'telegraph readability', 'boss phase completion'],
    },
  },
  {
    id: 'action_rpg_mana_adventure',
    game_type: 'action_rpg',
    label: 'Mana-style adventure RPG',
    intent_keywords: ['secret of mana', 'adventures of elliot', 'mana', 'spirit', 'relic', 'adventure'],
    design_pillars: ['exploration first', 'clean top-down combat', 'world charm through props and landmarks'],
    base_library: {
      asset_families: ['hero', 'enemies', 'npcs', 'items', 'loot', 'skills', 'tileset', 'biome_props', 'portraits'],
      systems: ['physics_topdown', 'enemy_ai', 'combat_melee', 'inventory', 'dialogue', 'quest_log', 'skill_tree'],
      animation_clips: ['idle', 'walk_4dir', 'attack_4dir', 'cast', 'pickup', 'hurt', 'death'],
      environment_kits: ['village_edge', 'forest_path', 'relic_gate', 'dungeon_room', 'interactive_props'],
      content_units: ['spawn_shrine', 'npc_hint', 'combat_clearing', 'relic_pickup', 'sealed_exit'],
      qa_gates: [...COMMON_QA, 'top-down collision clarity', 'quest objective readability'],
    },
  },
  {
    id: 'gacha_lane_action',
    game_type: 'gacha_rpg',
    label: 'Lane action gacha',
    intent_keywords: ['gacha', 'gatcha', 'lane', 'portrait', 'summon', 'banner', 'run'],
    design_pillars: ['premium roster fantasy', 'short readable combat runs', 'summon-to-upgrade loop'],
    base_library: {
      asset_families: ['heroes_roster', 'portraits', 'banner_art', 'enemy_horde', 'bosses', 'ui_kit', 'rarity_fx', 'arena_backgrounds'],
      systems: ['lane_runner', 'wave_spawner', 'auto_attack', 'gacha_summon', 'roster_collection', 'banner_rotation', 'pity_system', 'skill_tree'],
      animation_clips: ['idle', 'walk_lane', 'attack', 'cast_or_summon', 'hurt', 'victory', 'portrait_idle'],
      environment_kits: ['summon_hub', 'combat_lanes', 'boss_arena', 'rarity_reveal_fx', 'reward_screen'],
      content_units: ['banner_intro', 'first_pull', 'wave_run', 'blessing_choice', 'boss_reward'],
      qa_gates: [...COMMON_QA, 'summon economy sanity', 'lane hazard readability', 'reward loop clarity'],
    },
  },
  {
    id: 'gacha_turn_based_collection',
    game_type: 'gacha_rpg',
    label: 'Turn-based collection RPG',
    intent_keywords: ['turn based', 'tour par tour', 'party', 'fgo', 'jrpg', 'collection'],
    design_pillars: ['party identity', 'clear turn economy', 'collection progression'],
    base_library: {
      asset_families: ['heroes_roster', 'party', 'portraits', 'enemies', 'bosses', 'banner_art', 'ui_kit', 'skill_icons'],
      systems: ['turn_based_battle', 'gacha_summon', 'roster_collection', 'skill_tree', 'ascension_levels', 'quest_log'],
      animation_clips: ['battle_idle', 'basic_attack', 'skill_cast', 'ultimate', 'hurt', 'defeat', 'victory'],
      environment_kits: ['battle_stage', 'summon_hub', 'party_menu', 'quest_map'],
      content_units: ['party_setup', 'tutorial_battle', 'first_banner', 'boss_battle', 'upgrade_reward'],
      qa_gates: [...COMMON_QA, 'turn order clarity', 'party balance sanity', 'summon economy sanity'],
    },
  },
  {
    id: 'survivors_three_lane',
    game_type: 'survivors_like',
    label: 'Three-lane survivors',
    intent_keywords: ['survivors', 'lane', 'portrait', 'vampire survivors', 'horde', 'waves'],
    design_pillars: ['one-thumb control', 'wave escalation', 'draft choices with visible impact'],
    base_library: {
      asset_families: ['hero', 'enemy_horde', 'bosses', 'weapons', 'pickups', 'ui_kit', 'fx', 'arena_backgrounds'],
      systems: ['lane_runner', 'wave_spawner', 'auto_attack', 'blessing_draft', 'hazard_scheduler', 'boss_phases'],
      animation_clips: ['idle', 'lane_step', 'auto_attack', 'hurt', 'level_up', 'victory', 'death'],
      environment_kits: ['three_lane_arena', 'hazard_telegraphs', 'boss_entry', 'reward_overlay'],
      content_units: ['wave_1_teach', 'wave_2_pressure', 'draft_break', 'elite_wave', 'boss_wave'],
      qa_gates: [...COMMON_QA, 'wave curve sanity', 'hazard telegraph readability'],
    },
  },
  {
    id: 'topdown_dungeon_adventure',
    game_type: 'topdown_adventure',
    label: 'Top-down dungeon adventure',
    intent_keywords: ['zelda', 'dungeon', 'key', 'temple', 'tunic', 'puzzle'],
    design_pillars: ['exploration loop', 'key-lock progression', 'room readability'],
    base_library: {
      asset_families: ['hero', 'enemies', 'npcs', 'items', 'doors', 'keys', 'tileset', 'dungeons', 'ui_kit'],
      systems: ['physics_topdown', 'tile_collision', 'inventory', 'dialogue', 'triggers', 'enemy_ai', 'goal'],
      animation_clips: ['idle', 'walk_4dir', 'attack_4dir', 'interact', 'pickup', 'hurt', 'death'],
      environment_kits: ['dungeon_tiles', 'locked_door', 'key_pickup', 'puzzle_room', 'boss_door'],
      content_units: ['safe_spawn', 'locked_gate', 'key_room', 'enemy_room', 'exit_room'],
      qa_gates: [...COMMON_QA, 'key-lock solvability', 'top-down collision clarity'],
    },
  },
  {
    id: 'metroidvania_ability_gated',
    game_type: 'metroidvania',
    label: 'Ability-gated metroidvania',
    intent_keywords: ['metroidvania', 'ability', 'backtrack', 'map', 'hollow knight'],
    design_pillars: ['ability gating', 'world graph readability', 'rewarding backtracking'],
    base_library: {
      asset_families: ['hero', 'enemies', 'bosses', 'abilities', 'tileset', 'map_markers', 'parallax_bg', 'save_room'],
      systems: ['physics_platformer', 'tile_collision', 'enemy_ai', 'abilities', 'world_map', 'save_system', 'camera_follow'],
      animation_clips: ['idle', 'run', 'jump', 'fall', 'attack', 'ability_use', 'hurt', 'death'],
      environment_kits: ['starting_zone', 'locked_ability_gate', 'save_room', 'boss_room', 'shortcut'],
      content_units: ['start_room', 'combat_room', 'ability_gate', 'reward_room', 'shortcut_exit'],
      qa_gates: [...COMMON_QA, 'ability gate solvability', 'world graph consistency'],
    },
  },
];

export function listGameSubtypes(gameTypeId?: string): GameSubtype[] {
  return gameTypeId ? GAME_SUBTYPES.filter((s) => s.game_type === gameTypeId) : [...GAME_SUBTYPES];
}

export function getGameSubtype(id: string): GameSubtype | undefined {
  return GAME_SUBTYPES.find((s) => s.id === id);
}

export function inferGameSubtype(input: {
  game_type: string;
  subtype_id?: string;
  prompt?: string;
  mechanic_modules?: string[];
}): GameSubtype {
  if (input.subtype_id) {
    const exact = getGameSubtype(input.subtype_id);
    if (exact) return exact;
  }

  const candidates = listGameSubtypes(input.game_type);
  if (candidates.length === 0) {
    return defaultSubtypeForGameType(getGameType(input.game_type), input.game_type);
  }

  const haystack = `${input.prompt ?? ''} ${(input.mechanic_modules ?? []).join(' ')}`.toLowerCase();
  let best = candidates[0]!;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = candidate.intent_keywords.reduce((acc, keyword) => acc + (haystack.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function mergeLibraries(gameType: GameType | undefined, subtype: GameSubtype): SubtypeProductionLibrary {
  const defaults = defaultLibraryForGameType(gameType);
  const base = subtype.base_library;

  return {
    asset_families: uniq([...(gameType?.library.asset_families ?? []), ...defaults.asset_families, ...base.asset_families]),
    object_blueprints: uniq([...defaults.object_blueprints, ...(base.object_blueprints ?? [])]),
    room_templates: uniq([...defaults.room_templates, ...(base.room_templates ?? [])]),
    event_hooks: uniq([...defaults.event_hooks, ...(base.event_hooks ?? [])]),
    systems: uniq([...(gameType?.library.systems ?? []), ...defaults.systems, ...base.systems]),
    animation_clips: uniq([...defaults.animation_clips, ...base.animation_clips]),
    environment_kits: uniq([...defaults.environment_kits, ...base.environment_kits]),
    ui_surfaces: uniq([...defaults.ui_surfaces, ...(base.ui_surfaces ?? [])]),
    audio_cues: uniq([...defaults.audio_cues, ...(base.audio_cues ?? [])]),
    content_units: uniq([...defaults.content_units, ...base.content_units]),
    qa_gates: uniq([...defaults.qa_gates, ...base.qa_gates, ...(gameType?.core_loops ?? []).map((loop) => `loop:${loop}`)]),
  };
}

function backlogFromLibrary(library: SubtypeProductionLibrary): GameCreationProcedure['backlog_templates'] {
  return [
    ...library.asset_families.map((family) => ({
      id: `asset:${family}`,
      domain: 'asset',
      output: family,
      owner_agent: ownerForAssetFamily(family),
    })),
    ...library.object_blueprints.map((blueprint) => ({
      id: `object:${blueprint}`,
      domain: 'object_blueprint',
      output: blueprint,
      owner_agent: 'codegen',
    })),
    ...library.room_templates.map((room) => ({
      id: `room:${room}`,
      domain: 'room',
      output: room,
      owner_agent: 'level_design',
    })),
    ...library.event_hooks.map((hook) => ({
      id: `event:${hook}`,
      domain: 'event_graph',
      output: hook,
      owner_agent: 'codegen',
    })),
    ...library.animation_clips.map((clip) => ({
      id: `animation:${clip}`,
      domain: 'animation',
      output: clip,
      owner_agent: 'animation',
    })),
    ...library.environment_kits.map((kit) => ({
      id: `environment:${kit}`,
      domain: 'environment',
      output: kit,
      owner_agent: 'decor',
    })),
    ...library.ui_surfaces.map((surface) => ({
      id: `ui:${surface}`,
      domain: 'ui',
      output: surface,
      owner_agent: 'ui',
    })),
    ...library.audio_cues.map((cue) => ({
      id: `audio:${cue}`,
      domain: 'audio',
      output: cue,
      owner_agent: 'audio',
    })),
    ...library.systems.map((system) => ({
      id: `system:${system}`,
      domain: 'gameplay',
      output: system,
      owner_agent: 'gameplay',
    })),
    ...library.content_units.map((unit) => ({
      id: `content:${unit}`,
      domain: 'content',
      output: unit,
      owner_agent: 'narrative',
    })),
    ...library.qa_gates.map((gate) => ({
      id: `qa:${gate}`,
      domain: 'qa',
      output: gate,
      owner_agent: 'qa',
    })),
  ];
}

export function buildGameCreationProcedure(input: {
  preset: ProductionPreset;
  subtype_id?: string;
  prompt?: string;
}): GameCreationProcedure {
  const gameType = getGameType(input.preset.game_type);
  const subtype = inferGameSubtype({
    game_type: input.preset.game_type,
    subtype_id: input.subtype_id,
    prompt: input.prompt,
    mechanic_modules: input.preset.mechanic_modules,
  });
  const libraries = mergeLibraries(gameType, subtype);

  const steps: ProcedureStep[] = [
    {
      id: '01_intent_contract',
      label: 'Intent contract',
      purpose: 'Lock the game fantasy, subtype and production boundaries before assets are created.',
      inputs: ['prompt', 'boards', 'reference_images'],
      outputs: ['north_star', 'subtype', 'scope', 'quality_gates'],
      owner_agents: ['producer', 'game_design'],
    },
    {
      id: '02_library_resolution',
      label: 'Base library resolution',
      purpose: 'Expand the type/subtype into concrete assets, GameMaker-like objects, rooms, events, UI/audio, animation clips and gameplay systems.',
      inputs: ['game_type', 'subtype', 'mechanic_modules'],
      outputs: ['asset_families', 'object_blueprints', 'room_templates', 'event_hooks', 'animation_clips', 'environment_kits', 'ui_surfaces', 'audio_cues', 'systems'],
      owner_agents: ['producer', 'asset_direction'],
    },
    {
      id: '03_board_to_world',
      label: 'Board to world',
      purpose: 'Convert boards and prompt intent into a playable scene layout with collisions and objective flow.',
      inputs: ['boards', 'room_templates', 'content_units', 'map_kind'],
      outputs: ['scene_layout', 'room_graph', 'encounters', 'collision_shapes', 'goal'],
      owner_agents: ['level_design'],
    },
    {
      id: '04_asset_generation',
      label: 'Asset generation',
      purpose: 'Generate or cut every required asset family, with fallback placeholders tracked as missing work.',
      inputs: ['asset_families', 'reference_images', 'art_style'],
      outputs: ['hero', 'enemies', 'environment_assets', 'ui_assets', 'fx_assets'],
      owner_agents: ['character', 'decor', 'ui', 'vfx'],
    },
    {
      id: '05_animation_and_models',
      label: 'Animation and 2D/2.5D models',
      purpose: 'Create layered 2D rigs, sprite sheets and 2.5D billboard/depth variants where needed.',
      inputs: ['hero_asset', 'enemy_assets', 'animation_clips', 'dimension'],
      outputs: ['rigs', 'clips', 'runtime_atlas', 'depth_variants'],
      owner_agents: ['animation', 'character'],
    },
    {
      id: '06_gameplay_systems',
      label: 'Gameplay systems',
      purpose: 'Implement or scaffold the systems required by the subtype and bind them to the GDL.',
      inputs: ['systems', 'object_blueprints', 'event_hooks', 'entities', 'scene_layout'],
      outputs: ['runtime_systems', 'components', 'event_graph', 'balance_tables'],
      owner_agents: ['gameplay', 'codegen'],
    },
    {
      id: '07_story_and_content',
      label: 'Story and content',
      purpose: 'Create the narrative reason for the scene, objectives, NPC hooks and future content queue.',
      inputs: ['north_star', 'content_units', 'ui_surfaces', 'audio_cues'],
      outputs: ['story_hook', 'quest_objective', 'dialogue_seed', 'content_units', 'future_content_queue'],
      owner_agents: ['narrative'],
    },
    {
      id: '08_integration_qa_export',
      label: 'Integration, QA and export',
      purpose: 'Validate the slice, measure gaps, then export a playable review build.',
      inputs: ['gdl', 'assets', 'systems', 'qa_gates'],
      outputs: ['preview_bundle', 'qa_report', 'missing_elements', 'export_manifest'],
      owner_agents: ['integration', 'qa'],
    },
  ];

  return {
    game_type: input.preset.game_type,
    subtype: {
      id: subtype.id,
      label: subtype.label,
      design_pillars: subtype.design_pillars,
    },
    type_chain: [gameType?.family ?? 'unknown_family', input.preset.game_type, subtype.id],
    libraries,
    steps,
    backlog_templates: backlogFromLibrary(libraries),
  };
}

export function buildGameCreationProcedureForType(gameTypeId: string, prompt?: string): GameCreationProcedure {
  return buildGameCreationProcedure({
    preset: derivePreset({ game_type: gameTypeId }),
    prompt,
  });
}

export function buildCatalogCreationProcedures(): GameCreationProcedure[] {
  return GAME_TYPES.map((type) => buildGameCreationProcedureForType(type.id));
}
