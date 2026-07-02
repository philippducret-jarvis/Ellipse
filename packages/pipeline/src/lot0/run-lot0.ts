import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { processPhotoToSprite } from '../vision/process-photo.js';
import { extractImageElements } from './extract-elements.js';
import { composeLayeredSpriteSheet } from './compose-layered.js';
import { generateMeshFromSilhouette } from './mesh-from-silhouette.js';
import { buildLot0Animations } from './animation-lot0.js';
import { lot0ManifestPath, writeLot0Manifest, type Lot0Manifest } from './manifest.js';
import {
  deriveLearningSettings,
  toLearningSummary,
  updateLearningProfile,
} from './learning-profile.js';

export interface Lot0PipelineInput {
  sourcePath: string;
  outputDir: string;
  sessionId: string;
  frameSize?: number;
  frameCount?: number;
  include3d?: boolean;
}

export interface Lot0PipelineResult {
  manifest: Lot0Manifest;
  manifestPath: string;
}

export async function runLot0Pipeline(input: Lot0PipelineInput): Promise<Lot0PipelineResult> {
  const sessionLot0Dir = join(input.outputDir, input.sessionId, 'lot0');
  await mkdir(sessionLot0Dir, { recursive: true });
  const learning = await deriveLearningSettings(input.sourcePath, input.outputDir);
  const frameSize = input.frameSize ?? learning.settings.frameSize;
  const frameCount = input.frameCount ?? learning.settings.frameCount;

  const [extraction, sprite2d] = await Promise.all([
    extractImageElements({
      sourcePath: input.sourcePath,
      outputDir: input.outputDir,
      sessionId: input.sessionId,
      analysisSize: learning.settings.analysisSize,
    }),
    processPhotoToSprite({
      sourcePath: input.sourcePath,
      outputDir: input.outputDir,
      sessionId: input.sessionId,
      frameSize,
      frameCount,
    }),
  ]);

  const layeredSprite = await composeLayeredSpriteSheet({
    baseSprite: sprite2d,
    elements: extraction.elements,
    outputDir: input.outputDir,
    sessionId: input.sessionId,
    anchorOverrides: learning.profile?.preferredAnchors,
    motionScale: learning.settings.motionScale,
  });

  const animations = buildLot0Animations(frameCount, learning.settings.motionScale);

  let mesh3d: Lot0Manifest['mesh3d'];
  if (input.include3d !== false) {
    const mesh = await generateMeshFromSilhouette({
      sourcePath: input.sourcePath,
      outputDir: input.outputDir,
      sessionId: input.sessionId,
      elements: extraction.elements,
      textureSize: learning.settings.textureSize,
      depthStrength: learning.settings.depthStrength,
    });
    mesh3d = {
      path: mesh.path,
      url: mesh.url,
      textureUrl: mesh.textureUrl,
      vertexCount: mesh.vertexCount,
    };
  }

  const anchorOffsets = extraction.elements.reduce<Partial<Record<typeof extraction.elements[number]['label'], number>>>(
    (acc, element) => {
      const binding = layeredSprite.layerBindings.find((layer) => layer.elementId === element.id);
      if (binding) acc[element.label] = binding.offsetY / frameSize;
      return acc;
    },
    {},
  );

  const profile = await updateLearningProfile({
    sourcePath: input.sourcePath,
    outputDir: input.outputDir,
    fingerprint: learning.fingerprint,
    previousProfile: learning.profile,
    settings: learning.settings,
    metrics: {
      sessionId: input.sessionId,
      elementCount: extraction.elements.length,
      layerCount: layeredSprite.layerBindings.length,
      vertexCount: mesh3d?.vertexCount ?? 0,
      paletteSize: [...new Set([...extraction.palette, ...sprite2d.palette])].length,
      anchorOffsets,
    },
  });

  const manifest: Lot0Manifest = {
    version: 'lot0-v0',
    sessionId: input.sessionId,
    source: 'ellipse-lot0-v0',
    palette: [...new Set([...extraction.palette, ...sprite2d.palette])],
    backgroundColor: extraction.backgroundColor,
    elements: extraction.elements,
    sprite2d: {
      path: sprite2d.spriteSheetPath,
      url: sprite2d.spriteSheetUrl,
      frameSize: sprite2d.frameSize,
      frameCount: sprite2d.frameCount,
    },
    layeredSprite: {
      path: layeredSprite.spriteSheetPath,
      url: layeredSprite.spriteSheetUrl,
      frameSize: layeredSprite.frameSize,
      frameCount: layeredSprite.frameCount,
      layerBindings: layeredSprite.layerBindings,
    },
    mesh3d,
    animations,
    learning: toLearningSummary(profile),
    createdAt: new Date().toISOString(),
  };

  const manifestPath = lot0ManifestPath(input.outputDir, input.sessionId);
  await writeLot0Manifest(manifestPath, manifest);

  return { manifest, manifestPath };
}

export async function runLot0MeshOnly(input: Omit<Lot0PipelineInput, 'include3d'>): Promise<Lot0Manifest['mesh3d']> {
  const mesh = await generateMeshFromSilhouette({
    sourcePath: input.sourcePath,
    outputDir: input.outputDir,
    sessionId: input.sessionId,
  });
  return {
    path: mesh.path,
    url: mesh.url,
    textureUrl: mesh.textureUrl,
    vertexCount: mesh.vertexCount,
  };
}
