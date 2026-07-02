import { join } from 'node:path';
import { loadEnv } from '@ellipse/shared/load-env';
import { getBusConnection } from '@ellipse/bus';
import { Worker } from 'bullmq';
import { processPhotoToSprite, type PhotoPipelineInput, type PhotoPipelineResult } from './vision/process-photo.js';

export const PIPELINE_VISION_QUEUE = 'ellipse:pipeline:vision';

export type VisionJobData = PhotoPipelineInput;

export async function runVisionPipeline(input: PhotoPipelineInput): Promise<PhotoPipelineResult> {
  return processPhotoToSprite(input);
}

export function getGeneratedDir(): string {
  loadEnv();
  return process.env.GENERATED_DIR ?? join(process.cwd(), 'generated');
}

export function startVisionWorker(): Worker<VisionJobData, PhotoPipelineResult> {
  return new Worker<VisionJobData, PhotoPipelineResult>(
    PIPELINE_VISION_QUEUE,
    async (job) => processPhotoToSprite(job.data),
    { connection: getBusConnection(), concurrency: 2 },
  );
}

export {
  processPhotoToSprite,
  extractStyleFromPhoto,
  isComfyUIAvailable,
  type PhotoPipelineInput,
  type PhotoPipelineResult,
} from './vision/process-photo.js';
export { generateDecorAssets, type DecorPipelineResult } from './decor/generate-decor.js';
export { generateProceduralHero } from './procedural/generate-hero.js';
export { generateAssetSpec, type AssetFamily, type ProceduralSpecInput } from './asset-factory/procedural-specs.js';
export { rasterizeAssetSpecToPng, writeAssetSpecPng, type RasterizeOptions } from './asset-factory/rasterize.js';
export {
  produceAssetFamily,
  produceAssetCast,
  type AssetFamilyInput,
  type AssetFamilyResult,
} from './asset-factory/asset-family.js';
export {
  cutSprite,
  sliceBoardGrid,
  type CutResult,
  type SliceGridInput,
  type SliceGridResult,
} from './asset-factory/board-cutter.js';
export {
  extractSubject,
  type ExtractSubjectOptions,
  type ExtractSubjectResult,
} from './asset-factory/extract-subject.js';
export {
  produceLibraryPack,
  type LibraryPackInput,
  type LibraryPackResult,
} from './asset-factory/library-pack.js';
export { generateMeshStubGlb } from './mesh/generate-mesh-stub.js';
export {
  runLot0Pipeline,
  runLot0MeshOnly,
  type Lot0PipelineInput,
  type Lot0PipelineResult,
} from './lot0/run-lot0.js';
export {
  extractImageElements,
  type ExtractedElement,
  type ExtractElementsResult,
} from './lot0/extract-elements.js';
export { composeLayeredSpriteSheet, type LayeredSpriteResult } from './lot0/compose-layered.js';
export { generateMeshFromSilhouette, type MeshFromSilhouetteResult } from './lot0/mesh-from-silhouette.js';
export { buildLot0Animations, type Lot0AnimationSet } from './lot0/animation-lot0.js';
export { readLot0Manifest, writeLot0Manifest, lot0ManifestPath, type Lot0Manifest } from './lot0/manifest.js';
export {
  deriveLearningSettings,
  readLearningProfile,
  updateLearningProfile,
  toLearningSummary,
  type Lot0LearningProfile,
  type Lot0LearningResultSummary,
  type Lot0LearningSettings,
} from './lot0/learning-profile.js';
export {
  buildAssetFactoryKnowledgeBase,
  getAssetFactoryStage,
  listAssetFactoryTools,
} from './asset-factory/knowledge-base.js';
export {
  buildAssetFactoryPlan,
  createAssetProductionRecipe,
  createAssetCuttingQaItem,
  type WorkspaceAssetRecord,
  type WorkspaceReference,
  type AssetFactoryPlan,
  type AssetCuttingQaItem,
} from './asset-factory/planner.js';
export {
  generateHeroRuntimePack,
  type HeroRuntimePackInput,
  type HeroRuntimePackResult,
  type HeroPartSpec,
} from './asset-factory/hero-runtime-pack.js';
export {
  generateEnvironmentKitPack,
  type EnvironmentKitPackInput,
  type EnvironmentKitPackResult,
} from './asset-factory/environment-kit-pack.js';
export {
  decideFidelityPath,
  evaluateFidelityMetrics,
  DEFAULT_FIDELITY_THRESHOLDS,
  SHIPPING_ASSET_PIPELINE,
  type FidelityDecision,
  type FidelityMetrics,
  type FidelityEvaluationInput,
} from './asset-factory/fidelity-engine.js';
export {
  runFidelityQa,
  findFidelityPair,
  type FidelityQaInput,
  type FidelityQaResult,
} from './asset-factory/fidelity-qa.js';
export {
  runCutoutsStage,
  runCleanupStage,
  runAnimationStage,
  runRigStage,
  runExportsStage,
  runQaStage,
  type CutoutsStageInput,
  type CutoutsStageResult,
  type CleanupStageInput,
  type CleanupStageResult,
  type AnimationStageInput,
  type AnimationStageResult,
  type RigStageInput,
  type RigStageResult,
  type ExportsStageInput,
  type ExportsStageResult,
  type QaStageInput,
  type QaStageResult,
} from './asset-stages/run-stages.js';
export {
  executeImageOperation,
  autoRetouchAssetPack,
  segmentWithFloodFill,
  retouchInpaintCpu,
  retouchHybridBoard,
  retouchEnhance,
  createProceduralImage,
  readLatestAssetIou,
  type ImageOperationResult,
} from './vision/image-operations.js';
