function buildModel(id, url, use) {
  return { id, url, use };
}

export function folderGroupForRole(role) {
  if (['hero', 'companion', 'npc', 'enemy', 'monster', 'boss', 'ally', 'guide', 'merchant', 'summon', 'mount'].includes(role)) return 'characters';
  if (['weapon', 'armor', 'relic', 'pickup', 'collectible', 'checkpoint', 'hazard', 'trap', 'door', 'portal', 'altar', 'prop'].includes(role)) return 'props';
  if (['environment', 'biome', 'background', 'tileset'].includes(role)) return 'environments';
  if (role === 'ui') return 'ui';
  if (['music', 'sfx', 'voice'].includes(role)) return 'audio';
  if (role === 'fx') return 'fx';
  return 'misc';
}

export function familyIdForRole(role) {
  const map = {
    hero: 'heroes',
    companion: 'companions',
    ally: 'allies',
    guide: 'guides',
    merchant: 'merchants',
    npc: 'npcs',
    enemy: 'enemies',
    monster: 'monsters',
    boss: 'bosses',
    summon: 'summons',
    mount: 'mounts',
    weapon: 'weapons',
    armor: 'armor',
    relic: 'relics',
    pickup: 'pickups',
    collectible: 'collectibles',
    checkpoint: 'checkpoints',
    hazard: 'hazards',
    trap: 'traps',
    door: 'doors',
    portal: 'portals',
    altar: 'altars',
    prop: 'interactive_props',
    environment: 'biome_kits',
    biome: 'biome_kits',
    background: 'backgrounds',
    tileset: 'tilesets',
    ui: 'ui_shells',
    fx: 'fx_packs',
    music: 'music_packs',
    sfx: 'sfx_packs',
    voice: 'voice_packs',
  };
  return map[role] ?? 'misc';
}

function buildHeroRouting() {
  return {
    pipeline: 'hero_cutout_rig_runtime',
    execution: ['cpu_local', 'remote_gpu_optional'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'precision segmentation and masks'),
      buildModel('rembg', 'https://github.com/danielgatis/rembg', 'fast local alpha fallback'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'cleanup and upscale graph'),
      buildModel('godot_2d_skeleton', 'https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html', 'runtime rig target'),
      buildModel('aseprite_export', 'https://www.aseprite.org/docs/sprite-sheet/', 'atlas and tag export'),
    ],
    outputs: ['cutout_clean.png', 'parts/*.png', 'hero_rig_spec.json', 'runtime_animation_manifest.json', 'runtime_atlas.png'],
  };
}

function buildNpcRouting() {
  return {
    pipeline: 'npc_portrait_cutout_motion',
    execution: ['cpu_local', 'remote_gpu_optional'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'clean isolate from cast board'),
      buildModel('rembg', 'https://github.com/danielgatis/rembg', 'fallback masking'),
      buildModel('liveportrait', 'https://github.com/KwaiVGI/LivePortrait', 'portrait and dialogue motion'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'cleanup and consistency pass'),
    ],
    outputs: ['portrait_cutout.png', 'npc_rig_spec.json', 'npc_motion_pack.json', 'dialogue_pose_pack.json'],
  };
}

function buildEnemyRouting() {
  return {
    pipeline: 'enemy_sheet_split_runtime',
    execution: ['cpu_local', 'remote_gpu_optional'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'unit extraction from enemy boards'),
      buildModel('rembg', 'https://github.com/danielgatis/rembg', 'batch alpha extraction'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'cleanup and sheet harmonization'),
    ],
    outputs: ['enemy_cutouts/*.png', 'enemy_runtime_sheet.png', 'enemy_motion_pack.json', 'collision_profiles.json'],
  };
}

function buildBossRouting() {
  return {
    pipeline: 'boss_phase_runtime_and_proxy',
    execution: ['cpu_local', 'remote_gpu_recommended'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'boss phase isolation'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'phase cleanup and upscale'),
      buildModel('trellis', 'https://github.com/microsoft/TRELLIS', 'optional 3d proxy branch'),
      buildModel('godot_2d_skeleton', 'https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html', 'boss cutout rig runtime'),
    ],
    outputs: ['boss_phase_cutouts/*.png', 'boss_rig_spec.json', 'boss_phase_motion_pack.json', 'boss_proxy_3d_request.json'],
  };
}

