/**
 * Opérations image exécutables — création & retouche (CPU v1, hooks GPU Phase 2).
 */
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { extractSubject } from '../asset-factory/extract-subject.js';
import { runFidelityQa } from '../asset-factory/fidelity-qa.js';
import { generateProceduralHero } from '../procedural/generate-hero.js';
import type { ImageOperationId } from '@ellipse/shared';

export interface ImageOperationResult {
  operation: ImageOperationId;
  ok: boolean;
  outputs: string[];
  report: Record<string, unknown>;
  iou?: number;
  shipping_ready?: boolean;
  agent_instruction: string;
}

export interface RetouchInpaintInput {
  packRoot: string;
  role: 'hero' | 'enemy' | 'boss' | 'environment' | 'ui' | 'prop' | string;
  boardPath?: string;
  masterPath?: string;
}

export interface HybridBoardInput {
  packRoot: string;
  boardPath: string;
  masterPath: string;
  outputPath?: string;
}

export interface CreateProceduralInput {
  outputDir: string;
  sessionId: string;
  prompt: string;
  hue?: number;
}

const SHIPPING_IOU = 0.72;

function resolveBoardRef(packRoot: string, boardPath?: string): string {
  if (boardPath && existsSync(boardPath)) return boardPath;
  const frame = join(packRoot, '03_cleanup', 'board_frame.png');
  if (existsSync(frame)) return frame;
  const norm = join(packRoot, '03_cleanup', 'board_hd_normalized.png');
  if (existsSync(norm)) return norm;
  return join(packRoot, '01_source', 'reference.png');
}

