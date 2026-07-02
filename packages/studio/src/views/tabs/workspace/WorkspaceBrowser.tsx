import type { WorkspaceFilePayload, WorkspaceOverview, WorkspaceTreeEntry } from '../../../api/client.js';
import { formatSize } from './helpers.js';
import { renderWorkspaceTree } from './TreeView.js';

type WorkspaceBrowserProps = {
  overview: WorkspaceOverview;
  query: string;
  onQueryChange: (value: string) => void;
  deferredQuery: string;
  filteredEntries: WorkspaceTreeEntry[];
  selectedPath: string | null;
  setSelectedPath: (path: string) => void;
  fileLoading: boolean;
  selectedFile: WorkspaceFilePayload | null;
};

export function WorkspaceBrowser({
  overview,
  query,
  onQueryChange,
  deferredQuery,
  filteredEntries,
  selectedPath,
  setSelectedPath,
  fileLoading,
  selectedFile,
}: WorkspaceBrowserProps) {
  return (
    <div className="workspace-layout-grid">
      <section className="panel workspace-preview-panel">
        <div className="panel-head">
          <div>
            <h3>Aperçu intégré</h3>
            <p className="muted">La preview web du workspace est disponible directement ici.</p>
          </div>
        </div>
        {overview.highlights.preview_url ? (
          <iframe className="workspace-preview-frame" src={overview.highlights.preview_url} title="Aperçu workspace" />
        ) : (
          <div className="preview-empty">Aucun aperçu intégré disponible.</div>
        )}
      </section>

      <section className="panel workspace-browser-panel">
        <div className="panel-head">
          <div>
            <h3>Explorateur workspace</h3>
            <p className="muted">Navigation dans dossiers, manifests, layouts, prompts et exports.</p>
          </div>
        </div>

        <div className="workspace-browser-shell">
          <aside className="workspace-browser-sidebar">
            <input
              className="text-input"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Rechercher fichiers ou dossiers"
            />

            {deferredQuery.trim() ? (
              <div className="workspace-search-results">
                {filteredEntries.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    className={`workspace-search-item ${selectedPath === entry.path ? 'active' : ''}`}
                    onClick={() => {
                      if (entry.type === 'file') setSelectedPath(entry.path);
                    }}
                  >
                    <strong>{entry.name}</strong>
                    <span className="muted">{entry.path}</span>
                  </button>
                ))}
                {filteredEntries.length === 0 ? <p className="muted">Aucun résultat.</p> : null}
              </div>
            ) : (
              <div className="workspace-tree">{renderWorkspaceTree(overview.tree, selectedPath, setSelectedPath)}</div>
            )}
          </aside>

          <div className="workspace-browser-viewer">
            {fileLoading ? <p className="muted">Chargement du fichier…</p> : null}
            {!fileLoading && !selectedFile ? <p className="muted">Sélectionnez un fichier pour l&apos;inspecter.</p> : null}

            {selectedFile ? (
              <>
                <div className="workspace-file-head">
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <p className="muted">{selectedFile.path}</p>
                  </div>
                  <div className="workspace-file-meta">
                    <span className="chip-small">{selectedFile.kind}</span>
                    <span className="chip-small">{formatSize(selectedFile.size)}</span>
                    <a className="model-preview-link" href={selectedFile.url} target="_blank" rel="noreferrer">
                      Ouvrir brut
                    </a>
                  </div>
                </div>

                {selectedFile.kind === 'image' ? (
                  <div className="workspace-image-preview">
                    <img src={selectedFile.url} alt={selectedFile.name} />
                  </div>
                ) : null}

                {selectedFile.kind === 'html' ? (
                  <iframe className="workspace-inline-frame" src={selectedFile.url} title={selectedFile.name} />
                ) : null}

                {(selectedFile.kind === 'json' || selectedFile.kind === 'markdown' || selectedFile.kind === 'text') && selectedFile.content ? (
                  <pre className="workspace-code-view">{selectedFile.content}</pre>
                ) : null}

                {selectedFile.kind === 'binary' ? (
                  <div className="preview-empty">Fichier binaire — ouvrez le fichier brut pour l&apos;inspecter.</div>
                ) : null}

                {selectedFile.truncated ? <p className="muted">Aperçu tronqué pour la lisibilité.</p> : null}
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
