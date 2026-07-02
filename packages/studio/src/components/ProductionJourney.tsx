import { useMemo } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import {
  PRODUCTION_JOURNEY,
  assessProductionJourney,
  getJourneyStep,
  type JourneyStepId,
} from '@ellipse/shared';
import { useStudioStore, type WorkspaceTab } from '../store/studio-store.js';
import { ActionButton } from '../ui/ActionButton.js';

const STATUS_LABEL: Record<string, string> = {
  done: 'Fait',
  active: 'En cours',
  ready: 'Prêt',
  locked: 'Verrouillé',
  blocked: 'Bloqué',
};

interface Props {
  snap: GameProjectSnapshot;
}

export function ProductionJourney({ snap }: Props) {
  const setTab = useStudioStore((s) => s.setWorkspaceTab);
  const assessment = useMemo(() => assessProductionJourney(snap), [snap]);

  function goToStep(id: JourneyStepId) {
    const step = getJourneyStep(id);
    setTab(step.studioTab as WorkspaceTab);
  }

  return (
    <section className="production-journey" aria-label="Parcours image vers jeu">
      <header className="production-journey-head">
        <div>
          <p className="workspace-kicker">Chaîne automatisée</p>
          <h3 className="production-journey-title">Image concept → asset validé → jeu</h3>
          <p className="muted production-journey-lead">
            Seuls les assets passés par la gate QA (07) sont intégrables. Les crops procéduraux et placeholders
            restent en brouillon.
          </p>
        </div>
        <div className="production-journey-stats">
          <span className="chip chip-ok">{assessment.eligibleAssetCount} validé(s)</span>
          <span className="chip chip-warn">{assessment.draftAssetCount} brouillon(s)</span>
        </div>
      </header>

      {assessment.blockersFr.length > 0 ? (
        <div className="production-journey-blockers" role="alert">
          {assessment.blockersFr.map((b) => (
            <p key={b}>{b}</p>
          ))}
        </div>
      ) : null}

      <ol className="production-journey-steps">
        {PRODUCTION_JOURNEY.map((step) => {
          const progress = assessment.steps.find((s) => s.id === step.id)!;
          const isCurrent = assessment.currentStepId === step.id;
          return (
            <li
              key={step.id}
              className={`production-journey-step status-${progress.status}${isCurrent ? ' is-current' : ''}`}
            >
              <div className="production-journey-step-num">{step.order}</div>
              <div className="production-journey-step-body">
                <div className="production-journey-step-top">
                  <strong>{step.labelFr}</strong>
                  <span className={`pj-badge pj-badge-${progress.status}`}>{STATUS_LABEL[progress.status]}</span>
                </div>
                <p className="muted">{step.descriptionFr}</p>
                <p className="production-journey-criteria">
                  <span>Sortie :</span> {progress.detailFr}
                </p>
                {step.pipelineStages.length > 0 ? (
                  <p className="production-journey-stages">
                    Pipeline : {step.pipelineStages.join(' → ')}
                  </p>
                ) : null}
                <ActionButton
                  label={isCurrent ? `${step.verbFr} — ouvrir` : `Aller : ${step.labelFr}`}
                  hint={`Ouvre l’onglet ${step.studioTab}`}
                  variant={isCurrent ? 'primary' : 'ghost'}
                  onClick={() => goToStep(step.id)}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
