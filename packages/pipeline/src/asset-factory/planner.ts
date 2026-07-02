import type {
  AssetFactoryKnowledgeBase,
  AssetProductionRecipe,
  AssetStageTemplate,
} from './types.js';
import { buildAssetFactoryKnowledgeBase } from './knowledge-base.js';

export interface WorkspaceReference {
  role: string;
  workspace_file: string;
  url: string;
}

export interface WorkspaceAssetRecord {
  id: string;
  kind: string;
  role: string;
  title: string;
  status: string;
  spec?: Record<string, unknown>;
}

export interface AssetFactoryPlan {
  checkedAt: string;
  knowledgeBase: AssetFactoryKnowledgeBase;
  recipes: AssetProductionRecipe[];
  cuttingQa: AssetCuttingQaItem[];
}

export interface AssetCuttingQaItem {
  assetId: string;
  assetTitle: string;
  checks: string[];
  releaseBlockers: string[];
}

const CHARACTER_REFERENCE_HINTS: Record<string, string[]> = {
  hero: ['hero_primary', 'cast_sheet', 'character_sheet', 'menu_keyart'],
  npc: ['character_sheet', 'cast_sheet', 'menu_keyart'],
  boss: ['boss_board', 'enemy_board', 'character_sheet'],
};

const ENVIRONMENT_REFERENCE_HINTS: Record<string, string[]> = {
  environment: ['level_primary', 'level_secondary', 'modular_level', 'world_map', 'tutorial_overview'],
};

function pickReferences(asset: WorkspaceAssetRecord, references: WorkspaceReference[]): WorkspaceReference[] {
  const hints =
    (asset.kind === 'environment'
      ? ENVIRONMENT_REFERENCE_HINTS[asset.role]
      : CHARACTER_REFERENCE_HINTS[asset.role]) ?? ['cast_sheet', 'character_sheet', 'level_primary'];

  const ranked = hints
    .map((hint) => references.find((entry) => entry.role === hint))
    .filter((entry): entry is WorkspaceReference => Boolean(entry));

  if (ranked.length > 0) return ranked;
  return references.slice(0, 3);
}

function stageIdsForAsset(asset: WorkspaceAssetRecord): string[] {
  if (asset.kind === 'environment') {
    return [
      'intake_and_reference_lock',
      'segmentation_and_cutout',
      'parallax_tiles_collision',
      'atlas_and_export',
    ];
  }

  const base = [
    'intake_and_reference_lock',
    'segmentation_and_cutout',
    'cleanup_and_part_split',
    'runtime_rig',
    'motion_generation',
    'atlas_and_export',
  ];

  if (asset.role === 'boss') {
    base.splice(base.length - 1, 0, 'remote_3d_proxy');
  }

  return base;
}

function targetOutputsForAsset(asset: WorkspaceAssetRecord): string[] {
  if (asset.kind === 'environment') {
    return [
      'playfield_layer.png',
      'parallax_far.png',
      'parallax_mid.png',
      'foreground_overlays.png',
      'tileset_atlas.png',
      'collision-authoring-notes.json',
    ];
  }

  const common = ['cutout_clean.png', 'parts_manifest.json', 'runtime_atlas.png', 'runtime_animation_manifest.json'];
  if (asset.role === 'hero') {
    return [...common, 'hero_rig_spec.json', 'hero_motion_pack.json'];
  }
  if (asset.role === 'boss') {
    return [...common, 'boss_rig_spec.json', 'boss_phase_motion_pack.json', 'boss_proxy_3d_request.json'];
  }
  return [...common, 'npc_rig_spec.json', 'npc_motion_pack.json'];
}

function resolveStages(stageIds: string[], knowledgeBase: AssetFactoryKnowledgeBase): AssetStageTemplate[] {
  return stageIds
    .map((stageId) => knowledgeBase.stageLibrary.find((stage) => stage.id === stageId))
    .filter((stage): stage is AssetStageTemplate => Boolean(stage));
}

export function createAssetProductionRecipe(
  asset: WorkspaceAssetRecord,
  references: WorkspaceReference[],
  knowledgeBase = buildAssetFactoryKnowledgeBase(),
): AssetProductionRecipe {
  return {
    assetId: asset.id,
    assetTitle: asset.title,
    role: asset.role,
    kind: asset.kind,
    references: pickReferences(asset, references),
    targetOutputs: targetOutputsForAsset(asset),
    stages: resolveStages(stageIdsForAsset(asset), knowledgeBase),
  };
}

export function createAssetCuttingQaItem(asset: WorkspaceAssetRecord): AssetCuttingQaItem {
  const commonChecks = [
    'No hard background halo remains around the silhouette.',
    'Alpha has no accidental opaque pixels in transparent areas.',
    'The asset remains readable when reduced to mobile gameplay scale.',
    'Naming, pivots, and metadata are stored outside the painted image.',
  ];

  if (asset.kind === 'environment') {
    return {
      assetId: asset.id,
      assetTitle: asset.title,
      checks: [
        ...commonChecks,
        'Tile edges loop cleanly where reuse is expected.',
        'Foreground, play layer, and background are separated.',
        'Collision notes exist for platforms, ladders, hazards, and doors.',
      ],
      releaseBlockers: [
        'Visible seam when two tiles repeat side by side.',
        'Gameplay collision depends on painted shadows or atmosphere.',
      ],
    };
  }

  return {
    assetId: asset.id,
    assetTitle: asset.title,
    checks: [
      ...commonChecks,
      'Arms, cloak, weapon, and feet are either separated correctly or explicitly marked for sprite-swap fallback.',
      'No limb is missing where the runtime animation set expects it.',
      'Idle, locomotion, hurt, and attack state coverage is defined before export.',
    ],
    releaseBlockers: [
      'Clipped silhouette extremities.',
      'Part overlap makes the runtime rig unusable.',
      'Occluded regions were never repaired but are still expected to animate.',
    ],
  };
}

export function buildAssetFactoryPlan(
  assets: WorkspaceAssetRecord[],
  references: WorkspaceReference[],
  checkedAt = new Date().toISOString(),
): AssetFactoryPlan {
  const knowledgeBase = buildAssetFactoryKnowledgeBase(checkedAt);
  return {
    checkedAt,
    knowledgeBase,
    recipes: assets.map((asset) => createAssetProductionRecipe(asset, references, knowledgeBase)),
    cuttingQa: assets.map((asset) => createAssetCuttingQaItem(asset)),
  };
}
