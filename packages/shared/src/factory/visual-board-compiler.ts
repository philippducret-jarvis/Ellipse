import type { GameDefinition } from '../index.js';
import type { ProductionPreset } from '../catalog/game-types.js';
import { defaultDepthSpecForMode, type DepthMode } from '../gdl/depth.js';
import type { GdlLayout, Scene } from '../gdl/ir.js';

export type PlayableSliceQuality = 'prototype' | 'vertical_slice' | 'commercial_candidate';

export interface BoardSourceRef {
  id: string;
  kind: 'prompt' | 'board_image' | 'reference_image' | 'generated_placeholder';
  uri?: string;
  role: string;
}

export interface PlayableVolumeLayer {
  id: string;
  role: 'far_background' | 'midground' | 'playfield' | 'actor_plane' | 'foreground_occluder' | 'fx_lighting';
  depth: number;
  parallax: number;
  collision: boolean;
  asset_family: string;
  extraction_rule: string;
}

export interface CriticalPathBeat {
  id: string;
  zone_id: string;
  screen_goal: string;
  player_action: string;
  story_function: string;
  runtime_gate: string;
}

export interface BoardAssetExtractionSpec {
  id: string;
  family: string;
  source_role: string;
  output: string;
  needed_for: string[];
  acceptance: string[];
}

export interface PlayableSliceSpec {
  quality_target: PlayableSliceQuality;
  source_refs: BoardSourceRef[];
  spatial_model: {
    dimension: ProductionPreset['dimension'];
    perspective: ProductionPreset['perspective'];
    depth_mode: DepthMode;
    camera: string;
    navigation: 'platform_path' | 'topdown_walkable_space' | 'lane_combat';
    collision_truth: string;
  };
  volume_layers: PlayableVolumeLayer[];
  critical_path: CriticalPathBeat[];
  encounters: {
    id: string;
    zone_id: string;
    enemy_budget: number;
    purpose: string;
    fail_state: string;
    reward: string;
  }[];
  story_beats: {
    id: string;
    trigger: string;
    text: string;
    objective: string;
  }[];
  asset_extraction_manifest: BoardAssetExtractionSpec[];
  commercial_gates: string[];
  production_gaps: string[];
}

export interface BoardCompilerInput {
  preset: ProductionPreset;
  prompt?: string;
  title?: string;
  sourceImages?: string[];
  qualityTarget?: PlayableSliceQuality;
}

const DARK_FANTASY_WORDS = ['elden', 'souls', 'dark', 'fantasy', 'cursed', 'ash', 'rune'];
const MANA_WORDS = ['mana', 'secret of mana', 'elliot', 'adventure', 'forest', 'spirit'];

function includesAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function depthModeFor(preset: ProductionPreset): DepthMode {
  if (preset.game_type === 'survivors_like' || preset.game_type === 'gacha_rpg') return 'lane_perspective';
  if (preset.perspective === 'top_down' || preset.perspective === 'isometric') return 'top_down_axis';
  if (preset.dimension === '2.5d') return 'lane_perspective';
  return 'side_scroll';
}

function navigationFor(preset: ProductionPreset): PlayableSliceSpec['spatial_model']['navigation'] {
  if (preset.game_type === 'survivors_like' || preset.game_type === 'gacha_rpg') return 'lane_combat';
  if (preset.perspective === 'top_down' || preset.perspective === 'isometric') return 'topdown_walkable_space';
  return 'platform_path';
}

function commercialPromise(input: BoardCompilerInput): string {
  const text = `${input.title ?? ''} ${input.prompt ?? ''}`;
  if (input.preset.game_type === 'gacha_rpg') return 'summon a hero, survive a readable combat run, earn a roster reward';
  if (input.preset.game_type === 'souls_like_2d' || includesAny(text, DARK_FANTASY_WORDS)) {
    return 'cross a hostile dark fantasy space, learn enemy timing, reach the boss gate';
  }
  if (input.preset.game_type === 'action_rpg' || includesAny(text, MANA_WORDS)) {
    return 'explore a handcrafted-feeling place, find a relic, unlock the next story step';
  }
  return 'understand the objective in one screen, master one mechanic, reach a clear goal';
}

