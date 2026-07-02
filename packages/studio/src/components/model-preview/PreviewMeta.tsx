import type { LearningMeta } from './types.js';

export function PreviewMeta({ learning }: { learning?: LearningMeta | null }) {
  return (
    <div className="preview-meta">
      {learning?.attempt != null ? <span className="preview-pill">Tentative {learning.attempt}</span> : null}
      {learning?.score != null ? <span className="preview-pill">Score {learning.score}/100</span> : null}
      {learning?.settings?.textureSize != null ? (
        <span className="preview-pill">Texture {learning.settings.textureSize}px</span>
      ) : null}
      {learning?.settings?.frameCount != null ? (
        <span className="preview-pill">{learning.settings.frameCount} frames</span>
      ) : null}
    </div>
  );
}
