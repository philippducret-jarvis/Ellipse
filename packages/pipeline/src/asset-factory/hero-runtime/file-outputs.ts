import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { HERO_RUNTIME_SOURCE } from './constants.js';
import type { Bounds, HeroPartSpec } from './types.js';

export async function writePng(path: string, buffer: Buffer, width: number, height: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toFile(path);
}

export async function writeCutoutFiles({
  assetRoot,
  subjectRgba,
  cleanSubjectRgba,
  width,
  height,
  bounds,
}: {
  assetRoot: string;
  subjectRgba: Buffer;
  cleanSubjectRgba: Buffer;
  width: number;
  height: number;
  bounds: Bounds;
}) {
  const alphaMaskPath = join(assetRoot, '02_cutouts', 'alpha_mask.png');
  await writePng(alphaMaskPath, subjectRgba, width, height);

  const rawCutout = await sharp(subjectRgba, { raw: { width, height, channels: 4 } })
    .extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height })
    .png()
    .toBuffer();

  const cleanCutout = await sharp(cleanSubjectRgba, { raw: { width, height, channels: 4 } })
    .extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height })
    .png()
    .toBuffer();

  const rawCutoutPath = join(assetRoot, '02_cutouts', 'cutout_raw.png');
  const cleanCutoutPath = join(assetRoot, '03_cleanup', 'cutout_clean.png');
  await mkdir(join(assetRoot, '02_cutouts'), { recursive: true });
  await mkdir(join(assetRoot, '03_cleanup'), { recursive: true });
  await writeFile(rawCutoutPath, rawCutout);
  await writeFile(cleanCutoutPath, cleanCutout);

  return {
    alphaMaskPath,
    rawCutout,
    rawCutoutPath,
    cleanCutout,
    cleanCutoutPath,
  };
}

export function buildRigSpec(width: number, height: number, parts: HeroPartSpec[]) {
  return {
    source: HERO_RUNTIME_SOURCE,
    canvas: { width, height },
    root: 'root',
    bones: [
      { id: 'root', parent: null, position: { x: width * 0.5, y: height * 0.96 } },
      { id: 'pelvis', parent: 'root', position: { x: width * 0.5, y: height * 0.68 } },
      { id: 'torso', parent: 'pelvis', position: { x: width * 0.5, y: height * 0.42 } },
      { id: 'head', parent: 'torso', position: { x: width * 0.5, y: height * 0.18 } },
      { id: 'cloak', parent: 'torso', position: { x: width * 0.5, y: height * 0.4 } },
      { id: 'glow', parent: 'torso', position: { x: width * 0.5, y: height * 0.44 } },
    ],
    parts: parts.map((part) => ({
      id: part.id,
      file: part.file,
      pivot: part.pivot,
      bind_bone:
        part.id === 'head'
          ? 'head'
          : part.id === 'legs'
            ? 'pelvis'
            : part.id === 'cloak'
              ? 'cloak'
              : part.id === 'glow'
                ? 'glow'
                : 'torso',
    })),
    notes: [
      'This rig is a local preview rig specification, not a final authored gameplay rig.',
      'Missing occluded limbs should be repaired before production-grade combat animation.',
    ],
  };
}

export async function writeRigAndMotionNotes({
  assetRoot,
  cropWidth,
  cropHeight,
  parts,
}: {
  assetRoot: string;
  cropWidth: number;
  cropHeight: number;
  parts: HeroPartSpec[];
}) {
  const rigSpecPath = join(assetRoot, '04_rig', 'hero_rig_spec.json');
  await mkdir(dirname(rigSpecPath), { recursive: true });
  await writeFile(rigSpecPath, JSON.stringify(buildRigSpec(cropWidth, cropHeight, parts), null, 2), 'utf8');

  const motionNotesPath = join(assetRoot, '05_animation', 'motion_notes.json');
  await mkdir(dirname(motionNotesPath), { recursive: true });
  await writeFile(
    motionNotesPath,
    JSON.stringify(
      {
        source: HERO_RUNTIME_SOURCE,
        intended_use: ['preview', 'runtime prototype', 'agent handoff'],
        notes: [
          'Idle and run are represented as lightweight pose offsets over split parts.',
          'Jump and attack remain proxy poses pending a stronger rig or manual polish.',
          'Use this pack as an operational baseline, not as the final art lock.',
        ],
      },
      null,
      2,
    ),
    'utf8',
  );

  return { rigSpecPath, motionNotesPath };
}

export async function writeQaAndSnapshot({
  assetRoot,
  qa,
  sourcePath,
  bounds,
  alphaMaskPath,
  rawCutoutPath,
  cleanCutoutPath,
  atlasPath,
  animationManifestPath,
  rigSpecPath,
}: {
  assetRoot: string;
  qa: Record<string, unknown> & { palette: string[] };
  sourcePath: string;
  bounds: Bounds;
  alphaMaskPath: string;
  rawCutoutPath: string;
  cleanCutoutPath: string;
  atlasPath: string;
  animationManifestPath: string;
  rigSpecPath: string;
}) {
  const qaPath = join(assetRoot, '07_qa', 'cutout_qa.json');
  await mkdir(dirname(qaPath), { recursive: true });
  await writeFile(qaPath, JSON.stringify(qa, null, 2), 'utf8');

  const sourceSnapshotPath = join(assetRoot, '01_source', 'source.snapshot.json');
  await mkdir(dirname(sourceSnapshotPath), { recursive: true });
  await writeFile(
    sourceSnapshotPath,
    JSON.stringify(
      {
        source_path: sourcePath,
        extracted_at: new Date().toISOString(),
        crop: bounds,
        outputs: {
          alpha_mask: alphaMaskPath,
          raw_cutout: rawCutoutPath,
          clean_cutout: cleanCutoutPath,
          atlas: atlasPath,
          animation_manifest: animationManifestPath,
          rig_spec: rigSpecPath,
          qa_report: qaPath,
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return { qaPath, sourceSnapshotPath };
}
