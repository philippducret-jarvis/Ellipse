import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

async function metadataFor(path) {
  return sharp(path).rotate().metadata();
}

function toPixels(box, width, height) {
  return {
    left: Math.max(0, Math.round(box.x * width)),
    top: Math.max(0, Math.round(box.y * height)),
    width: Math.max(1, Math.round(box.width * width)),
    height: Math.max(1, Math.round(box.height * height)),
  };
}

export async function cropBoardRegion(srcPath, outPath, box, { trim = true, padding = 12 } = {}) {
  const meta = await metadataFor(srcPath);
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const extract = toPixels(box, width, height);

  let image = sharp(srcPath).rotate().extract(extract).ensureAlpha();
  if (trim) image = image.trim({ threshold: 8 });
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
