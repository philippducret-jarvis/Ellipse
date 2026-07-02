export type AssetToolCategory =
  | 'cutout'
  | 'segmentation'
  | 'cleanup'
  | 'animation_2d'
  | 'image_to_3d'
  | 'rigging_2d'
  | 'workflow'
  | 'export';

export type AssetComputeProfile = 'cpu_local' | 'gpu_local' | 'remote_gpu';

export interface AssetToolSpec {
  id: string;
  name: string;
  category: AssetToolCategory;
  compute: AssetComputeProfile;
  strengths: string[];
  tradeoffs: string[];
  recommendedFor: string[];
  sourceUrl: string;
  licenseNotes?: string;
}

export interface AssetStageTemplate {
  id: string;
  title: string;
  objective: string;
  agents: string[];
  inputs: string[];
  outputs: string[];
  preferredTools: string[];
  qualityGates: string[];
  notes?: string[];
}

export interface AssetProductionRecipe {
  assetId: string;
  assetTitle: string;
  role: string;
  kind: string;
  references: {
    role: string;
    workspace_file: string;
    url: string;
  }[];
  targetOutputs: string[];
  stages: AssetStageTemplate[];
}

export interface AssetFactoryKnowledgeBase {
  checkedAt: string;
  tools: AssetToolSpec[];
  stageLibrary: AssetStageTemplate[];
  agentPlaybooks: Record<string, string[]>;
}
