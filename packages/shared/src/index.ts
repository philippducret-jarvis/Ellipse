import { z } from 'zod';
import { AGENT_IDS, type AgentType } from './agents/catalog.js';
import { EntitySchema, SceneSchema, SystemSchema } from './gdl/ir.js';

export { AGENT_CATALOG, AGENT_IDS, WORK_OFFERINGS, DOMAIN_LABELS, getDomainOrder, getAgentCatalogEntry, agentsByDomain } from './agents/catalog.js';
export type { AgentType, AgentCatalogEntry } from './agents/catalog.js';
export {
  AGENT_SKILL_PROFILES,
  formatAgentSkillsForContext,
  getAgentsForAutoCorrect,
  type AgentSkillProfile,
} from './agents/skills.js';

export const AgentTypeSchema = z.enum(AGENT_IDS);

export const StyleGuideSchema = z.object({
  palette: z.array(z.string()).optional(),
  reference_assets: z.array(z.string()).optional(),
  dimension: z.enum(['2d', '2.5d', '3d']).optional(),
  mood: z.string().optional(),
});

export const TaskSpecSchema = z.object({
  task_id: z.string().uuid(),
  agent: AgentTypeSchema,
  priority: z.number().min(0).max(10).default(5),
  depends_on: z.array(z.string().uuid()).default([]),
  input: z.record(z.unknown()),
  context: z
    .object({
      project_id: z.string().optional(),
      gdd_excerpt: z.string().optional(),
      style_guide: StyleGuideSchema.optional(),
    })
    .optional(),
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const ArtifactSchema = z.object({
  type: z.enum(['sprite', 'sprite_sheet', 'texture', 'model', 'audio', 'tilemap', 'other']),
  path: z.string(),
  meta: z.record(z.unknown()).optional(),
});

export const TaskResultSchema = z.object({
  task_id: z.string().uuid(),
  agent: AgentTypeSchema,
  status: z.enum(['success', 'partial', 'failed', 'needs_clarification']),
  artifacts: z.array(ArtifactSchema).default([]),
  gdl_patches: z.array(z.record(z.unknown())).default([]),
  agent_notes: z.string().optional(),
  error: z.string().optional(),
  recovery_hints: z.array(z.string()).optional(),
});

export type TaskResult = z.infer<typeof TaskResultSchema>;

export const UserIntentSchema = z.object({
  raw_prompt: z.string(),
  genre: z.string().optional(),
  dimension: z.enum(['2d', '2.5d', '3d']).default('2d'),
  mechanics: z.array(z.string()).default([]),
  source_images: z.array(z.string()).default([]),
  features: z
    .object({
      narrative: z.boolean().default(false),
      vfx: z.boolean().default(false),
      cinematic: z.boolean().default(false),
    })
    .default({ narrative: false, vfx: false, cinematic: false }),
});

export type UserIntent = z.infer<typeof UserIntentSchema>;

export const GenerationPlanSchema = z.object({
  plan_id: z.string().uuid(),
  user_intent: UserIntentSchema,
  tasks: z.array(TaskSpecSchema),
  estimated_duration_minutes: z.number().optional(),
  master_notes: z.string().optional(),
});

export type GenerationPlan = z.infer<typeof GenerationPlanSchema>;

export const GameMetaSchema = z
  .object({
    title: z.string(),
    dimension: z.enum(['2d', '2.5d', '3d']),
    genre: z.string().optional(),
    resolution: z.tuple([z.number(), z.number()]).optional(),
    version: z.string().default('1.0.0'),
  })
  .passthrough();

export const GameDefinitionSchema = z.object({
  meta: GameMetaSchema,
  style: StyleGuideSchema.optional(),
  entities: z.array(EntitySchema),
  scenes: z.array(SceneSchema),
  systems: z.array(SystemSchema).default([]),
  ui: z.record(z.unknown()).optional(),
  audio: z.record(z.unknown()).optional(),
  narrative: z.record(z.unknown()).optional(),
  vfx: z.record(z.unknown()).optional(),
  export: z.record(z.unknown()).optional(),
});

export type GameDefinition = z.infer<typeof GameDefinitionSchema>;

export { createEmptyGDL, PLATFORMER_TEMPLATE } from './templates/platformer.js';
export { getGameplayTemplate, GAMEPLAY_TEMPLATES, type GameGenre } from './templates/gameplay-templates.js';
export { createBootstrapGdl, createSurvivorsBootstrapGdl, type BootstrapGdlInput } from './templates/bootstrap-gdl.js';
export {
  gdlPreviewPrefixFromSlug,
  gdlPreviewFileName,
  resolveGdlPreviewPath,
  resolveGdlPreviewRelativePath,
} from './gdl/gdl-paths.js';
export { validateGdl, collectAssetRefs, type GdlValidationResult } from './gdl/validate.js';
export { applyMechanics, mergeGameplayTemplate } from './gdl/mechanics.js';
export { generateLevelLayout, type LevelLayout, type Platform } from './gdl/level-gen.js';
export * from './gdl/ir.js';
export * from './gdl/mechanics-registry.js';
export * from './workspace/production-journey.js';
export * from './studio/godot-parity-registry.js';
export * from './intent/intent-contract.js';
export * from './intent/concept-manifold.js';
export * from './semantic/game-semantic-graph.js';
export * from './creation/creation-stream.js';
export * from './agents/image-playbook.js';
export * from './agents/agent-knowledge-corpus.js';
export * from './agents/training-roadmap.js';
export * from './workflow/autonomous-production.js';
export * from './gdl/npc-routines.js';
export * from './gdl/enemy-ai-spec.js';
export { assessAssetEligibility, filterEligibleAssetUrls, MIN_PASS_IOU, MIN_SHIPPING_IOU } from './assets/asset-eligibility.js';
export * from './gdl/world-factory.js';
export * from './gdl/gdl-edit.js';
export * from './provenance/provenance.js';
export * from './export/pwa.js';
export * from './telemetry/telemetry.js';
export * from './catalog/game-types.js';
export * from './catalog/library-plan.js';
export * from './catalog/starter-game.js';
export * from './catalog/production-recipe.js';
export * from './catalog/flagship-deliverable.js';
export * from './codegen/codegen.js';
export { generateNarrative, type NarrativePack } from './gdl/narrative-gen.js';
export { generateToneWav, generateSfxWav, generateMusicLoopWav, SFX_PRESETS } from './audio/procedural-wav.js';
export * from './game-factory.js';
export * from './production-architecture.js';
export * from './studio/capability-gap-registry.js';
export * from './assets/index.js';
