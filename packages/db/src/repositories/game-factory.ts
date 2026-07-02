import type {
  FactoryAgentId,
  GameProject,
  GameProjectAsset,
  GameProjectAssetOutput,
  GameProjectAssetSource,
  GameProjectAssetVariant,
  GameProjectBuild,
  GameProjectDocument,
  GameProjectPrompt,
  GameProjectScene,
  GameProjectSnapshot,
  GameProjectTask,
} from '@ellipse/shared';
import {
  GameProjectAssetSchema,
  GameProjectAssetOutputSchema,
  GameProjectAssetSourceSchema,
  GameProjectAssetVariantSchema,
  GameProjectBuildSchema,
  GameProjectDocumentSchema,
  GameProjectPromptSchema,
  GameProjectSchema,
  GameProjectSceneSchema,
  GameProjectSnapshotSchema,
  GameProjectTaskSchema,
} from '@ellipse/shared';
import { getPool } from '../client.js';

const FACTORY_AGENT_BLUEPRINTS: Array<{
  id: FactoryAgentId;
  name: string;
  lane: string;
  description: string;
  capabilities: string[];
}> = [
  {
    id: 'producer',
    name: 'Producer',
    lane: 'production',
    description: 'Owns scope, milestones and cross-agent alignment.',
    capabilities: ['Scope lock', 'Roadmap framing', 'Acceptance gate'],
  },
  {
    id: 'game_design',
    name: 'Game Design',
    lane: 'design',
    description: 'Defines the core loop, systems and player goals.',
    capabilities: ['Core loop', 'Mechanics breakdown', 'Difficulty beats'],
  },
  {
    id: 'narrative',
    name: 'Narrative',
    lane: 'design',
    description: 'Builds story beats, dialog and quest framing.',
    capabilities: ['Pitch tone', 'Quest beats', 'Dialog hooks'],
  },
  {
    id: 'art_direction',
    name: 'Art Direction',
    lane: 'visual',
    description: 'Keeps the project visually coherent across assets and scenes.',
    capabilities: ['Style guide', 'Palette', 'Reference handling'],
  },
  {
    id: 'asset_direction',
    name: 'Asset Direction',
    lane: 'assets',
    description: 'Specifies character, prop and environment assets.',
    capabilities: ['Asset specs', 'Photo-preserving briefs', 'Variant goals'],
  },
  {
    id: 'level_design',
    name: 'Level Design',
    lane: 'world',
    description: 'Shapes scenes, pacing and mission structure.',
    capabilities: ['Scene beats', 'Encounter pacing', 'Traversal layout'],
  },
  {
    id: 'gameplay_programming',
    name: 'Gameplay Programming',
    lane: 'engineering',
    description: 'Owns runtime systems and generated gameplay code.',
    capabilities: ['Player controller', 'Combat hooks', 'Interaction systems'],
  },
  {
    id: 'animation',
    name: 'Animation',
    lane: 'motion',
    description: 'Defines movement loops and state transitions.',
    capabilities: ['Locomotion', 'Pose timing', 'Runtime state map'],
  },
  {
    id: 'qa',
    name: 'QA',
    lane: 'quality',
    description: 'Validates playability and regression risks.',
    capabilities: ['Smoke tests', 'Asset validation', 'Playability checks'],
  },
  {
    id: 'build_release',
    name: 'Build Release',
    lane: 'delivery',
    description: 'Packages the playable preview and release notes.',
    capabilities: ['Web build', 'Manifest packaging', 'Release checklist'],
  },
];

function normalizeDates(row: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...row };
  for (const key of ['created_at', 'updated_at', 'started_at', 'completed_at'] as const) {
    const value = next[key];
    if (value instanceof Date) {
      next[key] = value.toISOString();
    }
  }
  return next;
}

function parseProject(row: Record<string, unknown>): GameProject {
  return GameProjectSchema.parse({
    ...normalizeDates(row),
    source_images: row.source_images ?? [],
    metadata: row.metadata ?? {},
  });
}

