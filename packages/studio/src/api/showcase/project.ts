import type {
  GameProject,
  GameProjectAsset,
  GameProjectAssetOutput,
  GameProjectAssetVariant,
  GameProjectBuild,
  GameProjectDocument,
  GameProjectPrompt,
  GameProjectScene,
  GameProjectSnapshot,
} from '@ellipse/shared';
import { SHOWCASE_BASE, SHOWCASE_DOC_PATHS, SHOWCASE_PROJECT_ID, SHOWCASE_SLUG, SHOWCASE_TASKS, SHOWCASE_MANIFEST_URL } from './constants.js';
import { FLAGSHIP_GAME, FLAGSHIP_PATHS } from '@ellipse/shared';
import { fetchJsonMaybe, fetchTextMaybe } from './helpers.js';
import type { ShowcaseManifest } from './types.js';

async function fetchShowcaseManifest(): Promise<ShowcaseManifest | null> {
  const raw = await fetchJsonMaybe<Record<string, unknown>>(SHOWCASE_MANIFEST_URL);
  if (!raw) return null;

  if (raw.project && typeof raw.project === 'object') {
    return raw as ShowcaseManifest;
  }

  const slug = (raw.slug as string) ?? FLAGSHIP_GAME.slug;
  const workspaceRoot = `workspaces/${slug}`;

  return {
    project: {
      id: (raw.project_id as string) ?? FLAGSHIP_GAME.id,
      title: (raw.title as string) ?? FLAGSHIP_GAME.title,
      slug,
      status: 'ready',
      source_prompt: FLAGSHIP_GAME.sourcePrompt,
      summary: 'Survivors-like portrait dark fantasy — jeu livrable Ellipse.',
      genre: (raw.genre as string) ?? FLAGSHIP_GAME.genre,
      dimension: FLAGSHIP_GAME.dimension,
      target_runtime: 'ellipse_web_2d',
      camera_mode: FLAGSHIP_GAME.cameraMode,
      source_images: [],
      metadata: { flagship: true, orientation: raw.orientation ?? FLAGSHIP_GAME.orientation },
      created_at: (raw.generated_at as string) ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    workspace: {
      rootDir: workspaceRoot,
      relativeRoot: workspaceRoot,
      readmePath: `${workspaceRoot}/README.md`,
      contextPath: `${workspaceRoot}/08_ops/manifests/veloria-workspace.json`,
    },
    preview_gdl: FLAGSHIP_PATHS.gdlUrl,
    copied_reference_count: 0,
  };
}

function withShowcaseMetadata(project: GameProject): GameProject {
  return {
    ...project,
    metadata: {
      ...(project.metadata ?? {}),
      showcase_mode: true,
      showcase_slug: SHOWCASE_SLUG,
    },
  };
}

export async function buildShowcaseProject(): Promise<GameProject | null> {
  const manifest = await fetchShowcaseManifest();
  if (!manifest) return null;
  return withShowcaseMetadata(manifest.project);
}

export async function buildShowcaseSnapshot(): Promise<GameProjectSnapshot> {
  const manifest = await fetchShowcaseManifest();
  if (!manifest) throw new Error('Showcase manifest unavailable');

  const project = withShowcaseMetadata(manifest.project);
  const studioCatalog = await fetchJsonMaybe<{
    assets: GameProjectAsset[];
    asset_sources: GameProjectSnapshot['asset_sources'];
  }>(`${SHOWCASE_BASE}/03_assets/registry/studio-asset-catalog.json`);
  const assets = studioCatalog?.assets ?? (await fetchJsonMaybe<GameProjectAsset[]>(`${SHOWCASE_BASE}/03_assets/registry/assets.json`)) ?? [];
  const referenceIndex = await fetchJsonMaybe<{ copied_references: Array<{ role: string; source: string; workspace_file: string; url: string }> }>(
    `${SHOWCASE_BASE}/01_inputs/references/reference-index.json`,
  );
  const layout = await fetchJsonMaybe<Record<string, unknown>>(`${SHOWCASE_BASE}/04_scenes/level_01/layout.json`);

  const documents = (await Promise.all(
    SHOWCASE_DOC_PATHS.map(async ([kind, title, url], index) => ({
      id: `00000000-0000-0000-0000-00000000020${index + 1}`,
      project_id: manifest.project.id,
      kind,
      title,
      status: 'generated',
      content: (await fetchTextMaybe(url)) ?? '',
      payload: {},
      created_by: 'workspace_showcase',
    })),
  )) as unknown as GameProjectDocument[];

  const prompts: GameProjectPrompt[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      project_id: manifest.project.id,
      prompt: manifest.project.source_prompt,
      source_images: [],
      intent: {},
    },
  ];

  const assetSources =
    studioCatalog?.asset_sources ??
    assets.flatMap((asset, assetIndex) => {
      const refs = referenceIndex?.copied_references ?? [];
      const mapped = refs.filter((ref) => {
        if (asset.role === 'hero') return ref.role.includes('hero');
      if (asset.role === 'boss') return ref.role.includes('boss');
      if (asset.role === 'npc') return ref.role.includes('character') || ref.role.includes('cast');
      if (asset.role === 'environment') return ref.role.includes('level') || ref.role.includes('world') || ref.role.includes('modular');
      return false;
    });

      return mapped.slice(0, 3).map((ref, sourceIndex) => ({
        id: `30000000-0000-0000-0000-00000000${assetIndex}${sourceIndex}`,
        asset_id: asset.id,
        source_type: 'concept_reference',
        url: ref.url,
        file_path: ref.workspace_file,
        metadata: { role: ref.role, source: ref.source },
      }));
    });

  const builds: GameProjectBuild[] = [
    {
      id: '40000000-0000-0000-0000-000000000001',
      project_id: manifest.project.id,
      target: 'web_preview',
      status: 'ready',
      output_url: `${SHOWCASE_BASE}/07_exports/web/preview.html`,
      manifest: {
        preview_gdl: FLAGSHIP_PATHS.gdlUrl,
        flagship: true,
      },
    },
  ];

  const scenes: GameProjectScene[] = [
    {
      id: '50000000-0000-0000-0000-000000000001',
      project_id: manifest.project.id,
      slug: 'level_01',
      title: 'Arènes Veloria — 6 slices',
      scene_type: 'level',
      status: 'ready',
      spec: layout ?? {},
    },
  ];

  const heroAsset = assets.find((asset) => asset.role === 'hero');
  const environmentAsset = assets.find((asset) => asset.kind === 'environment');
  const assetVariants: GameProjectAssetVariant[] = [
    ...(heroAsset
      ? [
          {
            id: '60000000-0000-0000-0000-000000000001',
            asset_id: heroAsset.id,
            label: 'hd_sprite_sheet',
            status: 'ready',
            score: 74,
            settings: {
              source: 'workspace_showcase',
              generated_from: 'build-echoes-hero-pack',
            },
          },
          {
            id: '60000000-0000-0000-0000-000000000002',
            asset_id: heroAsset.id,
            label: 'idle_motion_pack',
            status: 'ready',
            score: 68,
            settings: {
              source: 'workspace_showcase',
              generated_from: 'build-echoes-hero-pack',
            },
          },
        ]
      : []),
    ...(environmentAsset
      ? [
          {
            id: '60000000-0000-0000-0000-000000000003',
            asset_id: environmentAsset.id,
            label: 'hd_sprite_sheet',
            status: 'ready',
            score: 66,
            settings: {
              source: 'workspace_showcase',
              generated_from: 'build-echoes-environment-pack',
            },
          },
        ]
      : []),
  ];

  const assetOutputs: GameProjectAssetOutput[] = [
    ...(heroAsset
      ? [
          {
            id: '70000000-0000-0000-0000-000000000001',
            variant_id: '60000000-0000-0000-0000-000000000001',
            output_type: 'runtime_atlas',
            url: `${SHOWCASE_BASE}/03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_atlas.png`,
            file_path: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_atlas.png',
            metadata: { kind: 'image', role: 'hero' },
          },
          {
            id: '70000000-0000-0000-0000-000000000002',
            variant_id: '60000000-0000-0000-0000-000000000001',
            output_type: 'cutout_clean',
            url: `${SHOWCASE_BASE}/03_assets/characters/hero__the-echo-main-hero/03_cleanup/cutout_clean.png`,
            file_path: '03_assets/characters/hero__the-echo-main-hero/03_cleanup/cutout_clean.png',
            metadata: { kind: 'image', role: 'hero' },
          },
          {
            id: '70000000-0000-0000-0000-000000000003',
            variant_id: '60000000-0000-0000-0000-000000000002',
            output_type: 'animation_manifest',
            url: `${SHOWCASE_BASE}/03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json`,
            file_path: '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json',
            metadata: { kind: 'json', role: 'hero' },
          },
        ]
      : []),
    ...(environmentAsset
      ? [
          {
            id: '70000000-0000-0000-0000-000000000004',
            variant_id: '60000000-0000-0000-0000-000000000003',
            output_type: 'playfield_crop',
            url: `${SHOWCASE_BASE}/03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png`,
            file_path: '03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png',
            metadata: { kind: 'image', role: 'environment' },
          },
          {
            id: '70000000-0000-0000-0000-000000000005',
            variant_id: '60000000-0000-0000-0000-000000000003',
            output_type: 'environment_manifest',
            url: `${SHOWCASE_BASE}/03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json`,
            file_path: '03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json',
            metadata: { kind: 'json', role: 'environment' },
          },
        ]
      : []),
  ];

  return {
    project,
    prompts,
    documents,
    tasks: SHOWCASE_TASKS,
    assets,
    asset_sources: assetSources as GameProjectSnapshot['asset_sources'],
    asset_variants: assetVariants,
    asset_outputs: assetOutputs,
    scenes,
    builds,
  };
}

export { SHOWCASE_PROJECT_ID };
