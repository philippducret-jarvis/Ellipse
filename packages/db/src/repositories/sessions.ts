import type { GameDefinition, GenerationPlan, TaskResult } from '@ellipse/shared';
import { getPool } from '../client.js';

export async function createProject(title: string): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO projects (title) VALUES ($1) RETURNING id`,
    [title],
  );
  return rows[0]!.id;
}

export async function saveSession(input: {
  id: string;
  projectId?: string;
  prompt: string;
  status: string;
  plan?: GenerationPlan;
  gdl?: GameDefinition;
  masterNotes?: string;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO generation_sessions (id, project_id, prompt, status, plan, gdl, master_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       plan = EXCLUDED.plan,
       gdl = EXCLUDED.gdl,
       master_notes = EXCLUDED.master_notes,
       updated_at = NOW()`,
    [
      input.id,
      input.projectId ?? null,
      input.prompt,
      input.status,
      input.plan ? JSON.stringify(input.plan) : null,
      input.gdl ? JSON.stringify(input.gdl) : null,
      input.masterNotes ?? null,
    ],
  );
}

export async function saveTaskResult(sessionId: string, result: TaskResult): Promise<void> {
  await getPool().query(
    `INSERT INTO task_results (session_id, task_id, agent, result) VALUES ($1, $2, $3, $4)`,
    [sessionId, result.task_id, result.agent, JSON.stringify(result)],
  );
}

export async function getSession(id: string): Promise<{
  id: string;
  prompt: string;
  status: string;
  plan: GenerationPlan | null;
  gdl: GameDefinition | null;
  created_at?: string;
} | null> {
  const { rows } = await getPool().query<{
    id: string;
    prompt: string;
    status: string;
    plan: GenerationPlan | null;
    gdl: GameDefinition | null;
    created_at: string;
  }>(
    `SELECT id, prompt, status, plan, gdl, created_at FROM generation_sessions WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listSessions(limit = 30): Promise<
  {
    id: string;
    prompt: string;
    status: string;
    created_at: string;
    updated_at: string;
  }[]
> {
  const { rows } = await getPool().query<{
    id: string;
    prompt: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, prompt, status, created_at, updated_at
     FROM generation_sessions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function getTaskResults(sessionId: string): Promise<TaskResult[]> {
  const { rows } = await getPool().query<{ result: TaskResult }>(
    `SELECT result FROM task_results WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId],
  );
  return rows.map((r) => r.result);
}

export async function registerUpload(input: {
  id: string;
  sessionId?: string;
  projectId?: string;
  gameAssetId?: string;
  originalName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO uploaded_assets (id, session_id, project_id, game_asset_id, original_name, storage_path, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.id,
      input.sessionId ?? null,
      input.projectId ?? null,
      input.gameAssetId ?? null,
      input.originalName,
      input.storagePath,
      input.mimeType ?? null,
      input.sizeBytes ?? null,
    ],
  );
}
