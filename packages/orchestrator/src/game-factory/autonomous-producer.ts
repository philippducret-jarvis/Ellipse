/**
 * Production autonome bout-en-bout : seed GDL → assets → workflow 14 étapes → preview HD.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  GameDefinitionSchema,
  createBootstrapGdl,
  generateSfxWav,
  generateToneWav,
  isFlagshipProject,
  normalizeGdlForParse,
  resolveGdlPreviewPath,
} from '@ellipse/shared';
import type { ServerContext } from '../routes/context.js';
import { resolveWorkspaceRoot } from '../workspace-browser.js';
import { advanceAutonomousWorkflow } from '../autonomous-workflow-runner.js';
import { buildGenericPreviewBundle } from '../export/preview-builder.js';
import { AssetPipelineService } from '../asset-pipeline/service.js';
import { getAssetWorkspaceRoot } from '../workspace-scaffold.js';
import { buildVeloriaPreviewBundle } from '../export/veloria-preview.js';
import { runVeloriaFidelityPipeline, readVeloriaFidelityStatus } from '../veloria/fidelity-runner.js';
import { forgeGame, isForgePreviewEnabled, type ForgeGameResult } from './forge-bridge.js';

const pipeline = new AssetPipelineService();

const ASSET_STAGES = ['02_cutouts', '03_cleanup', '04_rig', '06_exports', '07_qa'] as const;

export interface AutonomousProductionOptions {
  maxLoops?: number;
  maxStepsPerLoop?: number;
  skipAssetPipeline?: boolean;
  skipPreview?: boolean;
}

export interface AutonomousProductionResult {
  projectId: string;
  runId: string;
  status: string;
  previewUrl?: string;
  loops: number;
  stepsPassed: number;
  stepsTotal: number;
  fidelity?: { ready: boolean; shipping_ready: number; total: number };
  /** résultat du pont Forge (vrai jeu généré) quand il a été tenté. */
  forge?: { ok: boolean; error?: string; durationMs: number };
}

async function seedBootstrapGdl(
  workspaceRoot: string,
  slug: string,
  snap: NonNullable<Awaited<ReturnType<ServerContext['factory']['getProjectSnapshot']>>>,
): Promise<void> {
  const gdlPath = resolveGdlPreviewPath(workspaceRoot, slug);
  if (existsSync(gdlPath)) return;

  if (isFlagshipProject(slug) || isFlagshipProject(snap.project.id)) {
    return;
  }

  const hero = snap.assets.find((a) => a.role === 'hero');
  const heroSource = hero ? snap.asset_sources.find((s) => s.asset_id === hero.id) : undefined;
  const mechanics = (snap.project.metadata?.mechanics as string[] | undefined) ?? [];

  const gdl = createBootstrapGdl({
    title: snap.project.title,
    slug,
    genre: snap.project.genre,
    dimension: snap.project.dimension === '3d' ? '2d' : snap.project.dimension,
    mechanics,
    heroSpriteUrl: heroSource?.url ?? heroSource?.file_path ?? null,
    sourceImages: snap.project.source_images ?? [],
    prompt: snap.project.source_prompt,
  });

  await mkdir(join(workspaceRoot, '05_runtime', 'gdl'), { recursive: true });
  await writeFile(gdlPath, JSON.stringify(GameDefinitionSchema.parse(normalizeGdlForParse(gdl)), null, 2));
}

