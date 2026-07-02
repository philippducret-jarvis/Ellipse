import { join } from 'node:path';
import { GDL_PATH, LEVEL_01_GROUND_Y, LEVEL_01_HEIGHT, LEVEL_01_WIDTH, LEVEL_SCENE_ROOT, REGISTRY_ROOT, RUNTIME_CONFIG_ROOT, WORKSPACE_ROOT } from './constants.mjs';
import { readJson, writeJson, writeText } from './io.mjs';
import { buildEchoesSceneGdl } from '../hd-faithful/depth-gdl.mjs';

function buildLayout() {
  return {
    world_size: { width: LEVEL_01_WIDTH, height: LEVEL_01_HEIGHT },
    ground_y: LEVEL_01_GROUND_Y,
    spawn: { x: 96, y: 560 },
    platforms: [
      { x: 0, y: 632, w: 352, h: 88, type: 'ground', theme: 'awakening' },
      { x: 352, y: 632, w: 228, h: 88, type: 'ground', theme: 'descent' },
      { x: 422, y: 552, w: 134, h: 22, type: 'platform', theme: 'descent' },
      { x: 560, y: 504, w: 126, h: 22, type: 'platform', theme: 'descent' },
      { x: 700, y: 452, w: 112, h: 22, type: 'platform', theme: 'descent' },
      { x: 744, y: 632, w: 392, h: 88, type: 'ground', theme: 'battlefield' },
      { x: 846, y: 560, w: 132, h: 20, type: 'platform', theme: 'battlefield' },
      { x: 1012, y: 520, w: 148, h: 20, type: 'platform', theme: 'battlefield' },
      { x: 1136, y: 632, w: 320, h: 88, type: 'ground', theme: 'weapon_trial' },
      { x: 1212, y: 488, w: 120, h: 20, type: 'altar', theme: 'weapon_trial' },
      { x: 1364, y: 488, w: 120, h: 20, type: 'altar', theme: 'weapon_trial' },
      { x: 1456, y: 632, w: 432, h: 88, type: 'ground', theme: 'boss_arena' },
      { x: 1596, y: 534, w: 102, h: 18, type: 'platform', theme: 'boss_arena' },
      { x: 1718, y: 480, w: 102, h: 18, type: 'platform', theme: 'boss_arena' },
      { x: 1888, y: 632, w: 416, h: 88, type: 'ground', theme: 'refuge_exit' },
      { x: 1962, y: 566, w: 136, h: 20, type: 'platform', theme: 'refuge_exit' },
      { x: 2144, y: 518, w: 92, h: 18, type: 'platform', theme: 'refuge_exit' },
    ],
    collectibles: [
      { x: 188, y: 544, type: 'spore' },
      { x: 472, y: 516, type: 'memory_shard' },
      { x: 740, y: 412, type: 'spore' },
      { x: 932, y: 520, type: 'spore' },
      { x: 1078, y: 486, type: 'memory_shard' },
      { x: 1268, y: 456, type: 'weapon_echo' },
      { x: 1420, y: 456, type: 'weapon_echo' },
      { x: 1668, y: 506, type: 'root_essence' },
      { x: 2056, y: 538, type: 'checkpoint_seed' },
    ],
    checkpoints: [
      { id: 'origin_tree', x: 104, y: 556, label: 'Reveil' },
      { id: 'ruins_mid', x: 696, y: 428, label: 'Ruines' },
      { id: 'weapon_trial', x: 1306, y: 468, label: 'Zone des armes' },
      { id: 'guardian_threshold', x: 1518, y: 556, label: 'Gardien' },
      { id: 'echo_refuge', x: 1962, y: 540, label: 'Refuge' },
    ],
    hazards: [
      { x: 596, y: 638, w: 68, h: 18, kind: 'spore_spikes' },
      { x: 884, y: 638, w: 98, h: 18, kind: 'grave_pikes' },
      { x: 1506, y: 638, w: 180, h: 18, kind: 'root_spikes' },
      { x: 1760, y: 638, w: 90, h: 18, kind: 'toxic_spore_bloom' },
    ],
    enemies: [
      { x: 450, y: 598, kind: 'sporeling', patrol: 88, speed: 62, zone: 'descent' },
      { x: 770, y: 418, kind: 'sporeling', patrol: 68, speed: 72, zone: 'descent' },
      { x: 874, y: 600, kind: 'rampore', patrol: 104, speed: 76, zone: 'battlefield' },
      { x: 1048, y: 486, kind: 'porteur_sporeal', patrol: 92, speed: 58, zone: 'battlefield' },
      { x: 1324, y: 454, kind: 'sporeling', patrol: 56, speed: 74, zone: 'weapon_trial' },
      { x: 1622, y: 596, kind: 'chevalier_fongique', patrol: 122, speed: 60, zone: 'boss_arena' },
      { x: 1784, y: 596, kind: 'moussu_furieux', patrol: 96, speed: 52, zone: 'boss_arena' },
      { x: 1704, y: 556, kind: 'root_guardian_boss', patrol: 0, speed: 0, zone: 'boss_arena', boss: true },
    ],
    zones: [
      { id: 'awakening', label: 'Reveil sous l arbre originel', x: 0, y: 0, w: 352, h: 720, theme: 'origin_tree', music_state: 'awakening_whisper' },
      { id: 'descent', label: 'Descente dans les ruines', x: 352, y: 0, w: 392, h: 720, theme: 'ruins', music_state: 'ruins_tension' },
      { id: 'battlefield', label: 'Champ de bataille', x: 744, y: 0, w: 392, h: 720, theme: 'battlefield', music_state: 'battlefield_pressure' },
      { id: 'weapon_trial', label: 'Zone de test des armes', x: 1136, y: 0, w: 320, h: 720, theme: 'weapon_trial', music_state: 'armory_choice' },
      { id: 'boss_arena', label: 'Gardien des racines', x: 1456, y: 0, w: 432, h: 720, theme: 'guardian_arena', music_state: 'guardian_boss' },
      { id: 'refuge_exit', label: 'Refuge des echos', x: 1888, y: 0, w: 416, h: 720, theme: 'echo_refuge', music_state: 'afterglow' },
    ],
    goal: { x: 2240, y: 548, kind: 'exit_gate', unlock_flag: 'guardian_defeated' },
  };
}

