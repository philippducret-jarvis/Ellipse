import type { ReactNode } from 'react';
import type { WorkspaceTreeEntry } from '../../../api/client.js';

export function renderWorkspaceTree(
  entries: WorkspaceTreeEntry[],
  selectedPath: string | null,
  onSelect: (path: string) => void,
): ReactNode {
  return entries.map((entry) => (
    <div key={entry.path} className="workspace-tree-node">
      <button
        type="button"
        className={`workspace-tree-item workspace-tree-item-${entry.type} ${selectedPath === entry.path ? 'active' : ''}`}
        onClick={() => {
          if (entry.type === 'file') onSelect(entry.path);
        }}
      >
        <span className="workspace-tree-icon">{entry.type === 'directory' ? '[dir]' : '[file]'}</span>
        <span className="workspace-tree-label">{entry.name}</span>
      </button>
      {entry.children?.length ? (
        <div className="workspace-tree-children">
          {renderWorkspaceTree(entry.children, selectedPath, onSelect)}
        </div>
      ) : null}
    </div>
  ));
}
