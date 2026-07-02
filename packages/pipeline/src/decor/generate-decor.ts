import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export interface DecorPipelineInput {
  outputDir: string;
  sessionId: string;
  palette?: string[];
  genre?: string;
  sourcePath?: string;
}

export interface DecorPipelineResult {
  tilesetPath: string;
  tilesetUrl: string;
  backgroundPath: string;
  backgroundUrl: string;
  palette: string[];
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) || 26,
    g: parseInt(h.slice(2, 4), 16) || 26,
    b: parseInt(h.slice(4, 6), 16) || 46,
  };
}

export async function generateDecorAssets(input: DecorPipelineInput): Promise<DecorPipelineResult> {
  const sessionDir = join(input.outputDir, input.sessionId);
  await mkdir(sessionDir, { recursive: true });

  let palette = input.palette ?? ['#1a1a2e', '#0f3460', '#533483', '#e94560'];
  if (input.sourcePath) {
    const stats = await sharp(input.sourcePath).rotate().stats();
    if (stats.dominant) {
      const d = stats.dominant;
      palette = [
        `#${[d.r, d.g, d.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`,
        ...palette.slice(1),
      ];
    }
  }

  const c0 = parseHex(palette[0]!);
  const c1 = parseHex(palette[1] ?? palette[0]!);
  const c2 = parseHex(palette[2] ?? palette[1] ?? palette[0]!);

  const tileSize = 64;
  const tilesetName = 'decor_tileset.png';
  const bgName = 'background.png';
  const tilesetPath = join(sessionDir, tilesetName);
  const backgroundPath = join(sessionDir, bgName);

  const ground = await sharp({
    create: { width: tileSize, height: tileSize, channels: 4, background: { ...c1, alpha: 255 } },
  })
    .png()
    .toBuffer();

  const accent = await sharp({
    create: { width: tileSize, height: tileSize, channels: 4, background: { ...c2, alpha: 255 } },
  })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: tileSize * 4,
      height: tileSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: ground, left: 0, top: 0 },
      { input: accent, left: tileSize, top: 0 },
      { input: ground, left: tileSize * 2, top: 0 },
      { input: accent, left: tileSize * 3, top: 0 },
    ])
    .png()
    .toFile(tilesetPath);

  await sharp({
    create: { width: 1280, height: 720, channels: 3, background: c0 },
  })
    .linear(1.1, -10)
    .png()
    .toFile(backgroundPath);

  return {
    tilesetPath,
    tilesetUrl: `/generated/${input.sessionId}/${tilesetName}`,
    backgroundPath,
    backgroundUrl: `/generated/${input.sessionId}/${bgName}`,
    palette,
  };
}
