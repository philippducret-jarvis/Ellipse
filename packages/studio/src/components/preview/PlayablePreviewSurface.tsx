import { Suspense, lazy } from 'react';
import type { GameDefinition } from '@ellipse/shared';

const GamePreview = lazy(async () => {
  const module = await import('../../GamePreview.js');
  return { default: module.GamePreview };
});

export function PlayablePreviewSurface({ gdl }: { gdl: GameDefinition }) {
  return (
    <section className="panel preview-panel">
      <div className="panel-head">
        <h2>Preview jouable</h2>
        <p className="muted">Flèches / WASD · Espace pour sauter - cliquez sur le canvas</p>
      </div>
      <Suspense fallback={<p className="status-line">Chargement du preview 2D...</p>}>
        <GamePreview gdl={gdl} />
      </Suspense>
    </section>
  );
}
