/**
 * Catalogue exhaustif des types de jeux + questionnaire de création + dérivation de preset.
 *
 * Pierre angulaire de la création « tous genres » : chaque `GameType` déclare sa dimension,
 * ses perspectives, ses styles d'art, sa boucle, et surtout sa **bibliothèque** (familles
 * d'assets, type de carte, profil audio, systèmes runtime). Le questionnaire (`CREATION_WIZARD`)
 * collecte l'intention ; `derivePreset` produit la configuration de production.
 *
 * Données pures (aucune dépendance) → testables et consommables par l'IA, les agents et le studio.
 */

export type GameDimension = '2d' | '2.5d' | '3d';
export type CameraPerspective = 'side' | 'top_down' | 'isometric' | 'first_person' | 'third_person';

export type ArtStyle =
  | 'pixel'
  | 'hand_drawn'
  | 'vector_flat'
  | 'cartoon'
  | 'painterly'
  | 'low_poly'
  | 'retro_8bit'
  | 'minimalist'
  | 'noir'
  | 'anime'
  | 'dark_fantasy'
  | 'cyberpunk';

export type CoreLoop =
  | 'platforming'
  | 'combat'
  | 'exploration'
  | 'puzzle'
  | 'narrative'
  | 'management'
  | 'rhythm'
  | 'racing'
  | 'survival'
  | 'building'
  | 'stealth'
  | 'shooting'
  | 'tactics'
  | 'deckbuilding'
  | 'sports';

export type MapKind =
  | 'tilemap'
  | 'grid'
  | 'graph'
  | 'isometric_grid'
  | 'board'
  | 'scene_graph'
  | 'endless'
  | 'arena'
  | 'track';

export type DifficultyBand = 'casual' | 'standard' | 'hardcore' | 'souls';

export interface GameTypeLibrary {
  /** Familles d'assets à générer (rôles personnages, ennemis, props, tilesets, UI, FX, portraits…). */
  asset_families: string[];
  map_kind: MapKind;
  /** Profil audio : genre musical + set SFX attendu. */
  audio_profile: string;
  /** Systèmes runtime activés (alignés sur le moteur ; certains sont feuille de route). */
  systems: string[];
}

export interface GameType {
  id: string;
  label: string;
  family: string;
  dimensions: GameDimension[];
  perspectives: CameraPerspective[];
  default_art_styles: ArtStyle[];
  core_loops: CoreLoop[];
  difficulty_band: DifficultyBand;
  library: GameTypeLibrary;
  /** Phase de construction Ellipse (1 = MVP runtime actuel, 2 = étendu, 3 = avancé/3D). */
  phase: 1 | 2 | 3;
  /** Jeux de référence best-in-class (rempli depuis REFERENCE_DATA). */
  reference_games?: string[];
  /** Modules de mécaniques suggérés pour ce type (rempli depuis REFERENCE_DATA). */
  suggested_modules?: string[];
}

const COMMON_FAMILIES = ['hero', 'enemies', 'props', 'ui_kit', 'fx'];

