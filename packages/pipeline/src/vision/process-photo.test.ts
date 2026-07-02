import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import sharp from 'sharp';
import { processPhotoToSprite } from './process-photo.js';

describe('processPhotoToSprite', () => {
  let workDir: string;

  afterEach(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('génère une spritesheet 4 frames depuis une photo', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'ellipse-pipeline-'));
    const photoPath = join(workDir, 'photo.png');
    const outDir = join(workDir, 'generated');

    await sharp({
      create: { width: 256, height: 256, channels: 3, background: { r: 200, g: 80, b: 40 } },
    })
      .png()
      .toFile(photoPath);

    const result = await processPhotoToSprite({
      sourcePath: photoPath,
      outputDir: outDir,
      sessionId: 'test-session',
    });

    expect(result.frameCount).toBe(4);
    expect(result.frameSize).toBe(128);
    expect(result.spriteSheetUrl).toBe('/generated/test-session/player_sheet.png');
    expect(result.palette.length).toBeGreaterThan(0);
    expect(result.source).toBe('ellipse-vision-v0');
  });
});
