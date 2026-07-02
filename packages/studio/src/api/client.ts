import type {
  AssetStageId,
  GameDefinition,
  GameProject,
  GameProjectAsset,
  GameProjectSnapshot,
  GenerationPlan,
  TaskResult,
  TaskSpec,
} from '@ellipse/shared';
import { buildShowcaseProject, buildShowcaseSnapshot, SHOWCASE_PROJECT_ID } from './showcase/project.js';
import { buildShowcaseWorkspaceFile, buildShowcaseWorkspaceOverview } from './showcase/workspace.js';

export interface HealthResponse {
  status: string;
  service: string;
  checks: { database: string; bus: string; comfyui: string };
}

export interface SessionSummary {
  id: string;
  prompt: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ObservabilitySummary {
  sessions_total: number;
  sessions_completed: number;
  sessions_failed: number;
  tasks_total: number;
  tasks_failed: number;
  agent_stats: Record<string, { success: number; failed: number; partial: number }>;
  recent_sessions: SessionSummary[];
}

export interface SessionDetail {
  id: string;
  prompt: string;
  status: string;
  plan: GenerationPlan | null;
  gdl: GameDefinition | null;
  created_at?: string;
}

export interface GenerationSession {
  session_id: string;
  plan: GenerationPlan;
  results: TaskResult[];
  gdl: GameDefinition;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

export interface UploadedFile {
  id: string;
  path: string;
  url: string;
  name: string;
}

export interface WorkspaceTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  ext?: string;
  size?: number;
  modified_at?: string;
  url?: string;
  children?: WorkspaceTreeEntry[];
}

export interface WorkspaceStats {
  files: number;
  directories: number;
  images: number;
  json: number;
  markdown: number;
}

export interface WorkspaceOverview {
  root_path: string;
  public_base: string;
  tree: WorkspaceTreeEntry[];
  stats: WorkspaceStats;
  highlights: {
    preview_url?: string;
    preview_manifest_url?: string;
    preview_gdl_url?: string;
    keyart_url?: string;
    workspace_manifest_url?: string;
    readme_url?: string;
    reference_index_url?: string;
  };
}

export interface WorkspaceFilePayload {
  path: string;
  name: string;
  ext: string;
  kind: 'json' | 'markdown' | 'html' | 'text' | 'image' | 'binary';
  url: string;
  size: number;
  modified_at?: string;
  content?: string;
  truncated?: boolean;
}

export interface CreateGameProjectInput {
  title?: string;
  prompt: string;
  images?: string[];
  autostart?: boolean;
  autonomous?: boolean;
}

export interface AutonomousProductionStatus {
  project_id: string;
  status: 'idle' | 'running';
}

export interface AutonomousProductionResult {
  projectId: string;
  runId: string;
  status: string;
  previewUrl?: string;
  loops: number;
  stepsPassed: number;
  stepsTotal: number;
}

export interface CreateGameAssetInput {
  title: string;
  role: GameProjectAsset['role'];
  kind: GameProjectAsset['kind'];
  prompt?: string;
}

export interface GenerateCallbacks {
  onStatus: (message: string) => void;
  onPlan: (plan: GenerationPlan) => void;
  onTaskStart: (task: TaskSpec) => void;
  onTaskComplete: (result: TaskResult) => void;
  onComplete: (session: GenerationSession) => void;
  onError: (message: string) => void;
}

export interface WorkflowCatalogResponse {
  workflows: Array<{
    id: string;
    label: string;
    runtime: string;
    objective: string;
    triggers: string[];
    recovery_strategy: string[];
    steps: Array<{
      id: string;
      label: string;
      kind: string;
      owner: string;
      depends_on: string[];
      inputs: string[];
      outputs: string[];
      automation_targets: string[];
    }>;
  }>;
}

async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJsonOrThrow<HealthResponse>('/health');
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  try {
    const data = await fetchJsonOrThrow<{ sessions: SessionSummary[] }>('/api/sessions');
    return data.sessions;
  } catch {
    return [];
  }
}

export async function fetchObservability(): Promise<ObservabilitySummary> {
  return fetchJsonOrThrow<ObservabilitySummary>('/api/observability');
}

export async function fetchGameProjects(): Promise<GameProject[]> {
  try {
    const data = await fetchJsonOrThrow<{ projects: GameProject[] }>('/api/projects');
    return data.projects;
  } catch {
    const showcase = await buildShowcaseProject();
    return showcase ? [showcase] : [];
  }
}