async function ensureReferenceImages(
  ctx: ServerContext,
  snap: NonNullable<Awaited<ReturnType<ServerContext['factory']['getProjectSnapshot']>>>,
): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
  for (const asset of snap.assets.filter((a) => a.role === 'hero' || a.role === 'environment')) {
    const sources = snap.asset_sources.filter((s) => s.asset_id === asset.id);
    if (sources.length === 0) continue;
    const assetRoot = getAssetWorkspaceRoot(snap.project, asset);
    const refDir = join(assetRoot, '01_source');
    const refPath = join(refDir, 'reference.png');
    if (existsSync(refPath)) continue;

    for (const source of sources) {
      let src = source.file_path ?? source.url ?? '';
      if (src.startsWith('/uploads/') || src.startsWith('/generated/')) {
        src = join(ctx.root, src.replace(/^\//, ''));
      } else if (src.startsWith('/workspaces/')) {
        src = join(ctx.root, src.replace(/^\//, ''));
      }
      if (!existsSync(src)) continue;
      await mkdir(refDir, { recursive: true });
      await copyFile(src, refPath);
      break;
    }
  }

  const audioDir = join(workspaceRoot, '03_assets', 'audio');
  await mkdir(audioDir, { recursive: true });
  const bgmPath = join(audioDir, 'bgm_loop.wav');
  if (!existsSync(bgmPath)) {
    await writeFile(bgmPath, generateToneWav({ frequencyHz: 220, durationMs: 8000, volume: 0.25 }));
  }
  for (const name of ['jump', 'hit', 'collect'] as const) {
    const p = join(audioDir, `${name}.wav`);
    if (!existsSync(p)) await writeFile(p, generateSfxWav(name));
  }
}

async function runAssetPipelineForProject(
  ctx: ServerContext,
  projectId: string,
  snap: NonNullable<Awaited<ReturnType<ServerContext['factory']['getProjectSnapshot']>>>,
): Promise<void> {
  const hasSources = snap.asset_sources.length > 0 || (snap.project.source_images?.length ?? 0) > 0;
  if (!hasSources) return;

  for (const asset of snap.assets.slice(0, 4)) {
    const sources = snap.asset_sources.filter((s) => s.asset_id === asset.id);
    if (sources.length === 0 && asset.role !== 'hero') continue;
    for (const stage of ASSET_STAGES) {
      try {
        await pipeline.runStage(projectId, asset.id, stage);
      } catch (err) {
        console.warn(`[autoproduce] asset ${asset.id} stage ${stage}:`, (err as Error).message);
      }
    }
  }
}

async function updateWorkspaceStatus(workspaceRoot: string, status: string, previewUrl?: string): Promise<void> {
  const wsPath = join(workspaceRoot, 'workspace.json');
  if (!existsSync(wsPath)) return;
  try {
    const ws = JSON.parse(await readFile(wsPath, 'utf-8')) as Record<string, unknown>;
    ws.production_status = status;
    ws.autonomous = { ...(ws.autonomous as object), last_updated: new Date().toISOString(), preview_url: previewUrl };
    await writeFile(wsPath, JSON.stringify(ws, null, 2));
  } catch {
    /* optional */
  }
}

/** Exécute la boucle autonome complète pour un projet (prompt/image → jeu HD). */
export async function runAutonomousProductionForProject(
  ctx: ServerContext,
  projectId: string,
  opts: AutonomousProductionOptions = {},
): Promise<AutonomousProductionResult> {
  const maxLoops = opts.maxLoops ?? Number(process.env.AUTOPRODUCE_MAX_LOOPS ?? 48);
  const maxStepsPerLoop = opts.maxStepsPerLoop ?? Number(process.env.AUTOPRODUCE_STEPS ?? 3);

  let snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');

  const slug = snap.project.slug;
  const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, slug);
  await mkdir(workspaceRoot, { recursive: true });

  const isFlagship = isFlagshipProject(slug) || isFlagshipProject(snap.project.id);
  let fidelityStatus;

  if (isFlagship && !opts.skipAssetPipeline) {
    await updateWorkspaceStatus(workspaceRoot, 'fidelity_pipeline');
    try {
      fidelityStatus = await runVeloriaFidelityPipeline(ctx.root, {
        force: process.env.FORCE_FIDELITY === '1',
      });
    } catch (err) {
      console.warn('[autoproduce] fidelity pipeline:', (err as Error).message);
      fidelityStatus = await readVeloriaFidelityStatus(workspaceRoot);
    }
  }

  await seedBootstrapGdl(workspaceRoot, slug, snap);
  await ensureReferenceImages(ctx, snap);

  if (!opts.skipAssetPipeline && !isFlagship) {
    snap = (await ctx.factory.getProjectSnapshot(projectId)) ?? snap;
    await runAssetPipelineForProject(ctx, projectId, snap);
  }

  const runId = `auto-${Date.now()}`;
  let run;
  let loops = 0;

  await updateWorkspaceStatus(workspaceRoot, 'running');

  while (loops < maxLoops) {
    run = await advanceAutonomousWorkflow(ctx, projectId, runId, { maxSteps: maxStepsPerLoop });
    loops++;
    if (run.status === 'completed' || run.status === 'awaiting_human') break;
  }

  if (!run) throw new Error('Workflow autonome non démarré');

  let previewUrl: string | undefined;
  let forgeResult: ForgeGameResult | undefined;
  if (!opts.skipPreview) {
    try {
      if (isFlagshipProject(slug) || isFlagshipProject(snap.project.id)) {
        const result = await buildVeloriaPreviewBundle(workspaceRoot, slug, snap.project.title);
        previewUrl = result.previewUrl;
      } else {
        // voie RÉELLE d'abord : la Forge produit un jeu jouable (assets générés
        // + rig + auto-play). Hors-ligne ou bot perdant → fallback preview GDL.
        const prompt = snap.project.source_prompt?.trim();
        if (isForgePreviewEnabled() && prompt) {
          await updateWorkspaceStatus(workspaceRoot, 'forging');
          forgeResult = await forgeGame(ctx.root, { prompt, id: slug });
          if (forgeResult.ok) previewUrl = forgeResult.previewUrl;
          else console.warn('[autoproduce] forge:', forgeResult.error);
        }
        if (!previewUrl) {
          const result = await buildGenericPreviewBundle(workspaceRoot, slug, snap.project.title);
          previewUrl = result.previewUrl;
        }
      }
    } catch (err) {
      console.warn('[autoproduce] preview:', (err as Error).message);
    }
  }

  await updateWorkspaceStatus(workspaceRoot, run.status, previewUrl);

  const stepsPassed = Object.values(run.steps).filter((s) => s.passed).length;
  const manifestPath = join(workspaceRoot, '08_ops', 'manifests', 'autonomous-production.json');
  await mkdir(join(workspaceRoot, '08_ops', 'manifests'), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        project_id: projectId,
        run_id: runId,
        status: run.status,
        loops,
        preview_url: previewUrl,
        steps_passed: stepsPassed,
        steps_total: Object.keys(run.steps).length,
        fidelity: fidelityStatus ?? null,
        forge: forgeResult
          ? { ok: forgeResult.ok, error: forgeResult.error ?? null, duration_ms: forgeResult.durationMs, report: forgeResult.report ?? null }
          : null,
      },
      null,
      2,
    ),
  );

  return {
    projectId,
    runId,
    status: run.status,
    previewUrl,
    loops,
    stepsPassed,
    stepsTotal: Object.keys(run.steps).length,
    fidelity: fidelityStatus,
    forge: forgeResult ? { ok: forgeResult.ok, error: forgeResult.error, durationMs: forgeResult.durationMs } : undefined,
  };
}

const inFlight = new Map<string, Promise<AutonomousProductionResult>>();

export function queueAutonomousProduction(
  ctx: ServerContext,
  projectId: string,
  opts?: AutonomousProductionOptions,
): Promise<AutonomousProductionResult> {
  const existing = inFlight.get(projectId);
  if (existing) return existing;

  const job = runAutonomousProductionForProject(ctx, projectId, opts).finally(() => {
    inFlight.delete(projectId);
  });
  inFlight.set(projectId, job);
  return job;
}

export function getAutonomousProductionStatus(projectId: string): 'idle' | 'running' {
  return inFlight.has(projectId) ? 'running' : 'idle';
}
