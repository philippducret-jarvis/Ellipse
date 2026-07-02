export function buildFoundationData({ checkedAt, layout, encounters }) {
  const dimensionStrategy = {
    checked_at: checkedAt,
    dimension_order: [
      {
        id: '2d_primary',
        label: '2D HD mobile-first',
        priority: 1,
        objective: 'Ship a readable, modular, performant game on mobile and web with layered 2D assets.',
        foundations: ['sprite atlases', 'cutout rigs', 'json collision', 'parallax layers', 'gesture-friendly menus'],
        reuse_for_next_stage: ['camera rules', 'story graph', 'menu tree', 'audio states', 'fx presets'],
      },
      {
        id: '2_5d_secondary',
        label: '2.5D staged depth',
        priority: 2,
        objective: 'Add depth, faux-volume, and premium staging without replacing the 2D content model.',
        foundations: ['billboard actors', 'depth-sorted props', 'volumetric fx planes', 'camera rails', 'hybrid light cards'],
        depends_on: ['2d_primary'],
      },
      {
        id: '3d_deferred',
        label: '3D deferred branch',
        priority: 3,
        objective: 'Enable selected remote-generated or premium 3D scenes later, while preserving the same design system.',
        foundations: ['remote gpu jobs', 'proxy meshes', 'material manifests', 'same story/audio/menu stack'],
        depends_on: ['2d_primary', '2_5d_secondary'],
      },
    ],
  };

  const designStrata = {
    checked_at: checkedAt,
    doctrine: {
      title: 'Layer-first game construction',
      core_idea:
        'The game is built by stacked strata instead of a single monolithic scene file. Each stratum is editable, traceable, and promotable independently.',
      rules: [
        'Every player-facing feature belongs to a named stratum.',
        'A stratum can depend on lower layers, never silently replace them.',
        'Agents must write manifests and handoffs, not just final media.',
      ],
    },
    strata: [
      { id: 'brief', order: 1, outcome: 'vision, pillars, constraints, target audience' },
      { id: 'wireframe', order: 2, outcome: 'play beats, pathing, anchors, interaction map' },
      { id: 'mechanics', order: 3, outcome: 'movement, combat, progression, verbs, fail states' },
      { id: 'scene_assembly', order: 4, outcome: 'asset placement, zone themes, spawn logic, camera logic' },
      { id: 'narrative', order: 5, outcome: 'story spine, dialog triggers, codex, world-state changes' },
      { id: 'audio', order: 6, outcome: 'music states, stingers, sfx families, ambient beds' },
      { id: 'fx_hd', order: 7, outcome: 'glow, spores, impacts, depth haze, UI feedback' },
      { id: 'ui_menu', order: 8, outcome: 'menus, onboarding, options, save/load, accessibility' },
      { id: 'runtime', order: 9, outcome: 'system toggles, presets, input rules, build targets' },
      { id: 'qa_release', order: 10, outcome: 'gates, checklists, telemetry, build validation' },
    ],
  };

  const wireframeBlueprint = {
    checked_at: checkedAt,
    game_mode: 'mobile action exploration',
    scene_language: {
      flow: ['wake', 'orient', 'test input', 'survive', 'choose', 'leave'],
      verbs: ['move', 'jump', 'dash_later', 'light_attack', 'interact', 'inspect', 'equip', 'rest'],
      readability: ['one primary threat at a time early', 'bright interactables', 'clear return loops', 'combat pockets separated from platform teaching'],
    },
    level_01_wireframe: {
      world_size: { width: layout.width, height: layout.height },
      spawn: layout.spawn,
      critical_path: layout.zones.map((zone) => ({
        id: zone.id,
        label: zone.label,
        x: zone.x,
        width: zone.w,
        beat: encounters.beats.find((beat) => beat.zone === zone.id)?.goal ?? 'exploration',
      })),
      anchors: [
        { id: 'awakening_gate', type: 'checkpoint', position: layout.checkpoints?.[0] ?? null },
        { id: 'weapon_trial', type: 'choice_node', position: layout.checkpoints?.[1] ?? null },
        { id: 'exit_gate', type: 'goal', position: layout.goal },
      ],
    },
  };

  const cameraLanguage = {
    checked_at: checkedAt,
    primary_mode: 'side_view_follow',
    fallback_modes: ['boss_focus', 'choice_altar_focus', 'dialogue_portrait', '2_5d_depth_pan'],
    rules: [
      'Camera follows the hero with a forward look-ahead toward movement direction.',
      'Camera recenters vertically only when the player commits to a jump or a fall.',
      'Boss introduction temporarily overrides follow to frame scale and threat.',
      'Menu and story overlays pause gameplay but preserve scene atmosphere behind them.',
    ],
    values: {
      dead_zone: { x: 0.26, y: 0.18 },
      look_ahead_px: 140,
      vertical_soft_follow_px: 96,
      boss_zoom: 0.9,
      portrait_overlay_blur: 8,
    },
  };

  const menuArchitecture = {
    checked_at: checkedAt,
    root_menu: {
      id: 'main_menu',
      entries: [
        { id: 'new_game', label: 'Nouvelle partie', route: 'flow/new_game' },
        { id: 'continue', label: 'Continuer', route: 'flow/continue' },
        { id: 'load', label: 'Charger', route: 'flow/load' },
        { id: 'weapons_codex', label: 'Armes et codex', route: 'flow/codex' },
        { id: 'settings', label: 'Options', route: 'flow/settings' },
        { id: 'accessibility', label: 'Accessibilite', route: 'flow/accessibility' },
        { id: 'credits', label: 'Credits', route: 'flow/credits' },
        { id: 'quit', label: 'Quitter', route: 'flow/quit' },
      ],
    },
    subflows: {
      new_game: ['difficulty', 'input_hint', 'story_intro'],
      settings: ['audio', 'video', 'controls', 'ui_scale', 'language'],
      accessibility: ['subtitle_size', 'flash_reduction', 'contrast_boost', 'hold_to_toggle', 'simplified_inputs'],
      codex: ['characters', 'weapons', 'biomes', 'memories', 'bosses'],
    },
    runtime_policies: [
      'Menus are data-driven and can be re-skinned without rewriting the tree.',
      'Story, codex, and options all use the same panel grammar.',
      'Menu backgrounds can pull live scene layers or key art based on context.',
    ],
  };

  const storyArchitecture = {
    checked_at: checkedAt,
    narrative_kernel: {
      hero: 'The Echo',
      mystery: 'The network cannot fully read the hero.',
      promise: 'Every mushroom region hides memory, danger, and one irreversible choice.',
    },
    layer_model: [
      { id: 'spine', purpose: 'Main beats that define progression' },
      { id: 'zone_story', purpose: 'Atmosphere and local lore per scene zone' },
      { id: 'memory_fragments', purpose: 'Optional pickups that deepen the world' },
      { id: 'npc_dialogue', purpose: 'Guidance, emotion, and world-state hints' },
      { id: 'codex', purpose: 'Persistent knowledge unlocked by discovery' },
    ],
    level_01_story_graph: {
      nodes: [
        { id: 'wake_under_tree', type: 'spine', unlocks: ['movement_hint', 'myla_signal'] },
        { id: 'battlefield_truth', type: 'zone_story', unlocks: ['weapon_trial_intro'] },
        { id: 'choose_one_weapon', type: 'spine', unlocks: ['exit_gate'] },
        { id: 'leave_the_root', type: 'spine', unlocks: ['next_region'] },
      ],
      delivery_modes: ['caption_card', 'ambient_line', 'npc_popup', 'codex_unlock', 'altar_memory_flash'],
    },
  };

  const gameFeelStack = {
    checked_at: checkedAt,
    principles: [
      'Input must feel immediate before visuals become elaborate.',
      'Every jump, hit, pickup, and menu selection must have a visual and audio response.',
      'Motion clarity is more important than effect density on mobile.',
    ],
    layers: {
      input: ['jump_buffer', 'coyote_time', 'input_queue_for_attack'],
      movement: ['acceleration_curve', 'landing_compression', 'cloak_follow'],
      combat: ['anticipation', 'hit_pause', 'directional_impact', 'hurt_flash'],
      reward: ['pickup_arc', 'spore_burst', 'codex_ping', 'weapon_choice_bloom'],
    },
  };

  const audioArchitecture = {
    checked_at: checkedAt,
    buses: ['master', 'music', 'ambient', 'ui', 'player', 'enemy', 'story', 'fx_magic'],
    music_states: [
      { id: 'root_awakening', mood: 'mystic, restrained, curious' },
      { id: 'ruins_tension', mood: 'low percussion, unease, discovery' },
      { id: 'weapon_trial', mood: 'ritual, charged, expectant' },
      { id: 'exit_release', mood: 'resolution with danger ahead' },
    ],
    sfx_families: {
      player: ['footstep_stone', 'jump', 'land', 'light_attack', 'hurt', 'heal'],
      enemies: ['sporeling_hop', 'rampore_charge', 'fungal_guard_slash'],
      environment: ['lamp_hum', 'spore_drift', 'distant_water', 'root_creak'],
      ui: ['menu_move', 'menu_confirm', 'codex_unlock', 'weapon_lock_in'],
    },
    implementation_rules: [
      'Every important mechanic gets at least one dry and one magical variant.',
      'Music transitions are state-driven, not hard-coded by map position alone.',
      'Ambient beds continue softly under pause and codex views unless story locks them out.',
    ],
  };

  const vfxHdStack = {
    checked_at: checkedAt,
    categories: {
      gameplay: ['attack_slash', 'hurt_flash', 'weapon_choice_rune', 'checkpoint_bloom'],
      biome: ['spore_drift', 'fog_plane', 'lamp_flicker', 'distant_motes'],
      story: ['memory_glitch', 'network_corruption', 'altar_reveal'],
      ui: ['focus_glow', 'selection_trail', 'save_confirm', 'codex_unlock_ring'],
    },
    policies: [
      'HD effects are layered and scalable by device tier.',
      'Gameplay readability effects cannot be disabled by decorative presets.',
      '2.5D and 3D branches reuse the same fx naming and event triggers.',
    ],
    device_tiers: {
      low: ['reduced particles', 'baked glows', 'static haze'],
      medium: ['animated glows', 'selective particles', 'screen tint pulses'],
      premium: ['depth haze planes', 'multi-layer spores', 'additive impact stacks'],
    },
  };

  const sceneAssembly = {
    checked_at: checkedAt,
    scene_id: 'level_01',
    assembly_layers: [
      { id: 'background_far', source: 'environment__origin-tree-level-kit/03_cleanup/parallax_far.png', parallax: 0.2 },
      { id: 'background_mid', source: 'environment__origin-tree-level-kit/03_cleanup/parallax_mid.png', parallax: 0.45 },
      { id: 'playfield', source: 'environment__origin-tree-level-kit/02_cutouts/playfield_crop.png', parallax: 1 },
      { id: 'foreground_fx', source: 'environment__origin-tree-level-kit/03_cleanup/foreground_glow.png', parallax: 1.2 },
    ],
    gameplay_anchors: {
      spawn: layout.spawn,
      checkpoints: layout.checkpoints ?? [],
      hazards: layout.hazards ?? [],
      goal: layout.goal ?? null,
    },
    asset_binding_rules: [
      'Decor layers never own collision.',
      'Character spawn, enemies, props, and story triggers are separate placement strata.',
      'A zone can swap ambience, music, and lighting without rebuilding the whole scene.',
    ],
  };

  const runtimeSystems = {
    checked_at: checkedAt,
    runtime: 'ellipse_web_2d',
    systems: [
      { id: 'input', critical: true },
      { id: 'platformer_physics', critical: true },
      { id: 'tile_collision', critical: true },
      { id: 'animation_runtime', critical: true },
      { id: 'camera_follow', critical: true },
      { id: 'story_trigger_runtime', critical: true },
      { id: 'menu_router', critical: true },
      { id: 'audio_state_machine', critical: true },
      { id: 'vfx_event_dispatch', critical: true },
      { id: 'save_profile_runtime', critical: false },
      { id: 'codex_unlock_runtime', critical: false },
      { id: '2_5d_depth_presenter', critical: false },
    ],
    loading_order: ['config', 'scene_layout', 'asset_manifests', 'audio_banks', 'fx_presets', 'story_graph'],
  };

  const mobilePresets = {
    checked_at: checkedAt,
    targets: [
      { id: 'mobile_low', render_scale: 0.8, particles: 'low', fx_profile: 'baked', animation_density: 'reduced', comments: 'safest default for weak hardware' },
      { id: 'mobile_mid', render_scale: 1, particles: 'medium', fx_profile: 'hybrid', animation_density: 'standard', comments: 'main shipping target' },
      { id: 'desktop_preview', render_scale: 1, particles: 'high', fx_profile: 'full_preview', animation_density: 'debug_plus', comments: 'used for showcasing and iteration' },
    ],
  };

  const runtimeMenuConfig = {
    checked_at: checkedAt,
    menus: menuArchitecture,
    panels: {
      default_transition_ms: 220,
      background_mode: 'scene_or_keyart',
      input_model: 'pad_touch_keyboard',
    },
  };

  const runtimeStoryGraph = {
    checked_at: checkedAt,
    graph: storyArchitecture.level_01_story_graph,
    triggers: [
      { id: 'zone_awakening_enter', type: 'zone_enter', zone: 'awakening', fires: ['wake_under_tree'] },
      { id: 'pickup_memory_shard', type: 'collectible', collectible: 'memory_shard', fires: ['battlefield_truth'] },
      { id: 'weapon_choice_commit', type: 'interaction', node: 'weapon_trial', fires: ['choose_one_weapon'] },
      { id: 'goal_reached', type: 'goal', fires: ['leave_the_root'] },
    ],
  };

  const audioBanks = {
    checked_at: checkedAt,
    architecture: audioArchitecture,
    sample_placeholders: {
      music: ['music_root_awakening.ogg', 'music_ruins_tension.ogg', 'music_weapon_trial.ogg', 'music_exit_release.ogg'],
      ui: ['ui_move.wav', 'ui_confirm.wav', 'ui_back.wav'],
      player: ['player_jump.wav', 'player_land.wav', 'player_attack_light.wav'],
      environment: ['ambient_spores_loop.ogg', 'ambient_lamp_loop.ogg'],
    },
  };

  const fxPresets = {
    checked_at: checkedAt,
    stack: vfxHdStack,
    named_presets: [
      { id: 'checkpoint_bloom', blend: 'additive', color: '#9b6dff', duration_ms: 680 },
      { id: 'weapon_choice_rune', blend: 'screen', color: '#f0d9a6', duration_ms: 1200 },
      { id: 'spore_drift_soft', blend: 'alpha', color: '#7de3ff', duration_ms: 3000 },
      { id: 'memory_glitch_red', blend: 'additive', color: '#c63a41', duration_ms: 540 },
    ],
  };

  const productionGates = {
    checked_at: checkedAt,
    gates: [
      { id: 'wireframe_clear', checks: ['critical path readable', 'spawn -> goal solvable', 'anchors named'] },
      { id: 'hero_runtime_ready', checks: ['cutout qa passes', 'rig spec exists', 'motion manifest exists'] },
      { id: 'environment_runtime_ready', checks: ['playfield crop exists', 'parallax layers exist', 'collision stays data-authored'] },
      { id: 'menu_story_audio_ready', checks: ['menu tree exists', 'story graph exists', 'audio states exist'] },
      { id: 'mobile_ship_gate', checks: ['device preset chosen', 'performance budget checked', 'effects tier mapped'] },
    ],
  };

  const agentHandoffs = {
    checked_at: checkedAt,
    handoffs: [
      { from: 'producer', to: 'game_design', deliver: ['pillars', 'dimension priority', 'ship order'] },
      { from: 'game_design', to: 'level_design', deliver: ['verbs', 'encounter pacing', 'risk/reward structure'] },
      { from: 'art_direction', to: 'asset_direction', deliver: ['style locks', 'readability rules', 'effect hierarchy'] },
      { from: 'asset_direction', to: 'animation', deliver: ['parts', 'rig scope', 'pose targets'] },
      { from: 'narrative', to: 'gameplay_programming', deliver: ['trigger graph', 'story payloads', 'codex unlock logic'] },
      { from: 'audio', to: 'build_release', deliver: ['bank names', 'state machine ids', 'device compression profile'] },
      { from: 'qa', to: 'build_release', deliver: ['release blockers', 'ship-ready gates', 'performance notes'] },
    ],
  };

  return {
    dimensionStrategy,
    designStrata,
    wireframeBlueprint,
    cameraLanguage,
    menuArchitecture,
    storyArchitecture,
    gameFeelStack,
    audioArchitecture,
    vfxHdStack,
    sceneAssembly,
    runtimeSystems,
    mobilePresets,
    runtimeMenuConfig,
    runtimeStoryGraph,
    audioBanks,
    fxPresets,
    productionGates,
    agentHandoffs,
  };
}
