import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import sharp from 'sharp';
import { runLot0Pipeline } from './run-lot0.js';
import { readLot0Manifest } from './manifest.js';

describe('runLot0Pipeline', () => {
  let workDir: string;

  afterEach(async () => {
    if (workDir) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await rm(workDir, { recursive: true, force: true });
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
        }
      }
    }
  });

  it('produit 2D, layers, mesh et manifest depuis une image', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'ellipse-lot0-'));
    const photoPath = join(workDir, 'hero.png');
    const outDir = join(workDir, 'generated');

    await sharp({
      create: {
        width: 320,
        height: 480,
        channels: 3,
        background: { r: 30, g: 30, b: 50 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 120, height: 80, channels: 3, background: { r: 220, g: 180, b: 60 } },
          })
            .png()
            .toBuffer(),
          top: 40,
          left: 100,
        },
        {
          input: await sharp({
            create: { width: 140, height: 200, channels: 3, background: { r: 60, g: 120, b: 200 } },
          })
            .png()
            .toBuffer(),
          top: 120,
          left: 90,
        },
      ])
      .png()
      .toFile(photoPath);

    const result = await runLot0Pipeline({
      sourcePath: photoPath,
      outputDir: outDir,
      sessionId: 'lot0-test',
      include3d: true,
    });

    expect(result.manifest.version).toBe('lot0-v0');
    expect(result.manifest.elements.length).toBeGreaterThan(0);
    expect(result.manifest.layeredSprite.url).toContain('player_layered_sheet.png');
    expect(result.manifest.mesh3d?.url).toContain('hero.gltf');
    expect(result.manifest.animations.animations.run.frames.length).toBe(4);
    expect(result.manifest.learning?.attempt).toBe(1);
    expect(result.manifest.learning?.score).toBeGreaterThan(0);

    const loaded = await readLot0Manifest(outDir, 'lot0-test');
    expect(loaded?.sessionId).toBe('lot0-test');
    expect(loaded?.learning?.attempt).toBe(1);
  });
});
