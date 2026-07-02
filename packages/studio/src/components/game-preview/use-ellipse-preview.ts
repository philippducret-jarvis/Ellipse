import { useEffect, useRef } from 'react';
import type { GameDefinition } from '@ellipse/shared';

export function useEllipsePreview(gdl: GameDefinition) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    void (async () => {
      const { createEllipsePreviewRuntime } = await import('./runtime.js');
      if (cancelled) return;

      dispose = await createEllipsePreviewRuntime(container, gdl);
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [gdl]);

  return { containerRef };
}