export const GAME_TYPES: GameType[] = [
  // ── ACTION / PLATEFORME ──
  {
    id: 'platformer',
    label: 'Plateforme',
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['pixel', 'hand_drawn', 'cartoon'],
    core_loops: ['platforming', 'combat', 'exploration'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'tileset', 'collectibles', 'parallax_bg'], map_kind: 'tilemap', audio_profile: 'chiptune+arcade_sfx', systems: ['physics_platformer', 'tile_collision', 'collectibles', 'enemy_ai', 'camera_follow', 'hazards', 'goal'] },
    phase: 1,
  },
  {
    id: 'metroidvania',
    label: 'Metroidvania',
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['pixel', 'painterly', 'dark_fantasy'],
    core_loops: ['platforming', 'combat', 'exploration'],
    difficulty_band: 'hardcore',
    library: { asset_families: [...COMMON_FAMILIES, 'tileset', 'bosses', 'abilities', 'map_markers'], map_kind: 'graph', audio_profile: 'atmospheric+orchestral', systems: ['physics_platformer', 'tile_collision', 'enemy_ai', 'abilities', 'world_map', 'save_system', 'camera_follow'] },
    phase: 2,
  },
  {
    id: 'souls_like_2d',
    label: 'Souls-like 2D',
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['dark_fantasy', 'painterly', 'noir'],
    core_loops: ['combat', 'exploration'],
    difficulty_band: 'souls',
    library: { asset_families: [...COMMON_FAMILIES, 'bosses', 'tileset', 'checkpoint_bonfire', 'weapons'], map_kind: 'graph', audio_profile: 'dark_ambient+impact_sfx', systems: ['physics_platformer', 'stamina_combat', 'lock_on', 'parry_dodge', 'bonfire_checkpoints', 'enemy_ai', 'boss_phases'] },
    phase: 2,
  },
  {
    id: 'runner',
    label: 'Runner / Endless',
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['vector_flat', 'cartoon', 'minimalist'],
    core_loops: ['platforming'],
    difficulty_band: 'casual',
    library: { asset_families: [...COMMON_FAMILIES, 'obstacles', 'pickups', 'parallax_bg'], map_kind: 'endless', audio_profile: 'electro+arcade_sfx', systems: ['runner_physics', 'endless_scroll', 'collectibles', 'obstacle_spawner'] },
    phase: 1,
  },
  {
    id: 'beat_em_up',
    label: "Beat'em up",
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['pixel', 'cartoon', 'anime'],
    core_loops: ['combat'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'combo_fx', 'street_props'], map_kind: 'scene_graph', audio_profile: 'funk_rock+punch_sfx', systems: ['brawler_combat', 'combo_system', 'enemy_waves', 'camera_lock'] },
    phase: 2,
  },
  {
    id: 'fighting',
    label: 'Combat / Versus',
    family: 'action',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['anime', 'pixel', 'cartoon'],
    core_loops: ['combat'],
    difficulty_band: 'hardcore',
    library: { asset_families: ['fighters', 'stages', 'ui_kit', 'hit_fx', 'portraits'], map_kind: 'arena', audio_profile: 'rock+impact_sfx', systems: ['fighting_physics', 'hitbox', 'combo_system', 'health_bars', 'round_system'] },
    phase: 2,
  },
  // ── TIR ──
  {
    id: 'twin_stick_shooter',
    label: 'Twin-stick shooter',
    family: 'shooter',
    dimensions: ['2d'],
    perspectives: ['top_down'],
    default_art_styles: ['vector_flat', 'pixel', 'cyberpunk'],
    core_loops: ['shooting', 'combat'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'projectiles', 'arena_tiles'], map_kind: 'arena', audio_profile: 'synthwave+laser_sfx', systems: ['physics_topdown', 'shooting', 'enemy_ai', 'wave_spawner', 'twin_stick_aim'] },
    phase: 2,
  },
  {
    id: 'shmup',
    label: 'Shoot’em up (shmup)',
    family: 'shooter',
    dimensions: ['2d'],
    perspectives: ['side', 'top_down'],
    default_art_styles: ['pixel', 'retro_8bit', 'cyberpunk'],
    core_loops: ['shooting'],
    difficulty_band: 'hardcore',
    library: { asset_families: ['ships', 'enemies', 'bullets', 'bosses', 'ui_kit', 'fx'], map_kind: 'endless', audio_profile: 'chiptune+laser_sfx', systems: ['auto_scroll', 'bullet_patterns', 'shooting', 'boss_phases', 'power_ups'] },
    phase: 2,
  },
  // ── AVENTURE / RPG ──
  {
    id: 'topdown_adventure',
    label: 'Aventure top-down (Zelda-like)',
    family: 'adventure',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down'],
    default_art_styles: ['pixel', 'cartoon', 'hand_drawn'],
    core_loops: ['exploration', 'combat', 'puzzle'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'tileset', 'npcs', 'items', 'dungeons'], map_kind: 'tilemap', audio_profile: 'orchestral+fantasy_sfx', systems: ['physics_topdown', 'tile_collision', 'dialogue', 'inventory', 'enemy_ai', 'triggers'] },
    phase: 1,
  },
  {
    id: 'action_rpg',
    label: 'Action-RPG / Hack’n’slash',
    family: 'rpg',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'isometric'],
    default_art_styles: ['pixel', 'dark_fantasy', 'painterly'],
    core_loops: ['combat', 'exploration', 'management'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'loot', 'skills', 'npcs', 'tileset', 'bosses'], map_kind: 'tilemap', audio_profile: 'epic_orchestral+combat_sfx', systems: ['physics_topdown', 'rpg_stats', 'loot_system', 'skill_tree', 'inventory', 'enemy_ai'] },
    phase: 2,
  },
  {
    id: 'jrpg',
    label: 'RPG tour par tour (JRPG)',
    family: 'rpg',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down'],
    default_art_styles: ['pixel', 'anime', 'hand_drawn'],
    core_loops: ['narrative', 'combat', 'exploration'],
    difficulty_band: 'standard',
    library: { asset_families: ['party', 'enemies', 'npcs', 'tileset', 'portraits', 'ui_kit', 'items'], map_kind: 'tilemap', audio_profile: 'melodic_orchestral+menu_sfx', systems: ['grid_movement', 'turn_based_battle', 'party_system', 'dialogue', 'inventory', 'quest_log'] },
    phase: 2,
  },
  {
    id: 'roguelike',
    label: 'Roguelike / Roguelite',
    family: 'rpg',
    dimensions: ['2d'],
    perspectives: ['top_down'],
    default_art_styles: ['pixel', 'retro_8bit', 'minimalist'],
    core_loops: ['combat', 'exploration'],
    difficulty_band: 'hardcore',
    library: { asset_families: [...COMMON_FAMILIES, 'tileset', 'items', 'modifiers'], map_kind: 'grid', audio_profile: 'dungeon_synth+sfx', systems: ['procedural_dungeon', 'permadeath', 'turn_system', 'loot_system', 'enemy_ai'] },
    phase: 2,
  },
  {
    id: 'tactics_srpg',
    label: 'Tactics / SRPG (grille)',
    family: 'strategy',
    dimensions: ['2d', '2.5d'],
    perspectives: ['isometric', 'top_down'],
    default_art_styles: ['pixel', 'anime', 'painterly'],
    core_loops: ['tactics', 'narrative'],
    difficulty_band: 'hardcore',
    library: { asset_families: ['units', 'classes', 'grid_tiles', 'ui_kit', 'portraits', 'fx'], map_kind: 'grid', audio_profile: 'tactical_orchestral+sfx', systems: ['grid_movement', 'turn_based_battle', 'fog_of_war', 'unit_classes', 'ai_tactics'] },
    phase: 3,
  },
  // ── PUZZLE / RÉFLEXION ──
  {
    id: 'match3',
    label: 'Match-3 / Casse-tête grille',
    family: 'puzzle',
    dimensions: ['2d'],
    perspectives: ['top_down'],
    default_art_styles: ['cartoon', 'vector_flat', 'minimalist'],
    core_loops: ['puzzle'],
    difficulty_band: 'casual',
    library: { asset_families: ['gems', 'board_bg', 'ui_kit', 'fx'], map_kind: 'grid', audio_profile: 'casual_pop+ui_sfx', systems: ['grid_match', 'swap_input', 'cascade', 'score_objectives'] },
    phase: 2,
  },
  {
    id: 'falling_block',
    label: 'Blocs qui tombent (Tetris-like)',
    family: 'puzzle',
    dimensions: ['2d'],
    perspectives: ['side'],
    default_art_styles: ['retro_8bit', 'minimalist', 'vector_flat'],
    core_loops: ['puzzle'],
    difficulty_band: 'standard',
    library: { asset_families: ['blocks', 'board_bg', 'ui_kit'], map_kind: 'grid', audio_profile: 'chiptune+ui_sfx', systems: ['falling_blocks', 'line_clear', 'gravity_grid', 'level_speed'] },
    phase: 2,
  },
  {
    id: 'merge_drop_gacha',
    label: 'Fusion de billes / Collection',
    family: 'puzzle',
    dimensions: ['2d'],
    perspectives: ['side'],
    default_art_styles: ['cartoon', 'anime', 'vector_flat'],
    core_loops: ['puzzle', 'management'],
    difficulty_band: 'casual',
    library: {
      asset_families: ['orb_tiers', 'hero_portraits', 'board_bg', 'ui_kit', 'rarity_fx', 'ability_fx'],
      map_kind: 'board',
      audio_profile: 'astral_pop+merge_sfx+gacha_sfx',
      systems: [
        'merge_drop_physics',
        'merge_cascade',
        'drop_aim',
        'hero_abilities',
        'merge_drop_gacha_summon',
        'merge_drop_roster',
        'merge_drop_pity',
        'run_rewards',
        'local_save',
      ],
    },
    phase: 1,
  },
  {
    id: 'sokoban',
    label: 'Puzzle logique (Sokoban/physique)',
    family: 'puzzle',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'side'],
    default_art_styles: ['cartoon', 'minimalist', 'low_poly'],
    core_loops: ['puzzle'],
    difficulty_band: 'standard',
    library: { asset_families: ['hero', 'crates', 'tileset', 'ui_kit'], map_kind: 'grid', audio_profile: 'ambient+ui_sfx', systems: ['grid_movement', 'push_blocks', 'goal_tiles', 'undo_system'] },
    phase: 2,
  },
  // ── NARRATION ──
  {
    id: 'visual_novel',
    label: 'Visual novel / Fiction interactive',
    family: 'narrative',
    dimensions: ['2d'],
    perspectives: ['side'],
    default_art_styles: ['anime', 'dark_fantasy', 'hand_drawn', 'painterly'],
    core_loops: ['narrative'],
    difficulty_band: 'casual',
    library: { asset_families: ['characters', 'backgrounds', 'cg_scenes', 'ui_kit', 'portraits'], map_kind: 'graph', audio_profile: 'ambient_melodic+voice', systems: ['dialogue', 'branching_choices', 'character_sprites', 'save_system'] },
    phase: 2,
  },
  {
    id: 'point_and_click',
    label: 'Point & click / Enquête',
    family: 'narrative',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side'],
    default_art_styles: ['hand_drawn', 'painterly', 'noir'],
    core_loops: ['puzzle', 'narrative', 'exploration'],
    difficulty_band: 'standard',
    library: { asset_families: ['scenes', 'interactables', 'inventory_items', 'characters', 'ui_kit'], map_kind: 'scene_graph', audio_profile: 'ambient+foley', systems: ['hotspots', 'inventory', 'dialogue', 'puzzle_logic'] },
    phase: 2,
  },
  // ── STRATÉGIE / GESTION ──
  {
    id: 'tower_defense',
    label: 'Tower defense',
    family: 'strategy',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'isometric'],
    default_art_styles: ['cartoon', 'vector_flat', 'low_poly'],
    core_loops: ['tactics', 'management'],
    difficulty_band: 'standard',
    library: { asset_families: ['towers', 'enemies', 'path_tiles', 'ui_kit', 'fx'], map_kind: 'tilemap', audio_profile: 'tension_orchestral+sfx', systems: ['enemy_paths', 'tower_placement', 'wave_spawner', 'economy'] },
    phase: 2,
  },
  {
    id: 'rts_lite',
    label: 'Stratégie temps réel (lite)',
    family: 'strategy',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'isometric'],
    default_art_styles: ['low_poly', 'cartoon', 'pixel'],
    core_loops: ['tactics', 'management'],
    difficulty_band: 'hardcore',
    library: { asset_families: ['units', 'buildings', 'terrain_tiles', 'ui_kit', 'fx'], map_kind: 'tilemap', audio_profile: 'martial_orchestral+sfx', systems: ['unit_selection', 'rts_pathfinding', 'resource_economy', 'build_orders'] },
    phase: 3,
  },
  {
    id: 'management_sim',
    label: 'Gestion / Tycoon / Idle',
    family: 'simulation',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'isometric'],
    default_art_styles: ['cartoon', 'vector_flat', 'low_poly'],
    core_loops: ['management', 'building'],
    difficulty_band: 'casual',
    library: { asset_families: ['buildings', 'agents', 'ui_kit', 'icons'], map_kind: 'isometric_grid', audio_profile: 'cozy_loop+ui_sfx', systems: ['economy', 'time_progression', 'build_placement', 'upgrades'] },
    phase: 2,
  },
  {
    id: 'card_deckbuilder',
    label: 'Cartes / Deckbuilder',
    family: 'strategy',
    dimensions: ['2d'],
    perspectives: ['side'],
    default_art_styles: ['hand_drawn', 'painterly', 'dark_fantasy'],
    core_loops: ['deckbuilding', 'combat'],
    difficulty_band: 'standard',
    library: { asset_families: ['cards', 'enemies', 'board_bg', 'ui_kit', 'fx'], map_kind: 'graph', audio_profile: 'mystic_ambient+card_sfx', systems: ['deck_system', 'turn_based_battle', 'card_effects', 'map_nodes'] },
    phase: 2,
  },
  // ── ARCADE / DIVERS ──
  {
    id: 'rhythm',
    label: 'Rythme / Musique',
    family: 'arcade',
    dimensions: ['2d'],
    perspectives: ['side', 'top_down'],
    default_art_styles: ['vector_flat', 'cyberpunk', 'minimalist'],
    core_loops: ['rhythm'],
    difficulty_band: 'standard',
    library: { asset_families: ['notes', 'tracks_bg', 'ui_kit', 'fx'], map_kind: 'track', audio_profile: 'music_driven+hit_sfx', systems: ['rhythm_input', 'beatmap', 'scoring', 'audio_sync'] },
    phase: 3,
  },
  {
    id: 'racing_2d',
    label: 'Course 2D / arcade',
    family: 'arcade',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'side'],
    default_art_styles: ['pixel', 'dark_fantasy', 'cartoon', 'retro_8bit'],
    core_loops: ['racing'],
    difficulty_band: 'standard',
    library: { asset_families: ['vehicles', 'track_tiles', 'props', 'ui_kit'], map_kind: 'track', audio_profile: 'engine_loop+arcade_sfx', systems: ['vehicle_physics', 'track_collision', 'lap_system', 'ai_racers'] },
    phase: 3,
  },
  {
    id: 'survival_craft',
    label: 'Survie / Craft 2D',
    family: 'simulation',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'side'],
    default_art_styles: ['pixel', 'cartoon', 'low_poly'],
    core_loops: ['survival', 'building', 'exploration'],
    difficulty_band: 'standard',
    library: { asset_families: [...COMMON_FAMILIES, 'resources', 'craftables', 'tileset', 'biomes'], map_kind: 'tilemap', audio_profile: 'ambient_nature+craft_sfx', systems: ['physics_topdown', 'inventory', 'crafting', 'day_night', 'hunger_health', 'procedural_world'] },
    phase: 3,
  },
  // ── LIVE / COLLECTION ──
  {
    id: 'gacha_rpg',
    label: 'Gacha RPG / Collection',
    family: 'rpg',
    dimensions: ['2d', '2.5d'],
    perspectives: ['side', 'top_down'],
    default_art_styles: ['anime', 'hand_drawn', 'painterly'],
    core_loops: ['combat', 'management', 'narrative'],
    difficulty_band: 'casual',
    library: { asset_families: ['heroes_roster', 'enemies', 'bosses', 'portraits', 'ui_kit', 'banner_art', 'fx'], map_kind: 'graph', audio_profile: 'epic_orchestral+gacha_sfx', systems: ['turn_based_battle', 'gacha_summon', 'roster_collection', 'ascension_levels', 'stamina_economy', 'banner_rotation'] },
    phase: 3,
  },
  {
    id: 'survivors_like',
    label: 'Survivors-like (horde)',
    family: 'action',
    dimensions: ['2d'],
    perspectives: ['top_down'],
    default_art_styles: ['pixel', 'cartoon', 'retro_8bit'],
    core_loops: ['combat', 'survival'],
    difficulty_band: 'standard',
    library: { asset_families: ['hero', 'enemy_horde', 'pickups', 'weapons', 'ui_kit', 'fx'], map_kind: 'arena', audio_profile: 'driving_synth+impact_sfx', systems: ['physics_topdown', 'auto_attack', 'horde_spawner', 'level_up_drafts', 'pickup_magnet', 'survival_timer'] },
    phase: 2,
  },
  {
    id: 'auto_battler',
    label: 'Auto-battler',
    family: 'strategy',
    dimensions: ['2d', '2.5d'],
    perspectives: ['top_down', 'isometric'],
    default_art_styles: ['cartoon', 'low_poly', 'anime'],
    core_loops: ['tactics', 'management'],
    difficulty_band: 'standard',
    library: { asset_families: ['units', 'board_bg', 'ui_kit', 'items', 'fx'], map_kind: 'grid', audio_profile: 'strategic_loop+sfx', systems: ['shop_phase', 'unit_synergies', 'auto_battle', 'economy', 'rounds'] },
    phase: 3,
  },
  {
    id: 'idle_incremental',
    label: 'Idle / Incremental',
    family: 'simulation',
    dimensions: ['2d'],
    perspectives: ['side'],
    default_art_styles: ['cartoon', 'vector_flat', 'minimalist'],
    core_loops: ['management'],
    difficulty_band: 'casual',
    library: { asset_families: ['generators', 'icons', 'ui_kit', 'fx'], map_kind: 'scene_graph', audio_profile: 'cozy_loop+ui_sfx', systems: ['idle_production', 'prestige', 'upgrade_tree', 'offline_progress'] },
    phase: 2,
  },
];

