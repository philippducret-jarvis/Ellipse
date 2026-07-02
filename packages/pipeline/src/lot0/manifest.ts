import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExtractedElement } from './extract-elements.js';
import type { Lot0AnimationSet } from './animation-lot0.js';
import type { Lot0LearningResultSummary } from './learning-profile.js';

export const LOT0_MANIFEST_NAME = 'lot0_manifest.json';

export interface Lot0Manifest {
  version: 'lot0-v0';
  sessionId: string;
  source: 'ellipse-lot0-v0';
  palette: string[];
  backgroundColor: string;
  elements: ExtractedElement[];
  sprite2d: {
    path: string;
    url: string;
    frameSize: number;
    frameCount: number;
  };
  layeredSprite: {
    path: string;
    url: string;
    frameSize: number;
    frameCount: number;
    layerBindings: {
      elementId: string;
      url: string;
      anchor: string;
      offsetY: number;
    }[];
  };
  mesh3d?: {
    path: string;
    url: string;
    textureUrl: string;
    vertexCount: number;
  };
  animations: Lot0AnimationSet;
  learning?: Lot0LearningResultSummary;
  createdAt: string;
}

export function lot0ManifestPath(outputDir: string, sessionId: string): string {
  return join(outputDir, sessionId, 'lot0', LOT0_MANIFEST_NAME);
}

export async function writeLot0Manifest(path: string, manifest: Lot0Manifest): Promise<void> {
  await writeFile(path, JSON.stringify(manifest, null, 2), 'utf8');
}

export async function readLot0Manifest(outputDir: string, sessionId: string): Promise<Lot0Manifest | null> {
  try {
    const raw = await readFile(lot0ManifestPath(outputDir, sessionId), 'utf8');
    return JSON.parse(raw) as Lot0Manifest;
  } catch {
    return null;
  }
}
