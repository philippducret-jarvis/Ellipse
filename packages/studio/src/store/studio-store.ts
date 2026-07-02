import { create } from 'zustand';
import type { AgentType, GameDefinition, GameProject, GameProjectSnapshot, GenerationPlan, TaskResult } from '@ellipse/shared';
import type { HealthResponse, SessionSummary, UploadedFile } from '../api/client.js';

export type WorkspaceTab = 'overview' | 'documents' | 'assets' | 'production' | 'generate' | 'build' | 'workspace' | 'agents' | 'observability' | 'extraction' | 'scene';
export type AgentStepStatus = 'pending' | 'running' | 'success' | 'partial' | 'failed';

export interface AgentStep {
  taskId: string;
  agent: AgentType;
  status: AgentStepStatus;
  notes?: string;
  error?: string;
}

interface StudioState {
  // ── Global ──────────────────────────────────────────────────────────────
  health: HealthResponse | null;
  setHealth: (h: HealthResponse | null) => void;

  // ── Projects list ───────────────────────────────────────────────────────
  projects: GameProject[];
  setProjects: (projects: GameProject[]) => void;

  // ── Active project workspace ────────────────────────────────────────────
  activeProjectId: string | null;
  activeSnapshot: GameProjectSnapshot | null;
  workspaceTab: WorkspaceTab;
  setActiveProject: (id: string | null) => void;
  setActiveSnapshot: (snap: GameProjectSnapshot | null) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  updateSnapshotInList: (snap: GameProjectSnapshot) => void;

  // ── New project modal ───────────────────────────────────────────────────
  newProjectOpen: boolean;
  setNewProjectOpen: (open: boolean) => void;

  // ── Assistant de création tous-genres (T2) ──────────────────────────────
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;

  // ── Generation (per active project) ────────────────────────────────────
  generatePrompt: string;
  generateUploads: UploadedFile[];
  generating: boolean;
  generateError: string | null;
  generateStatus: string | null;
  generatePlan: GenerationPlan | null;
  generateAgentSteps: AgentStep[];
  generateSessionId: string | null;
  generateSessionStatus: string | null;
  generateGdl: GameDefinition | null;

  setGeneratePrompt: (p: string) => void;
  addGenerateUpload: (f: UploadedFile) => void;
  removeGenerateUpload: (path: string) => void;
  setGenerating: (b: boolean) => void;
  setGenerateError: (e: string | null) => void;
  setGenerateStatus: (s: string | null) => void;
  initAgentSteps: (plan: GenerationPlan) => void;
  markAgentRunning: (agent: AgentType, taskId: string) => void;
  updateAgentStep: (result: TaskResult) => void;
  setGeneratePlan: (plan: GenerationPlan | null) => void;
  setGenerateSession: (s: { session_id: string; status: string; gdl: GameDefinition; plan: GenerationPlan }) => void;
  resetGeneration: () => void;

  // ── Sessions (history) ──────────────────────────────────────────────────
  sessions: SessionSummary[];
  setSessions: (sessions: SessionSummary[]) => void;
  selectedSessionId: string | null;
  selectSession: (id: string | null) => void;
}

function resultToStatus(s: TaskResult['status']): AgentStepStatus {
  if (s === 'success') return 'success';
  if (s === 'partial') return 'partial';
  if (s === 'failed') return 'failed';
  return 'pending';
}

export const useStudioStore = create<StudioState>((set, get) => ({
  // Global
  health: null,
  setHealth: (health) => set({ health }),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),

  // Active workspace
  activeProjectId: null,
  activeSnapshot: null,
  workspaceTab: 'overview',
  setActiveProject: (id) => set({ activeProjectId: id, activeSnapshot: null, workspaceTab: 'overview' }),
  setActiveSnapshot: (snap) => set({ activeSnapshot: snap }),
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  updateSnapshotInList: (snap) => {
    const projects = get().projects.map((p) => p.id === snap.project.id ? snap.project : p);
    set({ activeSnapshot: snap, projects });
  },

  // New project modal
  newProjectOpen: false,
  setNewProjectOpen: (open) => set({ newProjectOpen: open }),

  // Assistant de création
  wizardOpen: false,
  setWizardOpen: (open) => set({ wizardOpen: open }),

  // Generation
  generatePrompt: '',
  generateUploads: [],
  generating: false,
  generateError: null,
  generateStatus: null,
  generatePlan: null,
  generateAgentSteps: [],
  generateSessionId: null,
  generateSessionStatus: null,
  generateGdl: null,

  setGeneratePrompt: (p) => set({ generatePrompt: p }),
  addGenerateUpload: (f) => set({ generateUploads: [...get().generateUploads, f] }),
  removeGenerateUpload: (path) => set({ generateUploads: get().generateUploads.filter((u) => u.path !== path) }),
  setGenerating: (b) => set({ generating: b }),
  setGenerateError: (e) => set({ generateError: e }),
  setGenerateStatus: (s) => set({ generateStatus: s }),

  initAgentSteps: (plan) =>
    set({ generateAgentSteps: plan.tasks.map((t) => ({ taskId: t.task_id, agent: t.agent, status: 'pending' as const })) }),

  markAgentRunning: (agent, taskId) =>
    set({ generateAgentSteps: get().generateAgentSteps.map((s) => s.taskId === taskId ? { ...s, agent, status: 'running' as const } : s) }),

  updateAgentStep: (result) =>
    set({
      generateAgentSteps: get().generateAgentSteps.map((s) =>
        s.taskId === result.task_id ? { ...s, status: resultToStatus(result.status), notes: result.agent_notes, error: result.error } : s,
      ),
    }),

  setGeneratePlan: (plan) => set({ generatePlan: plan }),
  setGenerateSession: ({ session_id, status, gdl, plan }) =>
    set({ generateSessionId: session_id, generateSessionStatus: status, generateGdl: gdl, generatePlan: plan }),

  resetGeneration: () =>
    set({ generating: false, generateError: null, generateStatus: null, generatePlan: null, generateAgentSteps: [], generateSessionId: null, generateSessionStatus: null, generateGdl: null }),

  // Sessions
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  selectedSessionId: null,
  selectSession: (id) => set({ selectedSessionId: id }),
}));
