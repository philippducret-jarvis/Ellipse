/**
 * Starter game generator: ProductionPreset -> valid, playable GDL.
 *
 * The important split is intentional systems vs executable systems:
 * - meta.declared_systems keeps the full game fantasy for agents/codegen.
 * - systems activates only what the current runtime can actually simulate.
 */
import { GameDefinitionSchema, type GameDefinition } from '../index.js';
import type { GdlLayout } from '../gdl/ir.js';
import type { ProductionPreset, ArtStyle, DifficultyBand } from './game-types.js';
import { resolveLibraryPlan } from './library-plan.js';
import { buildProductionRecipe } from './production-recipe.js';
import { buildGameCreationProcedure } from './game-subtypes.js';
import { enhanceGdlWithPlayableSlice } from '../factory/visual-board-compiler.js';

const SIDE_SYSTEMS = [
  'input',
  'physics_platformer',
  'tile_collision',
  'collectibles',
  'enemy_ai',
  'camera_follow',
  'hazards',
  'goal',
  'health',
  'ui',
];

const TOPDOWN_SYSTEMS = [
  'input',
  'physics_topdown',
  'collectibles',
  'enemy_ai',
  'camera_follow',
  'hazards',
  'goal',
  'health',
  'ui',
];

const LANE_ACTION_SYSTEMS = [
  'input',
  'physics_topdown',
  'lane_runner',
  'wave_spawner',
  'auto_attack',
  'blessing_draft',
  'hazard_scheduler',
  'boss_phases',
  'camera_follow',
  'health',
  'ui',
];

const MERGE_DROP_SYSTEMS = [
  'input',
  'merge_drop_physics',
  'merge_cascade',
  'drop_aim',
  'hero_abilities',
  'merge_drop_gacha_summon',
  'merge_drop_roster',
  'merge_drop_pity',
  'run_rewards',
  'local_save',
  'ui',
];

const PALETTES: Partial<Record<ArtStyle, string[]>> = {
  pixel: ['#1a1a2e', '#0f3460', '#e94560', '#f0d9a6'],
  dark_fantasy: ['#08070d', '#211729', '#5a3a72', '#9e4f5c', '#d6b35a'],
  painterly: ['#12121a', '#31465c', '#7b5f3d', '#d6b35a', '#e8dfc8'],
  cyberpunk: ['#0d0221', '#ff2a6d', '#05d9e8', '#d1f7ff'],
  anime: ['#171927', '#ef476f', '#ffd166', '#7bdff2', '#f6f7fb'],
  noir: ['#0a0a0a', '#242424', '#777777', '#e0e0e0'],
  low_poly: ['#1d3557', '#457b9d', '#a8dadc', '#f1faee'],
};

const DEFAULT_PALETTE = ['#12121a', '#5a3a72', '#5ec7ef', '#f0d9a6'];

function healthFor(difficulty: DifficultyBand): number {
  return difficulty === 'casual' ? 6 : difficulty === 'standard' ? 4 : difficulty === 'hardcore' ? 3 : 1;
}

function enemyCountFor(difficulty: DifficultyBand): number {
  return difficulty === 'casual' ? 1 : difficulty === 'standard' ? 3 : difficulty === 'hardcore' ? 5 : 6;
}

function isTopdown(preset: ProductionPreset): boolean {
  return preset.perspective === 'top_down' || preset.perspective === 'isometric';
}

function isLaneAction(preset: ProductionPreset): boolean {
  return preset.game_type === 'survivors_like' || preset.game_type === 'gacha_rpg';
}

function isMergeDrop(preset: ProductionPreset): boolean {
  return preset.game_type === 'merge_drop_gacha';
}

function paletteFor(preset: ProductionPreset, override?: string[]): string[] {
  return override ?? PALETTES[preset.art_style] ?? DEFAULT_PALETTE;
}

function background(color: string, opts: StarterGdlOptions): Record<string, unknown> {
  return opts.backgroundImage ? { color, image: opts.backgroundImage, alpha: 0.72 } : { color };
}

function productionBoard(preset: ProductionPreset, opts: StarterGdlOptions): Record<string, unknown> {
  const loop =
    preset.game_type === 'merge_drop_gacha'
      ? ['aim', 'drop_orb', 'stack', 'merge_equal_tiers', 'cascade', 'cast_hero_power', 'earn_summon', 'unlock_roster', 'reach_nexus']
      : preset.game_type === 'gacha_rpg'
      ? ['invoke', 'draft_upgrade', 'lane_combat', 'boss', 'reward']
      : preset.game_type === 'souls_like_2d'
        ? ['approach', 'read_enemy', 'punish', 'checkpoint', 'boss_gate']
        : isTopdown(preset)
          ? ['explore', 'avoid_or_fight', 'collect_key_item', 'reach_exit']
          : ['move', 'jump', 'collect', 'survive', 'goal'];

  return {
    source_prompt: opts.prompt ?? null,
    game_type: preset.game_type,
    dimension: preset.dimension,
    perspective: preset.perspective,
    art_style: preset.art_style,
    difficulty: preset.difficulty,
    mechanic_modules: preset.mechanic_modules,
    playable_loop: loop,
    first_slice_scope: 'one_scene_with_win_condition',
    quality_gates: [
      'player_understands_goal_under_30s',
      'scene_has_no_dead_end',
      'runtime_uses_only_executable_systems',
      'declared_systems_preserved_for_agents',
    ],
  };
}

