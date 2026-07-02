import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { PhotoPipelineResult } from '../vision/process-photo.js';
import { processPhotoToSprite } from '../vision/process-photo.js';

export interface ProceduralHeroInput {
  outputDir: string;
  sessionId: string;
  hue?: number;
  label?: string;
}

export async function generateProceduralHero(input: ProceduralHeroInput): Promise<PhotoPipelineResult> {
  const sessionDir = join(input.outputDir, input.sessionId);
  await mkdir(sessionDir, { recursive: true });

  const hue = input.hue ?? 200;
  const tmpPath = join(sessionDir, '_procedural_source.png');

  await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 30, g: 30, b: 40 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="256" height="256"><circle cx="128" cy="100" r="48" fill="hsl(${hue},70%,55%)"/><rect x="88" y="140" width="80" height="90" rx="12" fill="hsl(${hue},60%,45%)"/></svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(tmpPath);

  return processPhotoToSprite({
    sourcePath: tmpPath,
    outputDir: input.outputDir,
    sessionId: input.sessionId,
  });
}