function buildEncounters() {
  return {
    level: 'level_01',
    boss: 'root_guardian',
    beats: [
      { id: 'intro_safe', zone: 'awakening', enemies: [], goal: 'teach movement and awaken the world tone', music_state: 'awakening_whisper', rewards: ['checkpoint_origin_tree'] },
      { id: 'ruins_pressure', zone: 'descent', enemies: ['sporeling', 'sporeling'], goal: 'teach spacing, jump timing, and recovery', music_state: 'ruins_tension', rewards: ['memory_shard'] },
      { id: 'battlefield_layering', zone: 'battlefield', enemies: ['rampore', 'porteur_sporeal', 'sporeling'], goal: 'teach lane pressure and projectile interruption', music_state: 'battlefield_pressure', rewards: ['weapon_test_hint'] },
      { id: 'weapon_test', zone: 'weapon_trial', enemies: ['sporeling'], goal: 'lock one weapon choice before the guardian threshold', music_state: 'armory_choice', rewards: ['weapon_choice_locked'] },
      { id: 'guardian_threshold', zone: 'boss_arena', enemies: ['chevalier_fongique', 'moussu_furieux'], goal: 'prepare the player for elite rhythm and arena control', music_state: 'guardian_boss_prelude', rewards: ['guardian_gate_open'] },
      { id: 'root_guardian', zone: 'boss_arena', enemies: ['root_guardian_boss'], goal: 'defeat the first network sentinel and unlock the refuge', music_state: 'guardian_boss', rewards: ['root_essence', 'refuge_unlock', 'story_flag_root_guardian_fallen'] },
      { id: 'echo_refuge', zone: 'refuge_exit', enemies: [], goal: 'cool down, save, and transition to the next region', music_state: 'afterglow', rewards: ['save', 'exit_gate'] },
    ],
  };
}