function sourceRefs(input: BoardCompilerInput): BoardSourceRef[] {
  const refs: BoardSourceRef[] = [];
  if (input.prompt?.trim()) {
    refs.push({ id: 'prompt_north_star', kind: 'prompt', role: 'intent_and_story_seed' });
  }
  input.sourceImages?.forEach((uri, index) => {
    refs.push({
      id: `source_image_${index + 1}`,
      kind: index === 0 ? 'board_image' : 'reference_image',
      uri,
      role: index === 0 ? 'visual_board_or_key_art' : 'character_prop_or_style_reference',
    });
  });
  if (refs.length === 0) {
    refs.push({ id: 'generated_style_board', kind: 'generated_placeholder', role: 'temporary_style_and_layout_seed' });
  }
  return refs;
}

function volumeLayers(preset: ProductionPreset): PlayableVolumeLayer[] {
  const twoFive = preset.dimension === '2.5d' || preset.perspective === 'isometric';
  return [
    {
      id: 'sky_or_far_backdrop',
      role: 'far_background',
      depth: 0.05,
      parallax: twoFive ? 0.08 : 0.2,
      collision: false,
      asset_family: 'environment_backdrop',
      extraction_rule: 'paint or cut the far silhouette; never put gameplay-critical detail here',
    },
    {
      id: 'landmark_midground',
      role: 'midground',
      depth: 0.35,
      parallax: twoFive ? 0.32 : 0.55,
      collision: false,
      asset_family: 'environment_landmarks',
      extraction_rule: 'extract readable landmarks that sell the world identity',
    },
    {
      id: 'collision_playfield',
      role: 'playfield',
      depth: 0.72,
      parallax: 1,
      collision: true,
      asset_family: 'collision_tiles_and_walkable_shapes',
      extraction_rule: 'author collision as data; never infer shipping collision from painted pixels only',
    },
    {
      id: 'actors_and_interactables',
      role: 'actor_plane',
      depth: 0.82,
      parallax: 1,
      collision: true,
      asset_family: 'characters_enemies_props_pickups',
      extraction_rule: 'cut silhouettes, define feet points, bind hitboxes and interaction radii',
    },
    {
      id: 'foreground_occluders',
      role: 'foreground_occluder',
      depth: 0.96,
      parallax: twoFive ? 1.18 : 1.05,
      collision: false,
      asset_family: 'foreground_depth_cards',
      extraction_rule: 'use only decorative occlusion; keep the player readable at all times',
    },
    {
      id: 'lighting_and_vfx',
      role: 'fx_lighting',
      depth: 1,
      parallax: 1,
      collision: false,
      asset_family: 'lighting_vfx_overlays',
      extraction_rule: 'separate fog, hit flashes and magic cues from the background art',
    },
  ];
}

function zonesFromLayout(layout: GdlLayout | undefined, preset: ProductionPreset): NonNullable<GdlLayout['zones']> {
  if (layout?.zones?.length) return layout.zones;
  const width = layout?.width ?? (preset.game_type === 'gacha_rpg' ? 720 : 1280);
  const height = layout?.height ?? (preset.game_type === 'gacha_rpg' ? 1280 : 720);
  if (navigationFor(preset) === 'lane_combat') {
    return [
      { id: 'summon_or_loadout', label: 'Summon or Loadout', x: 0, y: 0, w: width, h: Math.round(height * 0.22), theme: 'setup' },
      { id: 'combat_lanes', label: 'Combat Lanes', x: 0, y: Math.round(height * 0.22), w: width, h: Math.round(height * 0.58), theme: 'combat' },
      { id: 'boss_reward', label: 'Boss and Reward', x: 0, y: Math.round(height * 0.8), w: width, h: Math.round(height * 0.2), theme: 'reward' },
    ];
  }
  return [
    { id: 'entry_read', label: 'Entry Read', x: 0, y: 0, w: Math.round(width * 0.28), h: height, theme: 'intro' },
    { id: 'mechanic_trial', label: 'Mechanic Trial', x: Math.round(width * 0.28), y: 0, w: Math.round(width * 0.34), h: height, theme: 'trial' },
    { id: 'risk_reward', label: 'Risk Reward', x: Math.round(width * 0.62), y: 0, w: Math.round(width * 0.2), h: height, theme: 'reward' },
    { id: 'exit_hook', label: 'Exit Hook', x: Math.round(width * 0.82), y: 0, w: Math.round(width * 0.18), h: height, theme: 'story_gate' },
  ];
}

