import { useEffect, useRef, useState } from 'react';

export function useModelPreview(modelUrl: string) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setError(null);
    setLoading(true);

    let dispose: (() => void) | undefined;
    let cancelled = false;

    void import('./scene.js').then(({ createModelPreviewRuntime }) => {
      if (cancelled) return;

      dispose = createModelPreviewRuntime(mount, modelUrl, {
        onLoaded: () => setLoading(false),
        onError: (message) => {
          setError(message);
          setLoading(false);
        },
      });
    }).catch((cause) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : 'Chargement du preview 3D impossible');
      setLoading(false);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [modelUrl]);

  return {
    mountRef,
    loading,
    error,
  };
}