export async function createGameProject(input: CreateGameProjectInput): Promise<GameProjectSnapshot & { autonomous?: { status: string } }> {
  return fetchJsonOrThrow('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function fetchAutonomousProductionStatus(projectId: string): Promise<AutonomousProductionStatus> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/autoproduce/status`);
}

export async function runAutonomousProduction(
  projectId: string,
  opts?: { maxLoops?: number; maxSteps?: number },
): Promise<{ result: AutonomousProductionResult; snapshot: GameProjectSnapshot }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/autoproduce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts ?? {}),
  });
}

export async function fetchGameProject(id: string): Promise<GameProjectSnapshot> {
  try {
    return await fetchJsonOrThrow<GameProjectSnapshot>(`/api/projects/${id}`);
  } catch {
    if (id === SHOWCASE_PROJECT_ID) return buildShowcaseSnapshot();
    throw new Error('Projet introuvable');
  }
}

export async function fetchProjectWorkspace(id: string): Promise<WorkspaceOverview> {
  try {
    const data = await fetchJsonOrThrow<{ workspace: WorkspaceOverview }>(`/api/projects/${id}/workspace`);
    return data.workspace;
  } catch {
    if (id === SHOWCASE_PROJECT_ID) return buildShowcaseWorkspaceOverview();
    throw new Error('Workspace introuvable');
  }
}

export async function fetchProjectWorkspaceFile(id: string, path: string): Promise<WorkspaceFilePayload> {
  try {
    const data = await fetchJsonOrThrow<{ file: WorkspaceFilePayload }>(`/api/projects/${id}/workspace/file?path=${encodeURIComponent(path)}`);
    return data.file;
  } catch {
    if (id === SHOWCASE_PROJECT_ID) return buildShowcaseWorkspaceFile(path);
    throw new Error('Fichier introuvable');
  }
}

export async function addGameProjectPrompt(projectId: string, prompt: string, images: string[] = []): Promise<GameProjectSnapshot> {
  return fetchJsonOrThrow<GameProjectSnapshot>(`/api/projects/${projectId}/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images }),
  });
}

/** Persiste le GDL généré ou édité dans le workspace projet. */
export async function saveProjectGdl(
  projectId: string,
  gdl: GameDefinition,
  path?: string,
): Promise<{ ok: boolean; path: string; url: string }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/gdl`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gdl, path }),
  });
}

export async function createGameAsset(projectId: string, input: CreateGameAssetInput): Promise<GameProjectSnapshot> {
  return fetchJsonOrThrow<GameProjectSnapshot>(`/api/projects/${projectId}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function uploadAssetSource(projectId: string, assetId: string, file: File): Promise<GameProjectSnapshot> {
  const form = new FormData();
  form.append('file', file);
  return fetchJsonOrThrow<GameProjectSnapshot>(`/api/projects/${projectId}/assets/${assetId}/upload`, {
    method: 'POST',
    body: form,
  });
}

export async function generateAssetPrototypes(projectId: string, assetId: string, presets?: string[]): Promise<GameProjectSnapshot> {
  return fetchJsonOrThrow<GameProjectSnapshot>(`/api/projects/${projectId}/assets/${assetId}/prototypes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presets }),
  });
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  return fetchJsonOrThrow<SessionDetail>(`/api/sessions/${id}`);
}

export async function fetchSessionResults(id: string): Promise<TaskResult[]> {
  try {
    const data = await fetchJsonOrThrow<{ results: TaskResult[] }>(`/api/sessions/${id}/results`);
    return data.results;
  } catch {
    return [];
  }
}

export async function createPlan(prompt: string, images: string[]): Promise<GenerationPlan> {
  return fetchJsonOrThrow<GenerationPlan>('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images }),
  });
}

export async function uploadPhoto(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append('file', file);
  const data = await fetchJsonOrThrow<{ id: string; path: string; url: string; originalName: string }>('/api/upload', {
    method: 'POST',
    body: form,
  });
  return { id: data.id, path: data.path, url: data.url, name: data.originalName };
}

export function generateViaWebSocket(prompt: string, images: string[], callbacks: GenerateCallbacks): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'generate', prompt, images }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string) as {
      type: string;
      message?: string;
      data?: unknown;
    };

    switch (msg.type) {
      case 'status':
        if (msg.message) callbacks.onStatus(msg.message);
        break;
      case 'plan':
        callbacks.onPlan(msg.data as GenerationPlan);
        break;
      case 'task_start':
        callbacks.onTaskStart(msg.data as TaskSpec);
        break;
      case 'task_complete':
        callbacks.onTaskComplete(msg.data as TaskResult);
        break;
      case 'complete':
        callbacks.onComplete(msg.data as GenerationSession);
        break;
      case 'error':
        callbacks.onError(msg.message ?? 'Erreur génération');
        break;
    }
  };

  ws.onerror = () => callbacks.onError('Connexion WebSocket échouée');
  ws.onclose = () => {};

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}

