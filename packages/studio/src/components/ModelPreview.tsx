import { PreviewMeta } from './model-preview/PreviewMeta.js';
import type { ModelPreviewProps } from './model-preview/types.js';
import { useModelPreview } from './model-preview/use-model-preview.js';

export function ModelPreview({ title, modelUrl, textureUrl, learning }: ModelPreviewProps) {
  const { mountRef, loading, error } = useModelPreview(modelUrl);

  return (
    <div className="model-preview-shell">
      <div className="model-preview-head">
        <div>
          <strong>{title}</strong>
          <p className="muted">Rotation automatique, bobbing et inspection libre</p>
        </div>
        <PreviewMeta learning={learning} />
      </div>

      <div ref={mountRef} className="model-preview-canvas" />

      <div className="model-preview-foot">
        <span className="muted">Glisser pour tourner · molette pour zoomer</span>
        {textureUrl ? (
          <a href={textureUrl} target="_blank" rel="noreferrer" className="model-preview-link">
            Voir texture HD
          </a>
        ) : null}
      </div>

      {loading ? <p className="status-line">Chargement du modele 3D...</p> : null}
      {error ? (
        <div className="model-preview-fallback">
          <p className="error">{error}</p>
          {textureUrl ? <img src={textureUrl} alt={title} /> : null}
        </div>
      ) : null}
    </div>
  );
}
