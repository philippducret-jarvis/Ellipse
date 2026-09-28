import type { RefObject } from 'react';

export function PreviewStage({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="preview-wrap">
      <div ref={containerRef} className="preview-canvas" tabIndex={0} />
    </div>
  );
}