export interface AssetStageStatus {
  id: AssetStageId;
  label: string;
  labelFr: string;
  complete: boolean;
  artifacts: string[];
}

export async function fetchAssetStages(projectId: string, assetId: string): Promise<AssetStageStatus[]> {
  const data = await fetchJsonOrThrow<{ stages: AssetStageStatus[] }>(`/api/projects/${projectId}/assets/${assetId}/stages`);
  return data.stages;
}

export async function runAssetStage(projectId: string, assetId: string, stageId: AssetStageId): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/assets/${assetId}/stages/${stageId}/run`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Stage ${stageId} échoué`);
  }
}

export interface AssetRetouchResult {
  operation: string;
  ok: boolean;
  iou?: number;
  shipping_ready?: boolean;
  agent_instruction: string;
}

/** Retouche auto (hybrid/inpaint CPU) selon IoU QA. */
export async function retouchAssetImage(projectId: string, assetId: string, auto = true): Promise<AssetRetouchResult> {
  return fetchJsonOrThrow<AssetRetouchResult>(`/api/projects/${projectId}/assets/${assetId}/image/retouch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auto }),
  });
}

export async function fetchAutonomousWorkflow(projectId: string, runId?: string): Promise<{ run: import('@ellipse/shared').AutonomousWorkflowRun }> {
  const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
  return fetchJsonOrThrow(`/api/projects/${projectId}/workflow/autonomous${q}`);
}

export async function runAutonomousWorkflow(
  projectId: string,
  body: { runId?: string; maxSteps?: number } = {},
): Promise<{ run: import('@ellipse/shared').AutonomousWorkflowRun }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/workflow/autonomous/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function executeAutonomousAction(
  projectId: string,
  runId: string,
  actionId: string,
): Promise<{ run: import('@ellipse/shared').AutonomousWorkflowRun }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/workflow/autonomous/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, actionId }),
  });
}

export async function fetchWorkflowCatalog(): Promise<WorkflowCatalogResponse> {
  return fetchJsonOrThrow<WorkflowCatalogResponse>('/api/workflows/catalog');
}

export interface ExtractAssetInput {
  source: string;
  name: string;
  family?: string;
  box: { left: number; top: number; width: number; height: number };
  tolerance?: number;
  targetHeight?: number;
}

export interface ExtractAssetResult {
  id: string;
  name: string;
  family: string;
  url: string;
  width: number;
  height: number;
  removed_ratio: number;
}

export interface ReferenceUpload { name: string; path: string; url: string }

export async function uploadReference(projectId: string, file: File): Promise<ReferenceUpload> {
  const form = new FormData();
  form.append('file', file);
  return fetchJsonOrThrow<ReferenceUpload>(`/api/projects/${projectId}/references`, { method: 'POST', body: form });
}

export async function extractAsset(projectId: string, input: ExtractAssetInput): Promise<ExtractAssetResult> {
  return fetchJsonOrThrow<ExtractAssetResult>(`/api/projects/${projectId}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export type WorkOrderScript =
  | 'veloria:sprint-b'
  | 'veloria:sprints-cde'
  | 'veloria:all'
  | 'veloria:refine-all'
  | 'veloria:build'
  | 'studio:capability-manifest'
  | 'agents:communication-test'
  | 'roadmap:t0-t3';

export async function runProjectWorkOrder(
  projectId: string,
  script: WorkOrderScript,
  workOrderId?: string,
): Promise<{ ok: boolean; script: string; duration_ms: number; stdout_tail?: string }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/work-orders/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, work_order_id: workOrderId }),
  });
}

export async function indexProjectKnowledge(projectId: string): Promise<{ index: { chunk_count: number; indexed_at: string } }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/knowledge/index`, { method: 'POST' });
}

export async function searchProjectKnowledge(
  projectId: string,
  query: string,
  limit = 12,
): Promise<{ results: Array<{ id: string; path: string; title: string; excerpt: string; tags: string[] }> }> {
  return fetchJsonOrThrow(`/api/projects/${projectId}/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}
