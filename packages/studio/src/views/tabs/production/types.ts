import type { WorkspaceFilePayload } from '../../../api/client.js';

export type ProductionView = 'families' | 'routing' | 'workorders';

export type TaxonomyFile = {
  checked_at: string;
  families: Array<{
    id: string;
    label: string;
    group: string;
    roles: string[];
    kinds: string[];
    runtimeUse: string[];
    folderPattern: string;
    realized_assets: Array<{
      id: string;
      title: string;
      role: string;
      kind: string;
      workspace_root: string | null;
    }>;
  }>;
};

export type RoutingFile = {
  checked_at: string;
  routes: Array<{
    asset_id: string;
    title: string;
    role: string;
    kind: string;
    folder_group: string;
    family_id: string;
    routing: {
      pipeline: string;
      execution: string[];
      models: Array<{ id: string; url: string; use: string }>;
      outputs: string[];
    };
  }>;
};

export type ProductionFile = {
  checked_at: string;
  stats: {
    taxonomy_families: number;
    current_assets: number;
    planned_work_orders: number;
    active_agents: number;
  };
  work_orders: Array<{
    asset_id: string;
    asset_title: string;
    role: string;
    kind: string;
    asset_root: string | null;
    status: string;
    queue_state: string;
    execution_profile: string[];
    assigned_agents: string[];
    expected_outputs: string[];
    source_refs: Array<{
      role: string;
      workspace_file: string;
      url: string;
    }>;
    stages: Array<{
      id: string;
      title: string;
      status: string;
      agents: string[];
      preferred_tools: string[];
      quality_gates: string[];
    }>;
  }>;
};

export function parseWorkspaceJson<T>(file: WorkspaceFilePayload | null): T | null {
  if (!file?.content) return null;
  try {
    return JSON.parse(file.content) as T;
  } catch {
    return null;
  }
}
