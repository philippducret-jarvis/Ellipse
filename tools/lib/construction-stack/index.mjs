import { buildConstructionDocs } from './docs.mjs';
import { buildConstructionFilePlan } from './file-plan.mjs';
import { buildFoundationData } from './foundation.mjs';
import { buildConstructionGraph, buildConstructionManifest, buildSurfaceManifests } from './graph.mjs';
import { readWorkspaceJson, resolveEchoesWorkspaceRoot, writeWorkspaceFiles } from './io.mjs';
import { buildOperatingData } from './operating.mjs';
import { buildSystemsData } from './systems.mjs';
import { buildConstructionWebFiles } from './web.mjs';

export async function syncEchoesConstructionStack({ cwd = process.cwd(), checkedAt = new Date().toISOString() } = {}) {
  const workspaceRoot = resolveEchoesWorkspaceRoot(cwd);
  const [layout, encounters, animationSpecs, assetPrompts, assets] = await Promise.all([
    readWorkspaceJson(workspaceRoot, '04_scenes/level_01/layout.json'),
    readWorkspaceJson(workspaceRoot, '04_scenes/level_01/encounters.json'),
    readWorkspaceJson(workspaceRoot, '03_assets/registry/animation-specs.json'),
    readWorkspaceJson(workspaceRoot, '02_design/prompts/asset-prompts.json'),
    readWorkspaceJson(workspaceRoot, '03_assets/registry/assets.json'),
  ]);

  const foundation = buildFoundationData({ checkedAt, layout, encounters });
  const systems = buildSystemsData({ checkedAt, layout });
  const operating = buildOperatingData({ checkedAt });
  const docs = buildConstructionDocs({ checkedAt });
  const constructionGraph = buildConstructionGraph({ checkedAt, designStrata: foundation.designStrata, agentHandoffs: foundation.agentHandoffs });
  const constructionManifest = buildConstructionManifest({ checkedAt, designStrata: foundation.designStrata });
  const surfaceManifests = buildSurfaceManifests({ checkedAt });
  const web = await buildConstructionWebFiles();

  const files = buildConstructionFilePlan({
    docs,
    foundation,
    graph: {
      constructionGraph,
      constructionManifest,
      ...surfaceManifests,
    },
    systems,
    operating,
    web,
  });

  await writeWorkspaceFiles(workspaceRoot, files);

  return {
    checked_at: checkedAt,
    workspace_root: workspaceRoot,
    assets: assets.length,
    files_written: files.map((file) => file.path),
    references: {
      hero_prompt: assetPrompts.hero.title,
      environment_prompt: assetPrompts.environment.title,
      hero_required_clips: animationSpecs.hero.required_clips.length,
    },
  };
}
