/**
 * Solveur de budget / arbitrage coût · qualité · délai (Lot 2a).
 *
 * Cognition souveraine **déterministe** (aucun modèle, aucun tiers) : à partir d'un
 * `GenerationPlan` et de contraintes de production, on estime le coût et on arbitre
 * (abandon d'agents optionnels par poids qualité croissant) jusqu'à tenir dans le budget,
 * en traçant chaque décision. Les coûts sont en **unités relatives** (pipeline CPU/procédural,
 * ni GPU ni API tierce).
 */
import type { GenerationPlan, TaskSpec } from '@ellipse/shared';

export type QualityTarget = 'draft' | 'standard' | 'high';
export type ProductionPriority = 'speed' | 'quality' | 'balanced';

export interface ProductionConstraints {
  max_minutes?: number;
  max_cost_units?: number;
  quality_target?: QualityTarget;
  priority?: ProductionPriority;
}

export interface AgentCost {
  minutes: number;
  cost_units: number;
  /** Poids qualité : plus élevé = abandonné en dernier. */
  quality_weight: number;
  /** Essentiel = jamais abandonné (jeu non jouable sinon). */
  essential: boolean;
}

/** Modèle de coût par agent (CPU/procédural). Minutes = ordre de grandeur. */
export const AGENT_COST_MODEL: Record<string, AgentCost> = {
  character: { minutes: 3, cost_units: 3, quality_weight: 9, essential: true },
  decor: { minutes: 2.5, cost_units: 3, quality_weight: 8, essential: true },
  level: { minutes: 2, cost_units: 2, quality_weight: 9, essential: true },
  gameplay: { minutes: 2, cost_units: 2, quality_weight: 10, essential: true },
  qa: { minutes: 1, cost_units: 1, quality_weight: 8, essential: true },
  integration: { minutes: 1, cost_units: 1, quality_weight: 9, essential: true },
  ui: { minutes: 1, cost_units: 1, quality_weight: 7, essential: false },
  animation: { minutes: 2, cost_units: 2, quality_weight: 6, essential: false },
  narrative: { minutes: 2, cost_units: 1, quality_weight: 6, essential: false },
  camera: { minutes: 1, cost_units: 1, quality_weight: 5, essential: false },
  mesh_3d: { minutes: 4, cost_units: 4, quality_weight: 5, essential: false },
  lighting: { minutes: 2, cost_units: 2, quality_weight: 4, essential: false },
  music: { minutes: 1.5, cost_units: 1, quality_weight: 4, essential: false },
  sfx: { minutes: 1, cost_units: 1, quality_weight: 4, essential: false },
  vfx: { minutes: 1.5, cost_units: 1, quality_weight: 3, essential: false },
};

const DEFAULT_COST: AgentCost = { minutes: 1, cost_units: 1, quality_weight: 5, essential: false };

export function agentCost(agent: string): AgentCost {
  return AGENT_COST_MODEL[agent] ?? DEFAULT_COST;
}

export interface PlanEstimate {
  total_minutes: number;
  total_cost_units: number;
  per_agent: { agent: string; minutes: number; cost_units: number }[];
}

export function estimatePlan(plan: GenerationPlan): PlanEstimate {
  const per_agent = plan.tasks.map((t) => {
    const c = agentCost(t.agent);
    return { agent: t.agent, minutes: c.minutes, cost_units: c.cost_units };
  });
  const total_minutes = round(per_agent.reduce((s, a) => s + a.minutes, 0));
  const total_cost_units = round(per_agent.reduce((s, a) => s + a.cost_units, 0));
  return { total_minutes, total_cost_units, per_agent };
}

export type ArbitrationKind =
  | 'within_budget'
  | 'drop_agent'
  | 'over_budget_accepted'
  | 'quality_target';

export interface ArbitrationDecision {
  kind: ArbitrationKind;
  agent?: string;
  reason: string;
}