function parsePrompt(row: Record<string, unknown>): GameProjectPrompt {
  return GameProjectPromptSchema.parse({
    ...normalizeDates(row),
    source_images: row.source_images ?? [],
    intent: row.intent ?? null,
  });
}

function parseDocument(row: Record<string, unknown>): GameProjectDocument {
  return GameProjectDocumentSchema.parse({
    ...normalizeDates(row),
    payload: row.payload ?? {},
  });
}

function parseTask(row: Record<string, unknown>): GameProjectTask {
  return GameProjectTaskSchema.parse({
    ...normalizeDates(row),
    acceptance_criteria: row.acceptance_criteria ?? [],
    depends_on: row.depends_on ?? [],
    payload: row.payload ?? {},
  });
}

function parseAsset(row: Record<string, unknown>): GameProjectAsset {
  return GameProjectAssetSchema.parse({
    ...normalizeDates(row),
    spec: row.spec ?? {},
  });
}

function parseAssetSource(row: Record<string, unknown>): GameProjectAssetSource {
  return GameProjectAssetSourceSchema.parse({
    ...normalizeDates(row),
    metadata: row.metadata ?? {},
  });
}

function parseAssetVariant(row: Record<string, unknown>): GameProjectAssetVariant {
  return GameProjectAssetVariantSchema.parse({
    ...normalizeDates(row),
    score: row.score == null ? null : Number(row.score),
    settings: row.settings ?? {},
  });
}

function parseAssetOutput(row: Record<string, unknown>): GameProjectAssetOutput {
  return GameProjectAssetOutputSchema.parse({
    ...normalizeDates(row),
    metadata: row.metadata ?? {},
  });
}

function parseScene(row: Record<string, unknown>): GameProjectScene {
  return GameProjectSceneSchema.parse({
    ...normalizeDates(row),
    spec: row.spec ?? {},
  });
}

function parseBuild(row: Record<string, unknown>): GameProjectBuild {
  return GameProjectBuildSchema.parse({
    ...normalizeDates(row),
    manifest: row.manifest ?? {},
  });
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');
  return normalized || 'game-project';
}

export async function ensureGameFactoryAgents(): Promise<void> {
  for (const agent of FACTORY_AGENT_BLUEPRINTS) {
    await getPool().query(
      `INSERT INTO game_agents (id, name, lane, description, status, capabilities)
       VALUES ($1, $2, $3, $4, 'active', $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         lane = EXCLUDED.lane,
         description = EXCLUDED.description,
         capabilities = EXCLUDED.capabilities,
         updated_at = NOW()`,
      [agent.id, agent.name, agent.lane, agent.description, JSON.stringify(agent.capabilities)],
    );
  }
}

export async function createGameProject(input: {
  title: string;
  status: GameProject['status'];
  sourcePrompt: string;
  summary?: string | null;
  genre?: string | null;
  dimension: GameProject['dimension'];
  targetRuntime: GameProject['target_runtime'];
  cameraMode: GameProject['camera_mode'];
  sourceImages?: string[];
  metadata?: Record<string, unknown>;
}): Promise<GameProject> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_projects (
       title, slug, status, source_prompt, summary, genre, dimension, target_runtime, camera_mode, source_images, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.title,
      `${slugify(input.title)}-${Math.random().toString(36).slice(2, 8)}`,
      input.status,
      input.sourcePrompt,
      input.summary ?? null,
      input.genre ?? null,
      input.dimension,
      input.targetRuntime,
      input.cameraMode,
      JSON.stringify(input.sourceImages ?? []),
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return parseProject(rows[0] ?? {});
}

export async function listGameProjects(limit = 24): Promise<GameProject[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_projects ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(parseProject);
}

