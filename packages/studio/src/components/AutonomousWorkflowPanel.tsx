import { useCallback, useEffect, useState } from 'react';
import type { AutonomousWorkflowRun } from '@ellipse/shared';
import { AUTONOMOUS_PRODUCTION_STEPS } from '@ellipse/shared';
import {
  fetchAutonomousWorkflow,
  runAutonomousWorkflow,
  executeAutonomousAction,
} from '../api/client.js';

interface Props {
  projectId: string;
}

export function AutonomousWorkflowPanel({ projectId }: Props) {
  const [run, setRun] = useState<AutonomousWorkflowRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAutonomousWorkflow(projectId);
      setRun(data.run);
    } catch {
      setRun(null);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRun(maxSteps = 3): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const data = await runAutonomousWorkflow(projectId, { maxSteps, runId: run?.runId });
      setRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec workflow');
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(actionId: string): Promise<void> {
    if (!run?.runId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await executeAutonomousAction(projectId, run.runId, actionId);
      setRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action échouée');
    } finally {
      setBusy(false);
    }
  }

  const steps = run
    ? AUTONOMOUS_PRODUCTION_STEPS.map((def) => run.steps[def.id]).filter(Boolean)
    : [];

  const current = run?.steps[run.currentStepId];

  return (
    <section className="panel autonomous-workflow-panel">
      <header className="autonomous-workflow-head">
        <div>
          <h3>Workflow autonome — production complète</h3>
          <p className="muted">
            14 étapes : design, narrative, assets, animation, niveau, gameplay, IA ennemis, PNJ, audio, UI, FX,
            intégration, QA, export. Score &lt; seuil → retry automatique.
          </p>
        </div>
        <div className="autonomous-workflow-actions">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleRun(3)}>
            {busy ? 'En cours…' : 'Lancer / avancer (3 étapes)'}
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void refresh()}>
            Actualiser scores
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {run ? (
        <>
          <div className="autonomous-workflow-meta">
            <span className="chip">Statut : {run.status}</span>
            <span className="chip">Étape : {run.currentStepId}</span>
            <span className="chip">Intégrables : {run.integrableArtifacts.length}</span>
          </div>

          {current && !current.passed ? (
            <div className="autonomous-current-step">
              <strong>Étape courante — {current.detailFr}</strong>
              <p className="muted">Score {current.score}/{current.passScore} · Tentative {current.attempts}/{current.maxAttempts}</p>
              {current.proposedActions.length > 0 ? (
                <ul className="autonomous-action-list">
                  {current.proposedActions.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="factory-mini-btn" disabled={busy} onClick={() => void handleAction(a.id)}>
                        {a.labelFr}
                      </button>
                      <span className="muted"> — {a.reasonFr}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="autonomous-steps-grid">
            {steps.map((st) => (
              <div
                key={st.stepId}
                className={`autonomous-step-card autonomous-step-${st.status}`}
              >
                <div className="autonomous-step-title">{st.stepId.replace(/_/g, ' ')}</div>
                <div className="autonomous-step-score">
                  {st.score}/{st.passScore}
                </div>
                <div className="muted text-xs">{st.detailFr}</div>
              </div>
            ))}
          </div>

          {run.integrableArtifacts.length > 0 ? (
            <div className="autonomous-artifacts">
              <h4>Artefacts intégrables</h4>
              <ul>
                {run.integrableArtifacts.map((a) => (
                  <li key={a.path}>
                    <span className="chip chip-sm">{a.domain}</span> {a.path}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted">Chargement du workflow…</p>
      )}
    </section>
  );
}
