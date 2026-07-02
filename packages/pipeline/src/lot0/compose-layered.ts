import { join } from 'node:path';
import sharp from 'sharp';
import type { ExtractedElement } from './extract-elements.js';
import type { PhotoPipelineResult } from '../vision/process-photo.js';

export interface LayeredSpriteInput {
  baseSprite: PhotoPipelineResult;
  elements: ExtractedElement[];
  outputDir: string;
  sessionId: string;
  anchorOverrides?: Partial<Record<ExtractedElement['label'], number>>;
  motionScale?: number;
}

export interface LayeredSpriteResult {
  spriteSheetPath: string;
  spriteSheetUrl: string;
  frameSize: number;
  frameCount: number;
  layerBindings: {
    elementId: string;
    url: string;
    anchor: 'head' | 'torso' | 'base' | 'overlay';
    offsetY: number;
  }[];
}

const ANCHOR_Y: Record<string, number> = {
  head: 0.08,
  torso: 0.35,
  base: 0.72,
  accent: 0.45,
};

function anchorFor(label: ExtractedElement['label']): 'head' | 'torso' | 'base' | 'overlay' {
  if (label === 'accent') return 'overlay';
  return label;
}

export async function composeLayeredSpriteSheet(input: LayeredSpriteInput): Promise<LayeredSpriteResult> {
  const { baseSprite, elements, outputDir, sessionId } = input;
  const frameSize = baseSprite.frameSize;
  const frameCount = baseSprite.frameCount;
  const sessionDir = join(outputDir, sessionId, 'lot0');
  const motionScale = input.motionScale ?? 1;

  const baseBuf = await sharp(baseSprite.spriteSheetPath).png().toBuffer();
  const frameBuffers: Buffer[] = [];

  for (let i = 0; i < frameCount; i++) {
    const frameLeft = i * frameSize;
    const frameBase = await sharp(baseBuf)
      .extract({ left: frameLeft, top: 0, width: frameSize, height: frameSize })
      .png()
      .toBuffer();

    const composites: sharp.OverlayOptions[] = [];

    for (const el of elements) {
      if (el.prominence < 0.15) continue;

      const anchor = anchorFor(el.label);
      const anchorRatio = input.anchorOverrides?.[el.label] ?? ANCHOR_Y[el.label] ?? ANCHOR_Y.accent!;
      const baseY = Math.round(frameSize * anchorRatio);
      const wobble =
        el.label === 'head' && i > 0
          ? Math.sin(i * 1.2) * (3 * motionScale)
          : i === 2
            ? -2 * motionScale
            : i >= 3
              ? 2 * motionScale
              : 0;
      const top = Math.max(0, Math.min(frameSize - 32, baseY + wobble));

      const elMeta = await sharp(el.path).metadata();
      const elH = elMeta.height ?? 32;
      const elW = elMeta.width ?? 32;
      const targetW = Math.round(frameSize * (el.label === 'accent' ? 0.35 : 0.55));
      const targetH = Math.round((elH / elW) * targetW);
      const left = Math.round((frameSize - targetW) / 2);

      const resized = await sharp(el.path)
        .resize(targetW, Math.min(targetH, frameSize - top), { fit: 'inside' })
        .png()
        .toBuffer();

      composites.push({ input: resized, left: Math.round(left), top: Math.round(top) });
    }

    let frameOut = sharp(frameBase);
    if (composites.length > 0) {
      frameOut = frameOut.composite(composites);
    }
    frameBuffers.push(await frameOut.png().toBuffer());
  }

  const sheetName = 'player_layered_sheet.png';
  const sheetPath = join(sessionDir, sheetName);

  await sharp({
    create: {
      width: frameSize * frameCount,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frameBuffers.map((buf, i) => ({ input: buf, left: i * frameSize, top: 0 })))
    .png()
    .toFile(sheetPath);

  const layerBindings = elements
    .filter((e) => e.prominence >= 0.15)
    .map((e) => ({
      elementId: e.id,
      url: e.url,
      anchor: anchorFor(e.label),
      offsetY: Math.round(frameSize * (input.anchorOverrides?.[e.label] ?? ANCHOR_Y[e.label] ?? ANCHOR_Y.accent!)),
    }));

  return {
    spriteSheetPath: sheetPath,
    spriteSheetUrl: `/generated/${sessionId}/lot0/${sheetName}`,
    frameSize,
    frameCount,
    layerBindings,
  };
}
