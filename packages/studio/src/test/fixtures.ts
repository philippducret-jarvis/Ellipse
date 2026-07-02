import type {
  GameProjectAsset,
  GameProjectAssetSource,
  GameProjectBuild,
  GameProjectDocument,
  GameProjectPrompt,
  GameProjectSnapshot,
  GameProjectTask,
} from '@ellipse/shared';
import type { WorkspaceFilePayload, WorkspaceOverview } from '../api/client.js';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const PROMPT_ID = '22222222-2222-4222-8222-222222222222';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';
const TASK_ID = '44444444-4444-4444-8444-444444444444';
const BUILD_ID = '55555555-5555-4555-8555-555555555555';
const ASSET_ID = '66666666-6666-4666-8666-666666666666';
const ASSET_SOURCE_ID = '77777777-7777-4777-8777-777777777777';

export function createStudioTestSnapshot(overrides: Partial<GameProjectSnapshot> = {}): GameProjectSnapshot {
  const documents = overrides.documents ?? [createDocument()];
  const tasks = overrides.tasks ?? [createTask()];
  const prompts = overrides.prompts ?? [createPrompt()];
  const builds = overrides.builds ?? [createBuild()];

  return {
    project: {
      id: PROJECT_ID,
      title: 'Echoes of the Mushroom Realm',
      slug: 'echoes-of-the-mushroom-realm',
      status: 'planning',
      source_prompt: 'Create a dark fantasy exploration game.',
      dimension: '2d',
      target_runtime: 'ellipse_web_2d',
      camera_mode: 'side_view',
      source_images: [],
      metadata: { showcase_mode: true },
      summary: 'Dark fantasy 2D action-exploration slice.',
      genre: 'platformer',
      ...overrides.project,
    },
    prompts,
    documents,
    tasks,
    assets: overrides.assets ?? [],
    asset_sources: overrides.asset_sources ?? [],
    asset_variants: overrides.asset_variants ?? [],
    asset_outputs: overrides.asset_outputs ?? [],
    scenes: overrides.scenes ?? [],
    builds,
  };
}

export function createPrompt(overrides: Partial<GameProjectPrompt> = {}): GameProjectPrompt {
  return {
    id: PROMPT_ID,
    project_id: PROJECT_ID,
    prompt: 'Create a dark fantasy exploration game.',
    source_images: [],
    intent: { mode: 'showcase' },
    created_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

export function createDocument(overrides: Partial<GameProjectDocument> = {}): GameProjectDocument {
  return {
    id: DOCUMENT_ID,
    project_id: PROJECT_ID,
    kind: 'pitch',
    title: 'Pitch',
    status: 'generated',
    content: '# Pitch\nA playable vertical slice.\n- Hero\n- Boss',
    payload: {},
    created_by: 'test',
    created_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

export function createTask(overrides: Partial<GameProjectTask> = {}): GameProjectTask {
  return {
    id: TASK_ID,
    project_id: PROJECT_ID,
    agent_id: 'producer',
    kind: 'vision',
    title: 'Lock MVP',
    description: 'desc',
    status: 'ready',
    priority: 1,
    acceptance_criteria: ['done'],
    depends_on: [],
    payload: {},
    ...overrides,
  };
}

export function createBuild(overrides: Partial<GameProjectBuild> = {}): GameProjectBuild {
  return {
    id: BUILD_ID,
    project_id: PROJECT_ID,
    target: 'web_preview',
    status: 'ready',
    output_url: '/build.zip',
    manifest: {
      entry: '/workspaces/echoes-of-the-mushroom-realm/07_exports/web/preview.html',
      runtime: 'ellipse_web_2d',
    },
    created_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

export function createAsset(overrides: Partial<GameProjectAsset> = {}): GameProjectAsset {
  return {
    id: ASSET_ID,
    project_id: PROJECT_ID,
    kind: 'character',
    role: 'hero',
    title: "L'Echo",
    status: 'source_ready',
    source_prompt: 'A dark fantasy hero with a red scarf.',
    spec: {},
    created_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

export function createAssetSource(overrides: Partial<GameProjectAssetSource> = {}): GameProjectAssetSource {
  return {
    id: ASSET_SOURCE_ID,
    asset_id: ASSET_ID,
    source_type: 'concept_reference',
    url: '/references/hero.png',
    file_path: null,
    metadata: {},
    created_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

export function createWorkspaceOverview(): WorkspaceOverview {
  return {
    root_path: 'workspaces/echoes-of-the-mushroom-realm',
    public_base: '/workspaces/echoes-of-the-mushroom-realm',
    tree: [
      {
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        ext: '.md',
        size: 240,
        url: '/workspaces/echoes-of-the-mushroom-realm/README.md',
      },
      {
        name: '08_ops',
        path: '08_ops',
        type: 'directory',
        children: [
          {
            name: 'production-hq.json',
            path: '08_ops/manifests/production-hq.json',
            type: 'file',
            ext: '.json',
            size: 512,
            url: '/workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/production-hq.json',
          },
        ],
      },
    ],
    stats: {
      files: 2,
      directories: 1,
      images: 0,
      json: 1,
      markdown: 1,
    },
    highlights: {
      preview_url: '/workspaces/echoes-of-the-mushroom-realm/07_exports/web/preview.html',
      workspace_manifest_url: '/workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/echoes-workspace.json',
      readme_url: '/workspaces/echoes-of-the-mushroom-realm/README.md',
    },
  };
}

export function createWorkspaceFile(overrides: Partial<WorkspaceFilePayload> = {}): WorkspaceFilePayload {
  return {
    path: 'README.md',
    name: 'README.md',
    ext: '.md',
    kind: 'markdown',
    url: '/workspaces/echoes-of-the-mushroom-realm/README.md',
    size: 240,
    content: '# Echoes\nWorkspace overview',
    ...overrides,
  };
}
