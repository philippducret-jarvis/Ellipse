import { createRequire } from 'node:module';
import { HERO_BUILDER_HINTS } from './procedural-builders.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

/**
 * Analyse un cutout planche pour extraire profil silhouette (couleurs, masse, arme).
 */
export async function analyzeCutoutProfile(cutoutPath) {
  const { data, info } = await sharp(cutoutPath).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const channels = info.channels;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let leftMass = 0;
  let rightMass = 0;
  const colorBins = new Map();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      const a = data[i + 3];
      if (a < 80) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x < w / 2) leftMass += a;
      else rightMass += a;
      const key = `#${data[i].toString(16).padStart(2, '0')}${data[i + 1].toString(16).padStart(2, '0')}${data[i + 2].toString(16).padStart(2, '0')}`;
      colorBins.set(key, (colorBins.get(key) ?? 0) + a);
    }
  }

  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const dominant = [...colorBins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([hex]) => hex);

  return {
    width: w,
    height: h,
    bbox: { x: minX, y: minY, w: bboxW, h: bboxH },
    aspect: Number((bboxW / bboxH).toFixed(3)),
    weapon_side: rightMass > leftMass * 1.15 ? 'right' : leftMass > rightMass * 1.15 ? 'left' : 'center',
    dominant_colors: dominant,
    opaque_mass: leftMass + rightMass,
  };
}

export function mergeHeroProfile(key, analysis) {
  const hints = HERO_BUILDER_HINTS[key] ?? HERO_BUILDER_HINTS.aureline;
  return {
    key,
    ...hints,
    board_analysis: analysis,
    merged_weapon_side: hints.weapon_side === 'both' ? 'both' : analysis?.weapon_side ?? hints.weapon_side,
  };
}
