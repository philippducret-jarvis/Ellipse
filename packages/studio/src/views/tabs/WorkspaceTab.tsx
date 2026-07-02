import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import type { WorkspaceOverview } from '../../api/client.js';
import { fetchProjectWorkspace, fetchProjectWorkspaceFile } from '../../api/client.js';
import { flattenTree, findPreferredFile } from './workspace/helpers.js';
import { WorkspaceBrowser } from './workspace/WorkspaceBrowser.js';
import { WorkspaceHero } from './workspace/WorkspaceHero.js';
import { WorkspaceStats } from './workspace/WorkspaceStats.js';

export function WorkspaceTab({ snap }: { snap: GameProjectSnapshot }) {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Awaited<ReturnType<typeof fetchProjectWorkspaceFile>> | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchProjectWorkspace(snap.project.id)
      .then((workspace) => {
        if (!active) return;
        setOverview(workspace);
        setSelectedPath(findPreferredFile(workspace.tree));
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Workspace unavailable');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [snap.project.id]);

  useEffect(() => {
    if (!selectedPath) {
      setSelectedFile(null);
      return;
    }

    let active = true;
    setFileLoading(true);

    void fetchProjectWorkspaceFile(snap.project.id, selectedPath)
      .then((file) => {
        if (!active) return;
        setSelectedFile(file);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'File unavailable');
      })
      .finally(() => {
        if (active) setFileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [snap.project.id, selectedPath]);

  const flatEntries = useMemo(() => flattenTree(overview?.tree ?? []), [overview]);
  const filteredEntries = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    if (!term) return [];
    return flatEntries.filter((entry) => entry.path.toLowerCase().includes(term) || entry.name.toLowerCase().includes(term));
  }, [deferredQuery, flatEntries]);

  return (
    <div className="tab-content workspace-tab">
      <WorkspaceHero snap={snap} overview={overview} />

      {overview ? <WorkspaceStats overview={overview} /> : null}

      {loading ? <div className="panel">Chargement du workspace…</div> : null}
      {error ? <div className="panel form-error">{error}</div> : null}

      {overview ? (
        <WorkspaceBrowser
          overview={overview}
          query={query}
          onQueryChange={setQuery}
          deferredQuery={deferredQuery}
          filteredEntries={filteredEntries}
          selectedPath={selectedPath}
          setSelectedPath={setSelectedPath}
          fileLoading={fileLoading}
          selectedFile={selectedFile}
        />
      ) : null}
    </div>
  );
}
