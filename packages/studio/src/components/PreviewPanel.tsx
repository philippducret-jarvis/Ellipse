import { useStudioStore } from '../store/studio-store.js';
import { PhotoModelPreviewSurface } from './preview/PhotoModelPreviewSurface.js';
import { PlayablePreviewSurface } from './preview/PlayablePreviewSurface.js';
import { extractPreviewModelData } from './preview/extract-model-preview.js';

export function PreviewPanel() {
  const gdl = useStudioStore((state) => state.generateGdl);
  const sessionStatus = useStudioStore((state) => state.generateSessionStatus);

  if (!gdl || sessionStatus !== 'completed') return null;

  const { modelUrl, textureUrl, learning } = extractPreviewModelData(gdl);

  if (modelUrl && gdl.meta.dimension === '3d') {
    return (
      <PhotoModelPreviewSurface
        title={gdl.meta.title}
        modelUrl={modelUrl}
        textureUrl={textureUrl}
        learning={learning}
      />
    );
  }

  return <PlayablePreviewSurface gdl={gdl} />;
}
