export function buildSeedTasks(project) {
  return [
    {
      id: '10000000-0000-0000-0000-000000000001',
      project_id: project.id,
      agent_id: 'producer',
      kind: 'vision',
      title: 'Lock Echoes MVP',
      description: 'Freeze the first playable slice around one level, one hero, and one weapon choice arc.',
      status: 'ready',
      priority: 10,
      acceptance_criteria: ['One level only', 'One clear win condition', 'Concept fidelity remains the primary visual benchmark'],
      depends_on: [],
      payload: {},
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      project_id: project.id,
      agent_id: 'asset_direction',
      kind: 'asset',
      title: 'Build hero and enemy reference packs',
      description: 'Organize the Echo, spores, guardians, and bosses into asset groups with target outputs.',
      status: 'backlog',
      priority: 9,
      acceptance_criteria: ['Hero pack exists', 'Enemy pack exists', 'Boss pack exists'],
      depends_on: ['10000000-0000-0000-0000-000000000001'],
      payload: {},
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      project_id: project.id,
      agent_id: 'level_design',
      kind: 'scene',
      title: 'Author level_01 from Echoes preset',
      description: 'Convert the level boards into a playable preview layout with anchor zones and weapon-test progression.',
      status: 'backlog',
      priority: 9,
      acceptance_criteria: ['Spawn zone exists', 'Weapon test zone exists', 'Exit gate exists'],
      depends_on: ['10000000-0000-0000-0000-000000000001'],
      payload: {},
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      project_id: project.id,
      agent_id: 'gameplay_programming',
      kind: 'code',
      title: 'Make the preview playable',
      description: 'Bind the hero, level layout, goal, collectibles, and camera into a working GDL preview.',
      status: 'backlog',
      priority: 8,
      acceptance_criteria: ['Preview runs', 'Player can reach goal', 'Background concept art is visible'],
      depends_on: ['10000000-0000-0000-0000-000000000003'],
      payload: {},
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      project_id: project.id,
      agent_id: 'qa',
      kind: 'qa',
      title: 'Validate Echoes preview',
      description: 'Check readability, collision, and the first mobile viability assumptions.',
      status: 'backlog',
      priority: 8,
      acceptance_criteria: ['Hero silhouette readable', 'No dead-end path', 'Goal reachable'],
      depends_on: ['10000000-0000-0000-0000-000000000004'],
      payload: {},
    },
  ];
}

export function buildSeedAssets(project) {
  return [
    {
      id: '20000000-0000-0000-0000-000000000001',
      project_id: project.id,
      kind: 'character',
      role: 'hero',
      title: 'The Echo main hero',
      status: 'source_ready',
      source_prompt: project.source_prompt,
      spec: { render_target: 'hd_sprite_sheet', motion_target: 'idle_run_jump_attack', preserve_red_cloak: true },
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      project_id: project.id,
      kind: 'character',
      role: 'npc',
      title: 'Myla guide',
      status: 'concept',
      source_prompt: project.source_prompt,
      spec: { role: 'spore guardian', interaction: 'guide' },
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      project_id: project.id,
      kind: 'character',
      role: 'boss',
      title: 'Root Guardian boss',
      status: 'concept',
      source_prompt: project.source_prompt,
      spec: { encounter: 'tree-root fungal sentinel', output: 'boss_encounter_proto' },
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      project_id: project.id,
      kind: 'environment',
      role: 'environment',
      title: 'Origin Tree level kit',
      status: 'source_ready',
      source_prompt: project.source_prompt,
      spec: { includes: ['ruins', 'weapon altars', 'gate', 'mushroom props', 'lamps'] },
    },
  ];
}

export function buildAssetPrompts() {
  return {
    hero: {
      title: 'Echo HD runtime pack',
      prompt: 'Generate a 2D HD runtime character pack for a hooded dark-fantasy child hero with a torn red cloak, glowing blue-violet accents, readable silhouette, painterly texture, neutral turnaround, idle/run/jump/attack poses, transparent background, mobile-friendly readability.',
      outputs: ['turnaround_hd', 'sprite_sheet_idle_run_jump_attack', 'fx_pass_glow_mask'],
    },
    enemies: {
      title: 'Fungal enemy runtime pack',
      prompt: 'Generate modular 2D fungal enemy assets for Sporeling, Rampore, Porteur Sporeal, Chevalier Fongique, and Moussu Furieux. Keep high readability, painterly dark-fantasy rendering, purple spore effects, transparent backgrounds, combat poses, hit/death states, and animation-ready separation.',
      outputs: ['enemy_lineup_hd', 'per-enemy sprite sheets', 'impact and spore VFX'],
    },
    environment: {
      title: 'Origin Tree modular biome pack',
      prompt: 'Generate HD 2D modular level pieces for a fungal ruined kingdom: stone platforms, giant mushrooms, roots, lamps, altars, gates, spores, parallax ruins, foreground props, collision-safe silhouettes, painterly atmosphere, mobile-friendly contrast.',
      outputs: ['tileset_modular_hd', 'parallax_backdrops', 'interactive props'],
    },
  };
}

export function buildAnimationSpecs() {
  return {
    hero: {
      skeleton_hint: '2d cutout or sprite-swap hybrid',
      required_clips: ['idle', 'run', 'jump_start', 'jump_loop', 'fall', 'land', 'attack_light', 'hurt', 'death'],
      readability_rules: ['cloak silhouette must remain readable', 'weapon arc must remain bright', 'anticipation frames on attacks'],
    },
    enemies: {
      sporeling: ['idle', 'walk', 'hop', 'spore_burst', 'hit', 'death'],
      rampore: ['idle', 'charge', 'headbutt', 'stun', 'death'],
      chevalier_fongique: ['idle', 'walk', 'slash_combo', 'guard', 'hit', 'death'],
    },
  };
}

export function buildEncounterPlan() {
  return {
    level: 'level_01',
    beats: [
      { id: 'intro_safe', zone: 'awakening', enemies: [], goal: 'teach movement and mood' },
      { id: 'first_pressure', zone: 'descent', enemies: ['sporeling', 'sporeling'], goal: 'teach spacing and jump timing' },
      { id: 'weapon_test', zone: 'armory', enemies: ['rampore'], goal: 'teach weapon choice and reward loop' },
      { id: 'exit_lock', zone: 'exit', enemies: ['chevalier_fongique'], goal: 'validate mastery before gate' },
    ],
  };
}

export function buildMobilePerfProfile() {
  return {
    target_devices: ['mid-range Android', 'recent iPhone', 'web desktop preview'],
    budgets: {
      background_layers: 4,
      active_enemies_on_screen: 5,
      particles_per_burst: 24,
      target_fps: 60,
      minimum_fps: 30,
    },
    rules: [
      'Bake non-interactive lighting into backgrounds whenever possible',
      'Prefer sprite atlases over independent full-size textures',
      'Keep gameplay collision simple even when art is intricate',
    ],
  };
}

export function buildStyleGuide() {
  return {
    visual_target: 'painterly dark fantasy 2D',
    hero_silhouette: 'hooded child with red cloak',
    lighting: 'violet spores, ember reds, warm lamps, deep ruins',
    mobile_rules: ['preserve silhouette', 'limit fine contrast noise', 'bright focal points only on interactables'],
  };
}