/* ── Modules de mécaniques composables (Tetris, gacha, invocation, craft…) ── */

export interface MechanicModule {
  id: string;
  label: string;
  description: string;
  adds_systems: string[];
  adds_asset_families: string[];
  /** Familles de jeux auxquelles ce module convient. */
  suits_families: string[];
}

export const MECHANIC_MODULES: MechanicModule[] = [
  { id: 'gacha_summon', label: 'Gacha / Invocation', description: 'Tirages aléatoires de personnages/objets avec raretés et bannières.', adds_systems: ['gacha_summon', 'roster_collection', 'banner_rotation', 'pity_system'], adds_asset_families: ['banner_art', 'portraits', 'rarity_fx'], suits_families: ['rpg', 'strategy', 'puzzle'] },
  { id: 'merge_drop', label: 'Fusion de billes', description: 'Billes physiques qui tombent et fusionnent par paires identiques en une bille de rang supérieur.', adds_systems: ['merge_drop_physics', 'merge_cascade', 'drop_aim'], adds_asset_families: ['orb_tiers', 'merge_fx'], suits_families: ['puzzle'] },
  { id: 'summon_squad', label: 'Invocation / Escouade', description: 'Invoquer et contrôler des créatures ou alliés au combat.', adds_systems: ['summon_units', 'squad_control'], adds_asset_families: ['summons', 'portraits'], suits_families: ['rpg', 'strategy', 'action'] },
  { id: 'falling_blocks', label: 'Blocs qui tombent (Tetris)', description: 'Grille, pièces qui tombent, lignes à compléter.', adds_systems: ['falling_blocks', 'line_clear', 'gravity_grid'], adds_asset_families: ['blocks'], suits_families: ['puzzle'] },
  { id: 'match3', label: 'Match-3', description: 'Alignement de 3+ symboles, cascades.', adds_systems: ['grid_match', 'cascade', 'score_objectives'], adds_asset_families: ['gems'], suits_families: ['puzzle'] },
  { id: 'deckbuild', label: 'Deckbuilding', description: 'Construction de deck, effets de cartes.', adds_systems: ['deck_system', 'card_effects'], adds_asset_families: ['cards'], suits_families: ['strategy', 'rpg'] },
  { id: 'crafting', label: 'Craft / Fabrication', description: 'Recettes, ressources, établis.', adds_systems: ['crafting', 'inventory'], adds_asset_families: ['resources', 'craftables'], suits_families: ['simulation', 'rpg', 'action'] },
  { id: 'skill_tree', label: 'Arbre de compétences', description: 'Progression et déblocage de capacités.', adds_systems: ['skill_tree', 'xp_levels'], adds_asset_families: ['skill_icons'], suits_families: ['rpg', 'action', 'strategy'] },
  { id: 'base_building', label: 'Construction de base', description: 'Placement de structures, gestion d’espace.', adds_systems: ['build_placement', 'economy'], adds_asset_families: ['buildings'], suits_families: ['simulation', 'strategy'] },
  { id: 'permadeath', label: 'Permadeath / Run', description: 'Mort permanente, runs et méta-progression.', adds_systems: ['permadeath', 'meta_progression'], adds_asset_families: ['modifiers'], suits_families: ['rpg', 'action'] },
  { id: 'parry_dodge', label: 'Parade / Esquive (souls)', description: 'Combat à l’endurance, parade, esquive, lock-on.', adds_systems: ['stamina_combat', 'parry_dodge', 'lock_on'], adds_asset_families: ['weapons', 'hit_fx'], suits_families: ['action', 'rpg'] },
  { id: 'combo_system', label: 'Combos', description: 'Enchaînements d’attaques et juggles.', adds_systems: ['combo_system', 'hitbox'], adds_asset_families: ['combo_fx'], suits_families: ['action'] },
  { id: 'time_control', label: 'Manipulation du temps', description: 'Rembobinage, ralenti, boucles temporelles.', adds_systems: ['time_control'], adds_asset_families: ['time_fx'], suits_families: ['action', 'puzzle'] },
  { id: 'day_night', label: 'Cycle jour/nuit', description: 'Temps qui passe, comportements variables.', adds_systems: ['day_night'], adds_asset_families: ['lighting_variants'], suits_families: ['simulation', 'rpg', 'action'] },
  { id: 'romance_branch', label: 'Romance / Relations', description: 'Affinités, dialogues à embranchements.', adds_systems: ['relationship', 'branching_choices'], adds_asset_families: ['portraits', 'cg_scenes'], suits_families: ['narrative', 'rpg'] },
  { id: 'prestige_idle', label: 'Prestige / Idle', description: 'Production passive, resets de prestige.', adds_systems: ['idle_production', 'prestige'], adds_asset_families: ['generators', 'icons'], suits_families: ['simulation'] },
  { id: 'wave_survival', label: 'Vagues / Horde', description: 'Vagues d’ennemis croissantes.', adds_systems: ['wave_spawner', 'survival_timer'], adds_asset_families: ['enemy_horde'], suits_families: ['action', 'shooter', 'strategy'] },
  { id: 'loot_rarity', label: 'Loot & raretés', description: 'Butin aléatoire avec niveaux de rareté.', adds_systems: ['loot_system', 'rarity_tiers'], adds_asset_families: ['loot'], suits_families: ['rpg', 'action'] },
  { id: 'vehicle', label: 'Véhicules', description: 'Conduite et pilotage de véhicules.', adds_systems: ['vehicle_physics'], adds_asset_families: ['vehicles'], suits_families: ['arcade', 'action'] },
];

