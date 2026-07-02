import { loadEnv } from '@ellipse/shared/load-env';
import type { AgentType, TaskResult, TaskSpec } from '@ellipse/shared';
import { Queue, Worker, QueueEvents, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';

export interface TaskJobData {
  sessionId: string;
  task: TaskSpec;
}

export function getRedisUrl(): string {
  loadEnv();
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

/** Connexion BullMQ — objet partagé (évite conflits versions ioredis). */
export function getBusConnection(): ConnectionOptions {
  return { url: getRedisUrl(), maxRetriesPerRequest: null };
}

export function agentQueueName(agent: AgentType): string {
  return `ellipse-agent-${agent}`;
}

export async function isBusAvailable(): Promise<boolean> {
  const redis = new Redis(getRedisUrl());
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  } finally {
    redis.disconnect();
  }
}

export function createAgentQueue(agent: AgentType, connection: ConnectionOptions) {
  return new Queue<TaskJobData>(agentQueueName(agent), { connection });
}

export function createAgentQueueEvents(agent: AgentType, connection: ConnectionOptions) {
  return new QueueEvents(agentQueueName(agent), { connection });
}

export async function dispatchTask(
  agent: AgentType,
  data: TaskJobData,
  connection: ConnectionOptions = getBusConnection(),
): Promise<TaskResult> {
  const queue = createAgentQueue(agent, connection);
  const events = createAgentQueueEvents(agent, connection);
  const job = await queue.add('execute', data, { removeOnComplete: 100, removeOnFail: 50 });
  const result = await job.waitUntilFinished(events);
  await events.close();
  await queue.close();
  return result as TaskResult;
}

export function startAgentWorker(
  agent: AgentType,
  processor: (task: TaskSpec, sessionId: string) => Promise<TaskResult>,
  connection: ConnectionOptions = getBusConnection(),
): Worker<TaskJobData, TaskResult> {
  return new Worker<TaskJobData, TaskResult>(
    agentQueueName(agent),
    async (job) => processor(job.data.task, job.data.sessionId),
    { connection, concurrency: 2 },
  );
}
