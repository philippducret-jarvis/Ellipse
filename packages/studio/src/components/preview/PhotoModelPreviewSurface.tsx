import { Suspense, lazy } from 'react';
import type { PreviewLearningMeta } from './extract-model-preview.js';

const ModelPreview = lazy(async () => {
  const module = await import('../ModelPreview.js');
  return { default: module.ModelPreview };
});

export function PhotoModelPreviewSurface({
  title,
  modelUrl,
  textureUrl,
  learning,
}: {
  title: string;
  modelUrl: string;
  textureUrl?: string;
  learning?: PreviewLearningMeta;
}) {
  return (
    <section className="panel preview-panel">
      <div className="panel-head">
        <h2>Preview modele photo</h2>
        <p className="muted">Structure photo conservee, rendu 2.5D, rotation et mouvement</p>
      </div>
      <Suspense fallback={<p className="status-line">Chargement du preview 3D...</p>}>
        <ModelPreview title={title} modelUrl={modelUrl} textureUrl={textureUrl} learning={learning} />
      </Suspense>
    </section>
  );
}