function productionContract(preset: ProductionPreset, opts: StarterGdlOptions): Record<string, unknown> {
  const library = resolveLibraryPlan(preset);
  const recipe = buildProductionRecipe(preset.game_type);
  const procedure = buildGameCreationProcedure({ preset, prompt: opts.prompt });
  const plannedSystems = library.systems.filter((s) => s.status === 'planned').map((s) => s.id);
  const implementedSystems = library.systems.filter((s) => s.status === 'implemented').map((s) => s.id);
  const referenceAssets = library.assets.filter((a) => a.recipe === 'reference_cut').map((a) => a.family);
  const proceduralAssets = library.assets.filter((a) => a.recipe === 'procedural_vector').map((a) => a.family);
  const pendingAssets = library.assets.filter((a) => a.recipe === 'specialized_pending').map((a) => a.family);

  const missingElements = [
    ...plannedSystems.map((id) => ({
      id: `system:${id}`,
      domain: 'gameplay',
      reason: 'Declared by the game fantasy but not executable in the runtime yet.',
      next_owner: 'gameplay_programming',
    })),
    ...referenceAssets.map((family) => ({
      id: `asset:${family}`,
      domain: family.includes('bg') || family.includes('tiles') || family.includes('scene') ? 'environment' : 'assets',
      reason: 'Requires board/image cutting or a dedicated environment pass.',
      next_owner: 'asset_direction',
    })),
    ...pendingAssets.map((family) => ({
      id: `asset:${family}`,
      domain: 'assets',
      reason: 'Requires a specialized generator not present in the first playable slice.',
      next_owner: 'asset_direction',
    })),
  ];

  const productionQueue = recipe.stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    agents: stage.agents,
    expected_outputs: stage.outputs,
  }));

  return {
    subtype: procedure.subtype,
    type_chain: procedure.type_chain,
    north_star: {
      prompt: opts.prompt ?? null,
      target_game_type: preset.game_type,
      dimension: preset.dimension,
      perspective: preset.perspective,
      art_style: preset.art_style,
      difficulty: preset.difficulty,
      promise:
        preset.game_type === 'merge_drop_gacha'
          ? 'A one-touch physical puzzle where equal orbs merge upward, cascades charge hero powers and every run earns transparent collection progress.'
          : preset.game_type === 'gacha_rpg'
          ? 'A premium collection RPG loop: summon, improve, fight readable waves, defeat a boss, earn progression.'
          : preset.game_type === 'souls_like_2d'
            ? 'A punishing but fair dark fantasy slice with readable enemies, checkpoints, hazards and a boss gate.'
            : preset.game_type === 'action_rpg'
              ? 'A handcrafted-feeling adventure board with exploration, combat, pickups and a clear relic objective.'
              : 'A playable first slice that can grow into the requested full game without losing its intent.',
    },
    first_playable_slice: {
      generated_now: [
        'runtime_executable_gdl',
        'player_controller',
        'one_scene_board',
        'win_condition',
        'health_and_score_hud',
      ],
      scope_limit: 'This is the first playable slice, not the finished game.',
    },
    asset_roadmap: {
      procedural_now: proceduralAssets,
      board_or_image_cut_next: referenceAssets,
      specialized_later: pendingAssets,
      required_families: library.assets.map((a) => ({ family: a.family, recipe: a.recipe })),
      subtype_families: procedure.libraries.asset_families,
    },
    object_blueprint_plan: {
      required_blueprints: procedure.libraries.object_blueprints,
      acceptance: ['each object has spawn rules', 'each object has runtime events', 'placeholder art is tracked when final art is missing'],
    },
    room_plan: {
      templates: procedure.libraries.room_templates,
      content_units: procedure.libraries.content_units,
      acceptance: ['room has player entry and exit', 'room has objective flow', 'room can be generated from board constraints'],
    },
    event_graph_plan: {
      hooks: procedure.libraries.event_hooks,
      acceptance: ['start/update/end hooks are explicit', 'combat or economy hooks feed UI feedback', 'events are serializable in GDL metadata'],
    },
    animation_plan: {
      required_clips: preset.perspective === 'side'
        ? ['idle', 'run', 'jump', 'fall', 'hurt', 'death', 'attack_1', 'attack_2']
        : ['idle', 'walk_4dir', 'hurt', 'death', 'attack', 'cast_or_summon'],
      model_targets: preset.dimension === '2.5d'
        ? ['layered_2d_character', 'skeletal_2d_rig', 'billboard_depth_variant', 'parallax_environment_planes']
        : ['layered_2d_character', 'skeletal_2d_rig'],
      acceptance: ['silhouette readable', 'feet align with collision', 'clips loop cleanly', 'attack timing matches combat windows'],
      subtype_clips: procedure.libraries.animation_clips,
    },
    environment_plan: {
      map_kind: library.map.map_kind,
      generator: library.map.generator,
      status: library.map.status,
      required_layers: preset.dimension === '2.5d'
        ? ['sky_or_far_backdrop', 'midground_landmarks', 'collision_ground', 'foreground_occluders', 'lighting_vignette']
        : ['backdrop', 'collision_ground', 'decor_props'],
      acceptance: ['clear gameplay readability', 'strong first-screen identity', 'no collision ambiguity', 'visual depth supports camera'],
      subtype_environment_kits: procedure.libraries.environment_kits,
    },
    gameplay_plan: {
      executable_systems: implementedSystems,
      systems_to_build: plannedSystems,
      declared_systems: preset.systems,
      mechanic_modules: preset.mechanic_modules,
      subtype_systems: procedure.libraries.systems,
    },
    ui_audio_plan: {
      ui_surfaces: procedure.libraries.ui_surfaces,
      audio_cues: procedure.libraries.audio_cues,
      acceptance: ['hud communicates objective and danger', 'menus expose progression when the subtype needs it', 'audio cues cover input, reward and failure'],
    },
    story_plan: {
      required: ['premise', 'player_motive', 'opposition', 'first_scene_objective', 'completion_change'],
      status: 'seeded_for_agents',
    },
    procedural_libraries: procedure.libraries,
    procedural_chain: procedure.steps,
    future_creation_queue: [...procedure.steps.map((step) => ({
      id: step.id,
      label: step.label,
      agents: step.owner_agents,
      expected_outputs: step.outputs,
    })), ...productionQueue],
    work_order_templates: procedure.backlog_templates,
    missing_elements: missingElements,
    qa_gates: recipe.qa_gates,
  };
}

function entityPlayer(input: {
  topdown: boolean;
  hp: number;
  spawn: { x: number; y: number };
  heroSprite?: string;
}): GameDefinition['entities'][number] {
  return {
    id: 'player',
    type: 'character',
    assets: input.heroSprite ? { sprite: input.heroSprite, frame_count: 1 } : {},
    components: [
      { transform: { x: input.spawn.x, y: input.spawn.y } },
      { physics: { body: 'dynamic', gravity: input.topdown ? 0 : 980 } },
      input.topdown
        ? { topdown_controller: { move_speed: 230, diagonal: true } }
        : { platformer_controller: { move_speed: 235, jump_force: 455, coyote_time_ms: 110 } },
      { health: { max: input.hp, current: input.hp } },
    ],
  };
}

