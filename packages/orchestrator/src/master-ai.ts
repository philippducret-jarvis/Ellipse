import { v4 as uuidv4 } from 'uuid';
import type { GenerationPlan, GameDefinition, TaskResult, TaskSpec } from '@ellipse/shared';
import { getGameplayTemplate, PLATFORMER_TEMPLATE, getAgentsForAutoCorrect, type AgentType } from '@ellipse/shared';
import { getAgentRegistry } from '@ellipse/agents';
import { CortexMaster } from '@ellipse/cortex';
import { dispatchTask, isBusAvailable, getBusConnection } from '@ellipse/bus';
import { saveSession, saveTaskResult } from '@ellipse/db';
import {
  loadProjectKnowledgeContext,
  enrichTaskContextWithKnowledge,
  type ProjectKnowledgeContext,
} from './project-knowledge-loader.js';

export interface MasterAIConfig {
  modelsDir?: string;
  useQueue?: boolean;
}

export interface GenerationSession {
  session_id: string;
  plan: GenerationPlan;
  results: TaskResult[];
  gdl: GameDefinition;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

export type ExecuteProgressEvent =
  | { type: 'status'; message: string }
  | { type: 'task_start'; task: TaskSpec }
  | { type: 'task_complete'; result: TaskResult };

export interface ExecutePlanOptions {
  projectSlug?: string;
  workspaceRoot?: string;
  autoCorrect?: boolean;
  knowledgeQuery?: string;
}

export class MasterAI {
  private cortex = new CortexMaster();
  private registry = getAgentRegistry();
  private queueEnabled: boolean | null = null;
  private projectKnowledge: ProjectKnowledgeContext | null = null;
  private retryCounts = new Map<string, number>();

  constructor(private config: MasterAIConfig = {}) {
    if (config.modelsDir) {
      this.cortex = new CortexMaster({ modelsDir: config.modelsDir });
    }
  }

  async createPlan(prompt: string, sourceImages: string[] = []): Promise<GenerationPlan> {
    return this.cortex.planFromPromptAsync(prompt, sourceImages);
  }

  async executePlan(
    plan: GenerationPlan,
    persist = true,
    onProgress?: (event: ExecuteProgressEvent) => void,
    options: ExecutePlanOptions = {},
  ): Promise<GenerationSession> {
    const genre = plan.user_intent.genre ?? 'platformer';
    const base = getGameplayTemplate(genre) as GameDefinition;

    if (options.workspaceRoot && options.projectSlug) {
      this.projectKnowledge = await loadProjectKnowledgeContext(
        options.workspaceRoot,
        options.projectSlug,
        options.knowledgeQuery ?? plan.user_intent.raw_prompt,
      );
    } else {
      this.projectKnowledge = null;
    }
    this.retryCounts.clear();

    const session: GenerationSession = {
      session_id: uuidv4(),
      plan,
      results: [],
      gdl: structuredClone({ ...PLATFORMER_TEMPLATE, ...base, meta: { ...PLATFORMER_TEMPLATE.meta, ...base.meta, title: this.extractTitle(plan.user_intent.raw_prompt) } }),
      status: 'executing',
    };

    if (persist) {
      await saveSession({
        id: session.session_id,
        prompt: plan.user_intent.raw_prompt,
        status: session.status,
        plan,
        gdl: session.gdl,
        masterNotes: plan.master_notes,
      });
    }

    const useQueue =
      this.config.useQueue ?? (this.queueEnabled ?? (await isBusAvailable()));
    this.queueEnabled = useQueue;
    const connection = useQueue ? getBusConnection() : null;

    try {
      const completed = new Set<string>();
      const pending = [...plan.tasks].sort((a, b) => b.priority - a.priority);

      while (pending.length > 0) {
        const readyIndex = pending.findIndex((t) =>
          t.depends_on.every((dep) => completed.has(dep)),
        );

        if (readyIndex === -1) {
          session.status = 'failed';
          break;
        }

        const task = pending.splice(readyIndex, 1)[0]!;
        onProgress?.({ type: 'task_start', task });
        const result = await this.runTask(task, session.session_id, useQueue, connection, session.gdl);
        session.results.push(result);
        onProgress?.({ type: 'task_complete', result });

        if (persist) await saveTaskResult(session.session_id, result);

        if (result.status === 'success' || result.status === 'partial') {
          completed.add(task.task_id);
          this.applyPatches(session.gdl, result);
        } else if (result.status === 'failed') {
          const retried = await this.attemptAutoCorrect(
            task,
            result,
            pending,
            completed,
            options,
            session,
            useQueue,
            connection,
            onProgress,
            persist,
          );
          if (!retried) {
            session.status = 'failed';
            break;
          }
        }
      }

      if (session.status !== 'failed') session.status = 'completed';
    } finally {
      /* noop */
    }

    if (persist) {
      await saveSession({
        id: session.session_id,
        prompt: plan.user_intent.raw_prompt,
        status: session.status,
        plan,
        gdl: session.gdl,
        masterNotes: plan.master_notes,
      });
    }

    return session;
  }

