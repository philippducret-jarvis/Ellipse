/**
 * Orchestrateur Ellipse — sessions, API, dispatch agents.
 * Cognition déléguée à @ellipse/cortex (ORDRE-001) — importer depuis @ellipse/cortex directement.
 */

export { MasterAI } from './master-ai.js';
export { DURABLE_WORKFLOW_TEMPLATES, getDurableWorkflowCatalog } from './durable-workflows.js';
export {
  executeWorkflow,
  InMemoryStore,
  JsonFileStore,
  type RunState,
  type StepState,
  type StepStatus,
  type WorkflowStore,
  type StepHandler,
  type StepContext,
  type ExecuteOptions,
} from './durable-executor.js';
export { AgentDispatcher } from './agent-dispatcher.js';
export { createServer } from './server.js';
export { GameFactoryService } from './game-factory.js';
export { AssetPipelineService } from './asset-pipeline/service.js';
