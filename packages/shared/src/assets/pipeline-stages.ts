/**
 * Pipeline de production asset — 8 stages isolés.
 * Chaque stage = contrat d'entrée/sortie + agents + outils ML.
 */
import type { AgentType } from '../agents/catalog.js';
import type { AssetGroup } from './taxonomy.js';

export const ASSET_STAGE_IDS = [
  '01_source',
  '02_cutouts',
  '03_cleanup',
  '04_rig',
  '05_animation',
  '06_exports',
  '07_qa',
  '08_remote_jobs',
] as const;

export type AssetStageId = (typeof ASSET_STAGE_IDS)[number];

export interface AssetStageDefinition {
  id: AssetStageId;
  folder: AssetStageId;
  label: string;
  labelFr: string;
  description: string;
  /** Agents runtime Ellipse responsables */
  agents: AgentType[];
  /** Outils déterministes (pas de cognition externe) */
  tools: string[];
  /** Modèles ML locaux (Phase 2+) */
  models: string[];
  /** Artefacts attendus en sortie de stage */
  outputs: string[];
  /** Stage précédent obligatoire */
  dependsOn: AssetStageId | null;
}

export const ASSET_PIPELINE_STAGES: readonly AssetStageDefinition[] = [
  {
    id: '01_source',
    folder: '01_source',
    label: 'Source references',
    labelFr: 'Références source',
    description: 'Photos, concepts, moodboards verrouillés — aucune génération',
    agents: ['character', 'decor'],
    tools: ['filesystem', 'metadata-extract'],
    models: [],
    outputs: ['reference.png', 'style-lock.json', 'source-manifest.json'],
    dependsOn: null,
  },
  {
    id: '02_cutouts',
    folder: '02_cutouts',
    label: 'Cutouts & segmentation',
    labelFr: 'Découpage & segmentation',
    description: 'Extraction alpha, masques parties, fond transparent',
    agents: ['character'],
    tools: ['sharp', 'rembg'],
    models: ['sam2', 'birefnet'],
    outputs: ['cutout-alpha.png', 'segmentation-mask.png', 'parts-mask/*.png'],
    dependsOn: '01_source',
  },
  {
    id: '03_cleanup',
    folder: '03_cleanup',
    label: 'Cleanup & part slicing',
    labelFr: 'Nettoyage & découpe parts',
    description: 'Nettoyage bords, découpe tête/corps/membres, normalisation pixels',
    agents: ['character', 'decor'],
    tools: ['sharp', 'aseprite-cli'],
    models: ['comfyui-cleanup'],
    outputs: ['parts/*.png', 'silhouette-clean.png', 'cutting-report.json'],
    dependsOn: '02_cutouts',
  },
  {
    id: '04_rig',
    folder: '04_rig',
    label: 'Rig & skeleton',
    labelFr: 'Rig & squelette',
    description: 'Rig 2D (joints, pivots) ou mesh 3D + skeleton pour animation',
    agents: ['animation', 'mesh_3d'],
    tools: ['2d-pose-editor', 'mixamo', 'blender-headless'],
    models: ['triposr', 'instantmesh'],
    outputs: ['rig.json', 'skeleton.glb', 'pivot-map.json'],
    dependsOn: '03_cleanup',
  },
  {
    id: '05_animation',
    folder: '05_animation',
    label: 'Motion & animation packs',
    labelFr: 'Mouvements & animations',
    description: 'Idle, walk, run, jump, attack — spritesheets ou clips',
    agents: ['animation'],
    tools: ['comfyui', 'controlnet-openpose'],
    models: ['wan-2.x', 'animatediff', 'qwen-image-edit'],
    outputs: ['motion/*.png', 'spritesheet-*.png', 'anim-state-machine.json'],
    dependsOn: '04_rig',
  },
  {
    id: '06_exports',
    folder: '06_exports',
    label: 'Runtime exports',
    labelFr: 'Exports runtime',
    description: 'Atlas engine, manifests GDL, formats finaux (PNG, glTF, WAV)',
    agents: ['integration', 'character'],
    tools: ['atlas-packer', 'gltf-transform'],
    models: [],
    outputs: ['atlas.json', 'runtime-manifest.json', 'gdl-asset-ref.json'],
    dependsOn: '05_animation',
  },
  {
    id: '07_qa',
    folder: '07_qa',
    label: 'Quality gates',
    labelFr: 'Contrôle qualité',
    description: 'Cutting QA, alignement pixels, smoke test engine',
    agents: ['qa'],
    tools: ['pixel-diff', 'engine-smoke'],
    models: ['ellipse-qa-v0'],
    outputs: ['qa-report.json', 'blockers.json'],
    dependsOn: '06_exports',
  },
  {
    id: '08_remote_jobs',
    folder: '08_remote_jobs',
    label: 'Remote GPU jobs',
    labelFr: 'Jobs GPU distants',
    description: 'Inpaint CPU (IoU shipping) ou work orders GPU ComfyUI/rembg',
    agents: ['character', 'animation', 'mesh_3d', 'vfx'],
    tools: ['bullmq', 'comfyui-api'],
    models: ['ellipse-asset-v0', 'ellipse-mesh-v0'],
    outputs: ['production.workorder.json', 'job-results/*.json'],
    dependsOn: '01_source',
  },
] as const;

/** Stages requis par groupe d'asset (simplifié) */
export const STAGES_BY_GROUP: Record<AssetGroup, AssetStageId[]> = {
  characters: ['01_source', '02_cutouts', '03_cleanup', '04_rig', '05_animation', '06_exports', '07_qa'],
  props: ['01_source', '02_cutouts', '03_cleanup', '06_exports', '07_qa'],
  environments: ['01_source', '03_cleanup', '06_exports', '07_qa'],
  ui: ['01_source', '03_cleanup', '06_exports', '07_qa'],
  audio: ['01_source', '06_exports', '07_qa'],
  fx: ['01_source', '02_cutouts', '05_animation', '06_exports', '07_qa'],
};

export function getStage(id: AssetStageId): AssetStageDefinition {
  const stage = ASSET_PIPELINE_STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Stage inconnu: ${id}`);
  return stage;
}

export function getAgentsForStage(id: AssetStageId): AgentType[] {
  return getStage(id).agents;
}
