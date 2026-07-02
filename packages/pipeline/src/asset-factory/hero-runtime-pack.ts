import sharp from 'sharp';
import { DEFAULT_ATLAS_FRAME_COUNT, PART_DEFS } from './hero-runtime/constants.js';
import {
  buildCoreRowEnvelope,
  buildPartRgba,
  buildQaReport,
  buildSubjectRgba,
  clampBounds,
  countOpaquePixels,
  estimateBackground,
  findOpaqueBounds,
  tightenSubjectRgba,
  toDimension,
} from './hero-runtime/image-analysis.js';
import { composeAnimationAtlas, assembleCleanCutout } from './hero-runtime/assembly.js';
import { writeCutoutFiles, writePng, writeQaAndSnapshot, writeRigAndMotionNotes } from './hero-runtime/file-outputs.js';
import type { HeroPartSpec, HeroRuntimePackInput, HeroRuntimePackResult } from './hero-runtime/types.js';

export type { HeroPartSpec, HeroRuntimePackInput, HeroRuntimePackResult } from './hero-runtime/types.js';

export async function generateHeroRuntimePack(input: HeroRuntimePackInput): Promise<HeroRuntimePackResult> {
  const atlasFrames = input.atlasFrames ?? DEFAULT_ATLAS_FRAME_COUNT;
  const source = await sharp(input.sourcePath).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = toDimension(source.info.width, 1024);
  const height = toDimension(source.info.height, 1024);

  const background = estimateBackground(source.data, width, height);
  const subjectRgba = buildSubjectRgba(source.data, width, height, background);
  const cleanSubjectRgba = tightenSubjectRgba(subjectRgba, width, height);
  const bounds = clampBounds(findOpaqueBounds(cleanSubjectRgba, width, height), width, height, 24);

  const cutouts = await writeCutoutFiles({
    assetRoot: input.assetRoot,
    subjectRgba,
    cleanSubjectRgba,
    width,
    height,
    bounds,
  });

  const croppedRaw = await sharp(cutouts.cleanCutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cropWidth = toDimension(croppedRaw.info.width, bounds.width);
  const cropHeight = toDimension(croppedRaw.info.height, bounds.height);
  const rowEnvelope = buildCoreRowEnvelope(croppedRaw.data, cropWidth, cropHeight, 220);

  const parts: HeroPartSpec[] = [];
  for (const partDef of PART_DEFS) {
    const partRgba = buildPartRgba(croppedRaw.data, cropWidth, cropHeight, partDef.id, partDef.yStart, partDef.yEnd, rowEnvelope);
    const partPath = `${input.assetRoot}/03_cleanup/part_${partDef.id}.png`;
    await writePng(partPath, partRgba, cropWidth, cropHeight);
    parts.push({
      id: partDef.id,
      label: partDef.label,
      file: `part_${partDef.id}.png`,
      pivot: partDef.pivot,
      pixelCount: countOpaquePixels(partRgba),
    });
  }

  await assembleCleanCutout(input.assetRoot, cropWidth, cropHeight, parts, cutouts.cleanCutoutPath);
  const { rigSpecPath } = await writeRigAndMotionNotes({
    assetRoot: input.assetRoot,
    cropWidth,
    cropHeight,
    parts,
  });

  const { atlasPath, manifestPath } = await composeAnimationAtlas(input.assetRoot, cropWidth, cropHeight, parts, atlasFrames);
  const qa = buildQaReport({
    background,
    bounds,
    cropWidth,
    cropHeight,
    croppedRaw: croppedRaw.data,
    parts,
  });
  const { qaPath } = await writeQaAndSnapshot({
    assetRoot: input.assetRoot,
    qa,
    sourcePath: input.sourcePath,
    bounds,
    alphaMaskPath: cutouts.alphaMaskPath,
    rawCutoutPath: cutouts.rawCutoutPath,
    cleanCutoutPath: cutouts.cleanCutoutPath,
    atlasPath,
    animationManifestPath: manifestPath,
    rigSpecPath,
  });

  return {
    crop: bounds,
    palette: qa.palette,
    alphaMaskPath: cutouts.alphaMaskPath,
    rawCutoutPath: cutouts.rawCutoutPath,
    cleanCutoutPath: cutouts.cleanCutoutPath,
    atlasPath,
    animationManifestPath: manifestPath,
    rigSpecPath,
    qaPath,
    parts,
  };
}
