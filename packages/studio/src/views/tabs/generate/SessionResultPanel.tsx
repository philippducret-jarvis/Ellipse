export function SessionResultPanel({
  sessionId,
  sessionStatus,
}: {
  sessionId: string | null;
  sessionStatus: string | null;
}) {
  if (!sessionId) return null;

  const statusFr =
    sessionStatus === 'completed' ? 'Terminé' : sessionStatus === 'failed' ? 'Échec' : (sessionStatus ?? '—');

  return (
    <section className="panel session-result-panel">
      <div className="session-result-head">
        <h3>Résultat de session</h3>
        <span className={`chip chip-${sessionStatus === 'completed' ? 'success' : 'error'}`}>{statusFr}</span>
      </div>
      <p className="muted">
        ID session : <code>{sessionId}</code>
      </p>
      <div className="session-export-actions">
        <a
          className="btn-secondary"
          href={`/api/sessions/${sessionId}/export`}
          download={`ellipse-game-${sessionId.slice(0, 8)}.json`}
        >
          Exporter le bundle jeu
        </a>
      </div>
    </section>
  );
}