function buildSideScene(preset: ProductionPreset, opts: StarterGdlOptions): GameDefinition['scenes'][number] {
  const w = 1280;
  const h = 720;
  const groundY = 640;
  const souls = preset.game_type === 'souls_like_2d';
  const enemyCount = enemyCountFor(preset.difficulty);
  const enemies = Array.from({ length: enemyCount }, (_, i) => ({
    x: 390 + i * Math.floor(430 / Math.max(1, enemyCount - 1 || 1)),
    y: groundY - 42,
    kind: souls ? 'hollow_vassal' : 'enemy',
    patrol: souls ? 46 : 84,
    speed: souls ? 44 + i * 4 : 62 + i * 8,
    hp: souls ? 2 : 1,
  }));

  if (souls) {
    enemies.push({
      x: 1064,
      y: groundY - 92,
      w: 84,
      h: 92,
      kind: 'gate_warden',
      patrol: 28,
      speed: 28,
      hp: 8,
      isBoss: true,
      phase: 1,
      maxPhase: 2,
    } as (typeof enemies)[number]);
  }

  const layout: GdlLayout = {
    width: w,
    height: h,
    ground_y: groundY,
    spawn: { x: 96, y: groundY - 72 },
    platforms: [
      { x: 0, y: groundY, w, h: h - groundY, type: 'ground' },
      { x: 280, y: groundY - 116, w: 170, h: 24, type: 'platform' },
      { x: 520, y: groundY - 184, w: 152, h: 24, type: 'platform' },
      { x: 742, y: groundY - 132, w: 184, h: 24, type: 'platform' },
      { x: 974, y: groundY - 92, w: 150, h: 24, type: 'platform' },
    ],
    collectibles: [
      { x: 342, y: groundY - 154, type: souls ? 'ember_shard' : 'pickup' },
      { x: 592, y: groundY - 222, type: souls ? 'lost_rune' : 'pickup' },
      { x: 825, y: groundY - 170, type: souls ? 'relic' : 'pickup' },
    ],
    enemies: enemies as GdlLayout['enemies'],
    hazards: [
      { x: 468, y: groundY + 8, w: 74, h: 18, kind: souls ? 'cursed_thorns' : 'spikes' },
      { x: 930, y: groundY + 8, w: 82, h: 18, kind: souls ? 'grave_fire' : 'spikes' },
    ],
    checkpoints: [
      { x: 108, y: groundY - 76, label: souls ? 'Ashen Lantern' : 'Start' },
      { x: 756, y: groundY - 168, label: souls ? 'Broken Reliquary' : 'Midpoint' },
    ],
    zones: [
      { id: 'approach', label: souls ? 'Cemetery Approach' : 'Approach', x: 0, y: 0, w: 320, h, theme: 'intro' },
      { id: 'trial', label: souls ? 'Thorn Trial' : 'Traversal Trial', x: 320, y: 0, w: 360, h, theme: 'combat' },
      { id: 'gate', label: souls ? 'Boss Gate' : 'Exit Gate', x: 680, y: 0, w: 600, h, theme: 'finale' },
    ],
    goal: { x: w - 88, y: groundY - 84 },
  };

  return {
    id: 'level_01',
    title: souls ? 'Ashen Gate' : 'First Playable Slice',
    entities: ['player'],
    background: background(souls ? '#08070d' : '#12121a', opts),
    camera: { mode: 'follow_horizontal', follow: 'player', bounds: true, smoothing: 0.16 },
    depth: {
      mode: 'side_scroll',
      sort_key: 'feet_y',
      ground_y: groundY,
      feet_offset: 0.92,
    },
    layout,
    spawn: layout.spawn,
    board: productionBoard(preset, opts),
  };
}

function buildTopdownScene(preset: ProductionPreset, opts: StarterGdlOptions): GameDefinition['scenes'][number] {
  const w = 1280;
  const h = 720;
  const enemyCount = enemyCountFor(preset.difficulty);
  const layout: GdlLayout = {
    width: w,
    height: h,
    ground_y: h,
    spawn: { x: 112, y: 344 },
    platforms: [
      { x: 360, y: 118, w: 76, h: 230, type: 'platform' },
      { x: 590, y: 386, w: 252, h: 70, type: 'platform' },
      { x: 920, y: 145, w: 70, h: 245, type: 'platform' },
    ],
    collectibles: [
      { x: 510, y: 196, type: 'mana_seed' },
      { x: 766, y: 552, type: 'relic_key' },
      { x: 1032, y: 282, type: 'spirit_orb' },
    ],
    enemies: Array.from({ length: enemyCount }, (_, i) => ({
      x: 470 + i * Math.floor(430 / Math.max(1, enemyCount)),
      y: i % 2 === 0 ? 220 : 520,
      kind: i === enemyCount - 1 ? 'elite_guardian' : 'wildshade',
      patrol: 60,
      speed: 44 + i * 5,
      hp: i === enemyCount - 1 ? 4 : 2,
    })) as GdlLayout['enemies'],
    hazards: [
      { x: 700, y: 250, w: 84, h: 42, kind: 'curse_pool' },
    ],
    checkpoints: [
      { x: 116, y: 344, label: 'Shrine' },
      { x: 780, y: 548, label: 'Relic Crossing' },
    ],
    zones: [
      { id: 'village_edge', label: 'Village Edge', x: 0, y: 0, w: 360, h, theme: 'safe' },
      { id: 'spirit_woods', label: 'Spirit Woods', x: 360, y: 0, w: 420, h, theme: 'exploration' },
      { id: 'sealed_gate', label: 'Sealed Gate', x: 780, y: 0, w: 500, h, theme: 'boss_hint' },
    ],
    goal: { x: 1168, y: 340 },
  };

  return {
    id: 'level_01',
    title: preset.game_type === 'action_rpg' ? 'Spirit Gate' : 'First Adventure Board',
    entities: ['player'],
    background: background('#101922', opts),
    camera: { mode: 'top_down', follow: 'player', bounds: true, smoothing: 0.18 },
    depth: {
      mode: 'top_down_axis',
      sort_key: 'feet_y_skew',
      sort_skew: 0.002,
      ground_y: h,
      feet_offset: 0.85,
    },
    layout,
    spawn: layout.spawn,
    board: productionBoard(preset, opts),
  };
}

