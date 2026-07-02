import { buildSeedDocuments } from './data/documents.mjs';
import {
  buildAnimationSpecs,
  buildAssetPrompts,
  buildEncounterPlan,
  buildMobilePerfProfile,
  buildSeedAssets,
  buildSeedTasks,
  buildStyleGuide,
} from './data/content.mjs';
import { buildSeedProject } from './data/project.mjs';
import { buildReferencePlan } from './data/references.mjs';
import { buildLevelNotesMd, buildPreviewChecklistMd, buildTechnicalPipelineMd } from './data/text-content.mjs';

export function buildSeedData() {
  const timestamp = new Date().toISOString();
  const project = buildSeedProject(timestamp);

  return {
    project,
    documents: buildSeedDocuments(project),
    tasks: buildSeedTasks(project),
    assets: buildSeedAssets(project),
    referencePlan: buildReferencePlan(),
    assetPrompts: buildAssetPrompts(),
    animationSpecs: buildAnimationSpecs(),
    encounterPlan: buildEncounterPlan(),
    mobilePerfProfile: buildMobilePerfProfile(),
    styleGuide: buildStyleGuide(),
    technicalPipelineMd: buildTechnicalPipelineMd(),
    levelNotesMd: buildLevelNotesMd(),
    previewChecklistMd: buildPreviewChecklistMd(),
  };
}
