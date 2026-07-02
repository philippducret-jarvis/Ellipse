import { getAgentCatalogEntry, type AgentCatalogEntry } from '@ellipse/shared/agents/catalog';

export { AGENT_CATALOG, WORK_OFFERINGS, getAgentCatalogEntry } from '@ellipse/shared/agents/catalog';

export function getAgentMeta(id: string): {
  id: string;
  name: string;
  icon: string;
  role: string;
  workLabel?: string;
  capabilities?: readonly string[];
  entry?: AgentCatalogEntry;
} {
  const entry = getAgentCatalogEntry(id);
  if (!entry) return { id, name: id, icon: '⚙️', role: 'Agent' };
  return {
    id: entry.id,
    name: entry.name,
    icon: entry.icon,
    role: entry.role,
    workLabel: entry.workLabel,
    capabilities: entry.capabilities,
    entry,
  };
}
