import type { GameDefinition } from '@ellipse/shared';
import { PreviewStage } from './components/game-preview/PreviewStage.js';
import { useEllipsePreview } from './components/game-preview/use-ellipse-preview.js';

export function GamePreview({ gdl }: { gdl: GameDefinition }) {
  const { containerRef } = useEllipsePreview(gdl);
  return <PreviewStage containerRef={containerRef} />;
}