export interface ProductionBudget {
  constraints: ProductionConstraints;
  quality_target: QualityTarget;
  estimate_before: PlanEstimate;
  estimate_after: PlanEstimate;
  within_budget: boolean;
  decisions: ArbitrationDecision[];
}

export interface ArbitrationResult {
  plan: GenerationPlan;
  budget: ProductionBudget;
}

function resolveQualityTarget(c: ProductionConstraints): QualityTarget {
  if (c.quality_target) return c.quality_target;
  if (c.priority === 'speed') return 'draft';
  if (c.priority === 'quality') return 'high';
  return 'standard';
}

function exceedsBudget(est: PlanEstimate, c: ProductionConstraints): boolean {
  if (c.max_minutes != null && est.total_minutes > c.max_minutes) return true;
  if (c.max_cost_units != null && est.total_cost_units > c.max_cost_units) return true;
  return false;
}

/** Retire une tâche et nettoie toutes les `depends_on` qui la référençaient. */
function removeTask(tasks: TaskSpec[], taskId: string): TaskSpec[] {
  return tasks
    .filter((t) => t.task_id !== taskId)
    .map((t) => ({ ...t, depends_on: t.depends_on.filter((d) => d !== taskId) }));
}

/**
 * Arbitre un plan sous contraintes. Abandonne les agents optionnels par `quality_weight`
 * croissant jusqu'à tenir le budget (ou jusqu'à épuisement des optionnels).
 */
export function arbitratePlan(
  plan: GenerationPlan,
  constraints: ProductionConstraints = {},
): ArbitrationResult {
  const quality_target = resolveQualityTarget(constraints);
  const estimate_before = estimatePlan(plan);
  const decisions: ArbitrationDecision[] = [
    { kind: 'quality_target', reason: `Cible qualité : ${quality_target}` },
  ];

  let tasks = [...plan.tasks];

  // En mode "speed" sans budget chiffré, on vise un budget implicite = essentiels + marge.
  const effective: ProductionConstraints = { ...constraints };
  if (constraints.priority === 'speed' && constraints.max_minutes == null) {
    const essentialMinutes = tasks
      .filter((t) => agentCost(t.agent).essential)
      .reduce((s, t) => s + agentCost(t.agent).minutes, 0);
    effective.max_minutes = round(essentialMinutes * 1.25);
  }

  // Boucle d'abandon : optionnels par quality_weight croissant.
  while (exceedsBudget(estimatePlan({ ...plan, tasks }), effective)) {
    const droppable = tasks
      .filter((t) => !agentCost(t.agent).essential)
      .sort((a, b) => agentCost(a.agent).quality_weight - agentCost(b.agent).quality_weight);
    const victim = droppable[0];
    if (!victim) break; // plus rien d'optionnel à retirer
    tasks = removeTask(tasks, victim.task_id);
    decisions.push({
      kind: 'drop_agent',
      agent: victim.agent,
      reason: `Abandonné pour tenir le budget (poids qualité ${agentCost(victim.agent).quality_weight}).`,
    });
  }

  const estimate_after = estimatePlan({ ...plan, tasks });
  const within_budget = !exceedsBudget(estimate_after, effective);
  if (within_budget && decisions.length === 1) {
    decisions.push({ kind: 'within_budget', reason: 'Plan complet conservé, budget respecté.' });
  } else if (!within_budget) {
    decisions.push({
      kind: 'over_budget_accepted',
      reason: 'Budget toujours dépassé après abandon des optionnels (essentiels préservés).',
    });
  }

  const arbitratedPlan: GenerationPlan = {
    ...plan,
    tasks,
    estimated_duration_minutes: estimate_after.total_minutes,
    master_notes: [plan.master_notes, `Arbitrage : ${quality_target}, ${estimate_after.total_minutes} min`]
      .filter(Boolean)
      .join(' · '),
  };

  return {
    plan: arbitratedPlan,
    budget: {
      constraints,
      quality_target,
      estimate_before,
      estimate_after,
      within_budget,
      decisions,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
