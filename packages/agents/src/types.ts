import type { AgentType, TaskSpec, TaskResult } from '@ellipse/shared';

export interface Agent {
  readonly id: AgentType;
  readonly name: string;
  readonly description: string;
  execute(task: TaskSpec): Promise<TaskResult>;
}

export interface AgentRegistry {
  get(id: AgentType): Agent | undefined;
  list(): Agent[];
  register(agent: Agent): void;
}
