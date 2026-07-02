import { z } from 'zod';

export const GAME_PROJECT_STATUS = ['draft', 'planning', 'producing', 'review', 'ready', 'archived'] as const;
export const GAME_PROJECT_DOCUMENT_KINDS = [
  'pitch',
  'game_design_document',
  'narrative_bible',
  'art_direction',
  'technical_design',
  'production_plan',
  'iteration_brief',
] as const;
export const GAME_PROJECT_DOCUMENT_STATUS = ['draft', 'generated', 'approved'] as const;
export const FACTORY_AGENT_IDS = [
  'producer',
  'game_design',
  'narrative',
  'art_direction',
  'asset_direction',
  'level_design',
  'gameplay_programming',
  'animation',
  'qa',
  'build_release',
] as const;
export const GAME_TASK_STATUS = ['backlog', 'ready', 'in_progress', 'blocked', 'review', 'done'] as const;
export const GAME_TASK_KIND = ['vision', 'document', 'asset', 'scene', 'code', 'qa', 'build'] as const;
export const GAME_ASSET_KIND = [
  'character',
  'environment',
  'ui',
  'audio',
  'model',
  'fx',
  'prop',
  'tileset',
  'sprite',
  'portrait',
  'music',
  'voice',
  'material',
  'animation',
] as const;
export const GAME_ASSET_STATUS = ['source_ready', 'concept', 'in_progress', 'review', 'approved'] as const;
export const GAME_ASSET_ROLE = [
  'hero',
  'companion',
  'npc',
  'enemy',
  'monster',
  'boss',
  'ally',
  'guide',
  'merchant',
  'summon',
  'mount',
  'prop',
  'weapon',
  'armor',
  'relic',
  'pickup',
  'collectible',
  'checkpoint',
  'hazard',
  'trap',
  'door',
  'portal',
  'altar',
  'environment',
  'biome',
  'background',
  'tileset',
  'ui',
  'fx',
  'music',
  'sfx',
  'voice',
] as const;
export const GAME_ASSET_SOURCE_TYPE = [
  'photo_reference',
  'concept_reference',
  'moodboard',
  'texture_reference',
  'generated_seed',
] as const;
export const GAME_ASSET_VARIANT_STATUS = ['queued', 'in_progress', 'review', 'ready', 'failed'] as const;
export const GAME_ASSET_VARIANT_LABEL = [
  'hd_sprite_sheet',
  'model_25d_turn',
  'model_3d_motion',
  'idle_motion_pack',
  'combat_pose_pack',
  'boss_encounter_proto',
] as const;
export const GAME_SCENE_TYPE = ['level', 'hub', 'menu', 'cutscene'] as const;
export const GAME_SCENE_STATUS = ['draft', 'blocked', 'ready'] as const;
export const GAME_BUILD_STATUS = ['queued', 'building', 'ready', 'failed'] as const;
export const GAME_RUNTIME = ['ellipse_web_2d', 'ellipse_photo_3d'] as const;
export const GAME_CAMERA_MODE = ['side_view', 'top_down', 'third_person', 'isometric'] as const;

export const GameProjectStatusSchema = z.enum(GAME_PROJECT_STATUS);
export const GameProjectDocumentKindSchema = z.enum(GAME_PROJECT_DOCUMENT_KINDS);
export const GameProjectDocumentStatusSchema = z.enum(GAME_PROJECT_DOCUMENT_STATUS);
export const FactoryAgentIdSchema = z.enum(FACTORY_AGENT_IDS);
export const GameTaskStatusSchema = z.enum(GAME_TASK_STATUS);
export const GameTaskKindSchema = z.enum(GAME_TASK_KIND);
export const GameAssetKindSchema = z.enum(GAME_ASSET_KIND);
export const GameAssetStatusSchema = z.enum(GAME_ASSET_STATUS);
export const GameAssetRoleSchema = z.enum(GAME_ASSET_ROLE);
export const GameAssetSourceTypeSchema = z.enum(GAME_ASSET_SOURCE_TYPE);
export const GameAssetVariantStatusSchema = z.enum(GAME_ASSET_VARIANT_STATUS);
export const GameAssetVariantLabelSchema = z.enum(GAME_ASSET_VARIANT_LABEL);
export const GameSceneTypeSchema = z.enum(GAME_SCENE_TYPE);
export const GameSceneStatusSchema = z.enum(GAME_SCENE_STATUS);
export const GameBuildStatusSchema = z.enum(GAME_BUILD_STATUS);
export const GameRuntimeSchema = z.enum(GAME_RUNTIME);
export const GameCameraModeSchema = z.enum(GAME_CAMERA_MODE);

