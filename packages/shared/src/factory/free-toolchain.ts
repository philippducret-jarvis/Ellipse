import { derivePreset, getGameType, type ProductionPreset } from '../catalog/game-types.js';

export type FreeFactoryToolCategory =
  | 'core_runtime'
  | 'asset_fidelity'
  | 'animation'
  | 'world_editing'
  | 'runtime_export'
  | 'gacha_liveops'
  | 'analytics'
  | 'compliance';

export type FactoryToolAvailability = 'bundled' | 'installable' | 'env_required' | 'manual_gpu' | 'account_required';

export interface FreeFactoryTool {
  id: string;
  label: string;
  category: FreeFactoryToolCategory;
  availability: FactoryToolAvailability;
  priority: 'P0' | 'P1' | 'P2';
  free_use: string;
  command?: string;
  winget_id?: string;
  path_env?: string;
  env?: string[];
  url: string;
  agents: string[];
  capabilities: string[];
  required_for: string[];
  install_notes: string[];
}

export interface FactoryToolchainPlan {
  game_type: string;
  dimension: ProductionPreset['dimension'];
  required_tools: FreeFactoryTool[];
  optional_tools: FreeFactoryTool[];
  winget_install_ids: string[];
  env_to_configure: string[];
  agent_bindings: Record<string, string[]>;
  qa_gates: string[];
}