function buildLaneActionGdl(preset: ProductionPreset, opts: StarterGdlOptions): GameDefinition {
  const title = opts.title ?? (preset.game_type === 'gacha_rpg' ? 'Gacha RPG Prototype' : 'Survivors Prototype');
  const palette = paletteFor(preset, opts.palette);
  const sceneId = 'arena_01';
  const layout: GdlLayout = {
    width: 720,
    height: 1280,
    ground_y: 1120,
    spawn: { x: 360, y: 930 },
    platforms: [],
    collectibles: [],
    goal: { x: 360, y: 96 },
    zones: [
      { id: 'summon_gate', label: 'Summon Gate', x: 0, y: 0, w: 720, h: 280, theme: 'gacha' },
      { id: 'combat_lanes', label: 'Combat Lanes', x: 0, y: 280, w: 720, h: 760, theme: 'waves' },
      { id: 'last_stand', label: 'Last Stand', x: 0, y: 1040, w: 720, h: 240, theme: 'boss' },
    ],
    lane_meta: {
      lanes: [
        { id: 'lane_left', center_x: 180 },
        { id: 'lane_center', center_x: 360 },
        { id: 'lane_right', center_x: 540 },
      ],
    },
  } as GdlLayout;

  const base = GameDefinitionSchema.parse({
    meta: {
      title,
      dimension: preset.dimension,
      genre: preset.game_type,
      resolution: [720, 1280],
      version: '0.2.0',
      orientation: 'portrait',
      declared_systems: preset.systems,
      mechanic_modules: preset.mechanic_modules,
      prototype_board: productionBoard(preset, opts),
      production_contract: productionContract(preset, opts),
      hazard_scripts: {
        [sceneId]: {
          telegraph_duration_ms: 760,
          active_duration_ms: 440,
          cooldown_ms: 3200,
          pick_lane: 'most_populated',
          damage_on_active: 1,
        },
      },
      summon_banner: {
        currency: 'moon_crystals',
        pity_after_pulls: 60,
        rates: { ssr: 0.02, sr: 0.12, r: 0.86 },
        roster_preview: ['Aureline', 'Morgane', 'Selka'],
      },
    } as Record<string, unknown>,
    style: {
      palette,
      dimension: preset.dimension,
      mood: preset.art_style === 'dark_fantasy' ? 'dark_fantasy_premium' : preset.art_style,
    },
    systems: LANE_ACTION_SYSTEMS,
    entities: [
      entityPlayer({
        topdown: true,
        hp: preset.game_type === 'gacha_rpg' ? 10 : 8,
        spawn: layout.spawn,
        heroSprite: opts.heroSprite,
      }),
    ],
    scenes: [
      {
        id: sceneId,
        title: preset.game_type === 'gacha_rpg' ? 'Moonlit Invocation Run' : 'Horde Trial',
        entities: ['player'],
        background: background('#120f18', opts),
        camera: { mode: 'fixed', follow: 'player', bounds: true },
        depth: {
          mode: 'lane_perspective',
          sort_key: 'feet_y',
          horizon_y: 112,
          ground_y: 1120,
          scale_range: [0.54, 1.12],
          feet_offset: 0.92,
          lane_parallax_shift: 26,
        },
        layout,
        spawn: layout.spawn,
        board: productionBoard(preset, opts),
        veloria: {
          encounters: {
            total_waves: 6,
            blessing_breaks_after_waves: [2, 4],
            waves: [
              { wave: 1, enemies: [{ type: 'shade', lane: 'lane_center', count: 2 }] },
              { wave: 2, enemies: [{ type: 'tomb_hound', lane: 'lane_left', count: 2 }] },
              { wave: 3, enemies: [{ type: 'shade', lane: 'lane_right', count: 3, variant: 'elite' }] },
              { wave: 4, enemies: [{ type: 'gargoyle', lane: 'lane_center', count: 2 }] },
              { wave: 5, enemies: [{ type: 'tomb_hound', lane: 'lane_left', count: 2 }, { type: 'shade', lane: 'lane_right', count: 2 }] },
              {
                wave: 6,
                boss: { type: 'eclipse_warden', phase_count: 2, spawn_lane: 'lane_center' },
                adds: [{ type: 'shade', lane: 'lane_left', count: 1 }, { type: 'shade', lane: 'lane_right', count: 1 }],
              },
            ],
          },
          blessings: [
            { id: 'sacred_edge', label: 'Sacred Edge' },
            { id: 'divine_grace', label: 'Divine Grace' },
            { id: 'ember_contract', label: 'Ember Contract' },
          ],
        },
      },
    ],
    ui: {
      hud: {
        show_health: true,
        show_wave: true,
        show_score: true,
        draft_keys: ['1', '2', '3'],
      },
      gacha: {
        show_banner_preview: preset.game_type === 'gacha_rpg',
        rarity_colors: { ssr: '#d6b35a', sr: '#b48cff', r: '#7bdff2' },
      },
    },
  });

  return GameDefinitionSchema.parse(enhanceGdlWithPlayableSlice(base, {
    preset,
    title,
    prompt: opts.prompt,
    sourceImages: opts.boardImages,
    qualityTarget: 'vertical_slice',
  }));
}

