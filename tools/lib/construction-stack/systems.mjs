export function buildSystemsData({ checkedAt, layout }) {
  const zoneIntentMap = {
    awakening: ['spawn', 'checkpoint', 'tutorial', 'ambient_shift'],
    ruins: ['platforming', 'secret', 'enemy_spawn', 'codex'],
    battlefield: ['combat', 'hazard', 'music_ramp', 'boss_intro'],
    weapon_trial: ['choice', 'altar', 'music_switch', 'ui_prompt'],
    exit: ['gate', 'save', 'story_flag', 'transition'],
  };

  const worldComposition = {
    checked_at: checkedAt,
    hierarchy: ['world', 'region', 'scene', 'zone', 'anchor'],
    worlds: [
      {
        id: 'mushroom_realm',
        label: 'Echoes of the Mushroom Realm',
        theme: 'dark fantasy fungal ruins',
        regions: [
          {
            id: 'root_origin',
            label: 'Arbre Originel',
            scenes: [
              {
                id: 'level_01',
                label: 'Test 01 - Arbre-Racine',
                board_file: '04_scenes/level_01/layout.json',
                assembly_file: '04_scenes/level_01/scene-assembly.json',
                zones: layout.zones.map((zone) => ({
                  id: zone.id,
                  label: zone.label,
                  x: zone.x,
                  width: zone.w,
                  accepted_categories: zoneIntentMap[zone.id] ?? ['spawn', 'enemy', 'trigger', 'audio', 'fx'],
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const addableElementsCatalog = {
    checked_at: checkedAt,
    categories: [
      {
        id: 'spawn',
        label: 'Spawn and progression',
        items: [
          { id: 'hero_spawn', label: 'Hero spawn', token: 'SPAWN', file: '05_runtime/gdl/echoes.preview.gdl.json', accepted_in: ['awakening', 'exit'], triggers: ['on_scene_enter', 'on_respawn'] },
          { id: 'checkpoint_tree', label: 'Checkpoint tree', token: 'CHECK', file: '04_scenes/level_01/layout.json', accepted_in: ['awakening', 'ruins', 'battlefield', 'exit'], triggers: ['on_touch_save', 'on_restore'] },
          { id: 'exit_gate', label: 'Exit gate', token: 'EXIT', file: '05_runtime/config/story-graph.json', accepted_in: ['exit'], triggers: ['on_goal_reached', 'on_story_flag'] },
        ],
      },
      {
        id: 'enemy',
        label: 'Enemies and actors',
        items: [
          { id: 'sporeling_pack', label: 'Sporeling pack', token: 'ENEMY', file: '03_assets/registry/cast.json', accepted_in: ['ruins', 'battlefield'], triggers: ['on_zone_enter', 'on_wave_start'] },
          { id: 'fungal_knight', label: 'Fungal knight', token: 'ELITE', file: '03_assets/registry/cast.json', accepted_in: ['battlefield'], triggers: ['on_gate_lock', 'on_aggro'] },
          { id: 'myla_npc', label: 'Myla NPC', token: 'NPC', file: '02_design/specs/story-architecture.json', accepted_in: ['awakening', 'weapon_trial'], triggers: ['on_dialogue', 'on_story_unlock'] },
        ],
      },
      {
        id: 'world',
        label: 'World and movement',
        items: [
          { id: 'moving_platform', label: 'Moving platform', token: 'MOVE', file: '03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json', accepted_in: ['ruins', 'battlefield'], triggers: ['on_timer', 'on_switch'] },
          { id: 'secret_wall', label: 'Secret wall', token: 'SECRET', file: '04_scenes/level_01/scene-assembly.json', accepted_in: ['ruins', 'battlefield'], triggers: ['on_break', 'on_reveal'] },
          { id: 'weapon_altar', label: 'Weapon altar', token: 'ALTAR', file: '05_runtime/config/menu-config.json', accepted_in: ['weapon_trial'], triggers: ['on_interact', 'on_choice_commit'] },
        ],
      },
      {
        id: 'trigger',
        label: 'Logic and triggers',
        items: [
          { id: 'zone_trigger', label: 'Zone enter trigger', token: 'TRIG', file: '05_runtime/config/trigger-library.json', accepted_in: ['awakening', 'ruins', 'battlefield', 'weapon_trial', 'exit'], triggers: ['on_player_enter'] },
          { id: 'timer_trigger', label: 'Timer trigger', token: 'TIME', file: '05_runtime/config/trigger-library.json', accepted_in: ['battlefield', 'weapon_trial'], triggers: ['on_timer_elapsed'] },
          { id: 'boss_health_trigger', label: 'Boss health trigger', token: 'PHASE', file: '05_runtime/config/trigger-library.json', accepted_in: ['battlefield'], triggers: ['on_health_threshold'] },
        ],
      },
      {
        id: 'audio_fx',
        label: 'Audio and FX',
        items: [
          { id: 'music_state_switch', label: 'Music state switch', token: 'MUSIC', file: '05_runtime/config/audio-banks.json', accepted_in: ['awakening', 'ruins', 'battlefield', 'weapon_trial', 'exit'], triggers: ['on_zone_enter', 'on_boss_phase', 'on_choice_commit'] },
          { id: 'volume_ramp', label: 'Volume ramp', token: 'VOL', file: '05_runtime/config/audio-banks.json', accepted_in: ['battlefield', 'weapon_trial', 'exit'], triggers: ['on_tension', 'on_cutscene'] },
          { id: 'spore_burst_fx', label: 'Spore burst FX', token: 'FX', file: '05_runtime/config/fx-presets.json', accepted_in: ['ruins', 'battlefield', 'weapon_trial'], triggers: ['on_hit', 'on_pickup', 'on_reveal'] },
        ],
      },
      {
        id: 'story_ui',
        label: 'Story and UI',
        items: [
          { id: 'codex_unlock', label: 'Codex unlock', token: 'CODEX', file: '05_runtime/config/story-graph.json', accepted_in: ['ruins', 'battlefield', 'weapon_trial'], triggers: ['on_collectible', 'on_secret_found'] },
          { id: 'tutorial_hint', label: 'Tutorial hint', token: 'HINT', file: '05_runtime/config/menu-config.json', accepted_in: ['awakening', 'ruins'], triggers: ['on_first_input', 'on_fail_repeat'] },
          { id: 'choice_prompt', label: 'Choice prompt', token: 'CHOICE', file: '05_runtime/config/menu-config.json', accepted_in: ['weapon_trial'], triggers: ['on_altar_focus'] },
        ],
      },
    ],
  };

  const triggerLibrary = {
    checked_at: checkedAt,
    trigger_groups: [
      {
        id: 'zone_flow',
        label: 'Zone flow',
        templates: [
          { id: 'zone_enter_music_shift', event: 'on_player_enter_zone', condition: 'zone_id changes', actions: ['switch_music_state', 'blend_ambience', 'show_zone_title'], files: ['05_runtime/config/story-graph.json', '05_runtime/config/audio-banks.json', '05_runtime/config/menu-config.json'] },
          { id: 'checkpoint_restore', event: 'on_checkpoint_touch', condition: 'player is alive and checkpoint is inactive', actions: ['save_profile', 'play_checkpoint_bloom', 'set_respawn_anchor'], files: ['05_runtime/config/fx-presets.json', '05_runtime/config/runtime-systems.json'] },
        ],
      },
      {
        id: 'combat',
        label: 'Combat escalation',
        templates: [
          { id: 'boss_phase_shift', event: 'on_health_threshold', condition: 'boss hp <= 70 or <= 30', actions: ['tighten_camera', 'raise_music_intensity', 'spawn_wave', 'fire_corruption_fx'], files: ['05_runtime/config/audio-banks.json', '05_runtime/config/fx-presets.json', '05_runtime/config/runtime-systems.json'] },
          { id: 'trap_release', event: 'on_pressure_plate', condition: 'player or crate remains on plate', actions: ['open_door', 'lower_spikes', 'play_mechanical_sfx'], files: ['04_scenes/level_01/interaction-schema.json', '05_runtime/config/audio-banks.json'] },
        ],
      },
      {
        id: 'story_reward',
        label: 'Story and rewards',
        templates: [
          { id: 'memory_unlock', event: 'on_collectible_acquired', condition: 'collectible type = memory_shard', actions: ['unlock_codex_entry', 'play_story_whisper', 'emit_memory_glitch_fx'], files: ['05_runtime/config/story-graph.json', '05_runtime/config/audio-banks.json', '05_runtime/config/fx-presets.json'] },
          { id: 'weapon_commit', event: 'on_choice_commit', condition: 'one altar selected', actions: ['lock_selected_weapon', 'fade_other_altars', 'push_story_flag', 'play_choice_stinger'], files: ['05_runtime/config/menu-config.json', '05_runtime/config/story-graph.json', '05_runtime/config/audio-banks.json'] },
        ],
      },
    ],
  };

  const assetCallGraph = {
    checked_at: checkedAt,
    nodes: [
      { id: 'reference_images', label: 'Reference images', lane: 'source', file: '01_inputs/references/reference-index.json' },
      { id: 'asset_registry', label: 'Asset registry', lane: 'design', file: '03_assets/registry/assets.json' },
      { id: 'hero_pack', label: 'Hero runtime pack', lane: 'runtime', file: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json' },
      { id: 'environment_pack', label: 'Environment kit', lane: 'runtime', file: '03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json' },
      { id: 'scene_assembly', label: 'Scene assembly', lane: 'scene', file: '04_scenes/level_01/scene-assembly.json' },
      { id: 'trigger_library', label: 'Trigger library', lane: 'logic', file: '05_runtime/config/trigger-library.json' },
      { id: 'story_graph', label: 'Story graph', lane: 'logic', file: '05_runtime/config/story-graph.json' },
      { id: 'audio_banks', label: 'Audio banks', lane: 'feedback', file: '05_runtime/config/audio-banks.json' },
      { id: 'fx_presets', label: 'FX presets', lane: 'feedback', file: '05_runtime/config/fx-presets.json' },
      { id: 'preview_gdl', label: 'Preview GDL', lane: 'delivery', file: '05_runtime/gdl/echoes.preview.gdl.json' },
    ],
    edges: [
      { from: 'reference_images', to: 'asset_registry', label: 'classify and route' },
      { from: 'asset_registry', to: 'hero_pack', label: 'cutout, rig, animate' },
      { from: 'asset_registry', to: 'environment_pack', label: 'crop, split, layer' },
      { from: 'hero_pack', to: 'scene_assembly', label: 'bind hero atlas' },
      { from: 'environment_pack', to: 'scene_assembly', label: 'bind playfield and parallax' },
      { from: 'scene_assembly', to: 'trigger_library', label: 'attach emitters and anchors' },
      { from: 'trigger_library', to: 'story_graph', label: 'set progression flags' },
      { from: 'trigger_library', to: 'audio_banks', label: 'call music and stingers' },
      { from: 'trigger_library', to: 'fx_presets', label: 'call visual reactions' },
      { from: 'story_graph', to: 'preview_gdl', label: 'inject runtime story events' },
      { from: 'audio_banks', to: 'preview_gdl', label: 'mount audio states' },
      { from: 'fx_presets', to: 'preview_gdl', label: 'mount effect dispatch' },
    ],
  };

  const interactionSchema = {
    checked_at: checkedAt,
    board_modes: ['zone_composition', 'trigger_wiring', 'spawn_balance', 'audio_fx_pass'],
    drag_rules: {
      accepted_categories_by_zone: Object.fromEntries(
        worldComposition.worlds[0].regions[0].scenes[0].zones.map((zone) => [zone.id, zone.accepted_categories]),
      ),
      persistence: 'local board layout can be persisted in browser localStorage before being exported to manifests',
      placement_rule: 'board items stay data-driven and must reference a manifest owner file',
    },
    starter_layout: [
      { zone: 'awakening', item_id: 'hero_spawn', x: 0.2, y: 0.4 },
      { zone: 'awakening', item_id: 'checkpoint_tree', x: 0.46, y: 0.52 },
      { zone: 'ruins', item_id: 'moving_platform', x: 0.62, y: 0.38 },
      { zone: 'battlefield', item_id: 'sporeling_pack', x: 0.3, y: 0.56 },
      { zone: 'weapon_trial', item_id: 'weapon_altar', x: 0.5, y: 0.42 },
      { zone: 'weapon_trial', item_id: 'choice_prompt', x: 0.72, y: 0.28 },
      { zone: 'exit', item_id: 'exit_gate', x: 0.74, y: 0.46 },
    ],
  };

  const systemsBoard = {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    palette: addableElementsCatalog,
    worlds: worldComposition,
    triggers: triggerLibrary,
    asset_calls: assetCallGraph,
    interactions: interactionSchema,
    recipes: [
      { id: 'combat_alarm', label: 'Combat alarm recipe', steps: ['zone_enter_trigger', 'lock_gate', 'raise_music_state', 'spawn_enemy_wave', 'emit_spore_burst_fx'], files: ['05_runtime/config/trigger-library.json', '05_runtime/config/audio-banks.json', '05_runtime/config/fx-presets.json'] },
      { id: 'choice_altar_recipe', label: 'Weapon choice recipe', steps: ['altar_focus', 'show_choice_prompt', 'await_confirm', 'lock_selected_weapon', 'fade_other_altars'], files: ['05_runtime/config/menu-config.json', '05_runtime/config/story-graph.json'] },
      { id: 'secret_reward_recipe', label: 'Secret reward recipe', steps: ['break_secret_wall', 'spawn_memory_pickup', 'unlock_codex', 'play_story_whisper'], files: ['04_scenes/level_01/interaction-schema.json', '05_runtime/config/story-graph.json', '05_runtime/config/audio-banks.json'] },
    ],
  };

  return {
    zoneIntentMap,
    worldComposition,
    addableElementsCatalog,
    triggerLibrary,
    assetCallGraph,
    interactionSchema,
    systemsBoard,
  };
}
