import { getAgentCatalogEntry } from '@ellipse/shared/agents/catalog';
import { useStudioStore } from '../store/studio-store.js';

export function AgentTimeline() {
  const agentSteps = useStudioStore((s) => s.agentSteps);
  const statusMessage = useStudioStore((s) => s.statusMessage);
  const loading = useStudioStore((s) => s.loading);
  const sessionStatus = useStudioStore((s) => s.sessionStatus);

  const done = agentSteps.filter((s) => s.status === 'success' || s.status === 'partial').length;
  const total = agentSteps.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="panel timeline-panel">
      <div className="panel-head">
        <h2>Pipeline agents</h2>
        {total > 0 && (
          <span className="progress-label">
            {done}/{total} · {progress}%
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {statusMessage && loading && <p className="status-line pulse">{statusMessage}</p>}

      {agentSteps.length === 0 ? (
        <p className="muted empty-state">
          Planifiez ou générez pour voir les agents actifs. Consultez « Métiers & IA » pour toutes les capacités.
        </p>
      ) : (
        <ul className="agent-list">
          {agentSteps.map((step) => {
            const entry = getAgentCatalogEntry(step.agent);
            return (
              <li key={step.taskId} className={`agent-card status-${step.status}`}>
                <div className="agent-card-head">
                  <span className="agent-icon">{entry?.icon ?? '⚙️'}</span>
                  <div>
                    <strong>{entry?.name ?? step.agent}</strong>
                    <span className="muted">{entry?.workLabel ?? step.agent}</span>
                  </div>
                  <span className={`agent-badge ${step.status}`}>{labelForStatus(step.status)}</span>
                </div>
                {entry && (
                  <ul className="capability-list compact">
                    {entry.capabilities.slice(0, 3).map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {step.notes && <p className="agent-notes">{step.notes}</p>}
                {step.error && <p className="agent-error">{step.error}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {sessionStatus && !loading && (
        <p className={`session-badge status-${sessionStatus}`}>Session · {sessionStatus}</p>
      )}
    </section>
  );
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'running':
      return 'En cours';
    case 'success':
      return 'OK';
    case 'partial':
      return 'Partiel';
    case 'failed':
      return 'Échec';
    default:
      return 'En attente';
  }
}