export async function getGameProject(id: string): Promise<GameProject | null> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_projects WHERE id = $1`,
    [id],
  );
  return rows[0] ? parseProject(rows[0]) : null;
}

export async function createGamePrompt(input: {
  projectId: string;
  prompt: string;
  sourceImages?: string[];
  intent?: Record<string, unknown> | null;
}): Promise<GameProjectPrompt> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_prompts (project_id, prompt, source_images, intent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.projectId,
      input.prompt,
      JSON.stringify(input.sourceImages ?? []),
      input.intent ? JSON.stringify(input.intent) : null,
    ],
  );
  return parsePrompt(rows[0] ?? {});
}

export async function listGamePrompts(projectId: string): Promise<GameProjectPrompt[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_prompts WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  );
  return rows.map(parsePrompt);
}

export async function createGameDocument(input: {
  projectId: string;
  kind: GameProjectDocument['kind'];
  title: string;
  status: GameProjectDocument['status'];
  content: string;
  payload?: Record<string, unknown>;
  createdBy?: string;
}): Promise<GameProjectDocument> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_documents (project_id, kind, title, status, content, payload, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.projectId,
      input.kind,
      input.title,
      input.status,
      input.content,
      JSON.stringify(input.payload ?? {}),
      input.createdBy ?? 'ellipse_cortex',
    ],
  );
  return parseDocument(rows[0] ?? {});
}

export async function listGameDocuments(projectId: string): Promise<GameProjectDocument[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_documents WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId],
  );
  return rows.map(parseDocument);
}

export async function createGameTask(input: {
  id?: string;
  projectId: string;
  parentTaskId?: string | null;
  agentId: GameProjectTask['agent_id'];
  kind: GameProjectTask['kind'];
  title: string;
  description: string;
  status: GameProjectTask['status'];
  priority?: number;
  acceptanceCriteria?: string[];
  dependsOn?: string[];
  payload?: Record<string, unknown>;
}): Promise<GameProjectTask> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_tasks (
       id, project_id, parent_task_id, agent_id, kind, title, description, status, priority, acceptance_criteria, depends_on, payload
     ) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.id ?? null,
      input.projectId,
      input.parentTaskId ?? null,
      input.agentId,
      input.kind,
      input.title,
      input.description,
      input.status,
      input.priority ?? 5,
      JSON.stringify(input.acceptanceCriteria ?? []),
      JSON.stringify(input.dependsOn ?? []),
      JSON.stringify(input.payload ?? {}),
    ],
  );
  return parseTask(rows[0] ?? {});
}

export async function listGameTasks(projectId: string): Promise<GameProjectTask[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_tasks
     WHERE project_id = $1
     ORDER BY priority DESC, created_at ASC`,
    [projectId],
  );
  return rows.map(parseTask);
}

export async function createGameAsset(input: {
  projectId: string;
  kind: GameProjectAsset['kind'];
  role: GameProjectAsset['role'];
  title: string;
  status: GameProjectAsset['status'];
  sourcePrompt?: string | null;
  spec?: Record<string, unknown>;
}): Promise<GameProjectAsset> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_assets (project_id, kind, role, title, status, source_prompt, spec)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.projectId,
      input.kind,
      input.role,
      input.title,
      input.status,
      input.sourcePrompt ?? null,
      JSON.stringify(input.spec ?? {}),
    ],
  );
  return parseAsset(rows[0] ?? {});
}

export async function listGameAssets(projectId: string): Promise<GameProjectAsset[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_assets WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId],
  );
  return rows.map(parseAsset);
}

