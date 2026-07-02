/**
 * Télémétrie entraînement agents — drills, scores, phases (workspace-local).
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface AgentTrainingEvent {
  recorded_at: string;
  event: 'drill_start' | 'drill_pass' | 'drill_fail' | 'step_score' | 'phase_recommend' | 'workflow_advance';
  drill_id?: string;
  step_id?: string;
  score?: number;
  phase_id?: string;
  run_id?: string;
  detail?: string;
}

const TRAINING_FILE = join('08_ops', 'telemetry', 'agent-training.jsonl');

export async function appendAgentTrainingEvent(
  workspaceRoot: string,
  entry: Omit<AgentTrainingEvent, 'recorded_at'>,
): Promise<void> {
  const dir = join(workspaceRoot, '08_ops', 'telemetry');
  await mkdir(dir, { recursive: true });
  const line =
    JSON.stringify({
      ...entry,
      recorded_at: new Date().toISOString(),
    }) + '\n';
  await appendFile(join(workspaceRoot, TRAINING_FILE), line, 'utf-8');
}

export async function readAgentTrainingEvents(workspaceRoot: string, limit = 50): Promise<AgentTrainingEvent[]> {
  const path = join(workspaceRoot, TRAINING_FILE);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf-8');
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-limit)
    .map((l) => JSON.parse(l) as AgentTrainingEvent)
    .reverse();
}
