import type { TaskSpec, TaskResult } from '@ellipse/shared';
import { getAgentRegistry } from '@ellipse/agents';

export type ProgressCallback = (event: {
  type: 'task_start' | 'task_complete' | 'task_fail';
  task: TaskSpec;
  result?: TaskResult;
}) => void;

export class AgentDispatcher {
  private registry = getAgentRegistry();

  async dispatch(task: TaskSpec, onProgress?: ProgressCallback): Promise<TaskResult> {
    const agent = this.registry.get(task.agent);
    if (!agent) {
      return {
        task_id: task.task_id,
        agent: task.agent,
        status: 'failed',
        artifacts: [],
        gdl_patches: [],
        error: `Agent inconnu: ${task.agent}`,
        recovery_hints: ['Vérifier registry agents'],
      };
    }

    onProgress?.({ type: 'task_start', task });

    try {
      const result = await agent.execute(task);
      onProgress?.({ type: 'task_complete', task, result });
      return result;
    } catch (err) {
      const result: TaskResult = {
        task_id: task.task_id,
        agent: task.agent,
        status: 'failed',
        artifacts: [],
        gdl_patches: [],
        error: err instanceof Error ? err.message : String(err),
      };
      onProgress?.({ type: 'task_fail', task, result });
      return result;
    }
  }
}
