import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { rgbToHex } from '../lot0/color-utils.js';

export interface EnvironmentKitPackInput {
  sourcePath: string;
  assetRoot: string;
}

export interface EnvironmentKitPackResult {
  crop: { x: number; y: number; width: number; height: number };
  tilesetCrop: { x: number; y: number; width: number; height: number };
  outputs: string[];
  palette: string[];
}

function toInt(value: number): number {
  return Math.max(1, Math.round(value));
}

async function writeBuffer(path: string, buffer: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

function buildPaletteFromStats(stats: Awaited<ReturnType<sharp.Sharp['stats']>>): string[] {
  const palette = new Set<string>();
  if (stats.dominant) palette.add(rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b));
  for (const channel of stats.channels.slice(0, 3)) {
    palette.add(rgbToHex(channel.mean, channel.mean, channel.mean));
  }
  return [...palette].slice(0, 6);
}

async function extractForegroundGlow(buffer: Buffer): Promise<Buffer> {
  const source = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = source.info;
  const out = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = source.data[index] ?? 0;
      const g = source.data[index + 1] ?? 0;
      const b = source.data[index + 2] ?? 0;
      const lum = Math.max(r, g, b);
      const isSpore = b > 90 && g > 70;
      const isLamp = lum > 118 && r > 100;
      const isAccentMushroom = r > 100 && g < 100 && b < 110;
      if (!isSpore && !isLamp && !isAccentMushroom) continue;
      out[index] = r;
      out[index + 1] = g;
      out[index + 2] = b;
      out[index + 3] = 255;
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export async function generateEnvironmentKitPack(input: EnvironmentKitPackInput): Promise<EnvironmentKitPackResult> {
  const image = sharp(input.sourcePath).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 2048;
  const height = metadata.height ?? 1024;

  const mainCrop = {
    left: 0,
    top: toInt(height * 0.05),
    width: toInt(width * 0.84),
    height: toInt(height * 0.43),
  };

  const tilesetCrop = {
    left: 0,
    top: toInt(height * 0.56),
    width: toInt(width * 0.34),
    height: toInt(height * 0.25),
  };

  const dynamicsCrop = {
    left: toInt(width * 0.34),
    top: toInt(height * 0.56),
    width: toInt(width * 0.28),
    height: toInt(height * 0.25),
  };

  const mainScene = await image.extract(mainCrop).png().toBuffer();
  const tilesetStrip = await sharp(input.sourcePath).rotate().extract(tilesetCrop).png().toBuffer();
  const dynamicsStrip = await sharp(input.sourcePath).rotate().extract(dynamicsCrop).png().toBuffer();

  const farLayer = await sharp(mainScene).blur(4.2).modulate({ brightness: 0.74, saturation: 0.58 }).png().toBuffer();
  const midLayer = await sharp(mainScene).modulate({ brightness: 0.9, saturation: 0.88 }).sharpen().png().toBuffer();
  const foregroundGlow = await extractForegroundGlow(mainScene);
  const collisionGuide = await sharp(mainScene).grayscale().normalise().threshold(86).png().toBuffer();

  const playfieldPath = join(input.assetRoot, '02_cutouts', 'playfield_crop.png');
  const farLayerPath = join(input.assetRoot, '03_cleanup', 'parallax_far.png');
  const midLayerPath = join(input.assetRoot, '03_cleanup', 'parallax_mid.png');
  const foregroundPath = join(input.assetRoot, '03_cleanup', 'foreground_glow.png');
  const tilesetPath = join(input.assetRoot, '06_exports', 'tileset_reference_strip.png');
  const dynamicsPath = join(input.assetRoot, '06_exports', 'dynamic_elements_strip.png');
  const collisionPath = join(input.assetRoot, '06_exports', 'collision_guide.png');

  await writeBuffer(playfieldPath, mainScene);
  await writeBuffer(farLayerPath, farLayer);
  await writeBuffer(midLayerPath, midLayer);
  await writeBuffer(foregroundPath, foregroundGlow);
  await writeBuffer(tilesetPath, tilesetStrip);
  await writeBuffer(dynamicsPath, dynamicsStrip);
  await writeBuffer(collisionPath, collisionGuide);

  const stats = await sharp(mainScene).stats();
  const palette = buildPaletteFromStats(stats);

  const manifestPath = join(input.assetRoot, '06_exports', 'environment_runtime_manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        source: 'ellipse-environment-kit-v1',
        source_path: input.sourcePath,
        crop: { x: mainCrop.left, y: mainCrop.top, width: mainCrop.width, height: mainCrop.height },
        tileset_crop: { x: tilesetCrop.left, y: tilesetCrop.top, width: tilesetCrop.width, height: tilesetCrop.height },
        outputs: {
          playfield_crop: playfieldPath,
          parallax_far: farLayerPath,
          parallax_mid: midLayerPath,
          foreground_glow: foregroundPath,
          tileset_reference_strip: tilesetPath,
          dynamic_elements_strip: dynamicsPath,
          collision_guide: collisionPath,
        },
        recommended_layers: ['parallax_far', 'parallax_mid', 'playfield_crop', 'foreground_glow'],
        notes: [
          'This kit is extracted from an annotated board and should be refined before final shipping.',
          'Collision guide is a visual draft only; runtime collision stays authored in JSON.',
        ],
      },
      null,
      2,
    ),
    'utf8',
  );

  const qaPath = join(input.assetRoot, '07_qa', 'environment_qa.json');
  await writeFile(
    qaPath,
    JSON.stringify(
      {
        source: 'ellipse-environment-kit-v1',
        palette,
        crop: { x: mainCrop.left, y: mainCrop.top, width: mainCrop.width, height: mainCrop.height },
        tileset_crop: { x: tilesetCrop.left, y: tilesetCrop.top, width: tilesetCrop.width, height: tilesetCrop.height },
        warnings: [
          'The source board contains callouts and should remain a design reference, not a final atlas.',
          'Parallax layers are heuristic and should be repainted or segmented with stronger tooling for final production.',
        ],
        blockers: [],
      },
      null,
      2,
    ),
    'utf8',
  );

  const sourceSnapshotPath = join(input.assetRoot, '01_source', 'source.snapshot.json');
  await writeFile(
    sourceSnapshotPath,
    JSON.stringify(
      {
        source_path: input.sourcePath,
        extracted_at: new Date().toISOString(),
        outputs: {
          playfield_crop: playfieldPath,
          parallax_far: farLayerPath,
          parallax_mid: midLayerPath,
          foreground_glow: foregroundPath,
          tileset_reference_strip: tilesetPath,
          dynamic_elements_strip: dynamicsPath,
          collision_guide: collisionPath,
          manifest: manifestPath,
          qa: qaPath,
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    crop: { x: mainCrop.left, y: mainCrop.top, width: mainCrop.width, height: mainCrop.height },
    tilesetCrop: { x: tilesetCrop.left, y: tilesetCrop.top, width: tilesetCrop.width, height: tilesetCrop.height },
    outputs: [playfieldPath, farLayerPath, midLayerPath, foregroundPath, tilesetPath, dynamicsPath, collisionPath, manifestPath, qaPath],
    palette,
  };
}
