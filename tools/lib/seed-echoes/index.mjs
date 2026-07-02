import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { scaffoldGameWorkspace } from '../../../packages/orchestrator/dist/workspace-scaffold.js';
import { generateLevelLayout } from '../../../packages/shared/dist/gdl/level-gen.js';
import { buildSeedData } from './data.mjs';
import { buildSeedFilePlan } from './file-plan.mjs';
import { safeCopy, writeWorkspaceFiles } from './io.mjs';
import { buildPreviewFiles, buildPreviewGdl, gdlPathForWorkspace } from './preview.mjs';

export async function seedEchoesWorkspace() {
  const seedData = buildSeedData();
  const { project, documents, tasks, assets, referencePlan } = seedData;

  const workspace = await scaffoldGameWorkspace({
    project,
    primaryPrompt: project.source_prompt,
    sourceImages: referencePlan.map((entry) => entry.source),
    documents,
    tasks,
    assets,
  });

  const layout = generateLevelLayout('platformer', 1280, 720, 'echoes_mushroom_realm');
  const refsDir = join(workspace.rootDir, '01_inputs', 'references');
  await mkdir(refsDir, { recursive: true });

  const copied = [];
  for (const entry of referencePlan) {
    copied.push(await safeCopy(entry.source, join(refsDir, entry.target)));
  }

  const copiedRefs = referencePlan
    .filter((_, index) => copied[index]?.ok)
    .map((entry) => ({
      role: entry.role,
      source: entry.source,
      workspace_file: `01_inputs/references/${entry.target}`,
      url: gdlPathForWorkspace(project.slug, `01_inputs/references/${entry.target}`),
    }));

  const previewGdl = buildPreviewGdl({ project, layout, copiedRefs });
  const previewFiles = await buildPreviewFiles({ title: project.title });

  const files = buildSeedFilePlan({
    ...seedData,
    workspace,
    copiedRefs,
    layout,
    previewGdl,
    previewFiles,
  });

  await writeWorkspaceFiles(files);

  return {
    workspace: workspace.rootDir,
    preview_gdl: join(workspace.rootDir, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
    copied_reference_count: copiedRefs.length,
    missing_references: copied
      .filter((entry) => !entry.ok)
      .map((entry) => ({ source: entry.source, target: entry.target })),
  };
}