/** Stage 02 amélioré — flood-fill sujet au lieu d'un simple resize. */
export async function segmentWithFloodFill(sourcePath: string, outputDir: string): Promise<ImageOperationResult> {
  await mkdir(outputDir, { recursive: true });
  const cutoutPath = join(outputDir, 'cutout-alpha.png');
  const result = await extractSubject(sourcePath, cutoutPath, { targetHeight: 512, tolerance: 72, feather: 1 });

  const maskPath = join(outputDir, 'segmentation-mask.png');
  await sharp(cutoutPath).greyscale().png().toFile(maskPath);

  const manifestPath = join(outputDir, 'cutout-manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        stage: '02_cutouts',
        operation: 'segment_floodfill',
        tool: 'ellipse-extract-subject-v1',
        removed_ratio: result.removedRatio,
        outputs: { cutout: cutoutPath, mask: maskPath },
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return {
    operation: 'segment_floodfill',
    ok: true,
    outputs: [cutoutPath, maskPath, manifestPath],
    report: { removed_ratio: result.removedRatio, width: result.width, height: result.height },
    agent_instruction: 'Segmentation flood-fill OK — lancer 03_cleanup puis mesurer IoU vs planche.',
  };
}

/** Hybrid overlay planche + master procédural/cleanup. */
export async function retouchHybridBoard(input: HybridBoardInput): Promise<ImageOperationResult> {
  const out = input.outputPath ?? join(input.packRoot, '03_cleanup', 'silhouette-clean.png');
  await mkdir(dirname(out), { recursive: true });

  const boardBuf = await sharp(input.boardPath)
    .resize(128, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const masterBuf = await sharp(input.masterPath)
    .resize(128, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(boardBuf)
    .composite([{ input: masterBuf, blend: 'overlay' }])
    .png()
    .toFile(out);

  const qa = await runFidelityQa({
    referencePath: input.boardPath,
    candidatePath: out,
    outputDir: join(input.packRoot, '03_cleanup'),
    width: 128,
    height: 192,
  });

  return {
    operation: 'retouch_hybrid_board',
    ok: qa.passed,
    outputs: [out, qa.reportPath],
    report: { metrics: qa.metrics, decision: qa.decision },
    iou: qa.metrics.iou,
    shipping_ready: qa.shipping_ready,
    agent_instruction: qa.decision.agent_instruction,
  };
}

/** Inpaint CPU — port Veloria stage-08. */
export async function retouchInpaintCpu(input: RetouchInpaintInput): Promise<ImageOperationResult> {
  const packRoot = input.packRoot;
  const inpaintDir = join(packRoot, '08_inpaint');
  await mkdir(inpaintDir, { recursive: true });

  const boardRef = resolveBoardRef(packRoot, input.boardPath);
  const masterIn = input.masterPath ?? join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  const masterFallback = join(packRoot, '03_cleanup', 'silhouette-clean.png');
  const masterPath = existsSync(masterIn) ? masterIn : masterFallback;

  const inpaintOut = join(inpaintDir, 'inpaint_master.png');
  const reportPath = join(inpaintDir, 'inpaint-report.json');

  const refMeta = await sharp(boardRef).metadata();
  const w = refMeta.width ?? 128;
  const h = refMeta.height ?? 192;
  const isStatic = input.role === 'environment' || input.role === 'ui';

  if (isStatic) {
    await sharp(boardRef)
      .resize(w, h, { fit: 'fill' })
      .modulate({ brightness: 1.01, saturation: 1.04 })
      .sharpen({ sigma: 0.5 })
      .png()
      .toFile(inpaintOut);
  } else {
    const boardBuf = await sharp(boardRef)
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const masterBuf = await sharp(masterPath)
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp(boardBuf)
      .composite([{ input: masterBuf, blend: 'overlay' }])
      .modulate({ brightness: 1.015, saturation: 1.03 })
      .sharpen({ sigma: 0.45 })
      .png()
      .toFile(inpaintOut);
  }

  if (existsSync(masterIn)) await copyFile(inpaintOut, masterIn);
  await copyFile(inpaintOut, join(packRoot, '03_cleanup', 'silhouette-clean.png'));

  const qaW = isStatic ? w : Math.min(128, w);
  const qaH = isStatic ? h : Math.min(192, h);
  const qa = await runFidelityQa({
    referencePath: boardRef,
    candidatePath: inpaintOut,
    outputDir: inpaintDir,
    width: qaW,
    height: qaH,
  });

  const report = {
    stage: '08_inpaint',
    operation: 'retouch_inpaint_cpu',
    tool: 'ellipse-cpu-inpaint-v1',
    role: input.role,
    iou: qa.metrics.iou,
    shipping_ready: qa.shipping_ready,
    shipping_threshold: SHIPPING_IOU,
    passed: qa.passed,
    generated_at: new Date().toISOString(),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  return {
    operation: 'retouch_inpaint_cpu',
    ok: qa.shipping_ready,
    outputs: [inpaintOut, reportPath, qa.reportPath],
    report,
    iou: qa.metrics.iou,
    shipping_ready: qa.shipping_ready,
    agent_instruction: qa.shipping_ready
      ? `Shipping OK (IoU ${qa.metrics.iou}) — verrouiller style-lock et exporter.`
      : `Inpaint CPU insuffisant (IoU ${qa.metrics.iou}) — relancer hybrid ou workorder ComfyUI.`,
  };
}

/** Enhance léger sans changer la géométrie. */
export async function retouchEnhance(imagePath: string, outputPath?: string): Promise<ImageOperationResult> {
  const out = outputPath ?? imagePath;
  const buf = await sharp(imagePath)
    .modulate({ brightness: 1.02, saturation: 1.05 })
    .sharpen({ sigma: 0.35 })
    .png()
    .toBuffer();
  await writeFile(out, buf);

  return {
    operation: 'retouch_enhance',
    ok: true,
    outputs: [out],
    report: { tool: 'sharp-modulate' },
    agent_instruction: 'Enhance appliqué — re-valider IoU si asset gameplay.',
  };
}

/** Création procédurale depuis mots-clés prompt. */
export async function createProceduralImage(input: CreateProceduralInput): Promise<ImageOperationResult> {
  let hue = input.hue;
  if (hue == null) {
    hue = 0;
    for (let i = 0; i < input.prompt.length; i++) hue = (hue * 31 + input.prompt.charCodeAt(i)) % 360;
  }
  const result = await generateProceduralHero({
    outputDir: input.outputDir,
    sessionId: input.sessionId,
    hue,
    label: input.prompt.slice(0, 32),
  });

  return {
    operation: 'create_procedural',
    ok: true,
    outputs: [result.spriteSheetPath],
    report: { palette: result.palette, hue, url: result.spriteSheetUrl },
    agent_instruction: 'Asset procédural créé — uploader une planche pour hybrid si fidélité requise.',
  };
}

/** Routeur unique pour agents et API. */
export async function executeImageOperation(
  operation: ImageOperationId,
  params: Record<string, unknown>,
): Promise<ImageOperationResult> {
  switch (operation) {
    case 'segment_floodfill':
      return segmentWithFloodFill(params.sourcePath as string, params.outputDir as string);
    case 'retouch_hybrid_board':
      return retouchHybridBoard({
        packRoot: params.packRoot as string,
        boardPath: params.boardPath as string,
        masterPath: params.masterPath as string,
        outputPath: params.outputPath as string | undefined,
      });
    case 'retouch_inpaint_cpu':
      return retouchInpaintCpu({
        packRoot: params.packRoot as string,
        role: (params.role as string) ?? 'hero',
        boardPath: params.boardPath as string | undefined,
        masterPath: params.masterPath as string | undefined,
      });
    case 'retouch_enhance':
      return retouchEnhance(params.imagePath as string, params.outputPath as string | undefined);
    case 'create_procedural':
      return createProceduralImage({
        outputDir: params.outputDir as string,
        sessionId: params.sessionId as string,
        prompt: (params.prompt as string) ?? 'hero',
        hue: params.hue as number | undefined,
      });
    default:
      return {
        operation,
        ok: false,
        outputs: [],
        report: { error: 'operation_not_implemented_locally' },
        agent_instruction: `Opération ${operation} — soumettre production.workorder.json (ComfyUI/rembg distant).`,
      };
  }
}

/** Lit le dernier IoU QA si disponible. */
export async function readLatestAssetIou(packRoot: string): Promise<number | null> {
  const qaPath = join(packRoot, '07_qa', 'qa-report.json');
  if (!existsSync(qaPath)) return null;
  try {
    const raw = JSON.parse(await readFile(qaPath, 'utf-8')) as { fidelity?: { iou?: number } };
    return raw.fidelity?.iou ?? null;
  } catch {
    return null;
  }
}

/** Auto-retouche selon IoU mesuré. */
export async function autoRetouchAssetPack(
  packRoot: string,
  role: string,
): Promise<ImageOperationResult> {
  const iou = await readLatestAssetIou(packRoot);
  if (iou != null && iou >= SHIPPING_IOU) {
    return {
      operation: 'retouch_enhance',
      ok: true,
      outputs: [],
      report: { skipped: true, iou },
      iou,
      shipping_ready: true,
      agent_instruction: `IoU ${iou} déjà shipping — pas de retouche nécessaire.`,
    };
  }
  if (iou != null && iou >= 0.42) {
    return retouchInpaintCpu({ packRoot, role });
  }
  const board = resolveBoardRef(packRoot);
  const master = join(packRoot, '03_cleanup', 'silhouette-clean.png');
  try {
    await stat(master);
    return retouchHybridBoard({ packRoot, boardPath: board, masterPath: master });
  } catch {
    return retouchInpaintCpu({ packRoot, role });
  }
}
