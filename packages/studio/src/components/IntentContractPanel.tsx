import { useEffect, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { INTENT_CONTRACT_PATH } from '@ellipse/shared';
import { fetchProjectWorkspaceFile } from '../api/client.js';

interface IntentContractView {
  project_title?: string;
  creative_intent?: string;
  genre?: string;
  palette_lock?: string[];
  mechanics_must?: string[];
  fidelity?: { min_iou_pass?: number; min_iou_shipping?: number };
}

export function IntentContractPanel({ snap }: { snap: GameProjectSnapshot }) {
  const [contract, setContract] = useState<IntentContractView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjectWorkspaceFile(snap.project.id, INTENT_CONTRACT_PATH)
      .then((f) => {
        if (f.content) setContract(JSON.parse(f.content) as IntentContractView);
      })
      .catch(() => setError('Contrat intention non trouvé — créé au bootstrap des nouveaux projets.'));
  }, [snap.project.id]);

  return (
    <section className="intent-contract-panel" aria-label="Contrat d'intention">
      <header>
        <p className="workspace-kicker">F1 — Contrat d&apos;intention</p>
        <h3>Source de vérité créative</h3>
        <p className="muted">Tout asset et export est évalué contre ce contrat. IoU, palette, mécaniques.</p>
      </header>
      {error && !contract ? <p className="muted">{error}</p> : null}
      {contract ? (
        <div className="intent-contract-body">
          <p><strong>{contract.project_title}</strong></p>
          <p className="intent-snippet">{contract.creative_intent?.slice(0, 280)}…</p>
          <div className="overview-tags">
            {contract.genre ? <span className="chip">{contract.genre}</span> : null}
            {contract.palette_lock?.map((c) => (
              <span key={c} className="chip chip-photo">{c}</span>
            ))}
          </div>
          <p className="muted">
            IoU pass ≥ {contract.fidelity?.min_iou_pass ?? 0.42} · shipping ≥{' '}
            {contract.fidelity?.min_iou_shipping ?? 0.72}
          </p>
          {contract.mechanics_must?.length ? (
            <p className="muted">Mécaniques requises : {contract.mechanics_must.join(', ')}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