function buildEnvironmentRouting() {
  return {
    pipeline: 'level_board_to_modular_kit',
    execution: ['cpu_local', 'remote_gpu_optional'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'board decomposition into layers'),
      buildModel('rembg', 'https://github.com/danielgatis/rembg', 'extract isolated props and alpha'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'cleanup and variation graphs'),
      buildModel('aseprite_export', 'https://www.aseprite.org/docs/sprite-sheet/', 'tiles and strips export'),
    ],
    outputs: ['playfield_crop.png', 'parallax_*.png', 'tileset_reference_strip.png', 'environment_runtime_manifest.json'],
  };
}

function buildPropRouting() {
  return {
    pipeline: 'prop_pack_runtime',
    execution: ['cpu_local', 'remote_gpu_optional'],
    models: [
      buildModel('sam2', 'https://github.com/facebookresearch/sam2', 'object isolation from board'),
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'variant generation and cleanup'),
      buildModel('aseprite_export', 'https://www.aseprite.org/docs/sprite-sheet/', 'icon and sprite export'),
    ],
    outputs: ['prop_pack/*.png', 'interaction_icons/*.png', 'pickup_manifest.json'],
  };
}

function buildUiRouting() {
  return {
    pipeline: 'ui_shell_and_menu_assets',
    execution: ['cpu_local'],
    models: [
      buildModel('comfyui', 'https://github.com/comfyanonymous/ComfyUI', 'menu keyart motion and upscale'),
    ],
    outputs: ['menu_frames', 'hud_icons', 'ui_theme_tokens.json', 'menu_mockups'],
  };
}

function buildMusicRouting() {
  return {
    pipeline: 'adaptive_music_pack',
    execution: ['cpu_local'],
    models: [],
    outputs: ['bgm_loops', 'stingers', 'music_state_map.json'],
  };
}

function buildSfxRouting() {
  return {
    pipeline: 'sfx_and_foley_pack',
    execution: ['cpu_local'],
    models: [],
    outputs: ['sfx_*.wav', 'event_audio_map.json'],
  };
}

function buildVoiceRouting() {
  return {
    pipeline: 'voice_and_dialogue_pack',
    execution: ['remote_gpu_optional'],
    models: [],
    outputs: ['voice_lines', 'subtitle_timing.json'],
  };
}

function buildFxRouting() {
  return {
    pipeline: 'combat_and_ambient_fx',
    execution: ['cpu_local'],
    models: [],
    outputs: ['fx_layers', 'event_bindings.json', 'ambient_fx_presets.json'],
  };
}

function buildFallbackRouting() {
  return {
    pipeline: 'general_asset_pipeline',
    execution: ['cpu_local'],
    models: [],
    outputs: ['review_notes.json'],
  };
}

export function roleRoutingProfile(role, kind) {
  if (role === 'hero') return buildHeroRouting();
  if (['npc', 'guide', 'merchant', 'ally', 'companion'].includes(role)) return buildNpcRouting();
  if (['enemy', 'monster', 'summon', 'mount'].includes(role)) return buildEnemyRouting();
  if (role === 'boss') return buildBossRouting();
  if (['environment', 'biome', 'background', 'tileset'].includes(role) || kind === 'environment' || kind === 'tileset') return buildEnvironmentRouting();
  if (['weapon', 'armor', 'relic', 'pickup', 'collectible', 'checkpoint', 'hazard', 'trap', 'door', 'portal', 'altar', 'prop'].includes(role) || kind === 'prop') return buildPropRouting();
  if (role === 'ui' || kind === 'ui') return buildUiRouting();
  if (role === 'music' || kind === 'music') return buildMusicRouting();
  if (role === 'sfx' || kind === 'audio') return buildSfxRouting();
  if (role === 'voice' || kind === 'voice') return buildVoiceRouting();
  if (role === 'fx' || kind === 'fx') return buildFxRouting();
  return buildFallbackRouting();
}

export function buildRoutingSources() {
  return [
    { id: 'sam2', url: 'https://github.com/facebookresearch/sam2' },
    { id: 'rembg', url: 'https://github.com/danielgatis/rembg' },
    { id: 'comfyui', url: 'https://github.com/comfyanonymous/ComfyUI' },
    { id: 'liveportrait', url: 'https://github.com/KwaiVGI/LivePortrait' },
    { id: 'godot_2d_skeleton', url: 'https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html' },
    { id: 'aseprite_export', url: 'https://www.aseprite.org/docs/sprite-sheet/' },
    { id: 'trellis', url: 'https://github.com/microsoft/TRELLIS' },
  ];
}