function criticalPath(input: BoardCompilerInput, zones: NonNullable<GdlLayout['zones']>): CriticalPathBeat[] {
  const promise = commercialPromise(input);
  return zones.slice(0, 4).map((zone, index) => {
    const first = index === 0;
    const last = index === Math.min(zones.length, 4) - 1;
    return {
      id: `beat_${index + 1}_${zone.id}`,
      zone_id: zone.id,
      screen_goal: first ? 'read the objective without text overload' : last ? 'reach a gate that promises the next scene' : `complete ${zone.label}`,
      player_action: first
        ? 'move from spawn and test the core input'
        : last
          ? 'survive the final obstacle and touch the exit'
          : navigationFor(input.preset) === 'platform_path'
            ? 'jump, fight or collect with increasing risk'
            : 'navigate, fight and collect with clear feedback',
      story_function: first ? promise : last ? 'change the story state and open the next production beat' : 'prove the world rules through play',
      runtime_gate: first ? 'spawn_safe_and_camera_framed' : last ? 'goal_or_boss_gate_reachable' : 'no_dead_end_and_feedback_present',
    };
  });
}

function encounterPlan(preset: ProductionPreset, zones: NonNullable<GdlLayout['zones']>): PlayableSliceSpec['encounters'] {
  const combatZones = zones.filter((zone) => /trial|combat|risk|boss|gate|lane/i.test(`${zone.id} ${zone.theme ?? ''}`));
  const selected = combatZones.length ? combatZones : zones.slice(1, 3);
  return selected.slice(0, 3).map((zone, index) => ({
    id: `encounter_${index + 1}_${zone.id}`,
    zone_id: zone.id,
    enemy_budget: preset.game_type === 'souls_like_2d' ? (index === selected.length - 1 ? 1 : 2) : preset.game_type === 'gacha_rpg' ? 5 : 3,
    purpose: index === 0 ? 'teach threat readability' : index === 1 ? 'test mastery under pressure' : 'create a memorable finale',
    fail_state: 'damage, checkpoint reset or run loss must be explicit',
    reward: index === selected.length - 1 ? 'story gate, banner currency or relic' : 'pickup, checkpoint or ability hint',
  }));
}

function storyBeats(input: BoardCompilerInput, zones: NonNullable<GdlLayout['zones']>): PlayableSliceSpec['story_beats'] {
  const promise = commercialPromise(input);
  const first = zones[0]?.id ?? 'entry_read';
  const last = zones[zones.length - 1]?.id ?? 'exit_hook';
  return [
    {
      id: 'story_opening',
      trigger: `enter_zone:${first}`,
      text: promise,
      objective: 'Establish why the player moves now.',
    },
    {
      id: 'story_turn',
      trigger: zones[1] ? `enter_zone:${zones[1].id}` : 'first_pickup',
      text: 'The place reacts to the player; the board becomes a rule, not a wallpaper.',
      objective: 'Tie the first mechanic to the fiction.',
    },
    {
      id: 'story_exit_hook',
      trigger: `enter_zone:${last}`,
      text: 'A locked promise beyond the slice: boss, relic, banner, companion or new region.',
      objective: 'Give the player a reason to want the next level.',
    },
  ];
}

function assetManifest(input: BoardCompilerInput): BoardAssetExtractionSpec[] {
  const gacha = input.preset.game_type === 'gacha_rpg';
  return [
    {
      id: 'hero_runtime_sprite',
      family: 'hero',
      source_role: 'character_reference_or_prompt',
      output: input.preset.dimension === '2.5d' ? 'layered_sprite_plus_depth_billboard' : 'layered_sprite',
      needed_for: ['player readability', 'animation clips', 'hitbox feet point'],
      acceptance: ['silhouette readable at gameplay scale', 'feet point matches collision', 'idle/run/attack or walk clips exist'],
    },
    {
      id: 'playfield_collision_map',
      family: 'level_collision',
      source_role: 'board_overpaint_or_level_design',
      output: navigationFor(input.preset) === 'platform_path' ? 'platforms_and_hazards_json' : 'walkable_mask_or_blockers_json',
      needed_for: ['movement', 'enemy placement', 'camera bounds'],
      acceptance: ['spawn safe', 'goal reachable', 'no invisible wall ambiguity'],
    },
    {
      id: 'environment_depth_pack',
      family: 'environment',
      source_role: 'visual_board',
      output: input.preset.dimension === '2.5d' ? 'parallax_planes_and_foreground_cards' : 'background_plus_decor_tiles',
      needed_for: ['world identity', '2.5d volume', 'scene readability'],
      acceptance: ['far/mid/playfield/foreground separated', 'foreground never hides hazards', 'palette supports actors'],
    },
    {
      id: 'enemy_and_boss_readability_pack',
      family: 'enemies',
      source_role: 'prompt_or_board_creatures',
      output: 'enemy_sprites_hitboxes_attack_tells',
      needed_for: ['combat loop', 'difficulty curve', 'game feel'],
      acceptance: ['attack tell visible', 'damage state clear', 'boss or elite has phase marker when required'],
    },
    {
      id: gacha ? 'roster_and_banner_pack' : 'story_props_and_rewards',
      family: gacha ? 'gacha_roster' : 'props_rewards',
      source_role: gacha ? 'character_board_or_prompt' : 'board_props',
      output: gacha ? 'rarity_roster_cards_banner_ui' : 'collectibles_keys_relics',
      needed_for: gacha ? ['summon fantasy', 'economy clarity', 'reward screen'] : ['objective clarity', 'quest feedback'],
      acceptance: gacha
        ? ['rarity readable', 'odds disclosure present', 'pull result feeds inventory']
        : ['pickup readable', 'reward changes objective state', 'prop has icon and world sprite'],
    },
  ];
}

