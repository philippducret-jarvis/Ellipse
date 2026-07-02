export interface HeroRuntimePackInput {
  sourcePath: string;
  assetRoot: string;
  atlasFrames?: number;
}

export interface HeroPartSpec {
  id: string;
  label: string;
  file: string;
  pivot: { x: number; y: number };
  pixelCount: number;
}

export interface HeroRuntimePackResult {
  crop: { x: number; y: number; width: number; height: number };
  palette: string[];
  alphaMaskPath: string;
  rawCutoutPath: string;
  cleanCutoutPath: string;
  atlasPath: string;
  animationManifestPath: string;
  rigSpecPath: string;
  qaPath: string;
  parts: HeroPartSpec[];
}

export type Rgb = { r: number; g: number; b: number };
export type Bounds = { x: number; y: number; width: number; height: number };
export type RowEnvelope = { left: number; right: number };

export type FrameTransform = {
  x?: number;
  y?: number;
};