export function getMechanicModule(id: string): MechanicModule | undefined {
  return MECHANIC_MODULES.find((m) => m.id === id);
}
export function modulesForFamily(family: string): MechanicModule[] {
  return MECHANIC_MODULES.filter((m) => m.suits_families.includes(family));
}

/* ── Jeux de référence + modules suggérés par type (best-in-class) ── */

interface ReferenceEntry {
  reference_games: string[];
  suggested_modules: string[];
}

const REFERENCE_DATA: Record<string, ReferenceEntry> = {
  platformer: { reference_games: ['Super Mario Bros', 'Celeste', 'Hollow Knight'], suggested_modules: ['combo_system', 'time_control'] },
  metroidvania: { reference_games: ['Hollow Knight', 'Ori', 'Castlevania: SOTN'], suggested_modules: ['skill_tree', 'loot_rarity'] },
  souls_like_2d: { reference_games: ['Dark Souls', 'Salt and Sanctuary', 'Blasphemous'], suggested_modules: ['parry_dodge', 'loot_rarity', 'permadeath'] },
  runner: { reference_games: ['Canabalt', 'Subway Surfers', 'Jetpack Joyride'], suggested_modules: ['wave_survival'] },
  beat_em_up: { reference_games: ['Streets of Rage', 'TMNT Shredder’s Revenge'], suggested_modules: ['combo_system', 'wave_survival'] },
  fighting: { reference_games: ['Street Fighter', 'Skullgirls', 'Guilty Gear'], suggested_modules: ['combo_system'] },
  twin_stick_shooter: { reference_games: ['Enter the Gungeon', 'Nuclear Throne'], suggested_modules: ['wave_survival', 'loot_rarity', 'permadeath'] },
  shmup: { reference_games: ['Ikaruga', 'Touhou', 'Gradius'], suggested_modules: ['wave_survival'] },
  topdown_adventure: { reference_games: ['The Legend of Zelda', 'Tunic'], suggested_modules: ['crafting', 'skill_tree'] },
  action_rpg: { reference_games: ['Diablo', 'Hades', 'Path of Exile'], suggested_modules: ['loot_rarity', 'skill_tree', 'permadeath'] },
  jrpg: { reference_games: ['Final Fantasy VI', 'Chrono Trigger', 'Octopath Traveler'], suggested_modules: ['summon_squad', 'skill_tree', 'romance_branch'] },
  roguelike: { reference_games: ['The Binding of Isaac', 'Slay the Spire', 'Hades'], suggested_modules: ['permadeath', 'loot_rarity'] },
  tactics_srpg: { reference_games: ['Fire Emblem', 'Final Fantasy Tactics', 'XCOM'], suggested_modules: ['summon_squad', 'skill_tree'] },
  match3: { reference_games: ['Bejeweled', 'Candy Crush', 'Puzzle & Dragons'], suggested_modules: ['match3', 'gacha_summon'] },
  falling_block: { reference_games: ['Tetris', 'Puyo Puyo', 'Lumines'], suggested_modules: ['falling_blocks'] },
  merge_drop_gacha: { reference_games: ['Suika Game', '2048', 'Puyo Puyo'], suggested_modules: ['merge_drop', 'gacha_summon', 'skill_tree'] },
  sokoban: { reference_games: ['Sokoban', 'Baba Is You', 'Stephen’s Sausage Roll'], suggested_modules: ['time_control'] },
  visual_novel: { reference_games: ['Doki Doki Literature Club', 'Phoenix Wright', 'Steins;Gate'], suggested_modules: ['romance_branch'] },
  point_and_click: { reference_games: ['Monkey Island', 'Return of the Obra Dinn', 'Machinarium'], suggested_modules: [] },
  tower_defense: { reference_games: ['Kingdom Rush', 'Bloons TD', 'Plants vs Zombies'], suggested_modules: ['wave_survival', 'base_building'] },
  rts_lite: { reference_games: ['StarCraft', 'Age of Empires', 'They Are Billions'], suggested_modules: ['base_building', 'wave_survival'] },
  management_sim: { reference_games: ['Theme Park', 'Two Point Hospital', 'RollerCoaster Tycoon'], suggested_modules: ['base_building', 'prestige_idle'] },
  card_deckbuilder: { reference_games: ['Slay the Spire', 'Hearthstone', 'Inscryption'], suggested_modules: ['deckbuild', 'loot_rarity'] },
  rhythm: { reference_games: ['Guitar Hero', 'osu!', 'Crypt of the NecroDancer'], suggested_modules: [] },
  racing_2d: { reference_games: ['Micro Machines', 'Mario Kart (2D)'], suggested_modules: ['vehicle'] },
  survival_craft: { reference_games: ['Terraria', 'Don’t Starve', 'Stardew Valley'], suggested_modules: ['crafting', 'base_building', 'day_night'] },
  gacha_rpg: { reference_games: ['Genshin Impact', 'Fire Emblem Heroes', 'Fate/Grand Order'], suggested_modules: ['gacha_summon', 'summon_squad', 'skill_tree'] },
  survivors_like: { reference_games: ['Vampire Survivors', 'Brotato', 'Halls of Torment'], suggested_modules: ['wave_survival', 'skill_tree', 'permadeath'] },
  auto_battler: { reference_games: ['Teamfight Tactics', 'Super Auto Pets', 'Dota Underlords'], suggested_modules: ['gacha_summon', 'deckbuild'] },
  idle_incremental: { reference_games: ['Cookie Clicker', 'Adventure Capitalist', 'Melvor Idle'], suggested_modules: ['prestige_idle', 'crafting'] },
};

