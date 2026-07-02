import { importReferenceBoards } from './references.mjs';
import { buildDesignSpecs } from './design.mjs';
import { buildStudioCatalog } from './catalog.mjs';
import { buildRuntimePrep } from './runtime.mjs';

export async function buildVeloriaPrepPack() {
  const referenceIndex = await importReferenceBoards();
  const [design, studioCatalog, runtimeBundle] = await Promise.all([
    buildDesignSpecs(),
    buildStudioCatalog(),
    buildRuntimePrep(),
  ]);

  return {
    references: {
      copied: referenceIndex.copied_references.length,
      file: '01_inputs/references/reference-index.json',
    },
    design,
    studioCatalog: {
      assets: studioCatalog.assets.length,
      file: '03_assets/registry/studio-asset-catalog.json',
    },
    runtimeBundle: {
      file: '05_runtime/config/veloria-runtime-bundle.json',
      firstScene: '04_scenes/level_01/scene-assembly.json',
    },
  };
}
