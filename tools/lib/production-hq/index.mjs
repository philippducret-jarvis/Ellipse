import { buildProductionArtifacts, buildFamilyIndex, buildRoutingMatrix, buildWorkOrders } from './builders.mjs';
import { buildProductionFilePlan } from './file-plan.mjs';
import { readWorkspaceJson, resolveEchoesWorkspaceRoot, writeWorkspaceFiles } from './io.mjs';

export async function syncEchoesProductionHq({ cwd = process.cwd(), checkedAt = new Date().toISOString() } = {}) {
  const workspaceRoot = resolveEchoesWorkspaceRoot(cwd);
  const [assets, productionPlan, references, renderTargets, agentCapabilities] = await Promise.all([
    readWorkspaceJson(workspaceRoot, '03_assets/registry/assets.json'),
    readWorkspaceJson(workspaceRoot, '03_assets/registry/asset-production-plan.json'),
    readWorkspaceJson(workspaceRoot, '01_inputs/references/reference-index.json'),
    readWorkspaceJson(workspaceRoot, '03_assets/registry/render-targets.json'),
    readWorkspaceJson(workspaceRoot, '08_ops/manifests/agent-capabilities.json'),
  ]);

  const familyIndex = buildFamilyIndex(assets);
  const routingMatrix = buildRoutingMatrix(assets);
  const { currentOrders, syntheticOrders, allWorkOrders } = buildWorkOrders({
    assets,
    productionPlan,
    references,
  });

  const artifacts = buildProductionArtifacts({
    checkedAt,
    assets,
    renderTargets,
    agentCapabilities,
    familyIndex,
    routingMatrix,
    workOrders: allWorkOrders,
  });

  const files = buildProductionFilePlan({
    checkedAt,
    assetTaxonomy: artifacts.assetTaxonomy,
    modelRouting: artifacts.modelRouting,
    productionBoard: artifacts.productionBoard,
    productionManifest: artifacts.productionManifest,
    currentWorkOrders: currentOrders,
    syntheticWorkOrders: syntheticOrders,
  });

  await writeWorkspaceFiles(workspaceRoot, files);

  return {
    checked_at: checkedAt,
    workspace_root: workspaceRoot,
    files_written: files.map((file) => file.path),
    families: familyIndex.length,
    work_orders: allWorkOrders.length,
    current_assets: assets.length,
  };
}
