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

function paletteFor(preset: ProductionPreset, override?: string[]): string[] {
  return override ?? PALETTES[preset.art_style] ?? DEFAULT_PALETTE;
}

function background(color: string, opts: StarterGdlOptions): Record<string, unknown> {
  return opts.backgroundImage ? { color, image: opts.backgroundImage, alpha: 0.72 } : { color };
}

function productionBoard(preset: ProductionPreset, opts: StarterGdlOptions): Record<string, unknown> {
  const loop =
    preset.game_type === 'gacha_rpg'
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
        preset.game_type === 'gacha_rpg'
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

export interface StarterGdlOptions {
  title?: string;
  palette?: string[];
  /** Already generated asset paths: hero sprite, background, etc. */
  heroSprite?: string;
  backgroundImage?: string;
  /** Board/key-art/source references used to build a real playable volume contract. */
  boardImages?: string[];
  /** Raw prompt retained in meta.prototype_board for downstream agents. */
  prompt?: string;
}

export function buildStarterGdl(preset: ProductionPreset, opts: StarterGdlOptions = {}): GameDefinition {
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
