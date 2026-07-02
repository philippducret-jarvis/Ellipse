/**
 * Mémoire durable agents — échecs, succès, leçons (workspace-local).
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface AgentMemoryEntry {
  recorded_at: string;
  agent: string;
  kind: 'failure' | 'success' | 'lesson';
  subject: string;
  detail: string;
  iou?: number;
  asset_path?: string;
}

const MEMORY_FILE = join('08_ops', 'telemetry', 'agent-memory.jsonl');

export async function appendAgentMemory(workspaceRoot: string, entry: Omit<AgentMemoryEntry, 'recorded_at'>): Promise<void> {
  const dir = join(workspaceRoot, '08_ops', 'telemetry');
  await mkdir(dir, { recursive: true });
  const line =
    JSON.stringify({
      ...entry,
      recorded_at: new Date().toISOString(),
    }) + '\n';
  await appendFile(join(workspaceRoot, MEMORY_FILE), line, 'utf-8');
}

export async function readAgentMemory(workspaceRoot: string, limit = 40): Promise<AgentMemoryEntry[]> {
  const path = join(workspaceRoot, MEMORY_FILE);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);
  return lines
    .slice(-limit)
    .map((l) => JSON.parse(l) as AgentMemoryEntry)
    .reverse();
}

export function formatAgentMemoryForContext(entries: AgentMemoryEntry[], agent?: string): string {
  const filtered = agent ? entries.filter((e) => e.agent === agent) : entries;
  if (!filtered.length) return '';
  return filtered
    .slice(0, 15)
    .map((e) => `- [${e.kind}] ${e.agent} | ${e.subject}: ${e.detail}${e.iou != null ? ` (IoU ${e.iou.toFixed(2)})` : ''}`)
    .join('\n');
}
