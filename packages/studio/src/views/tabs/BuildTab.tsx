import { useEffect, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { fetchSessions, fetchSession, fetchSessionResults } from '../../api/client.js';
import { useStudioStore } from '../../store/studio-store.js';
import { ActionButton } from '../../ui/ActionButton.js';
import { PROJECT_STATUS_FR } from '../../i18n/fr.js';

const STATUS_FR: Record<string, string> = {
  ready: 'Prêt',
  queued: 'En file',
  failed: 'Échec',
  building: 'Compilation…',
  completed: 'Terminé',
  ...PROJECT_STATUS_FR,
};

export function BuildTab({ snap }: { snap: GameProjectSnapshot }) {
  const sessions = useStudioStore((s) => s.sessions);
  const setSessions = useStudioStore((s) => s.setSessions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{ prompt: string; status: string; created_at?: string } | null>(null);
  const [taskResults, setTaskResults] = useState<{ task_id: string; agent: string; status: string; agent_notes?: string }[]>([]);

  useEffect(() => {
    void fetchSessions().then((list) => setSessions(list)).catch(() => {});
  }, [setSessions]);

  useEffect(() => {
    if (!selectedId) return;

    void Promise.all([fetchSession(selectedId), fetchSessionResults(selectedId)])
      .then(([detail, results]) => {
        setSessionDetail(detail);
        setTaskResults(results);
      })
      .catch(() => {});
  }, [selectedId]);

  const exportHtml5Url = `/api/projects/${snap.project.id}/export/html5`;
  const exportPwaUrl = `/api/projects/${snap.project.id}/export/pwa`;
  const previewUrl = `/workspaces/${snap.project.slug}/07_exports/web/preview.html`;

  return (
    <div className="tab-content build-tab">
      <header className="es-command-bar-links" style={{ marginBottom: '1rem' }}>
        <ActionButton
          label="Exporter HTML5"
          hint="Télécharge le bundle jeu (preview + GDL + assets web)"
          variant="primary"
          onClick={() => {
            window.open(exportHtml5Url, '_blank');
          }}
        />
        <ActionButton
          label="Playtest synthétique"
          hint="500+ frames headless — rapport dans 08_ops/manifests"
          variant="secondary"
          onClick={() => {
            void fetch(`/api/projects/${snap.project.id}/playtest/synthetic`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ runs: 24 }),
            })
              .then((r) => r.json())
              .then((d) => alert(`Playtest: ${d.report?.wins ?? 0} wins / ${d.report?.losses ?? 0} losses`))
              .catch(() => alert('Playtest échoué'));
          }}
        />
        <ActionButton
          label="Export Godot"
          hint="Génère project.godot + main.tscn dans 07_exports/godot"
          variant="ghost"
          onClick={() => {
            void fetch(`/api/projects/${snap.project.id}/export/godot`, { method: 'POST' })
              .then((r) => r.json())
              .then((d) => alert(d.ok ? `Godot export: ${d.files?.length ?? 0} fichiers` : 'Échec'))
              .catch(() => alert('Export Godot échoué'));
          }}
        />
        <a className="es-btn es-btn-ghost es-btn-link" href={previewUrl} target="_blank" rel="noreferrer" title="Ouvre la preview dans un nouvel onglet">
          <span className="es-btn-text">
            <span className="es-btn-label">Ouvrir la preview</span>
            <span className="es-btn-hint">Valide le rendu avant export</span>
          </span>
        </a>
      </header>

      <div className="build-layout">
        <section className="panel build-status-panel">
          <h3>Cibles de compilation</h3>
          {snap.builds.length === 0 ? (
            <p className="muted">Aucune compilation. Lancez les agents ou exportez depuis le workspace.</p>
          ) : null}
          <div className="build-list">
            {snap.builds.map((build) => (
              <div key={build.id} className="build-item">
                <div className="build-item-info">
                  <strong>{build.target}</strong>
                  <span className="muted"> · {new Date(build.created_at ?? '').toLocaleString('fr-FR')}</span>
                </div>
                <span className={`chip chip-${build.status === 'ready' ? 'success' : build.status === 'failed' ? 'error' : 'muted'}`}>
                  {STATUS_FR[build.status] ?? build.status}
                </span>
                {build.output_url ? (
                  <a className="link" href={build.output_url} target="_blank" rel="noreferrer">
                    Ouvrir
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="panel build-sessions-panel">
          <h3>Runs de génération</h3>
          <div className="sessions-list">
            {sessions.slice(0, 20).map((session) => (
              <button
                key={session.id}
                type="button"
                className={`session-item ${selectedId === session.id ? 'active' : ''}`}
                onClick={() => setSelectedId(session.id)}
              >
                <div className="session-item-prompt">
                  {session.prompt.slice(0, 72)}
                  {session.prompt.length > 72 ? '…' : ''}
                </div>
                <div className="session-item-meta">
                  <span className={`chip chip-sm chip-${session.status === 'completed' ? 'success' : session.status === 'failed' ? 'error' : 'muted'}`}>
                    {STATUS_FR[session.status] ?? session.status}
                  </span>
                  <span className="muted">{new Date(session.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </button>
            ))}
            {sessions.length === 0 ? <p className="muted">Aucun run de génération pour le moment.</p> : null}
          </div>
        </section>

        {selectedId ? (
          <section className="panel build-detail-panel">
            <h3>Détail du run</h3>
            {sessionDetail ? (
              <div className="session-detail-head">
                <p>
                  <strong>{sessionDetail.prompt}</strong>
                </p>
                <div className="session-detail-meta">
                  <span className={`chip chip-${sessionDetail.status === 'completed' ? 'success' : sessionDetail.status === 'failed' ? 'error' : 'muted'}`}>
                    {STATUS_FR[sessionDetail.status] ?? sessionDetail.status}
                  </span>
                  <span className="muted">
                    {sessionDetail.created_at ? new Date(sessionDetail.created_at).toLocaleString('fr-FR') : ''}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="session-detail-actions">
              <a className="btn-secondary" href={`/api/sessions/${selectedId}/export`} download>
                Exporter le bundle session
              </a>
            </div>

            <div className="session-tasks">
              {taskResults.map((result) => (
                <div key={result.task_id} className={`session-task session-task-${result.status}`}>
                  <span className="session-task-agent">{result.agent}</span>
                  <span className={`chip chip-sm chip-${result.status === 'success' ? 'success' : result.status === 'failed' ? 'error' : 'muted'}`}>
                    {STATUS_FR[result.status] ?? result.status}
                  </span>
                  {result.agent_notes ? <span className="session-task-notes muted">{result.agent_notes}</span> : null}
                </div>
              ))}
              {taskResults.length === 0 ? <p className="muted">Aucun résultat de tâche enregistré pour ce run.</p> : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