  private enrichTask(task: TaskSpec, sessionId: string, gdl?: GameDefinition): TaskSpec {
    const needsSnapshot = task.agent === 'gameplay' || task.agent === 'qa' || task.agent === 'integration';
    const context = enrichTaskContextWithKnowledge(task.agent, task.context, this.projectKnowledge);
    return {
      ...task,
      context,
      input: {
        ...task.input,
        session_id: sessionId,
        ...(needsSnapshot && gdl ? { gdl_snapshot: structuredClone(gdl) } : {}),
      },
    };
  }

  private async attemptAutoCorrect(
    failedTask: TaskSpec,
    result: TaskResult,
    pending: TaskSpec[],
    completed: Set<string>,
    options: ExecutePlanOptions,
    session: GenerationSession,
    useQueue: boolean,
    connection: ReturnType<typeof getBusConnection> | null,
    onProgress: ((event: ExecuteProgressEvent) => void) | undefined,
    persist: boolean,
  ): Promise<boolean> {
    if (options.autoCorrect === false) return false;

    const key = `${failedTask.agent}:${failedTask.task_id}`;
    const tries = this.retryCounts.get(key) ?? 0;
    if (tries >= 3) return false;

    const hintText = [result.error, ...(result.recovery_hints ?? [])].join(' ');
    const correctors = getAgentsForAutoCorrect(hintText);
    const retryAgent = correctors.includes(failedTask.agent)
      ? failedTask.agent
      : correctors[0] ?? failedTask.agent;

    this.retryCounts.set(key, tries + 1);
    const retryTask: TaskSpec = {
      ...failedTask,
      task_id: uuidv4(),
      agent: retryAgent as AgentType,
      input: {
        ...failedTask.input,
        recovery_attempt: true,
        recovery_hints: result.recovery_hints ?? [],
        prior_error: result.error,
      },
    };

    onProgress?.({ type: 'status', message: `Auto-correct → ${retryAgent} (${result.error?.slice(0, 60) ?? 'retry'})` });
    onProgress?.({ type: 'task_start', task: retryTask });
    const retryResult = await this.runTask(retryTask, session.session_id, useQueue, connection, session.gdl);
    session.results.push(retryResult);
    onProgress?.({ type: 'task_complete', result: retryResult });
    if (persist) await saveTaskResult(session.session_id, retryResult);

    if (retryResult.status === 'success' || retryResult.status === 'partial') {
      completed.add(failedTask.task_id);
      this.applyPatches(session.gdl, retryResult);
      return true;
    }
    return false;
  }

  private async runTask(
    task: TaskSpec,
    sessionId: string,
    useQueue: boolean,
    connection: ReturnType<typeof getBusConnection> | null,
    gdl?: GameDefinition,
  ): Promise<TaskResult> {
    const enriched = this.enrichTask(task, sessionId, gdl);

    if (useQueue && connection) {
      try {
        return await dispatchTask(enriched.agent, { sessionId, task: enriched }, connection);
      } catch (err) {
        return {
          task_id: task.task_id,
          agent: task.agent,
          status: 'failed',
          artifacts: [],
          gdl_patches: [],
          error: err instanceof Error ? err.message : 'Erreur bus agent',
          recovery_hints: ['pnpm dev:workers'],
        };
      }
    }

    const agent = this.registry.get(enriched.agent);
    if (!agent) {
      return {
        task_id: task.task_id,
        agent: task.agent,
        status: 'failed',
        artifacts: [],
        gdl_patches: [],
        error: `Agent '${task.agent}' non enregistré`,
      };
    }
    return agent.execute(enriched);
  }

  private extractTitle(prompt: string): string {
    const trimmed = prompt.slice(0, 48);
    return trimmed.length < prompt.length ? `${trimmed}…` : trimmed;
  }

  private applyPatches(gdl: GameDefinition, result: TaskResult): void {
    for (const patch of result.gdl_patches) {
      if (typeof patch.path !== 'string') continue;
      if (patch.op === 'replace' || patch.op === 'add') {
        this.setByPath(gdl as unknown as Record<string, unknown>, patch.path, patch.value);
      }
    }
  }

  private setByPath(root: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('/').filter(Boolean);
    let cur: unknown = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      if (cur == null || typeof cur !== 'object') return;
      cur = Array.isArray(cur) ? cur[Number(key)] : (cur as Record<string, unknown>)[key];
    }
    const last = parts[parts.length - 1]!;
    if (Array.isArray(cur)) {
      cur[Number(last)] = value;
    } else if (cur && typeof cur === 'object') {
      (cur as Record<string, unknown>)[last] = value;
    }
  }
}