for (const t of GAME_TYPES) {
  const ref = REFERENCE_DATA[t.id];
  if (ref) {
    t.reference_games = ref.reference_games;
    t.suggested_modules = ref.suggested_modules;
  }
}

export const ART_STYLES: { id: ArtStyle; label: string }[] = [
  { id: 'pixel', label: 'Pixel art' },
  { id: 'hand_drawn', label: 'Dessiné à la main' },
  { id: 'vector_flat', label: 'Vectoriel / flat' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'painterly', label: 'Peint / illustration' },
  { id: 'low_poly', label: 'Low-poly stylisé' },
  { id: 'retro_8bit', label: 'Rétro 8/16-bit' },
  { id: 'minimalist', label: 'Minimaliste' },
  { id: 'noir', label: 'Noir / monochrome' },
  { id: 'anime', label: 'Anime / manga' },
  { id: 'dark_fantasy', label: 'Dark fantasy' },
  { id: 'cyberpunk', label: 'Cyberpunk / néon' },
];

/* ── Questionnaire de création ──────────────────────────────────────────── */

export interface WizardOption {
  value: string;
  label: string;
}
export interface WizardQuestion {
  id: string;
  label: string;
  multi: boolean;
  /** `from_catalog` : options dérivées dynamiquement (types de jeux / styles). */
  options: WizardOption[] | 'game_types' | 'art_styles';
}

