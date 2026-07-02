import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { FRAME_TRANSFORMS, HERO_RUNTIME_SOURCE } from './constants.js';
import type { FrameTransform, HeroPartSpec } from './types.js';

export async function assembleCleanCutout(
  assetRoot: string,
  width: number,
  height: number,
  parts: HeroPartSpec[],
  outputPath: string,
): Promise<void> {
  const composites = await Promise.all(
    parts.map(async (part) => ({
      input: await sharp(join(assetRoot, '03_cleanup', part.file)).png().toBuffer(),
      left: 0,
      top: 0,
    })),
  );

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

export async function composeAnimationAtlas(
  assetRoot: string,
  width: number,
  height: number,
  parts: HeroPartSpec[],
  frameCount: number,
): Promise<{ atlasPath: string; manifestPath: string }> {
  const partBuffers = await Promise.all(
    parts.map(async (part) => ({
      part,
      input: await sharp(join(assetRoot, '03_cleanup', part.file)).png().toBuffer(),
    })),
  );

  const frames: Buffer[] = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const transformMap: Record<string, FrameTransform> = FRAME_TRANSFORMS[frameIndex] ?? {};
    const composites = partBuffers.map(({ part, input }) => ({
      input,
      left: Math.max(0, Math.round(transformMap[part.id]?.x ?? 0)),
      top: Math.max(0, Math.round(transformMap[part.id]?.y ?? 0)),
    }));

    const frame = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    frames.push(frame);
  }

  const atlasPath = join(assetRoot, '06_exports', 'runtime_atlas.png');
  await mkdir(dirname(atlasPath), { recursive: true });
  await sharp({
    create: {
      width: width * frameCount,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((frame, index) => ({ input: frame, left: index * width, top: 0 })))
    .png()
    .toFile(atlasPath);

  const manifest = {
    source: HERO_RUNTIME_SOURCE,
    frame_width: width,
    frame_height: height,
    frame_count: frameCount,
    clips: {
      idle: { frames: [0, 1], fps: 3 },
      run: { frames: [2, 3], fps: 8 },
      jump: { frames: [4], fps: 1 },
      attack: { frames: [5], fps: 1 },
    },
  };

  const manifestPath = join(assetRoot, '06_exports', 'runtime_animation_manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { atlasPath, manifestPath };
}
