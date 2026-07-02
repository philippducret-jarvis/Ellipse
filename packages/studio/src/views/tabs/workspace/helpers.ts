import type { WorkspaceTreeEntry } from '../../../api/client.js';

export function flattenTree(entries: WorkspaceTreeEntry[]): WorkspaceTreeEntry[] {
  const result: WorkspaceTreeEntry[] = [];
  for (const entry of entries) {
    result.push(entry);
    if (entry.children) result.push(...flattenTree(entry.children));
  }
  return result;
}

export function findPreferredFile(entries: WorkspaceTreeEntry[]): string | null {
  const flat = flattenTree(entries).filter((entry) => entry.type === 'file');
  const preferred = [
    'README.md',
    '07_exports/web/production-hq.html',
    '08_ops/manifests/production-hq.json',
    '08_ops/manifests/agent-work-orders.json',
    '03_assets/registry/asset-taxonomy.json',
    '03_assets/registry/model-routing.json',
    '07_exports/web/operating-model.html',
    '07_exports/web/systems-board.html',
    '07_exports/web/construction-map.html',
    '02_design/specs/game-operating-model.md',
    '02_design/specs/interactive-systems-blueprint.md',
    '02_design/specs/game-construction-stack.md',
    '02_design/specs/asset-factory-blueprint.md',
    '08_ops/manifests/agent-capabilities.json',
    '08_ops/manifests/game-operating-model.json',
    '08_ops/manifests/systems-board.json',
    '08_ops/manifests/construction-stack.json',
    '08_ops/manifests/construction-graph.json',
    '03_assets/registry/asset-production-plan.json',
    '08_ops/manifests/echoes-workspace.json',
    '05_runtime/gdl/echoes.preview.gdl.json',
    '01_inputs/references/reference-index.json',
  ];

  for (const candidate of preferred) {
    const match = flat.find((entry) => entry.path === candidate);
    if (match) return match.path;
  }

  return flat[0]?.path ?? null;
}

export function formatSize(size: number | undefined): string {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