function buildWireframeMap() {
  return {
    world_size: { width: LEVEL_01_WIDTH, height: LEVEL_01_HEIGHT },
    spawn: { x: 96, y: 560 },
    critical_path: [
      { id: 'awakening', label: 'Reveil', x: 0, width: 352, beat: 'teach movement and mood' },
      { id: 'descent', label: 'Descente des ruines', x: 352, width: 392, beat: 'spacing and traversal pressure' },
      { id: 'battlefield', label: 'Champ de bataille', x: 744, width: 392, beat: 'enemy layering and hazards' },
      { id: 'weapon_trial', label: 'Zone des armes', x: 1136, width: 320, beat: 'choose one weapon line' },
      { id: 'boss_arena', label: 'Gardien des racines', x: 1456, width: 432, beat: 'three-phase boss encounter' },
      { id: 'refuge_exit', label: 'Refuge des echos', x: 1888, width: 416, beat: 'save, reward, exit' },
    ],
    anchors: [
      { id: 'awakening_gate', type: 'checkpoint', position: { x: 104, y: 556, label: 'Reveil' } },
      { id: 'myla_whisper', type: 'story', position: { x: 248, y: 536, label: 'Myla guidance' } },
      { id: 'ruins_mid', type: 'checkpoint', position: { x: 696, y: 428, label: 'Ruines' } },
      { id: 'weapon_trial', type: 'choice_node', position: { x: 1306, y: 468, label: 'Armes' } },
      { id: 'guardian_threshold', type: 'checkpoint', position: { x: 1518, y: 556, label: 'Gardien' } },
      { id: 'guardian_core', type: 'boss', position: { x: 1704, y: 556, label: 'Root Guardian' } },
      { id: 'refuge_exit', type: 'goal', position: { x: 2240, y: 548, label: 'Sortie' } },
    ],
  };
}

function buildSceneAssembly() {
  return {
    scene: 'level_01',
    universe_lock: {
      mood: 'fungal dark fantasy',
      palette: ['#16131f', '#2a1d34', '#5a3a72', '#9e4f5c', '#5ec7ef', '#f0d9a6'],
      references: [
        '01_inputs/references/level_test_01_board.png',
        '01_inputs/references/level_test_01_alt_board.png',
        '01_inputs/references/sporale_cliffs_board.png',
        '01_inputs/references/boss_guardian_board.png',
        '01_inputs/references/enemy_family_board.png',
      ],
    },
    layers: [
      { id: 'background_far', source: '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_far.png', parallax: 0.18, purpose: 'far fungal skyline' },
      { id: 'background_mid', source: '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_mid.png', parallax: 0.42, purpose: 'ruins and battlefield silhouettes' },
      { id: 'awakening_module', source: '03_assets/environments/level_01/background_modules/awakening_module.png', parallax: 0.78, zone: 'awakening' },
      { id: 'descent_module', source: '03_assets/environments/level_01/background_modules/descent_module.png', parallax: 0.84, zone: 'descent' },
      { id: 'weapon_trial_module', source: '03_assets/environments/level_01/background_modules/weapon_trial_module.png', parallax: 0.9, zone: 'weapon_trial' },
      { id: 'final_altar_module', source: '03_assets/environments/level_01/background_modules/final_altar_module.png', parallax: 0.96, zone: 'boss_arena' },
      { id: 'playfield', source: '03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png', parallax: 1, purpose: 'runtime playfield paintover' },
      { id: 'foreground_fx', source: '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/foreground_glow.png', parallax: 1.16, purpose: 'lamps, spores, magical accents' },
    ],
    actor_bindings: {
      hero: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json',
      enemies: '03_assets/characters/enemy__sporeling-family/06_exports/enemy_runtime_manifest.json',
      enemies_hd: '03_assets/characters/enemy__sporeling-family/06_exports/sporeling_hd_runtime_manifest.json',
      boss: '03_assets/characters/boss__root-guardian-boss/06_exports/boss_runtime_manifest.json',
      boss_hd: '03_assets/characters/boss__root-guardian-boss/06_exports/root_guardian_hd_runtime_manifest.json',
      environment: '03_assets/environments/level_01/first_level_environment_manifest.json',
    },
    prop_bindings: {
      weapons: '03_assets/props/prop__weapon-altar-and-checkpoints/pipeline.contract.json',
      fx: '03_assets/fx/fx__spore-combat-pack/pipeline.contract.json',
      audio: '03_assets/audio/audio__origin-tree-sound-pack/pipeline.contract.json',
    },
    anchors: [
      { id: 'hero_spawn', x: 96, y: 560, type: 'spawn' },
      { id: 'checkpoint_tree', x: 104, y: 556, type: 'checkpoint' },
      { id: 'weapon_choice_blue', x: 1212, y: 458, type: 'weapon_altar', weapon: 'epee_longue' },
      { id: 'weapon_choice_gold', x: 1364, y: 458, type: 'weapon_altar', weapon: 'marteau_sporeal' },
      { id: 'boss_center', x: 1704, y: 556, type: 'boss_anchor' },
      { id: 'refuge_gate', x: 2240, y: 548, type: 'goal' },
    ],
  };
}