function buildMergeDropGdl(preset: ProductionPreset, opts: StarterGdlOptions): GameDefinition {
  const title = opts.title ?? "Orbes d'Astra";
  const palette = opts.palette ?? ['#07131d', '#2dd4bf', '#38bdf8', '#fb7185', '#f59e0b', '#f8fafc'];
  const sceneId = 'astral_merge_well';
  const layout: GdlLayout = {
    width: 720,
    height: 1280,
    ground_y: 1008,
    spawn: { x: 360, y: 224 },
    platforms: [],
    collectibles: [],
    goal: { x: 360, y: 184 },
    zones: [
      { id: 'drop_preview', label: 'Drop Preview', x: 0, y: 0, w: 720, h: 184, theme: 'setup' },
      { id: 'merge_well', label: 'Merge Well', x: 72, y: 184, w: 576, h: 824, theme: 'physics_puzzle' },
      { id: 'roster_and_power', label: 'Roster and Power', x: 0, y: 1008, w: 720, h: 144, theme: 'hero_ability' },
      { id: 'earned_summon', label: 'Earned Summon', x: 0, y: 1152, w: 720, h: 128, theme: 'reward' },
    ],
  };

  type GuardianProfile = {
    id: string;
    name: string;
    title: string;
    rarity: 'R' | 'SR' | 'SSR';
    ability: string;
    ability_label: string;
    color: string;
    faction: string;
    role: string;
    element: string;
    quote: string;
    biography: string;
  };
  type Passive = [effect: string, value: number, name: string, description: string];
  const guardian = (frame: number, profile: GuardianProfile, first: Passive, second: Passive) => ({
    ...profile,
    portrait: opts.heroPortraitSheet,
    portrait_frame: frame,
    portrait_columns: 6,
    portrait_rows: 4,
    skills: [
      { id: `${profile.id}_a`, name: first[2], description: first[3], stars: 1, effect: first[0], value: first[1] },
      { id: `${profile.id}_b`, name: second[2], description: second[3], stars: 3, effect: second[0], value: second[1] },
    ],
  });

  const base = GameDefinitionSchema.parse({
    meta: {
      title,
      dimension: '2d',
      genre: 'merge_drop_gacha',
      resolution: [720, 1280],
      version: '1.0.0',
      orientation: 'portrait',
      declared_systems: preset.systems,
      mechanic_modules: preset.mechanic_modules,
      prototype_board: productionBoard(preset, opts),
      production_contract: productionContract(preset, opts),
      merge_drop: {
        board: { x: 72, y: 184, width: 576, height: 824, loss_line_y: 326 },
        gravity: 1180,
        drop_cooldown_ms: 280,
        overflow_grace_ms: 1600,
        initial_currency: 1800,
        summon_cost: 100,
        summon10_cost: 900,
        relic_summon_cost: 80,
        relic_summon10_cost: 720,
        pity_after: 30,
        summon_rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
        duplicate_essence: { R: 15, SR: 35, SSR: 80 },
        awaken_base_cost: 40,
        awaken_cost_step: 30,
        awaken_max_level: 5,
        evolution_max_stars: 5,
        item_max_level: 5,
        initial_unlocked_heroes: ['mira', 'brann', 'lys'],
        tiers: [
          { id: 'spark', label: 'Étincelle', persona: 'Pio', radius: 24, color: '#5eead4', score: 12 },
          { id: 'dew', label: 'Rosée', persona: 'Lumi', radius: 31, color: '#38bdf8', score: 30 },
          { id: 'moon', label: 'Lune', persona: 'Séla', radius: 40, color: '#818cf8', score: 72 },
          { id: 'comet', label: 'Comète', persona: 'Kori', radius: 50, color: '#c084fc', score: 160 },
          { id: 'sun', label: 'Soleil', persona: 'Hélio', radius: 62, color: '#fb7185', score: 360 },
          { id: 'crown', label: 'Couronne', persona: 'Auriel', radius: 76, color: '#f59e0b', score: 800 },
          { id: 'world', label: 'Monde', persona: 'Gaïa', radius: 92, color: '#84cc16', score: 1800 },
          { id: 'nexus', label: 'Nexus', persona: 'Astra', radius: 112, color: '#f8fafc', score: 4200 },
        ],
        // Atlas 6x4 : vingt-quatre Gardiens uniques avec identité, rôle et passifs propres.
        heroes: [
          guardian(0, { id: 'mira', name: 'Mira', title: 'Tisseuse de gravité', rarity: 'R', ability: 'gravity_well', ability_label: 'Puits astral', color: '#2dd4bf', faction: 'Cercle des Marées', role: 'Contrôle', element: 'Lune', quote: 'Tout astre connaît le chemin du retour.', biography: 'Cartographe des courants célestes, Mira plie la gravité pour protéger les voyageurs du Nexus.' }, ['eclat_bonus_pct', 10, "Fil d'argent", 'Éclats de fusion +10 %'], ['charge_merge_bonus', 2, 'Cœur du puits', '+2 charge par fusion']),
          guardian(1, { id: 'brann', name: 'Brann', title: 'Forgeron des astres', rarity: 'R', ability: 'forge_next', ability_label: 'Frappe runique', color: '#f97316', faction: 'Forge Solaire', role: 'Amplificateur', element: 'Feu', quote: 'Le ciel se répare à coups de marteau.', biography: 'Brann frappe les météores encore chauds pour façonner des orbes capables de défier la Nuit.' }, ['score_bonus_pct', 8, 'Braises', 'Score +8 %'], ['charge_per_drop', 2, 'Souffle de forge', '+2 charge par orbe']),
          guardian(2, { id: 'kael', name: 'Kael', title: "Chasseur d'étoiles", rarity: 'R', ability: 'starfall', ability_label: "Pluie d'étoiles", color: '#a3e635', faction: 'Veilleurs Boréaux', role: 'Dégâts', element: 'Vent', quote: 'Je ne manque jamais une étoile filante.', biography: 'Éclaireur des frontières boréales, Kael abat les fragments corrompus avant leur chute.' }, ['eclat_bonus_pct', 12, 'Instinct de chasse', 'Éclats de fusion +12 %'], ['overflow_grace_ms', 250, 'Ciel dégagé', 'Grâce de débordement +250 ms']),
          guardian(3, { id: 'orin', name: 'Orin', title: 'Chasseur des marées', rarity: 'R', ability: 'echo_merge', ability_label: 'Écho jumeau', color: '#22d3ee', faction: 'Cercle des Marées', role: 'Combo', element: 'Eau', quote: 'Une vague revient toujours deux fois.', biography: 'Orin entend les échos des fusions futures et reproduit leurs ondes dans le présent.' }, ['cascade_window_ms', 200, 'Ressac', 'Fenêtre de cascade +200 ms'], ['score_bonus_pct', 10, 'Marée montante', 'Score +10 %']),
          guardian(4, { id: 'talia', name: 'Talia', title: 'Messagère des zéphyrs', rarity: 'R', ability: 'time_bloom', ability_label: 'Danse suspendue', color: '#67e8f9', faction: 'Veilleurs Boréaux', role: 'Vitesse', element: 'Vent', quote: 'Respire. Le ciel te laisse une seconde.', biography: 'Talia traverse les tempêtes pour transmettre les ordres de l’Observatoire dans un silence absolu.' }, ['cooldown_reduction_ms', 45, 'Pas de brise', 'Recharge des orbes −45 ms'], ['slow_on_cascade_ms', 900, 'Courant calme', 'Ralenti 0,9 s sur cascade ×3']),
          guardian(5, { id: 'joren', name: 'Joren', title: 'Porte-bouclier lunaire', rarity: 'R', ability: 'aegis', ability_label: 'Rempart lunaire', color: '#94a3b8', faction: 'Ordre du Croissant', role: 'Protection', element: 'Lune', quote: 'Derrière moi, aucune étoile ne tombe.', biography: 'Dernier gardien d’un temple effondré, Joren porte un éclat de lune en guise de bouclier.' }, ['overflow_grace_ms', 300, 'Garde blanche', 'Grâce de débordement +300 ms'], ['score_bonus_pct', 7, 'Serment', 'Score +7 %']),
          guardian(6, { id: 'phae', name: 'Phaé', title: 'Herboriste de comète', rarity: 'R', ability: 'ascension', ability_label: 'Pollen ascendant', color: '#bef264', faction: 'Jardins Sidéraux', role: 'Soutien', element: 'Nature', quote: 'Même le vide peut refleurir.', biography: 'Phaé cultive des graines nées dans les queues de comètes et soigne les constellations blessées.' }, ['start_charge', 12, 'Graine vive', 'Commence avec 12 % de charge'], ['charge_per_drop', 1, 'Floraison', '+1 charge par orbe']),
          guardian(7, { id: 'ciro', name: 'Ciro', title: 'Archiviste errant', rarity: 'R', ability: 'shatter_top', ability_label: 'Page tranchante', color: '#fca5a5', faction: 'Bibliothèque du Nexus', role: 'Précision', element: 'Solaire', quote: 'Une erreur bien lue devient une victoire.', biography: 'Ciro collectionne les cartes des ciels disparus et sait exactement quel orbe retirer du chaos.' }, ['score_bonus_pct', 9, 'Annotation', 'Score +9 %'], ['eclat_bonus_pct', 8, 'Index secret', 'Éclats de fusion +8 %']),
          guardian(8, { id: 'lys', name: 'Lys', title: 'Gardienne des secondes', rarity: 'SR', ability: 'time_bloom', ability_label: 'Temps suspendu', color: '#60a5fa', faction: 'Horloge Astrale', role: 'Contrôle', element: 'Temps', quote: 'Une seconde suffit à changer un destin.', biography: 'Lys surveille les secondes perdues depuis la fracture et les restitue aux invocateurs audacieux.' }, ['slow_on_cascade_ms', 1500, 'Rosée persistante', 'Ralenti 1,5 s sur cascade ×3'], ['cascade_window_ms', 300, 'Sablier fêlé', 'Fenêtre de cascade +300 ms']),
          guardian(9, { id: 'noor', name: 'Noor', title: "Porteuse d'aurore", rarity: 'SR', ability: 'ascension', ability_label: 'Ascension', color: '#f472b6', faction: 'Forge Solaire', role: 'Soutien', element: 'Solaire', quote: 'L’aube est une promesse, pas un souvenir.', biography: 'Noor porte dans sa lanterne la première lumière du monde, assez vive pour élever les astres.' }, ['start_charge', 20, 'Aube claire', 'Commence avec 20 % de charge'], ['charge_merge_bonus', 3, 'Élan céleste', '+3 charge par fusion']),
          guardian(10, { id: 'vesper', name: 'Vesper', title: 'Sentinelle du soir', rarity: 'SR', ability: 'aegis', ability_label: 'Voile stellaire', color: '#94a3b8', faction: 'Ordre du Croissant', role: 'Protection', element: 'Ombre', quote: 'Le crépuscule n’est pas une fin.', biography: 'Vesper veille là où la lumière hésite et repousse le débordement par un voile impénétrable.' }, ['overflow_grace_ms', 400, 'Garde du soir', 'Grâce de débordement +400 ms'], ['cooldown_reduction_ms', 60, 'Pas feutré', 'Recharge des orbes −60 ms']),
          guardian(11, { id: 'saphira', name: 'Saphira', title: 'Lame de cristal', rarity: 'SR', ability: 'shatter_top', ability_label: 'Éclat pur', color: '#7dd3fc', faction: 'Prisme Royal', role: 'Dégâts', element: 'Cristal', quote: 'La perfection possède un tranchant.', biography: 'Duelliste du Prisme Royal, Saphira fend les formations impossibles d’un seul geste lumineux.' }, ['score_bonus_pct', 12, 'Tranchant', 'Score +12 %'], ['eclat_bonus_pct', 8, 'Facettes', 'Éclats de fusion +8 %']),
          guardian(12, { id: 'nyx', name: 'Nyx', title: 'Murmure du vide', rarity: 'SR', ability: 'void_swap', ability_label: 'Bascule du vide', color: '#6366f1', faction: 'Exilés du Vide', role: 'Manipulation', element: 'Vide', quote: 'Le vide ne ment jamais.', biography: 'Nyx a traversé la Nuit sans constellation et en a rapporté l’art d’inverser les lois du Puits.' }, ['cooldown_reduction_ms', 50, 'Ombre utile', 'Recharge des orbes −50 ms'], ['charge_per_drop', 3, 'Regard du vide', '+3 charge par orbe']),
          guardian(13, { id: 'ilyra', name: 'Ilyra', title: 'Cantatrice des anneaux', rarity: 'SR', ability: 'constellation', ability_label: 'Accord orbital', color: '#d8b4fe', faction: 'Chœur Céleste', role: 'Combo', element: 'Son', quote: 'Chaque orbite attend sa note.', biography: 'La voix d’Ilyra relie les orbes distants et prolonge les cascades au-delà du possible.' }, ['cascade_window_ms', 280, 'Legato', 'Fenêtre de cascade +280 ms'], ['charge_merge_bonus', 3, 'Harmonique', '+3 charge par fusion']),
          guardian(14, { id: 'caelum', name: 'Caelum', title: 'Lancetoile impérial', rarity: 'SR', ability: 'starfall', ability_label: 'Javelot céleste', color: '#38bdf8', faction: 'Légion d’Astra', role: 'Dégâts', element: 'Foudre', quote: 'Je trace la ligne que suivra l’éclair.', biography: 'Champion de la Légion, Caelum concentre les pluies stellaires en impacts d’une précision brutale.' }, ['score_bonus_pct', 13, 'Pointe d’azur', 'Score +13 %'], ['eclat_bonus_pct', 10, 'Arc ionique', 'Éclats de fusion +10 %']),
          guardian(15, { id: 'rhea', name: 'Rhéa', title: 'Oracle des marées', rarity: 'SR', ability: 'echo_merge', ability_label: 'Double présage', color: '#06b6d4', faction: 'Cercle des Marées', role: 'Combo', element: 'Eau', quote: 'J’ai déjà vu la prochaine vague.', biography: 'Rhéa lit les futurs possibles dans l’eau stellaire et choisit celui qui produit la cascade parfaite.' }, ['cascade_window_ms', 320, 'Présage fluide', 'Fenêtre de cascade +320 ms'], ['score_bonus_pct', 11, 'Seconde vague', 'Score +11 %']),
          guardian(16, { id: 'talos', name: 'Talos', title: 'Colosse magnétique', rarity: 'SR', ability: 'gravity_well', ability_label: 'Cœur magnétique', color: '#a78bfa', faction: 'Forge Solaire', role: 'Contrôle', element: 'Métal', quote: 'Tout finit par graviter autour d’une volonté.', biography: 'Armure antique animée par un noyau conscient, Talos attire les orbes comme des satellites.' }, ['overflow_grace_ms', 450, 'Blindage orbital', 'Grâce de débordement +450 ms'], ['charge_merge_bonus', 3, 'Induction', '+3 charge par fusion']),
          guardian(17, { id: 'maelys', name: 'Maëlys', title: 'Dompteuse de nébuleuses', rarity: 'SR', ability: 'forge_next', ability_label: 'Nébuleuse captive', color: '#fb7185', faction: 'Jardins Sidéraux', role: 'Amplificateur', element: 'Cosmos', quote: 'Les nuages du ciel ont aussi un cœur.', biography: 'Maëlys apprivoise les nébuleuses vivantes et condense leur poussière en orbes de rang supérieur.' }, ['charge_per_drop', 3, 'Poussière vive', '+3 charge par orbe'], ['score_bonus_pct', 12, 'Nuage royal', 'Score +12 %']),
          guardian(18, { id: 'aster', name: 'Aster', title: 'Héritière du Nexus', rarity: 'SSR', ability: 'supernova', ability_label: 'Supernova', color: '#facc15', faction: 'Trône du Nexus', role: 'Dégâts', element: 'Nexus', quote: 'Je rallumerai chaque royaume, un astre après l’autre.', biography: 'Héritière de la couronne brisée, Aster transforme les fusions en une supernova capable de repousser la Nuit.' }, ['charge_merge_bonus', 4, 'Héritage', '+4 charge par fusion'], ['score_bonus_pct', 15, 'Noblesse', 'Score +15 %']),
          guardian(19, { id: 'elya', name: 'Élya', title: 'Voix des constellations', rarity: 'SSR', ability: 'constellation', ability_label: 'Constellation', color: '#e879f9', faction: 'Chœur Céleste', role: 'Combo', element: 'Son', quote: 'Le ciel se souvient de notre refrain.', biography: 'Élya chante les noms véritables des constellations et force leurs fragments à se reconnaître.' }, ['eclat_bonus_pct', 15, 'Chœur mineur', 'Éclats de fusion +15 %'], ['cascade_window_ms', 350, 'Harmonie', 'Fenêtre de cascade +350 ms']),
          guardian(20, { id: 'solveig', name: 'Solveig', title: 'Aube éternelle', rarity: 'SSR', ability: 'aurora', ability_label: 'Aurore boréale', color: '#fb923c', faction: 'Veilleurs Boréaux', role: 'Amplificateur', element: 'Aurore', quote: 'La nuit reculera tant que je respire.', biography: 'Vedette de l’Aurore Boréale, Solveig double les fusions pendant une danse de lumière polaire.' }, ['start_charge', 30, 'Premier rayon', 'Commence avec 30 % de charge'], ['slow_on_cascade_ms', 2000, 'Chaleur douce', 'Ralenti 2 s sur cascade ×3']),
          guardian(21, { id: 'seraphiel', name: 'Séraphiel', title: 'Juge des sept soleils', rarity: 'SSR', ability: 'starfall', ability_label: 'Sentence solaire', color: '#fde68a', faction: 'Trône du Nexus', role: 'Dégâts', element: 'Solaire', quote: 'Sept soleils, un seul verdict.', biography: 'Séraphiel descend lorsque les cieux sont condamnés et fait pleuvoir une sentence de feu pur.' }, ['score_bonus_pct', 18, 'Septième sceau', 'Score +18 %'], ['charge_merge_bonus', 5, 'Justice ardente', '+5 charge par fusion']),
          guardian(22, { id: 'vaelora', name: 'Vaelora', title: 'Impératrice du vide', rarity: 'SSR', ability: 'void_swap', ability_label: 'Renversement absolu', color: '#8b5cf6', faction: 'Exilés du Vide', role: 'Manipulation', element: 'Vide', quote: 'Je ne crains pas la Nuit. Elle me craint.', biography: 'Ancienne souveraine exilée, Vaelora retourne la corruption contre elle-même et réordonne le Puits.' }, ['cooldown_reduction_ms', 90, 'Autorité noire', 'Recharge des orbes −90 ms'], ['eclat_bonus_pct', 18, 'Tribut du vide', 'Éclats de fusion +18 %']),
          guardian(23, { id: 'orion', name: 'Orion', title: 'Architecte primordial', rarity: 'SSR', ability: 'gravity_well', ability_label: 'Architecture céleste', color: '#5eead4', faction: 'Bâtisseurs Premiers', role: 'Contrôle', element: 'Nexus', quote: 'Une constellation est une cité qui sait danser.', biography: 'Orion dessina les premières orbites. Son retour annonce la reconstruction du ciel originel.' }, ['overflow_grace_ms', 650, 'Fondation', 'Grâce de débordement +650 ms'], ['start_charge', 35, 'Plan primordial', 'Commence avec 35 % de charge']),
        ],
      },
      economy_disclosure: {
        paid_currency: false,
        currency_source: 'earned by merges, cascades and Nexus completion',
        duplicate_resource: 'essence',
        duplicate_compensation: { R: 15, SR: 35, SSR: 80 },
        duplicate_sink: 'essence awakens Guardian ultimates (5 levels, published costs)',
        duplicate_evolution: 'each Guardian duplicate grants an evolution star (max 5) unlocking skills at 1 and 3 stars',
        rates: { R: '70%', SR: '25%', SSR: '5%' },
        pity: 'SSR guaranteed no later than pull 30; a non-featured SSR guarantees the featured SSR on the next SSR pull',
        ten_pull: '900 shards for 10 pulls with at least one SR or better guaranteed',
        relic_banner: '80 shards per pull (720 for 10, SR+ guaranteed); duplicates level items up to 5 then convert to essence',
      },
    } as Record<string, unknown>,
    style: {
      palette,
      dimension: '2d',
      mood: 'astral_arcade_collection',
    },
    systems: MERGE_DROP_SYSTEMS,
    entities: [
      {
        id: 'player',
        type: 'game_controller',
        assets: {},
        components: [{ transform: { x: 360, y: 224 } }],
      },
    ],
    scenes: [
      {
        id: sceneId,
        title: 'Le Puits des Constellations',
        entities: ['player'],
        background: background('#07131d', opts),
        camera: { mode: 'fixed', bounds: true },
        depth: { mode: 'flat', sort_key: 'feet_y' },
        layout,
        spawn: layout.spawn,
        board: productionBoard(preset, opts),
        story_beats: [
          { id: 'opening', trigger: 'first_drop', text: 'Le ciel d Astra s est brise. Chaque fusion restaure une constellation.' },
          { id: 'power', trigger: 'first_ability', text: 'Les Veilleurs pretent leur pouvoir a ceux qui savent ordonner les astres.' },
          { id: 'nexus', trigger: 'target_reached', text: 'Le Nexus rallume une route vers le prochain ciel.' },
        ],
      },
    ],
    ui: {
      orientation: 'portrait',
      surfaces: ['score', 'next_orb', 'loss_line', 'hero_roster', 'ability_button', 'earned_summon', 'rates_disclosure'],
      touch_targets_min_css_px: 44,
    },
    narrative: {
      hook: 'Lead twenty-four Guardians across three shattered skies, master astral trials and defeat the Void Leviathans.',
      first_run_objective: 'Complete the first constellation mission, recruit a squad and restore the road to the Nexus.',
    },
  });

  return GameDefinitionSchema.parse(enhanceGdlWithPlayableSlice(base, {
    preset,
    title,
    prompt: opts.prompt,
    sourceImages: opts.boardImages,
    qualityTarget: 'vertical_slice',
  }));
}

