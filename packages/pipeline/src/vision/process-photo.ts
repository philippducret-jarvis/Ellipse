import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export interface PhotoPipelineInput {
  sourcePath: string;
  outputDir: string;
  sessionId: string;
  frameSize?: number;
  frameCount?: number;
}

export interface PhotoPipelineResult {
  spriteSheetPath: string;
  spriteSheetUrl: string;
  palette: string[];
  frameSize: number;
  frameCount: number;
  source: 'ellipse-vision-v0';
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export async function processPhotoToSprite(input: PhotoPipelineInput): Promise<PhotoPipelineResult> {
  const frameSize = input.frameSize ?? 128;
  const frameCount = input.frameCount ?? 4;
  const sessionDir = join(input.outputDir, input.sessionId);
  await mkdir(sessionDir, { recursive: true });

  const base = sharp(input.sourcePath).rotate();
  const stats = await base.stats();

  const palette: string[] = [];
  if (stats.dominant) {
    palette.push(rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b));
  }
  for (const ch of stats.channels.slice(0, 3)) {
    palette.push(rgbToHex(ch.mean, ch.mean, ch.mean));
  }

  const cropped = await base
    .resize(frameSize, frameSize, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const frames: Buffer[] = [];
  for (let i = 0; i < frameCount; i++) {
    let mod = sharp(cropped);
    if (i > 0) mod = mod.modulate({ brightness: 1 + i * 0.04, saturation: 1.05 });
    if (i === 2) mod = mod.flop();
    frames.push(await mod.png().toBuffer());
  }

  const sheetName = 'player_sheet.png';
  const sheetPath = join(sessionDir, sheetName);

  await sharp({
    create: {
      width: frameSize * frameCount,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((buf, i) => ({ input: buf, left: i * frameSize, top: 0 })))
    .png()
    .toFile(sheetPath);

  return {
    spriteSheetPath: sheetPath,
    spriteSheetUrl: `/generated/${input.sessionId}/${sheetName}`,
    palette: [...new Set(palette)].slice(0, 5),
    frameSize,
    frameCount,
    source: 'ellipse-vision-v0',
  };
}

export async function extractStyleFromPhoto(sourcePath: string): Promise<{ palette: string[] }> {
  const stats = await sharp(sourcePath).rotate().stats();
  if (!stats.dominant) return { palette: ['#1a1a2e'] };
  return {
    palette: [rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b)],
  };
}

export async function isComfyUIAvailable(): Promise<boolean> {
  const url = process.env.COMFYUI_URL;
  if (!url) return false;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/system_stats`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