function commercialGates(input: BoardCompilerInput): string[] {
  const gates = [
    'first 30 seconds: player sees objective, danger and exit direction',
    'input loop: movement, feedback, failure and reward all respond in runtime',
    'scene volume: far/mid/playfield/foreground are separate, with collision authored as data',
    'narrative loop: opening motive, mid-slice turn and exit hook are present',
    'content loop: at least one enemy or obstacle, one reward, one checkpoint or recovery rule',
    'QA loop: synthetic playtest or human route proves spawn-to-goal reachability',
    'asset loop: no final export if core hero/environment assets remain unapproved placeholders',
  ];
  if (input.preset.game_type === 'gacha_rpg') {
    gates.push('gacha compliance: rates, pity, currency source and purchase-adjacent odds are disclosed');
  }
  return gates;
}

function productionGaps(input: BoardCompilerInput): string[] {
  const gaps = [
    'board segmentation must output separate actor, prop, environment and collision candidates',
    'animation must be authored per runtime clip, not just a static sheet',
    'combat readability must be checked at gameplay camera scale',
    'story beats must be connected to zones and triggers, not only markdown lore',
  ];
  if (input.sourceImages?.length) {
    gaps.push('source image needs approval pass: silhouette, alpha, palette, feet point and hitbox');
  } else {
    gaps.push('no board image supplied: generate a style board, then rerun extraction before commercial export');
  }
  if (input.preset.dimension === '2.5d') {
    gaps.push('2.5d pass requires parallax cards, Y-sort/scale rules and foreground occlusion QA');
  }
  return gaps;
}

export function compileVisualBoardToPlayableSlice(
  input: BoardCompilerInput,
  layout?: GdlLayout,
): PlayableSliceSpec {
  const zones = zonesFromLayout(layout, input.preset);
  const depthMode = depthModeFor(input.preset);
  return {
    quality_target: input.qualityTarget ?? 'vertical_slice',
    source_refs: sourceRefs(input),
    spatial_model: {
      dimension: input.preset.dimension,
      perspective: input.preset.perspective,
      depth_mode: depthMode,
      camera: depthMode === 'top_down_axis' ? 'top_down_follow_with_ysort' : depthMode === 'lane_perspective' ? 'follow_or_fixed_with_depth_lanes' : 'horizontal_follow',
      navigation: navigationFor(input.preset),
      collision_truth: 'GDL layout collision, tilemap, blockers and hazards are the source of truth; painted pixels are reference only',
    },
    volume_layers: volumeLayers(input.preset),
    critical_path: criticalPath(input, zones),
    encounters: encounterPlan(input.preset, zones),
    story_beats: storyBeats(input, zones),
    asset_extraction_manifest: assetManifest(input),
    commercial_gates: commercialGates(input),
    production_gaps: productionGaps(input),
  };
}

function ensureSceneLayout(scene: Scene, preset: ProductionPreset): GdlLayout | undefined {
  const layout = scene.layout;
  if (!layout) return layout;
  const zones = zonesFromLayout(layout, preset);
  const next: GdlLayout = { ...layout, zones };

  if (!next.checkpoints?.length && zones[1]) {
    next.checkpoints = [{ x: zones[1].x + Math.round(zones[1].w * 0.5), y: (layout.ground_y ?? layout.height) - 76, label: 'Midpoint' }];
  }
  if (!next.goal) {
    const last = zones[zones.length - 1];
    next.goal = last
      ? { x: last.x + Math.max(32, last.w - 96), y: (layout.ground_y ?? layout.height) - 84 }
      : { x: layout.width - 96, y: (layout.ground_y ?? layout.height) - 84 };
  }
  if (!next.collectibles?.length) {
    next.collectibles = zones.slice(1, 3).map((zone, index) => ({
      x: zone.x + Math.round(zone.w * 0.5),
      y: (layout.ground_y ?? layout.height) - 150 - index * 36,
      type: preset.game_type === 'gacha_rpg' ? 'moon_crystal' : 'story_relic',
    }));
  }
  if (!next.enemies?.length && preset.game_type !== 'topdown_adventure') {
    next.enemies = zones.slice(1, 3).map((zone, index) => ({
      x: zone.x + Math.round(zone.w * 0.55),
      y: (layout.ground_y ?? layout.height) - 42,
      kind: preset.game_type === 'souls_like_2d' && index === 1 ? 'gate_warden' : 'board_guardian',
      speed: preset.game_type === 'souls_like_2d' ? 38 : 58,
      patrol: preset.game_type === 'souls_like_2d' ? 42 : 72,
      hp: preset.game_type === 'souls_like_2d' && index === 1 ? 6 : 2,
    }));
  }
  return next;
}

