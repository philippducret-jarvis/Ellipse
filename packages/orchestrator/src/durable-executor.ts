/**
 * Exécuteur durable (Lot 4) — transforme les *templates* de `durable-workflows.ts` en machine.
 *
 * - résout les dépendances (`depends_on`) en ordre topologique,
 * - **persiste l'état** après chaque step via un `WorkflowStore` pluggable,
 * - **resume** : un run rechargé saute les steps déjà `done`,
 * - **retry** avec compteur d'essais (catégorie technique/qualité),
 * - ouvre une **gate humaine** quand les essais sont épuisés.
 *
 * Aucune dépendance à Temporal/Postgres : `InMemoryStore` (tests) et `JsonFileStore` (local)
 * suffisent ; un store DB se branchera derrière la même interface (Lot 5/10).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { DurableWorkflow, WorkflowStep } from '@ellipse/shared';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface StepState {
  status: StepStatus;
  attempts: number;
  error?: string;
  output?: unknown;
}

export interface RunState {
  runId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'awaiting_human';
  steps: Record<string, StepState>;
  updatedAt: string;
}

export interface WorkflowStore {
  load(runId: string): Promise<RunState | null>;
  save(state: RunState): Promise<void>;
}

export class InMemoryStore implements WorkflowStore {
  private map = new Map<string, RunState>();
  async load(runId: string): Promise<RunState | null> {
    const s = this.map.get(runId);
    return s ? structuredClone(s) : null;
  }
  async save(state: RunState): Promise<void> {
    this.map.set(state.runId, structuredClone(state));
  }
}

export class JsonFileStore implements WorkflowStore {
  constructor(private dir: string) {}
  private path(runId: string): string {
    return join(this.dir, `${runId}.json`);
  }
  async load(runId: string): Promise<RunState | null> {
    try {
      return JSON.parse(await readFile(this.path(runId), 'utf-8')) as RunState;
    } catch {
      return null;
    }
  }
  async save(state: RunState): Promise<void> {
    const p = this.path(state.runId);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(state, null, 2));
  }
}

export interface StepContext {
  runId: string;
  workflow: DurableWorkflow;
  step: WorkflowStep;
  attempt: number;
}

export type StepHandler = (ctx: StepContext) => Promise<unknown>;

export interface ExecuteOptions {
  runId: string;
  store: WorkflowStore;
  /** Handler par step id ; défaut = no-op (step marqué done). */
  handlers?: Record<string, StepHandler>;
  /** Essais max par step (retry technique/qualité). */
  maxAttempts?: number;
}

/** Tri topologique des steps selon `depends_on`. */
function topoSort(steps: WorkflowStep[]): WorkflowStep[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const out: WorkflowStep[] = [];
  const visit = (s: WorkflowStep, stack: Set<string>): void => {
    if (visited.has(s.id)) return;
    if (stack.has(s.id)) throw new Error(`Cycle de dépendances détecté sur ${s.id}`);
    stack.add(s.id);
    for (const dep of s.depends_on ?? []) {
      const d = byId.get(dep);
      if (d) visit(d, stack);
    }
    stack.delete(s.id);
    visited.add(s.id);
    out.push(s);
  };
  for (const s of steps) visit(s, new Set());
  return out;
}

function emptyState(runId: string, wf: DurableWorkflow): RunState {
  const steps: Record<string, StepState> = {};
  for (const s of wf.steps) steps[s.id] = { status: 'pending', attempts: 0 };
  return { runId, workflowId: wf.id, status: 'running', steps, updatedAt: new Date().toISOString() };
}

/**
 * Exécute (ou reprend) un workflow durable. Idempotent : relancer avec le même `runId` et
 * le même `store` reprend là où le run s'était arrêté (steps `done` ignorés).
 */
export async function executeWorkflow(
  workflow: DurableWorkflow,
  opts: ExecuteOptions,
): Promise<RunState> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const handlers = opts.handlers ?? {};

  let state = (await opts.store.load(opts.runId)) ?? emptyState(opts.runId, workflow);
  // S'assurer que les steps absents (template modifié) existent.
  for (const s of workflow.steps) state.steps[s.id] ??= { status: 'pending', attempts: 0 };
  state.status = 'running';

  const ordered = topoSort(workflow.steps);

  for (const step of ordered) {
    const st = state.steps[step.id]!;
    if (st.status === 'done') continue; // resume : déjà fait

    // Bloqué si une dépendance n'est pas done.
    const blocked = (step.depends_on ?? []).some((d) => state.steps[d]?.status !== 'done');
    if (blocked) {
      state.status = 'awaiting_human';
      st.error = 'Dépendance non satisfaite';
      await opts.store.save(touch(state));
      return state;
    }

    const handler = handlers[step.id];
    let success = false;
    while (st.attempts < maxAttempts && !success) {
      st.attempts += 1;
      st.status = 'running';
      await opts.store.save(touch(state));
      try {
        const output = handler
          ? await handler({ runId: opts.runId, workflow, step, attempt: st.attempts })
          : undefined;
        st.status = 'done';
        st.output = output;
        st.error = undefined;
        success = true;
      } catch (err) {
        st.error = err instanceof Error ? err.message : String(err);
        st.status = 'failed';
      }
      await opts.store.save(touch(state));
    }

    if (!success) {
      // Essais épuisés → gate humaine (recovery_strategy : require_human_signoff / open_fix_batch).
      state.status = 'awaiting_human';
      await opts.store.save(touch(state));
      return state;
    }
  }

  state.status = 'completed';
  await opts.store.save(touch(state));
  return state;
}

function touch(state: RunState): RunState {
  state.updatedAt = new Date().toISOString();
  return state;
}
