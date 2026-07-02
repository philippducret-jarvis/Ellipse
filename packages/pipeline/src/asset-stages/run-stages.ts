import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { extractSubject } from '../asset-factory/extract-subject.js';

export interface CutoutsStageInput {
  sourcePath: string;
  outputDir: string;
}

export interface CutoutsStageResult {
  cutoutPath: string;
  maskPath: string;
  partsDir: string;
  manifestPath: string;
  parts: string[];
}

export interface CleanupStageInput {
  cutoutsDir: string;
  outputDir: string;
  targetHeight?: number;
}

export interface CleanupStageResult {
  partsDir: string;
  silhouettePath: string;
  reportPath: string;
  partCount: number;
}

/** Stage 02 — segmentation alpha + masques parties (Sharp local, SAM2 Phase 2). */
export async function runCutoutsStage(input: CutoutsStageInput): Promise<CutoutsStageResult> {
  await mkdir(input.outputDir, { recursive: true });
  const partsDir = join(input.outputDir, 'parts-mask');
  await mkdir(partsDir, { recursive: true });

  const meta = await sharp(input.sourcePath).rotate().metadata();
  const width = meta.width ?? 256;
  const height = meta.height ?? 256;

  const cutoutPath = join(input.outputDir, 'cutout-alpha.png');
  await extractSubject(input.sourcePath, cutoutPath, {
    targetHeight: Math.min(height, 512),
    tolerance: 72,
    feather: 1,
  });

  const maskPath = join(input.outputDir, 'segmentation-mask.png');
  await sharp(cutoutPath).greyscale().png().toFile(maskPath);

  const resized = await sharp(cutoutPath).png().toBuffer();
  const h = (await sharp(resized).metadata()).height ?? height;
  const w = (await sharp(resized).metadata()).width ?? width;

  const slices = [
    { name: 'head', top: 0, height: Math.floor(h * 0.28) },
    { name: 'torso', top: Math.floor(h * 0.28), height: Math.floor(h * 0.38) },
    { name: 'limbs', top: Math.floor(h * 0.66), height: h - Math.floor(h * 0.66) },
  ];

  const parts: string[] = [];
  for (const slice of slices) {
    const partPath = join(partsDir, `${slice.name}.png`);
    await sharp(resized)
      .extract({ left: 0, top: slice.top, width: w, height: Math.max(1, slice.height) })
      .png()
      .toFile(partPath);
    parts.push(partPath);
  }

  const manifestPath = join(input.outputDir, 'cutout-manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        stage: '02_cutouts',
        source: input.sourcePath,
        outputs: {
          cutout: cutoutPath,
          mask: maskPath,
          parts: parts.map((p) => p.replace(/\\/g, '/')),
        },
        tool: 'ellipse-extract-subject-v1',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return { cutoutPath, maskPath, partsDir, manifestPath, parts };
}

/** Stage 03 — nettoyage, normalisation taille, rapport découpe. */
export async function runCleanupStage(input: CleanupStageInput): Promise<CleanupStageResult> {
  await mkdir(input.outputDir, { recursive: true });
  const partsDir = join(input.outputDir, 'parts');
  await mkdir(partsDir, { recursive: true });

  const cutoutPath = join(input.cutoutsDir, 'cutout-alpha.png');
  const targetHeight = input.targetHeight ?? 256;

  const cleanedPath = join(input.outputDir, 'silhouette-clean.png');
  await sharp(cutoutPath)
    .resize({ height: targetHeight, fit: 'inside' })
    .sharpen()
    .png()
    .toFile(cleanedPath);

  const partsMaskDir = join(input.cutoutsDir, 'parts-mask');
  let partCount = 0;
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(partsMaskDir);
    for (const entry of entries.filter((e) => e.endsWith('.png'))) {
      const dest = join(partsDir, entry);
      await sharp(join(partsMaskDir, entry))
        .resize({ height: Math.floor(targetHeight * 0.35), fit: 'inside' })
        .png()
        .toFile(dest);
      partCount += 1;
    }
  } catch {
    await sharp(cleanedPath).png().toFile(join(partsDir, 'body.png'));
    partCount = 1;
  }

  const reportPath = join(input.outputDir, 'cutting-report.json');
  const stats = await sharp(cleanedPath).stats();
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        stage: '03_cleanup',
        target_height: targetHeight,
        part_count: partCount,
        channels: stats.channels.length,
        score: partCount >= 3 ? 85 : 60,
        tool: 'ellipse-sharp-cleanup-v0',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return { partsDir, silhouettePath: cleanedPath, reportPath, partCount };
}