function enrichedNarrative(input: BoardCompilerInput, slice: PlayableSliceSpec): Record<string, unknown> {
  return {
    hook: commercialPromise(input),
    quests: [
      {
        id: 'main_vertical_slice',
        title: 'First playable objective',
        status: 'active',
        objective: slice.story_beats[0]?.objective ?? 'Reach the exit hook',
        completion: slice.story_beats[slice.story_beats.length - 1]?.trigger ?? 'goal',
      },
      {
        id: 'board_mastery',
        title: 'Read the board',
        status: 'available',
        objective: 'Find the reward, survive the encounter and prove the world rule.',
        completion: 'collectible_or_encounter_clear',
      },
    ],
    dialogues: slice.story_beats.map((beat) => ({
      id: beat.id,
      speaker: beat.id === 'story_opening' ? 'narrator' : 'world',
      text: beat.text,
      trigger: beat.trigger,
      objective: beat.objective,
    })),
  };
}

export function enhanceGdlWithPlayableSlice(
  gdl: GameDefinition,
  input: BoardCompilerInput,
): GameDefinition {
  const scene0 = gdl.scenes[0];
  const slice = compileVisualBoardToPlayableSlice(input, scene0?.layout);
  const depthMode = slice.spatial_model.depth_mode;

  const scenes = gdl.scenes.map((scene, index) => {
    if (index !== 0) return scene;
    const layout = ensureSceneLayout(scene, input.preset);
    const shouldUpgradeDepth = input.preset.dimension === '2.5d' && scene.depth?.mode === 'side_scroll';
    const depth = shouldUpgradeDepth ? defaultDepthSpecForMode(depthMode, layout) : scene.depth ?? defaultDepthSpecForMode(depthMode, layout);
    return {
      ...scene,
      layout,
      depth,
      camera: scene.camera ?? {
        mode: depthMode === 'top_down_axis' ? 'top_down' : 'follow_horizontal',
        follow: 'player',
        bounds: true,
        smoothing: 0.16,
      },
      playable_volume: {
        spatial_model: slice.spatial_model,
        layers: slice.volume_layers,
        critical_path: slice.critical_path,
        encounters: slice.encounters,
      },
      story_beats: slice.story_beats,
      asset_extraction_manifest: slice.asset_extraction_manifest,
    } as Scene;
  });

  const existingMeta = gdl.meta as Record<string, unknown>;
  const productionContract = (existingMeta.production_contract as Record<string, unknown> | undefined) ?? {};

  return {
    ...gdl,
    meta: {
      ...gdl.meta,
      board_to_playable: slice,
      first_playable_slice: {
        quality_target: slice.quality_target,
        commercial_promise: commercialPromise(input),
        runtime_requirements: slice.commercial_gates,
        production_gaps: slice.production_gaps,
      },
      production_contract: {
        ...productionContract,
        playable_slice_contract: {
          quality_target: slice.quality_target,
          spatial_model: slice.spatial_model,
          critical_path: slice.critical_path,
          asset_extraction_manifest: slice.asset_extraction_manifest,
          commercial_gates: slice.commercial_gates,
          production_gaps: slice.production_gaps,
        },
      },
    },
    scenes,
    narrative: {
      ...(gdl.narrative ?? {}),
      ...enrichedNarrative(input, slice),
    },
    ui: {
      ...(gdl.ui ?? {}),
      objective_tracker: {
        primary: slice.story_beats[0]?.objective ?? 'Reach the goal',
        beats: slice.critical_path.map((beat) => ({ id: beat.id, zone_id: beat.zone_id, objective: beat.screen_goal })),
      },
    },
  };
}
