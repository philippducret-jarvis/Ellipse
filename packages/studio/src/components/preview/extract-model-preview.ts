import type { GameDefinition } from '@ellipse/shared';

export interface PreviewLearningMeta {
  attempt?: number;
  score?: number;
  bestScore?: number;
  settings?: { textureSize?: number; frameCount?: number; depthStrength?: number };
}

export interface PreviewModelData {
  modelUrl: string | null;
  textureUrl?: string;
  learning?: PreviewLearningMeta;
}

export function extractPreviewModelData(gdl: GameDefinition): PreviewModelData {
  const playerEntity = gdl.entities.find((entity) => {
    const candidate = entity as { id?: string };
    return candidate.id === 'player';
  }) as { assets?: Record<string, unknown> } | undefined;

  const assets = playerEntity?.assets ?? {};
  const modelUrl = typeof assets.model === 'string' ? assets.model : null;
  const textureUrl = typeof assets.model_texture === 'string' ? assets.model_texture : undefined;
  const meta = gdl.meta as Record<string, unknown>;
  const learning = (meta.learning as PreviewLearningMeta | undefined) ?? undefined;

  return {
    modelUrl,
    textureUrl,
    learning,
  };
}