export interface AnimationStageInput {
  sourcePath: string;
  outputDir: string;
  frameCount?: number;
}

export interface AnimationStageResult {
  walkSheetPath: string;
  idleSheetPath: string;
  stateMachinePath: string;
}

/** Stage 05 — spritesheets walk + idle (Sharp v0, ComfyUI Phase 2). */
export async function runAnimationStage(input: AnimationStageInput): Promise<AnimationStageResult> {
  const walkDir = join(input.outputDir, 'walk');
  const idleDir = join(input.outputDir, 'idle');
  await mkdir(walkDir, { recursive: true });
  await mkdir(idleDir, { recursive: true });

  const frameCount = input.frameCount ?? 6;
  const frameSize = 128;
  const base = sharp(input.sourcePath).rotate().resize(frameSize, frameSize, { fit: 'cover' });

  const buildSheet = async (dir: string, name: string, flipMid: boolean) => {
    const frames: Buffer[] = [];
    for (let i = 0; i < frameCount; i++) {
      let mod = base.clone();
      if (i > 0) mod = mod.modulate({ brightness: 1 + i * 0.03 });
      if (flipMid && i >= Math.floor(frameCount / 2)) mod = mod.flop();
      frames.push(await mod.png().toBuffer());
    }
    const sheetPath = join(dir, 'spritesheet.png');
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
    return sheetPath;
  };

  const walkSheetPath = await buildSheet(walkDir, 'walk', true);
  const idleSheetPath = await buildSheet(idleDir, 'idle', false);

  const stateMachinePath = join(input.outputDir, 'anim-state-machine.json');
  await writeFile(
    stateMachinePath,
    JSON.stringify(
      {
        stage: '05_animation',
        states: {
          idle: { sheet: 'idle/spritesheet.png', frames: 4, fps: 6, loop: true },
          walk: { sheet: 'walk/spritesheet.png', frames: frameCount, fps: 10, loop: true },
        },
        default: 'idle',
        tool: 'ellipse-sharp-animation-v0',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return { walkSheetPath, idleSheetPath, stateMachinePath };
}

export interface RigStageInput {
  cleanupDir: string;
  outputDir: string;
}

export interface RigStageResult {
  rigPath: string;
  pivotPath: string;
  partCount: number;
}

/** Stage 04 — rig 2D cutout (pivots + joints depuis parts cleanup). */
export async function runRigStage(input: RigStageInput): Promise<RigStageResult> {
  await mkdir(input.outputDir, { recursive: true });
  const partsDir = join(input.cleanupDir, 'parts');
  const { readdir } = await import('node:fs/promises');

  let partNames: string[] = [];
  try {
    partNames = (await readdir(partsDir)).filter((f) => f.endsWith('.png'));
  } catch {
    partNames = ['body.png'];
  }

  const joints = partNames.map((name, i) => ({
    id: name.replace(/\.png$/i, ''),
    pivot: { x: 0.5, y: i === 0 ? 0.15 : 0.5 },
    parent: i === 0 ? null : partNames[0]?.replace(/\.png$/i, '') ?? null,
  }));

  const rigPath = join(input.outputDir, 'rig.json');
  await writeFile(
    rigPath,
    JSON.stringify(
      {
        stage: '04_rig',
        type: 'cutout_2d',
        joints,
        tool: 'ellipse-sharp-rig-v0',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const pivotPath = join(input.outputDir, 'pivot-map.json');
  await writeFile(
    pivotPath,
    JSON.stringify(
      { pivots: Object.fromEntries(joints.map((j) => [j.id, j.pivot])) },
      null,
      2,
    ),
  );

  return { rigPath, pivotPath, partCount: partNames.length };
}

export interface ExportsStageInput {
  animationDir: string;
  rigDir: string;
  outputDir: string;
}

export interface ExportsStageResult {
  atlasPath: string;
  runtimeManifestPath: string;
  gdlRefPath: string;
}

/** Stage 06 — atlas runtime + manifests GDL. */
export async function runExportsStage(input: ExportsStageInput): Promise<ExportsStageResult> {
  await mkdir(input.outputDir, { recursive: true });
  const walkSheet = join(input.animationDir, 'walk', 'spritesheet.png');
  const idleSheet = join(input.animationDir, 'idle', 'spritesheet.png');

  const frames: Array<{ name: string; path: string }> = [];
  for (const [name, path] of [
    ['walk', walkSheet],
    ['idle', idleSheet],
  ] as const) {
    try {
      await sharp(path).metadata();
      frames.push({ name, path: path.replace(/\\/g, '/') });
    } catch {
      /* skip */
    }
  }

  const atlasPath = join(input.outputDir, 'atlas.json');
  await writeFile(
    atlasPath,
    JSON.stringify(
      {
        stage: '06_exports',
        sheets: frames,
        frame_size: 128,
        tool: 'ellipse-atlas-v0',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const runtimeManifestPath = join(input.outputDir, 'runtime-manifest.json');
  await writeFile(
    runtimeManifestPath,
    JSON.stringify(
      {
        animations: {
          idle: { sheet: '05_animation/idle/spritesheet.png', fps: 6 },
          walk: { sheet: '05_animation/walk/spritesheet.png', fps: 10 },
        },
        rig: '04_rig/rig.json',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const gdlRefPath = join(input.outputDir, 'gdl-asset-ref.json');
  await writeFile(
    gdlRefPath,
    JSON.stringify(
      {
        asset_ref: {
          type: 'sprite_atlas',
          manifest: 'runtime-manifest.json',
          default_animation: 'idle',
        },
      },
      null,
      2,
    ),
  );

  return { atlasPath, runtimeManifestPath, gdlRefPath };
}

export interface QaStageInput {
  exportsDir: string;
  outputDir: string;
  /** Racine asset (03_assets/...) — active le gate pixel-diff IoU bloquant. */
  assetRoot?: string;
}

export interface QaStageResult {
  reportPath: string;
  blockersPath: string;
  score: number;
  passed: boolean;
  fidelity?: Record<string, unknown>;
}

/** Stage 07 — contrôle qualité (artefacts + gate fidélité IoU bloquant). */
export async function runQaStage(input: QaStageInput): Promise<QaStageResult> {
  await mkdir(input.outputDir, { recursive: true });
  const { readdir, stat } = await import('node:fs/promises');
  const { findFidelityPair, runFidelityQa } = await import('../asset-factory/fidelity-qa.js');

  let score = 100;
  const blockers: string[] = [];
  let fidelityReport: Record<string, unknown> | undefined;

  const required = ['atlas.json', 'runtime-manifest.json', 'gdl-asset-ref.json'];
  for (const file of required) {
    try {
      await stat(join(input.exportsDir, file));
    } catch {
      blockers.push(`missing:${file}`);
      score -= 25;
    }
  }

  if (input.assetRoot) {
    const pair = await findFidelityPair(input.assetRoot);
    if (pair) {
      try {
        const fidelity = await runFidelityQa({
          referencePath: pair.reference,
          candidatePath: pair.candidate,
          outputDir: input.outputDir,
        });
        fidelityReport = {
          iou: fidelity.metrics.iou,
          passed: fidelity.passed,
          shipping_ready: fidelity.shipping_ready,
          decision: fidelity.decision.decision,
          heatmap: fidelity.heatmapPath.replace(/\\/g, '/'),
        };
        if (!fidelity.passed) {
          blockers.push(`fidelity:iou=${fidelity.metrics.iou}`);
          score -= 40;
        }
      } catch (err) {
        blockers.push(`fidelity:error:${err instanceof Error ? err.message : 'unknown'}`);
        score -= 20;
      }
    }
  }

  const reportPath = join(input.outputDir, 'qa-report.json');
  const blockersPath = join(input.outputDir, 'blockers.json');
  const finalScore = Math.max(0, score);
  const passed = blockers.length === 0;

  await writeFile(
    reportPath,
    JSON.stringify(
      {
        stage: '07_qa',
        score: finalScore,
        blockers,
        passed,
        fidelity: fidelityReport ?? null,
        tool: 'ellipse-qa-fidelity-v1',
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await writeFile(blockersPath, JSON.stringify({ blockers }, null, 2));

  return { reportPath, blockersPath, score: finalScore, passed, fidelity: fidelityReport };
}
