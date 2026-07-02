import type { Agent } from './types.js';
import type { TaskSpec, TaskResult } from '@ellipse/shared';
import { getAgentCatalogEntry } from '@ellipse/shared/agents/catalog';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export abstract class BaseAgent implements Agent {
  abstract readonly id: Agent['id'];
  abstract readonly name: string;
  abstract readonly description: string;

  protected async simulateWork(ms = 100): Promise<void> {
    await delay(ms);
  }

  abstract execute(task: TaskSpec): Promise<TaskResult>;

  protected getSessionId(task: TaskSpec): string {
    return (task.input.session_id as string) ?? 'default';
  }

  protected getGenre(task: TaskSpec): string {
    return (
      (task.input.genre as string) ??
      (task.context?.style_guide?.mood as string) ??
      'platformer'
    );
  }

  protected getPromptExcerpt(task: TaskSpec): string {
    return task.context?.gdd_excerpt ?? '';
  }

  protected getModelHint(): string {
    const entry = getAgentCatalogEntry(this.id);
    return entry ? `ellipse-${entry.id}-v0 (phase ${entry.phase})` : 'ellipse-agent-v0';
  }

  protected success(task: TaskSpec, partial: Partial<TaskResult> = {}): TaskResult {
    return {
      task_id: task.task_id,
      agent: task.agent,
      status: 'success',
      artifacts: [],
      gdl_patches: [],
      ...partial,
    };
  }

  protected partial(task: TaskSpec, partial: Partial<TaskResult> = {}): TaskResult {
    return this.success(task, { status: 'partial', ...partial });
  }

  protected fail(task: TaskSpec, error: string, recovery_hints: string[] = []): TaskResult {
    return {
      task_id: task.task_id,
      agent: task.agent,
      status: 'failed',
      artifacts: [],
      gdl_patches: [],
      error,
      recovery_hints,
    };
  }
}
