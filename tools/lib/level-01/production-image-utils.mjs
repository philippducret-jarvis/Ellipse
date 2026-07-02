import { copyFile, mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeJson } from './io.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');
const execFileAsync = promisify(execFile);

function toPixels(box, width, height) {
  return {
    left: Math.max(0, Math.round(box.x * width)),
    top: Math.max(0, Math.round(box.y * height)),
    width: Math.max(1, Math.round(box.width * width)),
    height: Math.max(1, Math.round(box.height * height)),
  };
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function copyImageToWorkspace(srcPath, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await copyFile(srcPath, outPath);
  return outPath;
}

export async function removeChromaKeyImage(inputPath, outPath) {
  const helper = resolve(
    homedir(),
    '.codex',
    'skills',
    '.system',
    'imagegen',
    'scripts',
    'remove_chroma_key.py',
  );
  await mkdir(dirname(outPath), { recursive: true });
  await execFileAsync(
    'python',
    [
      helper,
      '--input',
      inputPath,
      '--out',
      outPath,
      '--force',
      '--auto-key',
      'border',
      '--soft-matte',
      '--transparent-threshold',
      '12',
      '--opaque-threshold',
      '220',
      '--despill',
    ],
    { windowsHide: true },
  );
  return outPath;
}

export async function cropAlphaImage(srcPath, outPath, box, { trim = true, padding = 12 } = {}) {
  const meta = await sharp(srcPath).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const extract = toPixels(box, width, height);

  let image = sharp(srcPath).extract(extract).ensureAlpha();
  if (trim) {
    image = image.trim({ threshold: 4 });
  }
  if (padding > 0) {
    image = image.extend({
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  await mkdir(dirname(outPath), { recursive: true });
  await image.png().toFile(outPath);
  const outMeta = await sharp(outPath).metadata();
  return {
    path: outPath,
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
    extract,
  };
}

export async function buildAtlasGrid(frames, outImagePath, outJsonPath, { columns = 3, padding = 24 } = {}) {
  const metas = await Promise.all(
    frames.map(async (frame) => {
      const meta = await sharp(frame.path).metadata();
      return {
        ...frame,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
      };
    }),
  );

  const cellWidth = Math.max(...metas.map((meta) => meta.width));
  const cellHeight = Math.max(...metas.map((meta) => meta.height));
  const cols = Math.min(columns, metas.length);
  const rows = Math.ceil(metas.length / cols);
  const atlasWidth = cols * cellWidth + padding * (cols + 1);
  const atlasHeight = rows * cellHeight + padding * (rows + 1);

  const composites = [];
  const atlasFrames = {};

  metas.forEach((meta, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellX = padding + col * (cellWidth + padding);
    const cellY = padding + row * (cellHeight + padding);
    const left = cellX + Math.round((cellWidth - meta.width) / 2);
    const top = cellY + Math.round((cellHeight - meta.height) / 2);

    composites.push({ input: meta.path, left, top });
    atlasFrames[meta.id] = {
      frame: { x: left, y: top, w: meta.width, h: meta.height },
      sourceSize: { w: meta.width, h: meta.height },
      anchor: { x: Math.round(meta.width / 2), y: Math.round(meta.height * 0.82) },
      clip: meta.clip ?? null,
      role: meta.role ?? 'pose',
      file: meta.workspacePath,
    };
  });

  await mkdir(dirname(outImagePath), { recursive: true });
  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outImagePath);

  const atlasManifest = {
    image: outImagePath.replace(/^.*?workspaces\\echoes-of-the-mushroom-realm\\/, '').replace(/\\/g, '/'),
    meta: {
      app: 'ellipse-level01-production-sheet-builder',
      version: 1,
      size: { w: atlasWidth, h: atlasHeight },
      cell: { w: cellWidth, h: cellHeight },
      padding,
    },
    frames: atlasFrames,
  };

  await writeJson(outJsonPath, atlasManifest);
  return atlasManifest;
}
