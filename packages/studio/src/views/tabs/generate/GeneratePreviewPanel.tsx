import { Suspense, lazy } from 'react';

import { ActionButton } from '../../../ui/ActionButton.js';

const PreviewPanel = lazy(async () => {
  const module = await import('../../../components/PreviewPanel.js');
  return { default: module.PreviewPanel };
});

export function GeneratePreviewPanel({
  hasGdl,
  onSaveToProject,
}: {
  hasGdl: boolean;
  onSaveToProject?: () => void;
}) {
  return (
    <section className="panel generate-preview-panel">
      <div className="generate-preview-head">
        <h3>Aperçu live</h3>
        {onSaveToProject ? (
          <ActionButton
            label="Enregistrer dans le projet"
            hint="Écrit le GDL dans 05_runtime/gdl — synchronise preview workspace"
            variant="secondary"
            onClick={onSaveToProject}
          />
        ) : null}
      </div>
      {hasGdl ? (
        <Suspense fallback={<div className="preview-empty"><span className="spinner-sm" /> Chargement de l&apos;aperçu…</div>}>
          <PreviewPanel />
        </Suspense>
      ) : (
        <div className="preview-empty">Generate a game to see the preview here.</div>
      )}
    </section>
  );
}
