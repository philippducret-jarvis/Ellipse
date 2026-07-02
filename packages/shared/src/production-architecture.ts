import { z } from 'zod';

export const PROJECT_STRATA_IDS = [
  'product',
  'canonical_data',
  'durable_orchestration',
  'cognition_planning',
  'knowledge_graph',
  'asset_factory_2d',
  'world_factory',
  'gameplay_systems',
  'animation',
  'audio',
  'fx_game_feel',
  'runtime_shipping',
  'studio_editing',
  'qa_validation',
  'observability_mlops',
  'security_compliance',
] as const;

export const CANONICAL_CONTRACT_KINDS = [
  'project',
  'prompt',
  'document',
  'task',
  'asset',
  'asset_variant',
  'asset_output',
  'scene',
  'story_graph',
  'trigger_graph',
  'audio_graph',
  'world_state',
  'save_profile',
  'build_target',
  'workflow',
  'telemetry',
] as const;

export const WORKFLOW_RUNTIME_IDS = ['in_process', 'temporal', 'manual', 'hybrid'] as const;
export const WORKFLOW_JOB_STATUS = ['planned', 'queued', 'running', 'paused', 'completed', 'failed'] as const;
export const WORKFLOW_STEP_KIND = ['analysis', 'generation', 'validation', 'integration', 'export', 'handoff'] as const;

export const ProjectStrataIdSchema = z.enum(PROJECT_STRATA_IDS);
export const CanonicalContractKindSchema = z.enum(CANONICAL_CONTRACT_KINDS);
export const WorkflowRuntimeSchema = z.enum(WORKFLOW_RUNTIME_IDS);
export const WorkflowJobStatusSchema = z.enum(WORKFLOW_JOB_STATUS);
export const WorkflowStepKindSchema = z.enum(WORKFLOW_STEP_KIND);

export const CanonicalContractSurfaceSchema = z.object({
  id: z.string(),
  kind: CanonicalContractKindSchema,
  owner: z.string(),
  source_of_truth: z.string(),
  downstream_consumers: z.array(z.string()).default([]),
  validation: z.array(z.string()).default([]),
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: WorkflowStepKindSchema,
  owner: z.string(),
  depends_on: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  automation_targets: z.array(z.string()).default([]),
});

export const DurableWorkflowSchema = z.object({
  id: z.string(),
  label: z.string(),
  runtime: WorkflowRuntimeSchema,
  objective: z.string(),
  triggers: z.array(z.string()).default([]),
  recovery_strategy: z.array(z.string()).default([]),
  steps: z.array(WorkflowStepSchema).default([]),
});

export const StrataRoadmapItemSchema = z.object({
  id: z.string(),
  strata: ProjectStrataIdSchema,
  title: z.string(),
  objective: z.string(),
  current_state: z.string(),
  target_state: z.string(),
  gaps: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
});

export const MasterExecutionPlanSchema = z.object({
  version: z.string(),
  updated_at: z.string(),
  north_star: z.string(),
  architecture_decisions: z.array(z.string()).default([]),
  canonical_contracts: z.array(CanonicalContractSurfaceSchema).default([]),
  workflows: z.array(DurableWorkflowSchema).default([]),
  roadmap: z.array(StrataRoadmapItemSchema).default([]),
});

export type ProjectStrataId = z.infer<typeof ProjectStrataIdSchema>;
export type CanonicalContractKind = z.infer<typeof CanonicalContractKindSchema>;
export type WorkflowRuntime = z.infer<typeof WorkflowRuntimeSchema>;
export type WorkflowJobStatus = z.infer<typeof WorkflowJobStatusSchema>;
export type WorkflowStepKind = z.infer<typeof WorkflowStepKindSchema>;
export type CanonicalContractSurface = z.infer<typeof CanonicalContractSurfaceSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type DurableWorkflow = z.infer<typeof DurableWorkflowSchema>;
export type StrataRoadmapItem = z.infer<typeof StrataRoadmapItemSchema>;
export type MasterExecutionPlan = z.infer<typeof MasterExecutionPlanSchema>;