export async function createGameAssetSource(input: {
  assetId: string;
  sourceType: string;
  url?: string | null;
  filePath?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<GameProjectAssetSource> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_asset_sources (asset_id, source_type, url, file_path, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.assetId,
      input.sourceType,
      input.url ?? null,
      input.filePath ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return parseAssetSource(rows[0] ?? {});
}

export async function listGameAssetSources(projectId: string): Promise<GameProjectAssetSource[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT source.*
     FROM game_asset_sources source
     INNER JOIN game_assets asset ON asset.id = source.asset_id
     WHERE asset.project_id = $1
     ORDER BY source.created_at ASC`,
    [projectId],
  );
  return rows.map(parseAssetSource);
}

export async function createGameAssetVariant(input: {
  assetId: string;
  label: string;
  status: string;
  score?: number | null;
  settings?: Record<string, unknown>;
}): Promise<GameProjectAssetVariant> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_asset_variants (asset_id, label, status, score, settings)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.assetId,
      input.label,
      input.status,
      input.score ?? null,
      JSON.stringify(input.settings ?? {}),
    ],
  );
  return parseAssetVariant(rows[0] ?? {});
}

export async function listGameAssetVariants(projectId: string): Promise<GameProjectAssetVariant[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT variant.*
     FROM game_asset_variants variant
     INNER JOIN game_assets asset ON asset.id = variant.asset_id
     WHERE asset.project_id = $1
     ORDER BY variant.created_at DESC`,
    [projectId],
  );
  return rows.map(parseAssetVariant);
}

export async function createGameAssetOutput(input: {
  variantId: string;
  outputType: string;
  url?: string | null;
  filePath?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<GameProjectAssetOutput> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_asset_outputs (variant_id, output_type, url, file_path, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.variantId,
      input.outputType,
      input.url ?? null,
      input.filePath ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return parseAssetOutput(rows[0] ?? {});
}

export async function listGameAssetOutputs(projectId: string): Promise<GameProjectAssetOutput[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT output.*
     FROM game_asset_outputs output
     INNER JOIN game_asset_variants variant ON variant.id = output.variant_id
     INNER JOIN game_assets asset ON asset.id = variant.asset_id
     WHERE asset.project_id = $1
     ORDER BY output.created_at DESC`,
    [projectId],
  );
  return rows.map(parseAssetOutput);
}

export async function createGameScene(input: {
  projectId: string;
  slug: string;
  title: string;
  sceneType: GameProjectScene['scene_type'];
  status: GameProjectScene['status'];
  spec?: Record<string, unknown>;
}): Promise<GameProjectScene> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_scenes (project_id, slug, title, scene_type, status, spec)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.projectId, input.slug, input.title, input.sceneType, input.status, JSON.stringify(input.spec ?? {})],
  );
  return parseScene(rows[0] ?? {});
}

export async function listGameScenes(projectId: string): Promise<GameProjectScene[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_scenes WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId],
  );
  return rows.map(parseScene);
}

export async function createGameBuild(input: {
  projectId: string;
  target: string;
  status: GameProjectBuild['status'];
  outputUrl?: string | null;
  manifest?: Record<string, unknown>;
}): Promise<GameProjectBuild> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `INSERT INTO game_builds (project_id, target, status, output_url, manifest)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.projectId,
      input.target,
      input.status,
      input.outputUrl ?? null,
      JSON.stringify(input.manifest ?? {}),
    ],
  );
  return parseBuild(rows[0] ?? {});
}

export async function listGameBuilds(projectId: string): Promise<GameProjectBuild[]> {
  const { rows } = await getPool().query<Record<string, unknown>>(
    `SELECT * FROM game_builds WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  );
  return rows.map(parseBuild);
}

export async function getGameProjectSnapshot(projectId: string): Promise<GameProjectSnapshot | null> {
  const project = await getGameProject(projectId);
  if (!project) return null;

  const [prompts, documents, tasks, assets, assetSources, assetVariants, assetOutputs, scenes, builds] = await Promise.all([
    listGamePrompts(projectId),
    listGameDocuments(projectId),
    listGameTasks(projectId),
    listGameAssets(projectId),
    listGameAssetSources(projectId),
    listGameAssetVariants(projectId),
    listGameAssetOutputs(projectId),
    listGameScenes(projectId),
    listGameBuilds(projectId),
  ]);

  return GameProjectSnapshotSchema.parse({
    project,
    prompts,
    documents,
    tasks,
    assets,
    asset_sources: assetSources,
    asset_variants: assetVariants,
    asset_outputs: assetOutputs,
    scenes,
    builds,
  });
}