export interface StarterGdlOptions {
  title?: string;
  palette?: string[];
  /** Already generated asset paths: hero sprite, background, etc. */
  heroSprite?: string;
  backgroundImage?: string;
  /** Optional six-column portrait atlas for the twenty-four merge-drop Guardians. */
  heroPortraitSheet?: string;
  /** Board/key-art/source references used to build a real playable volume contract. */
  boardImages?: string[];
  /** Raw prompt retained in meta.prototype_board for downstream agents. */
  prompt?: string;
}

export function buildStarterGdl(preset: ProductionPreset, opts: StarterGdlOptions = {}): GameDefinition {
  if (isMergeDrop(preset)) {
    return buildMergeDropGdl(preset, opts);
  }
  if (isLaneAction(preset)) {
    return buildLaneActionGdl(preset, opts);
  }

  const topdown = isTopdown(preset);
  const scene = topdown ? buildTopdownScene(preset, opts) : buildSideScene(preset, opts);
  const palette = paletteFor(preset, opts.palette);
  const hp = healthFor(preset.difficulty);

  const base = GameDefinitionSchema.parse({
    meta: {
      title: opts.title ?? preset.game_type,
      dimension: preset.dimension,
      genre: preset.game_type,
      resolution: [1280, 720],
      version: '0.2.0',
      declared_systems: preset.systems,
      mechanic_modules: preset.mechanic_modules,
      prototype_board: productionBoard(preset, opts),
      production_contract: productionContract(preset, opts),
    } as Record<string, unknown>,
    style: {
      palette,
      dimension: preset.dimension,
      mood: preset.art_style === 'dark_fantasy' ? 'dark_fantasy' : preset.game_type,
    },
    systems: topdown ? TOPDOWN_SYSTEMS : SIDE_SYSTEMS,
    entities: [
      entityPlayer({
        topdown,
        hp,
        spawn: scene.spawn ?? scene.layout?.spawn ?? { x: 96, y: 560 },
        heroSprite: opts.heroSprite,
      }),
    ],
    scenes: [scene],
    ui: {
      hud: topdown
        ? [{ type: 'health_bar', bind: 'player.health' }, { type: 'objective', text: 'Reach the relic gate' }]
        : [{ type: 'health_bar', bind: 'player.health' }, { type: 'objective', text: 'Reach the gate' }],
    },
    narrative: {
      hook:
        preset.game_type === 'souls_like_2d'
          ? 'A condemned hero crosses an ashen gate guarded by a relic warden.'
          : preset.game_type === 'action_rpg'
            ? 'A young guardian follows spirit traces through a sealed wood.'
            : 'A focused first playable slice with a clear traversal objective.',
    },
  });

  return GameDefinitionSchema.parse(enhanceGdlWithPlayableSlice(base, {
    preset,
    title: opts.title ?? preset.game_type,
    prompt: opts.prompt,
    sourceImages: opts.boardImages,
    qualityTarget: 'vertical_slice',
  }));
}