function buildInteractionSchema() {
  return {
    checked_at: new Date().toISOString(),
    board_modes: ['zone_composition', 'trigger_wiring', 'spawn_balance', 'audio_fx_pass', 'story_gating', 'weapon_choice'],
    drag_rules: {
      accepted_categories_by_zone: {
        awakening: ['spawn', 'checkpoint', 'tutorial', 'ambient_shift', 'story_flag'],
        descent: ['spawn', 'enemy', 'trigger', 'audio', 'fx', 'secret'],
        battlefield: ['spawn', 'enemy', 'trigger', 'audio', 'fx', 'hazard'],
        weapon_trial: ['spawn', 'weapon_altar', 'trigger', 'audio', 'fx', 'story_flag'],
        boss_arena: ['boss', 'enemy', 'trigger', 'audio', 'fx', 'hazard', 'save'],
        refuge_exit: ['save', 'story_flag', 'merchant', 'transition', 'ambient_shift'],
      },
      persistence: 'board layout may be authored visually, then exported into layout, scene-assembly, and runtime bundle',
      placement_rule: 'every draggable item must resolve to a manifest owner and a zone-safe category',
    },
    music_triggers: [
      { id: 'awakening_whisper', event: 'on_scene_start', zone: 'awakening', actions: ['play_bgm_awakening', 'set_ambience_blue'] },
      { id: 'battlefield_pressure', event: 'on_enter_zone', zone: 'battlefield', actions: ['crossfade_bgm_battlefield', 'raise_combat_bus', 'spawn_spore_haze_fx'] },
      { id: 'weapon_trial_focus', event: 'on_weapon_altar_focus', zone: 'weapon_trial', actions: ['duck_ambience', 'play_weapon_resonance', 'freeze_training_dummy'] },
      { id: 'guardian_phase_shift', event: 'on_boss_hp_threshold', zone: 'boss_arena', actions: ['transition_boss_music', 'change_lighting', 'spawn_phase_fx'] },
      { id: 'afterglow_release', event: 'on_guardian_defeat', zone: 'refuge_exit', actions: ['fade_boss_bus', 'play_afterglow_theme', 'unlock_exit_gate'] },
    ],
    weapon_choice_flow: {
      preconditions: ['player_reaches_weapon_trial', 'no_weapon_locked'],
      choices: ['epee_longue', 'marteau_sporeal'],
      effects: ['lock_selected_weapon', 'despawn_unused_altars', 'write_story_flag_weapon_chosen'],
    },
    boss_phase_flow: {
      boss_id: 'root_guardian_boss',
      phases: [
        { id: 'phase_01_sentinel', threshold: 0.7, unlocks: ['fouet_racinaire'] },
        { id: 'phase_02_mycelium', threshold: 0.3, unlocks: ['invocation_fongique', 'nuage_toxique'] },
        { id: 'phase_03_network_heart', threshold: 0.0, unlocks: ['racines_du_reseau', 'desperation_loop'] },
      ],
    },
    starter_layout: [
      { zone: 'awakening', item_id: 'hero_spawn', x: 0.19, y: 0.58 },
      { zone: 'awakening', item_id: 'checkpoint_tree', x: 0.29, y: 0.61 },
      { zone: 'descent', item_id: 'sporeling_pack', x: 0.38, y: 0.62 },
      { zone: 'battlefield', item_id: 'rampore_lane', x: 0.42, y: 0.66 },
      { zone: 'weapon_trial', item_id: 'weapon_altar_blue', x: 0.28, y: 0.54 },
      { zone: 'weapon_trial', item_id: 'weapon_altar_gold', x: 0.76, y: 0.54 },
      { zone: 'boss_arena', item_id: 'root_guardian_boss', x: 0.58, y: 0.66 },
      { zone: 'refuge_exit', item_id: 'exit_gate', x: 0.84, y: 0.57 },
    ],
  };
}

