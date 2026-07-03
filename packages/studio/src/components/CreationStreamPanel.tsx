import { useMemo } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { CREATION_STREAM, assessCreationStream, type StreamMilestoneId } from '@ellipse/shared';
import { useStudioStore, type WorkspaceTab } from '../store/studio-store.js';
import { ActionButton } from '../ui/ActionButton.js';
import { resolvePreviewUrl } from '../lib/preview.js';

export function CreationStreamPanel({ snap }: { snap: GameProjectSnapshot }) {
  const setTab = useStudioStore((s) => s.setWorkspaceTab);
  const previewUrl = resolvePreviewUrl(snap);
  const assessment = useMemo(() => assessCreationStream(snap, previewUrl), [snap, previewUrl]);

  function openMilestone(id: StreamMilestoneId) {
    const m = CREATION_STREAM.find((x) => x.id === id);
    if (m) setTab(m.studioTab as WorkspaceTab);
  }

  return (
    <section className="creation-stream-panel" aria-label="Timeline de création">
      <header>
        <p className="workspace-kicker">F3 — Toujours jouable</p>
        <h3>Timeline T+0 → T+6</h3>
        <p className="muted">Chaque étape doit produire une preview honnête — jamais de batch invisible.</p>
      </header>
      <ol className="creation-stream-steps">
        {CREATION_STREAM.map((m) => {
          const prog = assessment.milestones.find((p) => p.milestoneId === m.id)!;
          const isCurrent = assessment.currentId === m.id;
          return (
            <li key={m.id} className={`stream-step status-${prog.status}${isCurrent ? ' is-current' : ''}`}>
              <div className="stream-step-head">
                <strong>{m.labelFr}</strong>
                <span className={`pj-badge pj-badge-${prog.status === 'done' ? 'done' : isCurrent ? 'active' : 'ready'}`}>
                  {prog.status === 'done' ? 'Jouable' : isCurrent ? 'En cours' : 'À faire'}
                </span>
              </div>
              <p className="muted">{m.previewFr}</p>
              <p className="stream-criteria">{prog.detailFr}</p>
              {isCurrent ? (
                <ActionButton
                  label="Ouvrir l'étape"
                  hint={m.playableCriteriaFr}
                  variant="primary"
                  onClick={() => openMilestone(m.id)}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {assessment.alwaysPlayableUrl ? (
        <a className="stream-preview-link" href={assessment.alwaysPlayableUrl} target="_blank" rel="noreferrer">
          Ouvrir preview workspace →
        </a>
      ) : null}
    </section>
  );
}
