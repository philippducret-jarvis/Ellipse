/**
 * Ellipse Cortex — IA Maîtresse native.
 *
 * Le cerveau est interchangeable derrière un `CortexProvider` (voir provider-registry.ts) :
 *   - PONT open-weights auto-hébergé (Ollama/Llama/Mistral) — transition assumée.
 *   - Modèle Ellipse FROM-SCRATCH (ONNX, voir `training/`) — cible souveraine (ORDRE-001).
 *   - Heuristique déterministe — filet toujours disponible.
 * Aucun SaaS cognitif tiers, aucune donnée qui sort de l'infra (ORDRE-003).
 */
import type { GenerationPlan, UserIntent } from '@ellipse/shared';
import { GenerationPlanSchema } from '@ellipse/shared';
import { IntentModule } from './modules/intent.js';
import { PlanModule } from './modules/plan.js';
import { arbitratePlan, type ArbitrationResult, type ProductionConstraints } from './modules/budget.js';

export interface CortexConfig {
  modelsDir?: string;
}

export class CortexMaster {
  private intent = new IntentModule();
  private plan = new PlanModule();

  constructor(private config: CortexConfig = {}) {}

  // ── Synchrone (fallback keyword) ─────────────────────────────────────────
  /** Parse synchrone (keyword fallback). Préférer parseIntentAsync quand possible. */
  parseIntent(prompt: string, sourceImages: string[] = []): UserIntent {
    return this.intent.parse(prompt, sourceImages);
  }

  /** Plan synchrone (heuristique). Préférer planFromPromptAsync quand possible. */
  buildPlan(intent: UserIntent): GenerationPlan {
    const raw = this.plan.build(intent);
    return GenerationPlanSchema.parse(raw);
  }

  /** Pipeline synchrone intent → plan. */
  planFromPrompt(prompt: string, sourceImages: string[] = []): GenerationPlan {
    const intent = this.parseIntent(prompt, sourceImages);
    return this.buildPlan(intent);
  }

  // ── Async (Ollama → fallback keyword) ────────────────────────────────────
  /** Parse async — utilise Ollama si disponible, keyword fallback sinon. */
  async parseIntentAsync(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    return this.intent.parseAsync(prompt, sourceImages);
  }

  /** Plan async — utilise Ollama si disponible, heuristique sinon. */
  async buildPlanAsync(intent: UserIntent): Promise<GenerationPlan> {
    const raw = await this.plan.buildAsync(intent);
    return GenerationPlanSchema.parse(raw);
  }

  /** Pipeline async complet intent → plan (recommandé). */
  async planFromPromptAsync(prompt: string, sourceImages: string[] = []): Promise<GenerationPlan> {
    const intent = await this.parseIntentAsync(prompt, sourceImages);
    return this.buildPlanAsync(intent);
  }

  /**
   * Pipeline async intent → plan → **arbitrage budget** (Lot 2a).
   * Renvoie le plan arbitré + le budget tracé (décisions explicables).
   */
  async planFromPromptArbitrated(
    prompt: string,
    sourceImages: string[] = [],
    constraints: ProductionConstraints = {},
  ): Promise<ArbitrationResult> {
    const plan = await this.planFromPromptAsync(prompt, sourceImages);
    return arbitratePlan(plan, constraints);
  }
}

export { ModelRegistryImpl, getModelRegistry, createModelRegistry } from './model-registry.js';
export type { EllipseModelEntry, ModelRegistry } from './model-registry.js';
export { OllamaClient, getOllamaClient } from './modules/ollama-client.js';

// ── Providers cognitifs interchangeables (pont tiers ↔ modèle Ellipse from-scratch) ──
export { getCortexProvider, resetCortexProvider, ProviderRouter } from './provider-registry.js';
export type { CortexProvider, LLMPlanHints } from './provider.js';
export { HeuristicProvider } from './providers/heuristic-provider.js';
export { OllamaProvider } from './providers/ollama-provider.js';
export { EllipseProvider } from './providers/ellipse-provider.js';

// ── Cognition souveraine : arbitrage budget + mémoire d'exécution (Lot 2a) ──
export {
  arbitratePlan,
  estimatePlan,
  agentCost,
  AGENT_COST_MODEL,
} from './modules/budget.js';
export type {
  ProductionConstraints,
  ProductionBudget,
  ArbitrationResult,
  ArbitrationDecision,
  PlanEstimate,
  QualityTarget,
  ProductionPriority,
  AgentCost,
} from './modules/budget.js';
export { ExecutionMemory } from './modules/execution-memory.js';
export type { MemoryEntry, MemoryKind } from './modules/execution-memory.js';
