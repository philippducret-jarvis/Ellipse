import manifest from '../models/manifest.json' with { type: 'json' };
import type { AgentType } from '@ellipse/shared';

export interface EllipseModelEntry {
  id: string;
  type: string;
  description: string;
  weights_path: string;
  agent_id?: AgentType;
  runtime?: string;
  status: string;
  phase: number;
}

export interface ModelRegistry {
  getMaster(): EllipseModelEntry;
  getForAgent(agentId: AgentType): EllipseModelEntry | undefined;
  list(): EllipseModelEntry[];
}

class Registry implements ModelRegistry {
  private entries: Map<string, EllipseModelEntry>;

  constructor() {
    this.entries = new Map();
    const models = manifest.models as Record<string, EllipseModelEntry>;
    for (const [, entry] of Object.entries(models)) {
      if (entry.agent_id) {
        this.entries.set(entry.agent_id, entry);
      }
    }
    this.masterEntry = models.master as EllipseModelEntry;
  }

  private masterEntry: EllipseModelEntry;

  getMaster(): EllipseModelEntry {
    return this.masterEntry;
  }

  getForAgent(agentId: AgentType): EllipseModelEntry | undefined {
    return this.entries.get(agentId);
  }

  list(): EllipseModelEntry[] {
    return [this.masterEntry, ...this.entries.values()];
  }
}

let singleton: ModelRegistry | null = null;

export function getModelRegistry(): ModelRegistry {
  if (!singleton) singleton = new Registry();
  return singleton;
}

export { Registry as ModelRegistryImpl };
export function createModelRegistry(): ModelRegistry {
  return new Registry();
}
