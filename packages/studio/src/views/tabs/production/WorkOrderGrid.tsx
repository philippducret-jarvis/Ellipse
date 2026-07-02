import { useState } from 'react';
import { computeStageProgress, summarizeExecution } from './helpers.js';
import { runProjectWorkOrder, type WorkOrderScript } from '../../../api/client.js';
import type { ProductionFile } from './types.js';

function inferScript(slug: string, order: ProductionFile['work_orders'][number]): WorkOrderScript | null {
  if (slug.includes('veloria')) {
    if (order.role === 'hero') return 'veloria:sprint-b';
    if (['enemy', 'boss', 'environment', 'background'].includes(order.role)) return 'veloria:refine-all';
    return 'veloria:refine-all';
  }
  return 'agents:communication-test';
}

export function WorkOrderGrid({ production, projectId, projectSlug }: { production: ProductionFile; projectId: string; projectSlug: string }) {
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRun(order: ProductionFile['work_orders'][number]) {
    const script = inferScript(projectSlug, order);
    if (!script) return;
    setRunning(order.asset_id);
    setMessage(null);
    try {
      const result = await runProjectWorkOrder(projectId, script, order.asset_id);
      setMessage(`Ordre lancé (${result.script}) — ${Math.round(result.duration_ms / 1000)}s`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Échec ordre de travail');
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="production-workorder-grid">
      {message ? <p className="muted production-mini-summary">{message}</p> : null}
      {production.work_orders.map((order) => {
        const progress = computeStageProgress(order);
        return (
          <article key={order.asset_id} className="production-card workorder-card-pro">
            <div className="production-card-head">
              <div>
                <span className="production-card-kicker">{order.queue_state}</span>
                <h4>{order.asset_title}</h4>
              </div>
              <span className={`production-status status-${order.queue_state}`}>{progress}%</span>
            </div>
            <p className="production-card-copy">{order.role} | {order.kind} | {order.status}</p>
            <div className="production-progress-track">
              <div className="production-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="muted production-mini-summary">{summarizeExecution(order)}</p>
            <div className="production-stage-stack">
              {order.stages.map((stage) => (
                <div key={stage.id} className="production-stage-item">
                  <div>
                    <strong>{stage.title}</strong>
                    <p className="muted">{stage.agents.join(', ')}</p>
                  </div>
                  <span className={`production-status status-${stage.status}`}>{stage.status}</span>
                </div>
              ))}
            </div>
            <div className="production-detail-grid">
              <div className="production-subpanel">
                <span className="muted">Expected outputs</span>
                <div className="production-chip-row">
                  {order.expected_outputs.map((output) => <span key={output} className="chip-small">{output}</span>)}
                </div>
              </div>
              <div className="production-subpanel">
                <span className="muted">Source refs</span>
                <div className="production-link-list">
                  {order.source_refs.map((reference) => (
                    <a key={`${order.asset_id}-${reference.workspace_file}`} href={reference.url} target="_blank" rel="noreferrer">
                      {reference.role}
                    </a>
                  ))}
                  {order.source_refs.length === 0 ? <span className="muted">To be linked</span> : null}
                </div>
              </div>
            </div>
            <div className="production-hero-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                disabled={running === order.asset_id}
                onClick={() => void handleRun(order)}
              >
                {running === order.asset_id ? 'Exécution…' : 'Exécuter ordre'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