function buildAssetBindings() {
  return {
    level: 'level_01',
    title: 'Origin Tree - first playable level pack',
    board_lock: {
      core: [
        '01_inputs/references/level_test_01_board.png',
        '01_inputs/references/level_test_01_alt_board.png',
        '01_inputs/references/sporale_cliffs_board.png',
        '01_inputs/references/enemy_family_board.png',
        '01_inputs/references/sporeling_detail_board.png',
        '01_inputs/references/boss_guardian_board.png',
        '01_inputs/references/main_cast_board.png',
      ],
      promise: 'Keep fungal cathedral silhouettes, blue-purple glow accents, and red corruption contrast visible across every runtime surface.',
    },
    packs: {
      hero: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json',
      enemies: '03_assets/characters/enemy__sporeling-family/06_exports/enemy_runtime_manifest.json',
      enemies_hd: '03_assets/characters/enemy__sporeling-family/06_exports/sporeling_hd_runtime_manifest.json',
      boss: '03_assets/characters/boss__root-guardian-boss/06_exports/boss_runtime_manifest.json',
      boss_hd: '03_assets/characters/boss__root-guardian-boss/06_exports/root_guardian_hd_runtime_manifest.json',
      environment: '03_assets/environments/level_01/first_level_environment_manifest.json',
      base_environment: '03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json',
      props: '03_assets/props/prop__weapon-altar-and-checkpoints/pipeline.contract.json',
      fx: '03_assets/fx/fx__spore-combat-pack/pipeline.contract.json',
      audio: '03_assets/audio/audio__origin-tree-sound-pack/pipeline.contract.json',
    },
    characters: {
      hero: 'The Echo',
      ally: 'Myla',
      enemies: ['Sporeling', 'Rampore', 'Porteur Sporeal', 'Chevalier Fongique', 'Moussu Furieux'],
      boss: 'Root Guardian',
    },
    weapons: ['epee_longue', 'marteau_sporeal'],
    runtime_files: [
      '04_scenes/level_01/layout.json',
      '04_scenes/level_01/scene-assembly.json',
      '04_scenes/level_01/encounters.json',
      '04_scenes/level_01/interaction-schema.json',
      '05_runtime/config/level-01-runtime-bundle.json',
      '05_runtime/gdl/echoes.preview.gdl.json',
    ],
  };
}

function buildRuntimeBundle() {
  return {
    level: 'level_01',
    scene_files: {
      layout: '04_scenes/level_01/layout.json',
      assembly: '04_scenes/level_01/scene-assembly.json',
      encounters: '04_scenes/level_01/encounters.json',
      interactions: '04_scenes/level_01/interaction-schema.json',
      wireframe: '04_scenes/level_01/wireframe-map.json',
      assets: '04_scenes/level_01/asset-bindings.json',
    },
    runtime_packs: {
      hero: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json',
      enemies: '03_assets/characters/enemy__sporeling-family/06_exports/enemy_runtime_manifest.json',
      boss: '03_assets/characters/boss__root-guardian-boss/06_exports/boss_runtime_manifest.json',
      environment: '03_assets/environments/level_01/first_level_environment_manifest.json',
    },
    production_overrides: {
      enemy_preview_atlas: '03_assets/characters/enemy__sporeling-family/06_exports/sporeling_hd_pose_atlas.png',
      enemy_preview_manifest: '03_assets/characters/enemy__sporeling-family/06_exports/sporeling_hd_pose_atlas.json',
      boss_preview_atlas: '03_assets/characters/boss__root-guardian-boss/06_exports/root_guardian_hd_phase_atlas.png',
      boss_preview_manifest: '03_assets/characters/boss__root-guardian-boss/06_exports/root_guardian_hd_phase_atlas.json',
    },
    audio_states: ['awakening_whisper', 'ruins_tension', 'battlefield_pressure', 'armory_choice', 'guardian_boss', 'afterglow'],
    fx_states: ['spore_haze', 'weapon_resonance', 'guardian_root_slam', 'refuge_afterglow'],
    shipping_notes: ['Built for mobile-friendly 2D runtime first', '2.5D dressing can layer on top of this pack later without changing the gameplay map'],
  };
}

function buildRegistryPack() {
  return {
    id: 'level_01_assembly_pack',
    title: 'Origin Tree first level assembly pack',
    theme: 'fungal dark fantasy platformer',
    required_packs: [
      '03_assets/characters/hero__the-echo-main-hero',
      '03_assets/characters/enemy__sporeling-family',
      '03_assets/characters/boss__root-guardian-boss',
      '03_assets/environments/environment__origin-tree-level-kit',
      '03_assets/environments/level_01',
      '03_assets/props/prop__weapon-altar-and-checkpoints',
      '03_assets/audio/audio__origin-tree-sound-pack',
      '03_assets/fx/fx__spore-combat-pack',
    ],
    playable_flow: ['awakening', 'descent', 'battlefield', 'weapon_trial', 'boss_arena', 'refuge_exit'],
    locked_to_boards: [
      'world_map_board',
      'boss_guardian_board',
      'enemy_family_board',
      'sporeling_detail_board',
      'tutorial_overview_board',
      'level_test_01_board',
      'level_test_01_alt_board',
      'sporale_cliffs_board',
      'main_cast_board',
    ],
  };
}

