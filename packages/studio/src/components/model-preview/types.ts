export interface LearningMeta {
  attempt?: number;
  score?: number;
  bestScore?: number;
  settings?: {
    textureSize?: number;
    frameCount?: number;
    depthStrength?: number;
  };
}

export interface ModelPreviewProps {
  title: string;
  modelUrl: string;
  textureUrl?: string;
  learning?: LearningMeta | null;
}
