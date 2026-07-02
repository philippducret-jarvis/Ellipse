export function buildOperatingData({ checkedAt }) {
  const progressionEconomy = {
    checked_at: checkedAt,
    pillars: ['mastery through exploration', 'choice permanence', 'reward clarity', 'low-friction mobile readability'],
    player_stats: [
      { id: 'health', base: 100, growth: 'hearts_and_relics' },
      { id: 'stamina', base: 60, growth: 'gear_and_blessings' },
      { id: 'focus', base: 40, growth: 'memory_unlocked' },
      { id: 'spore_resistance', base: 0, growth: 'biome_progression' },
    ],
    currencies: [
      { id: 'residual_spores', use: ['merchant', 'basic_upgrade', 'consumable_craft'] },
      { id: 'echo_shards', use: ['weapon_unfold', 'skill_branch_unlock'] },
      { id: 'memory_threads', use: ['codex_restore', 'lore_gate', 'story_choice'] },
    ],
    reward_streams: [
      { id: 'combat_clear', grants: ['residual_spores', 'minor_drop'] },
      { id: 'secret_found', grants: ['memory_threads', 'codex_unlock'] },
      { id: 'boss_phase_break', grants: ['echo_shards', 'healing_window'] },
      { id: 'weapon_choice_commit', grants: ['weapon_branch', 'unique_stance'] },
    ],
    progression_tracks: [
      { id: 'weapon_mastery', nodes: ['basic_combo', 'charged_release', 'mobility_synergy', 'echo_finisher'] },
      { id: 'survival', nodes: ['extra_heal', 'spore_guard', 'checkpoint_bonus'] },
      { id: 'exploration', nodes: ['secret_sense', 'double_jump', 'spectral_anchor'] },
    ],
  };

  const saveProfileSchema = {
    checked_at: checkedAt,
    version: 1,
    slots: 3,
    schema: {
      profile: ['slot_id', 'difficulty', 'playtime_seconds', 'last_scene_id', 'last_checkpoint_id', 'created_at', 'updated_at'],
      progression_flags: ['weapon_selected', 'quest_states', 'codex_entries', 'world_state_tags', 'boss_phase_seen'],
      player_state: ['health_current', 'health_max', 'inventory', 'equipped_weapon', 'abilities_unlocked'],
      accessibility: ['subtitle_size', 'contrast_mode', 'flash_reduction', 'input_assist', 'hold_toggle_mode'],
      meta: ['build_channel', 'save_version', 'migration_notes'],
    },
    policies: [
      'Autosave only at explicit safe anchors or after irreversible choices.',
      'Temporary combat state is never saved in a broken configuration.',
      'Accessibility preferences persist account-wide when possible.',
    ],
  };

  const accessibilityPresets = {
    checked_at: checkedAt,
    presets: [
      { id: 'default_readable', label: 'Default readable', settings: { subtitle_size: 'medium', flash_reduction: false, contrast_boost: false, hold_to_interact: false, aim_assist: 'light' } },
      { id: 'comfort_focus', label: 'Comfort focus', settings: { subtitle_size: 'large', flash_reduction: true, contrast_boost: true, hold_to_interact: true, aim_assist: 'medium' } },
      { id: 'motor_assist', label: 'Motor assist', settings: { subtitle_size: 'large', flash_reduction: true, contrast_boost: true, hold_to_interact: true, aim_assist: 'strong', input_buffer_bonus_ms: 120 } },
    ],
    ui_rules: ['Every major interaction must be rebindable or assistable.', 'Combat readability cannot depend on color alone.'],
  };

  const localizationPlan = {
    checked_at: checkedAt,
    source_language: 'fr',
    launch_languages: ['fr', 'en'],
    expansion_languages: ['de', 'es', 'ja'],
    content_domains: ['ui', 'dialogue', 'codex', 'quests', 'combat_hints', 'storefront_metadata'],
    formatting_rules: [
      'All player-facing strings use stable ids.',
      'Line breaks for codex and tutorials are previewable in workspace exports.',
      'Menu labels must fit mobile width constraints.',
    ],
  };

  const questGraph = {
    checked_at: checkedAt,
    arcs: [
      { id: 'origin_awakening', label: 'Awakening at the Origin Tree', beats: ['wake_under_tree', 'reach_ruins', 'learn_checkpoint', 'commit_weapon', 'leave_root'] },
      { id: 'myla_guidance', label: 'Myla guidance', beats: ['first_signal', 'warning_about_network', 'weapon_whisper', 'future_promise'] },
    ],
    quest_states: ['locked', 'active', 'optional', 'resolved', 'failed_branch'],
  };

  const worldStateMachine = {
    checked_at: checkedAt,
    axes: [
      { id: 'contamination', range: [0, 100], effects: ['palette_shift', 'enemy_aggression', 'music_tension', 'vfx_density'] },
      { id: 'memory_restored', range: [0, 100], effects: ['codex_detail', 'npc_truthfulness', 'safe_routes'] },
      { id: 'network_awareness', range: [0, 100], effects: ['ambush_frequency', 'secret_reactivity', 'boss_mutation'] },
    ],
    region_hooks: [
      { region: 'root_origin', primary_axis: 'memory_restored' },
      { region: 'sporale_cliffs', primary_axis: 'contamination' },
      { region: 'cathedral_below', primary_axis: 'network_awareness' },
    ],
  };

  const buildTargets = {
    checked_at: checkedAt,
    channels: [
      { id: 'web_preview', purpose: 'workspace preview and design reviews', quality: 'high readability, debug enabled' },
      { id: 'mobile_alpha_low', purpose: 'weak hardware validation', quality: 'reduced particles, baked glows' },
      { id: 'mobile_alpha_mid', purpose: 'main gameplay milestone', quality: 'standard shipping profile' },
      { id: 'desktop_showcase', purpose: 'marketing and visual review', quality: 'full preview effects' },
    ],
    release_gates: ['perf_budget_ok', 'save_migration_ok', 'accessibility_checked', 'localized_ui_checked', 'telemetry_events_mapped'],
  };

  const telemetryPlan = {
    checked_at: checkedAt,
    events: [
      { id: 'session_start', purpose: 'retention and stability' },
      { id: 'checkpoint_reached', purpose: 'level pacing and fail heatmaps' },
      { id: 'death_cause', purpose: 'balance and readability' },
      { id: 'weapon_selected', purpose: 'branch popularity' },
      { id: 'secret_found', purpose: 'exploration density' },
      { id: 'accessibility_preset_enabled', purpose: 'support prioritization' },
    ],
    dashboards: ['onboarding funnel', 'combat pain points', 'weapon preference', 'device performance', 'drop-off zones'],
    privacy_rules: ['No personal content in telemetry payloads.', 'Use aggregate balancing signals only.'],
  };

  const gameOperatingModel = {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    progression: progressionEconomy,
    save_profile: saveProfileSchema,
    accessibility: accessibilityPresets,
    localization: localizationPlan,
    quests: questGraph,
    world_state: worldStateMachine,
    builds: buildTargets,
    telemetry: telemetryPlan,
  };

  return {
    progressionEconomy,
    saveProfileSchema,
    accessibilityPresets,
    localizationPlan,
    questGraph,
    worldStateMachine,
    buildTargets,
    telemetryPlan,
    gameOperatingModel,
  };
}