export const FREE_FACTORY_TOOLS: FreeFactoryTool[] = [
  {
    id: 'node_pnpm_git_python',
    label: 'Node, pnpm, Git, Python',
    category: 'core_runtime',
    availability: 'bundled',
    priority: 'P0',
    free_use: 'Local development toolchain.',
    url: 'https://nodejs.org/',
    agents: ['producer', 'integration', 'qa'],
    capabilities: ['run scripts', 'build packages', 'clone open-source adapters', 'execute Python workers'],
    required_for: ['all'],
    install_notes: ['Already expected by the repo; doctor verifies commands node, pnpm, git and python.'],
  },
  {
    id: 'sharp_background_removal',
    label: 'Sharp + IMG.LY background removal',
    category: 'asset_fidelity',
    availability: 'bundled',
    priority: 'P0',
    free_use: 'Local CPU image processing and background removal fallback.',
    url: 'https://sharp.pixelplumbing.com/',
    agents: ['character', 'decor', 'qa'],
    capabilities: ['cutouts', 'alpha cleanup', 'sprite sheets', 'fidelity heatmaps'],
    required_for: ['asset.concept_to_hd', 'asset.board_decomposition'],
    install_notes: ['Sharp is in @ellipse/pipeline; @imgly/background-removal-node is present at workspace root.'],
  },
  {
    id: 'sam2',
    label: 'Meta SAM 2',
    category: 'asset_fidelity',
    availability: 'manual_gpu',
    priority: 'P0',
    free_use: 'Open-source segmentation model for image/video masks.',
    url: 'https://github.com/facebookresearch/sam2',
    agents: ['character', 'decor', 'qa'],
    capabilities: ['promptable segmentation', 'board object masks', 'cutout correction'],
    required_for: ['asset.board_decomposition', 'asset.concept_to_hd'],
    install_notes: ['Connect as a Python worker when GPU is available; keep Sharp flood-fill fallback for CPU-only machines.'],
  },
  {
    id: 'birefnet',
    label: 'BiRefNet',
    category: 'asset_fidelity',
    availability: 'manual_gpu',
    priority: 'P0',
    free_use: 'Open weights for high-resolution dichotomous image segmentation.',
    url: 'https://github.com/ZhengPeng7/BiRefNet',
    agents: ['character', 'decor', 'qa'],
    capabilities: ['high quality foreground masks', 'transparent sprite preparation'],
    required_for: ['asset.concept_to_hd'],
    install_notes: ['Connect through a Python/Hugging Face worker; cache models outside the repo.'],
  },
  {
    id: 'comfyui',
    label: 'ComfyUI',
    category: 'asset_fidelity',
    availability: 'env_required',
    priority: 'P0',
    command: 'comfy',
    winget_id: 'Comfy.ComfyUI-Desktop',
    path_env: 'ELLIPSE_COMFYUI_DESKTOP_PATH',
    env: ['COMFYUI_URL'],
    free_use: 'Local or remote node-graph image generation, inpaint and upscale.',
    url: 'https://github.com/comfy-org/comfyui',
    agents: ['character', 'decor', 'animation', 'vfx'],
    capabilities: ['inpaint', 'upscale', 'style lock', 'variant generation'],
    required_for: ['asset.concept_to_hd', 'asset.inpaint'],
    install_notes: ['Desktop can be installed with winget; production should prefer COMFYUI_URL to a controlled worker.'],
  },
  {
    id: 'pixijs_spritesheet',
    label: 'PixiJS spritesheets',
    category: 'animation',
    availability: 'bundled',
    priority: 'P0',
    free_use: 'Runtime rendering path already used by @ellipse/engine.',
    url: 'https://pixijs.com/',
    agents: ['animation', 'integration', 'qa'],
    capabilities: ['spritesheet JSON', 'AnimatedSprite', 'runtime atlas playback'],
    required_for: ['animation.rig_runtime', 'runtime.preview'],
    install_notes: ['Use as the first runtime target before optional Godot export.'],
  },
  {
    id: 'godot',
    label: 'Godot Engine',
    category: 'runtime_export',
    availability: 'installable',
    priority: 'P1',
    command: 'godot',
    winget_id: 'GodotEngine.GodotEngine',
    path_env: 'ELLIPSE_GODOT_PATH',
    free_use: 'Open-source editor/runtime for export parity and 2D scene validation.',
    url: 'https://godotengine.org/',
    agents: ['animation', 'level', 'integration', 'qa'],
    capabilities: ['2D skeleton reference', 'scene export adapter', 'runtime smoke parity'],
    required_for: ['runtime.godot_export', 'animation.rig_runtime'],
    install_notes: ['Optional for web-first builds; useful for validating exported scenes.'],
  },
  {
    id: 'blender',
    label: 'Blender',
    category: 'runtime_export',
    availability: 'installable',
    priority: 'P1',
    command: 'blender',
    winget_id: 'BlenderFoundation.Blender',
    path_env: 'ELLIPSE_BLENDER_PATH',
    free_use: 'Open-source 3D/2.5D asset processing and depth-card generation.',
    url: 'https://www.blender.org/',
    agents: ['mesh_3d', 'lighting', 'integration'],
    capabilities: ['billboard depth cards', 'glTF validation', '2.5D environment planes'],
    required_for: ['dimension.2.5d', 'dimension.3d'],
    install_notes: ['Do not block 2D production if absent; use for advanced 2.5D/3D passes.'],
  },
  {
    id: 'tiled',
    label: 'Tiled Map Editor',
    category: 'world_editing',
    availability: 'installable',
    priority: 'P0',
    command: 'tiled',
    winget_id: 'Tiled.Tiled',
    path_env: 'ELLIPSE_TILED_PATH',
    free_use: 'Free/open-source tilemap editor with JSON export.',
    url: 'https://www.mapeditor.org/',
    agents: ['level', 'decor', 'qa'],
    capabilities: ['tilemaps', 'collision objects', 'custom properties', 'JSON export'],
    required_for: ['world.tilemaps', 'world.collision'],
    install_notes: ['Use JSON export as an external interchange format for GDL layout.tilemap.'],
  },
  {
    id: 'ldtk',
    label: 'LDtk',
    category: 'world_editing',
    availability: 'installable',
    priority: 'P0',
    command: 'ldtk',
    winget_id: 'deepnight.LDtk',
    path_env: 'ELLIPSE_LDTK_PATH',
    free_use: 'Free level-design toolkit with entity/layer definitions.',
    url: 'https://ldtk.io/',
    agents: ['level', 'gameplay', 'qa'],
    capabilities: ['entity definitions', 'int grids', 'world graphs', 'JSON export'],
    required_for: ['world.rooms', 'world.entity_placement'],
    install_notes: ['Use when prompt/board implies authored rooms, locks, keys, boss gates or metroidvania flow.'],
  },
  {
    id: 'playfab',
    label: 'PlayFab Economy v2',
    category: 'gacha_liveops',
    availability: 'account_required',
    priority: 'P1',
    env: ['PLAYFAB_TITLE_ID', 'PLAYFAB_DEV_SECRET_KEY'],
    free_use: 'Free tier backend for catalog, inventory, currencies and bundles.',
    url: 'https://learn.microsoft.com/en-us/gaming/playfab/',
    agents: ['economy', 'integration', 'qa'],
    capabilities: ['catalog items', 'inventory', 'virtual currency', 'bundles', 'stores'],
    required_for: ['gacha_rpg', 'liveops.inventory'],
    install_notes: ['Requires account credentials; local fallback writes economy JSON manifests.'],
  },
  {
    id: 'firebase_remote_config',
    label: 'Firebase Remote Config + A/B Testing',
    category: 'analytics',
    availability: 'account_required',
    priority: 'P1',
    env: ['FIREBASE_CONFIG'],
    free_use: 'Remote balancing and experiments for web/mobile.',
    url: 'https://firebase.google.com/docs/remote-config',
    agents: ['economy', 'gameplay', 'qa'],
    capabilities: ['remote tuning', 'A/B tests', 'variant assignment'],
    required_for: ['gacha_rpg', 'liveops.balance'],
    install_notes: ['Requires Firebase project; local fallback stores remote-config defaults in GDL meta.'],
  },
  {
    id: 'gameanalytics',
    label: 'GameAnalytics',
    category: 'analytics',
    availability: 'account_required',
    priority: 'P1',
    env: ['GAMEANALYTICS_GAME_KEY', 'GAMEANALYTICS_SECRET_KEY'],
    free_use: 'Free analytics tier for progression, design and economy events.',
    url: 'https://docs.gameanalytics.com/',
    agents: ['qa', 'economy', 'integration'],
    capabilities: ['progression events', 'design events', 'economy funnels'],
    required_for: ['liveops.analytics', 'qa.telemetry'],
    install_notes: ['Requires keys; local fallback records telemetry JSONL in workspace.'],
  },
  {
    id: 'unity_remote_config',
    label: 'Unity Remote Config',
    category: 'analytics',
    availability: 'account_required',
    priority: 'P2',
    env: ['UNITY_REMOTE_CONFIG_ENVIRONMENT_ID'],
    free_use: 'Free remote tuning option if Unity Gaming Services is preferred.',
    url: 'https://docs.unity.com/en-us/remote-config',
    agents: ['economy', 'gameplay'],
    capabilities: ['remote balance parameters', 'segmented configs'],
    required_for: ['liveops.balance'],
    install_notes: ['Optional alternative to Firebase Remote Config.'],
  },
  {
    id: 'store_compliance',
    label: 'Apple/Google randomized item compliance',
    category: 'compliance',
    availability: 'bundled',
    priority: 'P0',
    free_use: 'Generated disclosure data and QA checks; no external account required.',
    url: 'https://developer.apple.com/app-store/review/guidelines/',
    agents: ['economy', 'ui', 'qa', 'integration'],
    capabilities: ['odds disclosure', 'purchase proximity checks', 'region flags', 'audit manifests'],
    required_for: ['gacha_rpg', 'storefronts.mobile'],
    install_notes: ['Always generate compliance metadata when randomized rewards can be purchased.'],
  },
];

