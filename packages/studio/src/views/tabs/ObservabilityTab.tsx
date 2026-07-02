import { useEffect, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { fetchObservability, type ObservabilitySummary } from '../../api/client.js';
import { useStudioStore } from '../../store/studio-store.js';

/**
 * Observabilité — métriques de production, provenance et reproductibilité (Lots 5/10).
 */
const TRACKED_METRICS: { id: string; label: string; help: string }[] = [
  { id: 'prompt_to_preview_ms', label: 'Temps prompt → preview', help: 'Latence de bout en bout de la fabrication.' },
  { id: 'retry', label: 'Retries par type de tâche', help: 'Techniques, qualité, créatifs bornés.' },
  { id: 'validator_failure', label: 'Échecs de validateurs', help: 'Par famille d’asset / gate QA.' },
  { id: 'qa_score', label: 'Score QA', help: 'Lisibilité, équilibrage, perf.' },
  { id: 'build_broken', label: 'Builds cassés', help: 'Taux de builds en échec.' },
  { id: 'agent_duration_ms', label: 'Durée par agent', help: 'Avec modèle, seed, coût.' },
];

export function ObservabilityTab({ snap }: { snap: GameProjectSnapshot }) {
  const sessions = useStudioStore((s) => s.sessions);
  const [metrics, setMetrics] = useState<ObservabilitySummary | null>(null);
  const project = snap.project as { title: string; status: string; dimension?: string; genre?: string };

  useEffect(() => {
    void fetchObservability().then(setMetrics).catch(() => setMetrics(null));
  }, [sessions.length]);

  const agentRows = metrics
    ? Object.entries(metrics.agent_stats).sort((a, b) => {
        const totalA = a[1].success + a[1].failed + a[1].partial;
        const totalB = b[1].success + b[1].failed + b[1].partial;
        return totalB - totalA;
      })
    : [];

  return (
    <div className="tab-content obs">
      <header className="obs-head">
        <h2>Observabilité</h2>
        <span className="muted">coût · qualité · retries · provenance — par run et par genre</span>
      </header>

      <section className="obs-kpis">
        <Kpi value={String(metrics?.sessions_total ?? sessions.length)} label="Sessions de génération" />
        <Kpi value={String(metrics?.sessions_completed ?? '—')} label="Sessions terminées" />
        <Kpi value={String(metrics?.tasks_failed ?? '—')} label="Tâches en échec" />
        <Kpi value={project.genre ?? '—'} label="Genre" />
      </section>

      {agentRows.length > 0 ? (
        <section className="cockpit-section">
          <div className="cockpit-section-head">
            <h2>Agents (agrégé)</h2>
            <span className="muted">{metrics?.tasks_total ?? 0} tâches suivies</span>
          </div>
          <div className="obs-metrics">
            {agentRows.map(([agent, stats]) => (
              <div key={agent} className="obs-metric">
                <div className="obs-metric-label">{agent}</div>
                <div className="obs-metric-help">
                  ✓ {stats.success} · ~ {stats.partial} · ✗ {stats.failed}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cockpit-section">
        <div className="cockpit-section-head"><h2>Métriques suivies</h2><span className="muted">collecteur souverain</span></div>
        <div className="obs-metrics">
          {TRACKED_METRICS.map((m) => (
            <div key={m.id} className="obs-metric">
              <div className="obs-metric-label">{m.label}</div>
              <div className="obs-metric-help">{m.help}</div>
              <code className="obs-metric-id">{m.id}</code>
            </div>
          ))}
        </div>
      </section>

      {metrics?.recent_sessions?.length ? (
        <section className="cockpit-section">
          <div className="cockpit-section-head"><h2>Runs récents</h2></div>
          <ul className="obs-list">
            {metrics.recent_sessions.map((s) => (
              <li key={s.id}>
                <code>{s.id.slice(0, 8)}</code> — {s.status} — {s.prompt.slice(0, 64)}
                {s.prompt.length > 64 ? '…' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cockpit-section">
        <div className="cockpit-section-head"><h2>Provenance & reproductibilité</h2></div>
        <ul className="obs-list">
          <li>Chaque asset porte sa <strong>généalogie</strong> (source : découpe CV ou procédural + seed).</li>
          <li>Chaque run est <strong>rejouable</strong> à l’identique via les seeds persistés.</li>
          <li>Gate de <strong>compliance</strong> (photo de personne / licences) avant tout export public.</li>
        </ul>
      </section>
    </div>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="cockpit-stat">
      <div className="cockpit-stat-value obs-kpi-value">{value}</div>
      <div className="cockpit-stat-label">{label}</div>
    </div>
  );
}
