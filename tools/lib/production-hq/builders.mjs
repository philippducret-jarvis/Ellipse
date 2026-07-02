import { ASSET_ROOT_MAP, CANONICAL_FAMILIES, SYNTHETIC_SLOTS } from './catalog.mjs';
import { buildRoutingSources, familyIdForRole, folderGroupForRole, roleRoutingProfile } from './routing.mjs';

export function stageCompletion(assetRoot, outputName) {
  if (!assetRoot) return 'pending';
  const rel = outputName.toLowerCase();
  if (rel.includes('rig') && assetRoot.includes('hero__the-echo-main-hero')) return 'ready';
  if (rel.includes('runtime_atlas') && assetRoot.includes('hero__the-echo-main-hero')) return 'ready';
  if (rel.includes('environment_runtime_manifest') && assetRoot.includes('environment__origin-tree-level-kit')) return 'ready';
  if (rel.includes('cutout_clean') && assetRoot.includes('hero__the-echo-main-hero')) return 'ready';
  if (rel.includes('playfield') && assetRoot.includes('environment__origin-tree-level-kit')) return 'ready';
  return 'queued';
}

export function buildFamilyIndex(assets) {
  return CANONICAL_FAMILIES.map((family) => {
    const realized = assets.filter((asset) => family.roles.includes(asset.role));
    return {
      ...family,
      realized_assets: realized.map((asset) => ({
        id: asset.id,
        title: asset.title,
        role: asset.role,
        kind: asset.kind,
        workspace_root: ASSET_ROOT_MAP.get(asset.id) ?? null,
      })),
    };
  });
}

export function buildRoutingMatrix(assets) {
  const routedAssets = [
    ...assets,
    ...SYNTHETIC_SLOTS.map((slot, index) => ({
      id: `synthetic-${index + 1}`,
      title: slot.title,
      role: slot.role,
      kind: slot.kind,
      status: 'planned',
    })),
  ];

  return routedAssets.map((asset) => ({
    asset_id: asset.id,
    title: asset.title,
    role: asset.role,
    kind: asset.kind,
    folder_group: folderGroupForRole(asset.role),
    family_id: familyIdForRole(asset.role),
    routing: roleRoutingProfile(asset.role, asset.kind),
  }));
}

function buildSyntheticStageSet(slot, routing) {
  return [
    {
      id: 'reference_lock',
      title: 'Reference lock',
      status: 'queued',
      agents: ['asset_direction'],
      preferred_tools: ['comfyui'],
      quality_gates: ['Reference board linked'],
    },
    {
      id: 'generation',
      title: 'Generation',
      status: 'queued',
      agents: slot.role === 'music' ? ['music'] : slot.role === 'fx' ? ['vfx'] : ['asset_direction', 'animation'],
      preferred_tools: routing.models.map((model) => model.id),
      quality_gates: ['Output bundle exists'],
    },
    {
      id: 'runtime_export',
      title: 'Runtime export',
      status: 'queued',
      agents: ['build_release'],
      preferred_tools: ['aseprite_export'],
      quality_gates: ['Manifest registered'],
    },
  ];
}

export function buildWorkOrders({ assets, productionPlan, references }) {
  const recipesByAsset = new Map(productionPlan.recipes.map((recipe) => [recipe.assetId, recipe]));

  const currentOrders = assets.map((asset) => {
    const recipe = recipesByAsset.get(asset.id);
    const assetRoot = ASSET_ROOT_MAP.get(asset.id) ?? null;
    const routing = roleRoutingProfile(asset.role, asset.kind);
    const stages = recipe?.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      status: stage.outputs.some((outputName) => stageCompletion(assetRoot ?? '', outputName) === 'ready') ? 'ready' : 'queued',
      agents: stage.agents,
      preferred_tools: stage.preferredTools,
      quality_gates: stage.qualityGates,
    })) ?? [];

    return {
      asset_id: asset.id,
      asset_title: asset.title,
      role: asset.role,
      kind: asset.kind,
      asset_root: assetRoot,
      status: asset.status,
      execution_profile: routing.execution,
      assigned_agents: [...new Set(stages.flatMap((stage) => stage.agents))],
      source_refs: recipe?.references ?? references.copied_references.filter((ref) => ref.role.includes(asset.role)),
      expected_outputs: routing.outputs,
      stages,
      queue_state: stages.every((stage) => stage.status === 'ready') ? 'advanced' : stages.some((stage) => stage.status === 'ready') ? 'in_progress' : 'queued',
    };
  });

  const syntheticOrders = SYNTHETIC_SLOTS.map((slot, index) => {
    const routing = roleRoutingProfile(slot.role, slot.kind);
    return {
      asset_id: `synthetic-${index + 1}`,
      asset_title: slot.title,
      role: slot.role,
      kind: slot.kind,
      asset_root: slot.root,
      status: 'planned',
      execution_profile: routing.execution,
      assigned_agents: slot.role === 'music' ? ['music', 'build_release'] : slot.role === 'fx' ? ['vfx', 'build_release'] : ['asset_direction', 'animation', 'build_release'],
      source_refs: [],
      expected_outputs: routing.outputs,
      stages: buildSyntheticStageSet(slot, routing),
      queue_state: 'queued',
    };
  });

  return {
    currentOrders,
    syntheticOrders,
    allWorkOrders: [...currentOrders, ...syntheticOrders],
  };
}

export function buildProductionArtifacts({ checkedAt, assets, renderTargets, agentCapabilities, familyIndex, routingMatrix, workOrders }) {
  const assetTaxonomy = {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    families: familyIndex,
  };

  const modelRouting = {
    checked_at: checkedAt,
    render_targets: renderTargets,
    routes: routingMatrix,
    sources: buildRoutingSources(),
  };

  const productionBoard = {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    stats: {
      taxonomy_families: familyIndex.length,
      current_assets: assets.length,
      planned_work_orders: workOrders.length,
      active_agents: agentCapabilities.agents.length,
    },
    links: {
      taxonomy: '03_assets/registry/asset-taxonomy.json',
      routing: '03_assets/registry/model-routing.json',
      work_orders: '08_ops/manifests/agent-work-orders.json',
    },
    work_orders: workOrders,
  };

  const productionManifest = {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    taxonomy_url: '/workspaces/echoes-of-the-mushroom-realm/03_assets/registry/asset-taxonomy.json',
    routing_url: '/workspaces/echoes-of-the-mushroom-realm/03_assets/registry/model-routing.json',
    work_orders_url: '/workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/agent-work-orders.json',
    production_url: '/workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/production-hq.json',
  };

  return { assetTaxonomy, modelRouting, productionBoard, productionManifest };
}