function buildCastRegistry() {
  return {
    hero: 'The Echo',
    allies: ['Myla', 'Tink', 'Lyra'],
    bosses: ['Root Guardian', 'The Cardinal'],
    enemies: ['Sporeling', 'Rampore', 'Porteur Sporeal', 'Chevalier Fongique', 'Moussu Furieux'],
    key_figures: ['Aldren', 'Lorien', 'Voran'],
    level_01_focus: {
      active_cast: ['The Echo', 'Myla', 'Root Guardian'],
      active_enemy_family: ['Sporeling', 'Rampore', 'Porteur Sporeal', 'Chevalier Fongique', 'Moussu Furieux'],
      weapon_trial: ['epee_longue', 'marteau_sporeal'],
    },
  };
}

function buildNotes() {
  return `# level_01

This playable slice now follows the full first-level arc locked by the supplied Echoes boards:

- awakening under the Origin Tree
- descent through suspended ruins
- battlefield pressure with mixed enemy roles
- weapon test and irreversible choice
- Root Guardian arena
- refuge and exit gate

Visual rules kept from the boards:

- dark fungal cathedral silhouettes stay dominant
- blue and cyan spores stay readable against deep violets
- corruption reds only peak around the altar and boss flow
- every gameplay zone keeps a strong horizon line for mobile readability

Runtime notes:

- geometry is still simplified for playability
- environment modules remain board-derived references, not final paintovers
- enemy and boss packs are now bound into the level through dedicated runtime manifests
`;
}

function buildGdlScene(layout, integratedManifest = null) {
  return buildEchoesSceneGdl(layout, integratedManifest);
}

export async function buildScenePack() {
  const layout = buildLayout();
  const encounters = buildEncounters();
  const wireframeMap = buildWireframeMap();
  const sceneAssembly = buildSceneAssembly();
  const interactionSchema = buildInteractionSchema();
  const assetBindings = buildAssetBindings();
  const runtimeBundle = buildRuntimeBundle();
  const registryPack = buildRegistryPack();
  const castRegistry = buildCastRegistry();

  await writeJson(join(LEVEL_SCENE_ROOT, 'layout.json'), layout);
  await writeJson(join(LEVEL_SCENE_ROOT, 'encounters.json'), encounters);
  await writeJson(join(LEVEL_SCENE_ROOT, 'wireframe-map.json'), wireframeMap);
  await writeJson(join(LEVEL_SCENE_ROOT, 'scene-assembly.json'), sceneAssembly);
  await writeJson(join(LEVEL_SCENE_ROOT, 'interaction-schema.json'), interactionSchema);
  await writeJson(join(LEVEL_SCENE_ROOT, 'asset-bindings.json'), assetBindings);
  await writeText(join(LEVEL_SCENE_ROOT, 'notes.md'), buildNotes());

  await writeJson(join(RUNTIME_CONFIG_ROOT, 'level-01-runtime-bundle.json'), runtimeBundle);
  await writeJson(join(REGISTRY_ROOT, 'level-01-assembly-pack.json'), registryPack);
  await writeJson(join(REGISTRY_ROOT, 'cast.json'), castRegistry);

  const gdl = await readJson(GDL_PATH);
  gdl.meta = { ...(gdl.meta ?? {}), version: '0.4.0', dimension: '2.5d' };
  let integratedManifest = null;
  try {
    integratedManifest = await readJson(join(WORKSPACE_ROOT, '03_assets', 'integrated', 'integrated-manifest.json'));
  } catch {
    /* manifest intégré optionnel au premier seed */
  }
  gdl.scenes = [buildGdlScene(layout, integratedManifest)];
  if (gdl.entities?.length) {
    gdl.entities = gdl.entities.map((e) =>
      e.id === 'player' ? { ...e, depth: { plane: 'ground', feet_offset: 0.92 } } : e,
    );
  } else {
    gdl.entities = [{ id: 'player', type: 'character', depth: { plane: 'ground', feet_offset: 0.92 }, components: [] }];
  }
  gdl.systems = [...new Set([...(gdl.systems ?? []), 'camera_follow'])];
  await writeJson(GDL_PATH, gdl);

  return {
    layout,
    encounters,
    wireframeMap,
    sceneAssembly,
    interactionSchema,
    assetBindings,
    runtimeBundle,
  };
}