export const CREATION_WIZARD: WizardQuestion[] = [
  { id: 'game_type', label: 'Quel type de jeu veux-tu créer ?', multi: false, options: 'game_types' },
  { id: 'dimension', label: 'Quelle dimension visuelle ?', multi: false, options: [
    { value: '2d', label: '2D' }, { value: '2.5d', label: '2.5D (profondeur/parallaxe)' }, { value: '3d', label: '3D stylisée' },
  ] },
  { id: 'art_style', label: 'Quel style artistique ?', multi: false, options: 'art_styles' },
  { id: 'mood', label: 'Quelle ambiance / ton ?', multi: false, options: [
    { value: 'mignon', label: 'Mignon / coloré' }, { value: 'dark', label: 'Sombre / mature' },
    { value: 'epic', label: 'Épique / héroïque' }, { value: 'retro', label: 'Rétro / arcade' },
    { value: 'mysterious', label: 'Mystérieux / onirique' },
  ] },
  { id: 'difficulty', label: 'Quel niveau de difficulté ?', multi: false, options: [
    { value: 'casual', label: 'Détente' }, { value: 'standard', label: 'Standard' },
    { value: 'hardcore', label: 'Exigeant' }, { value: 'souls', label: 'Souls (très dur)' },
  ] },
  { id: 'scope', label: 'Quelle portée pour ce premier livrable ?', multi: false, options: [
    { value: 'demo_slice', label: 'Tranche de démo (1 scène)' }, { value: 'level', label: 'Niveau complet' },
    { value: 'campaign', label: 'Mini-campagne' },
  ] },
  { id: 'platforms', label: 'Cibles de plateforme ?', multi: true, options: [
    { value: 'web', label: 'Web' }, { value: 'mobile', label: 'Mobile (PWA)' }, { value: 'desktop', label: 'Desktop' },
  ] },
];