const P0_ALWAYS = ['node_pnpm_git_python', 'sharp_background_removal', 'pixijs_spritesheet'];
const P0_ASSET = ['sam2', 'birefnet', 'comfyui'];
const WORLD_TOOLS = ['tiled', 'ldtk'];
const GACHA_TOOLS = ['playfab', 'firebase_remote_config', 'gameanalytics', 'store_compliance'];

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function listFreeFactoryTools(): FreeFactoryTool[] {
  return FREE_FACTORY_TOOLS.map((tool) => ({ ...tool, agents: [...tool.agents], capabilities: [...tool.capabilities] }));
}

export function getFreeFactoryTool(id: string): FreeFactoryTool | undefined {
  const tool = FREE_FACTORY_TOOLS.find((t) => t.id === id);
  return tool ? { ...tool, agents: [...tool.agents], capabilities: [...tool.capabilities] } : undefined;
}

export function inferToolIdsForPreset(preset: ProductionPreset): string[] {
  const type = getGameType(preset.game_type);
  const systems = new Set(preset.systems);
  const ids = [...P0_ALWAYS, ...P0_ASSET];

  if (['tilemap', 'grid', 'graph', 'scene_graph', 'isometric_grid'].includes(preset.map_kind)) {
    ids.push(...WORLD_TOOLS);
  }
  if (preset.dimension === '2.5d' || preset.dimension === '3d') {
    ids.push('blender', 'godot');
  }
  if (
    preset.game_type === 'gacha_rpg' ||
    systems.has('gacha_summon') ||
    systems.has('banner_rotation') ||
    systems.has('roster_collection') ||
    type?.core_loops.includes('management')
  ) {
    ids.push(...GACHA_TOOLS);
  }
  if (preset.platforms.includes('mobile') || preset.platforms.includes('desktop')) {
    ids.push('godot', 'store_compliance');
  }

  return uniq(ids);
}

export function buildFactoryToolchainPlan(input: {
  game_type: string;
  dimension?: ProductionPreset['dimension'];
  platforms?: string[];
  mechanic_modules?: string[];
}): FactoryToolchainPlan {
  const preset = derivePreset({
    game_type: input.game_type,
    dimension: input.dimension,
    platforms: input.platforms,
    mechanic_modules: input.mechanic_modules,
  });
  const ids = inferToolIdsForPreset(preset);
  const tools = ids.map((id) => getFreeFactoryTool(id)).filter((tool): tool is FreeFactoryTool => Boolean(tool));
  const required = tools.filter((tool) => tool.priority === 'P0' || tool.required_for.includes(preset.game_type));
  const optional = tools.filter((tool) => !required.some((r) => r.id === tool.id));

  const agentBindings: Record<string, string[]> = {};
  for (const tool of tools) {
    for (const agent of tool.agents) {
      agentBindings[agent] ??= [];
      agentBindings[agent]!.push(tool.id);
    }
  }

  return {
    game_type: preset.game_type,
    dimension: preset.dimension,
    required_tools: required,
    optional_tools: optional,
    winget_install_ids: uniq(tools.map((tool) => tool.winget_id).filter((id): id is string => Boolean(id))),
    env_to_configure: uniq(tools.flatMap((tool) => tool.env ?? [])),
    agent_bindings: agentBindings,
    qa_gates: [
      'toolchain doctor has no missing P0 bundled tools',
      'asset fidelity route selected before stage 03_cleanup',
      'world editor interchange selected before scene assembly',
      preset.game_type === 'gacha_rpg' ? 'randomized item odds disclosure generated before export' : 'store compliance gate evaluated',
    ],
  };
}
