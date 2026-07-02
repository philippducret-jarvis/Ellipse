import { join } from 'node:path';
import { ALL_ASSETS } from './data.mjs';
import { ASSETS_ROOT, PROJECT_ID, PUBLIC_WORKSPACE_ROOT, REFERENCES_ROOT, REGISTRY_ROOT } from './constants.mjs';
import { cropBoardRegion } from './crop-utils.mjs';
import { writeJson } from './io.mjs';

function assetSourceId(assetId, index) {
  return `83000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function buildAssetRecord(asset) {
  return {
    id: asset.id,
    project_id: PROJECT_ID,
    kind: asset.kind,
    role: asset.role,
    title: asset.title,
    status: asset.status,
    source_prompt:
      'Board-derived Veloria asset preview. Preserve premium dark fantasy, vertical mobile readability, noble materials, gold-violet-carmin palette and clear lane-based combat silhouettes.',
    spec: {
      pack_root: asset.pack_root,
      quality_tier: 'board-derived curated preview',
      canonical_board: asset.board,
      display_title: asset.display_title,
      role_text: asset.role_text,
    },
  };
}

function buildSourceRecord(asset, index) {
  return {
    id: assetSourceId(asset.id, index + 1),
    asset_id: asset.id,
    source_type: 'concept_reference',
    url: `${PUBLIC_WORKSPACE_ROOT}/${asset.preview_file}`,
    file_path: asset.preview_file,
    metadata: {
      board: asset.board,
      display_title: asset.display_title,
      role_text: asset.role_text,
    },
  };
}

export async function buildStudioCatalog() {
  const assetSources = [];
  for (const asset of ALL_ASSETS) {
    await cropBoardRegion(
      join(REFERENCES_ROOT, asset.board),
      join(process.cwd(), 'workspaces', 'veloria-veille-des-lames', asset.preview_file),
      asset.crop,
      { trim: false, padding: 0 },
    );
  }

  const assets = ALL_ASSETS.map(buildAssetRecord);
  ALL_ASSETS.forEach((asset, index) => {
    assetSources.push(buildSourceRecord(asset, index));
  });

  const catalog = {
    project_id: PROJECT_ID,
    generated_at: new Date().toISOString(),
    intent: 'Curated Veloria board-derived previews for Studio and production preparation.',
    assets,
    asset_sources: assetSources,
  };

  await writeJson(join(REGISTRY_ROOT, 'studio-asset-catalog.json'), catalog);
  await writeJson(join(REGISTRY_ROOT, 'veloria-asset-roster.json'), {
    generated_at: catalog.generated_at,
    counts: {
      heroes: assets.filter((asset) => asset.role === 'hero').length,
      supports: assets.filter((asset) => asset.role === 'companion').length,
      enemies: assets.filter((asset) => asset.role === 'enemy').length,
      bosses: assets.filter((asset) => asset.role === 'boss').length,
      environments: assets.filter((asset) => asset.role === 'environment').length,
      systems: assets.filter((asset) => ['ui', 'relic', 'armor'].includes(asset.role)).length,
    },
    assets: assets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      role: asset.role,
      kind: asset.kind,
      pack_root: asset.spec.pack_root,
      preview_file: assetSources.find((source) => source.asset_id === asset.id)?.file_path ?? null,
    })),
  });

  return catalog;
}