const JsonObjectSchema = z.record(z.unknown());

export const GameProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: GameProjectStatusSchema,
  source_prompt: z.string(),
  summary: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  dimension: z.enum(['2d', '2.5d', '3d']),
  target_runtime: GameRuntimeSchema,
  camera_mode: GameCameraModeSchema,
  source_images: z.array(z.string()).default([]),
  metadata: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectPromptSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  prompt: z.string(),
  source_images: z.array(z.string()).default([]),
  intent: JsonObjectSchema.nullable().optional(),
  created_at: z.string().optional(),
});

export const GameProjectDocumentSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  kind: GameProjectDocumentKindSchema,
  title: z.string(),
  status: GameProjectDocumentStatusSchema,
  content: z.string(),
  payload: JsonObjectSchema.default({}),
  created_by: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectTaskSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  parent_task_id: z.string().uuid().nullable().optional(),
  agent_id: FactoryAgentIdSchema,
  kind: GameTaskKindSchema,
  title: z.string(),
  description: z.string(),
  status: GameTaskStatusSchema,
  priority: z.number().int().min(0).max(10),
  acceptance_criteria: z.array(z.string()).default([]),
  depends_on: z.array(z.string().uuid()).default([]),
  payload: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectAssetSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  kind: GameAssetKindSchema,
  role: GameAssetRoleSchema,
  title: z.string(),
  status: GameAssetStatusSchema,
  source_prompt: z.string().nullable().optional(),
  spec: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectAssetSourceSchema = z.object({
  id: z.string().uuid(),
  asset_id: z.string().uuid(),
  source_type: GameAssetSourceTypeSchema.or(z.string()),
  url: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  metadata: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
});

export const GameProjectAssetVariantSchema = z.object({
  id: z.string().uuid(),
  asset_id: z.string().uuid(),
  label: GameAssetVariantLabelSchema.or(z.string()),
  status: GameAssetVariantStatusSchema.or(z.string()),
  score: z.number().nullable().optional(),
  settings: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectAssetOutputSchema = z.object({
  id: z.string().uuid(),
  variant_id: z.string().uuid(),
  output_type: z.string(),
  url: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  metadata: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
});

export const GameProjectSceneSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  scene_type: GameSceneTypeSchema,
  status: GameSceneStatusSchema,
  spec: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectBuildSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  target: z.string(),
  status: GameBuildStatusSchema,
  output_url: z.string().nullable().optional(),
  manifest: JsonObjectSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const GameProjectSnapshotSchema = z.object({
  project: GameProjectSchema,
  prompts: z.array(GameProjectPromptSchema),
  documents: z.array(GameProjectDocumentSchema),
  tasks: z.array(GameProjectTaskSchema),
  assets: z.array(GameProjectAssetSchema),
  asset_sources: z.array(GameProjectAssetSourceSchema),
  asset_variants: z.array(GameProjectAssetVariantSchema),
  asset_outputs: z.array(GameProjectAssetOutputSchema),
  scenes: z.array(GameProjectSceneSchema),
  builds: z.array(GameProjectBuildSchema),
});

export type GameProject = z.infer<typeof GameProjectSchema>;
export type GameProjectPrompt = z.infer<typeof GameProjectPromptSchema>;
export type GameProjectDocument = z.infer<typeof GameProjectDocumentSchema>;
export type GameProjectTask = z.infer<typeof GameProjectTaskSchema>;
export type GameProjectAsset = z.infer<typeof GameProjectAssetSchema>;
export type GameProjectAssetSource = z.infer<typeof GameProjectAssetSourceSchema>;
export type GameProjectAssetVariant = z.infer<typeof GameProjectAssetVariantSchema>;
export type GameProjectAssetOutput = z.infer<typeof GameProjectAssetOutputSchema>;
export type GameProjectScene = z.infer<typeof GameProjectSceneSchema>;
export type GameProjectBuild = z.infer<typeof GameProjectBuildSchema>;
export type GameProjectSnapshot = z.infer<typeof GameProjectSnapshotSchema>;
export type FactoryAgentId = z.infer<typeof FactoryAgentIdSchema>;
