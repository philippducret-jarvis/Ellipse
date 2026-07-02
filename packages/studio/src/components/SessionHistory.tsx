import { useEffect } from 'react';
import { fetchSession, fetchSessionResults, fetchSessions } from '../api/client.js';
import { useStudioStore } from '../store/studio-store.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionHistory() {
  const sessions = useStudioStore((s) => s.sessions);
  const setSessions = useStudioStore((s) => s.setSessions);
  const loadSessionDetail = useStudioStore((s) => s.loadSessionDetail);
  const setError = useStudioStore((s) => s.setError);
  const loading = useStudioStore((s) => s.loading);

  useEffect(() => {
    void fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [setSessions]);

  async function openSession(id: string) {
    try {
      const [detail, results] = await Promise.all([fetchSession(id), fetchSessionResults(id)]);
      loadSessionDetail({ ...detail, results });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }

  if (sessions.length === 0) {
    return (
      <section className="panel history-panel">
        <div className="panel-head">
          <h2>Historique</h2>
        </div>
        <p className="muted empty-state">Aucune session enregistrée. Générez votre premier jeu !</p>
      </section>
    );
  }

  return (
    <section className="panel history-panel">
      <div className="panel-head">
        <h2>Historique</h2>
        <button
          type="button"
          className="chip"
          onClick={() => void fetchSessions().then(setSessions)}
          disabled={loading}
        >
          Actualiser
        </button>
      </div>

      <ul className="session-list">
        {sessions.map((s) => (
          <li key={s.id}>
            <button type="button" className="session-card" onClick={() => void openSession(s.id)}>
              <div className="session-card-top">
                <span className={`session-status status-${s.status}`}>{s.status}</span>
                <time>{formatDate(s.created_at)}</time>
              </div>
              <p className="session-prompt">{s.prompt}</p>
              <span className="session-id">{s.id.slice(0, 8)}…</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