/* ── Dérivation de preset ───────────────────────────────────────────────── */

export interface CreationAnswers {
  game_type: string;
  dimension?: GameDimension;
  art_style?: ArtStyle;
  mood?: string;
  difficulty?: DifficultyBand;
  scope?: string;
  platforms?: string[];
  /** Modules de mécaniques additionnels (gacha, invocation, tetris, craft…). */
  mechanic_modules?: string[];
}

export interface ProductionPreset {
  game_type: string;
  dimension: GameDimension;
  perspective: CameraPerspective;
  art_style: ArtStyle;
  difficulty: DifficultyBand;
  systems: string[];
  asset_families: string[];
  map_kind: MapKind;
  audio_profile: string;
  platforms: string[];
  mechanic_modules: string[];
  phase: 1 | 2 | 3;
}

export function getGameType(id: string): GameType | undefined {
  return GAME_TYPES.find((t) => t.id === id);
}

export function listGameTypesByPhase(phase: 1 | 2 | 3): GameType[] {
  return GAME_TYPES.filter((t) => t.phase === phase);
}

/** Combine le type choisi + les réponses du questionnaire en une configuration de production. */
export function derivePreset(answers: CreationAnswers): ProductionPreset {
  const type = getGameType(answers.game_type);
  if (!type) throw new Error(`Type de jeu inconnu : ${answers.game_type}`);
  const dimension = answers.dimension && type.dimensions.includes(answers.dimension) ? answers.dimension : type.dimensions[0]!;
  const perspective = type.perspectives[0]!;
  const art_style = answers.art_style && type.default_art_styles.includes(answers.art_style) ? answers.art_style : type.default_art_styles[0]!;
  const difficulty = answers.difficulty ?? type.difficulty_band;

  // Fusion des modules de mécaniques choisis (systèmes + familles d'assets).
  const systems = new Set(type.library.systems);
  const assetFamilies = new Set(type.library.asset_families);
  const modules = answers.mechanic_modules ?? [];
  for (const id of modules) {
    const mod = getMechanicModule(id);
    if (!mod) continue;
    mod.adds_systems.forEach((s) => systems.add(s));
    mod.adds_asset_families.forEach((f) => assetFamilies.add(f));
  }

  return {
    game_type: type.id,
    dimension,
    perspective,
    art_style,
    difficulty,
    systems: [...systems],
    asset_families: [...assetFamilies],
    map_kind: type.library.map_kind,
    audio_profile: type.library.audio_profile,
    platforms: answers.platforms?.length ? answers.platforms : ['web'],
    mechanic_modules: modules,
    phase: type.phase,
  };
}
