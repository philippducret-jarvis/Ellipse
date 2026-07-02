import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssetStageId } from '@ellipse/shared';
import { ASSET_PIPELINE_STAGES, getStage } from '@ellipse/shared';
import {
  runAnimationStage,
  runCleanupStage,
  runCutoutsStage,
  runExportsStage,
  runQaStage,
  runRigStage,
  generateHeroRuntimePack,
  autoRetouchAssetPack,
} from '@ellipse/pipeline';
import type { GameProject, GameProjectAsset } from '@ellipse/shared';
import { getAssetWorkspaceRoot } from '../workspace-scaffold.js';
import { getGameProjectSnapshot } from '@ellipse/db';

async function findSourceImage(assetRoot: string, snapshotSources: { file_path?: string | null; url?: string | null }[]): Promise<string> {
  const canonical = join(assetRoot, '01_source', 'reference.png');
  try {
    await stat(canonical);
    return canonical;
  } catch {
    /* next */
  }

  for (const source of snapshotSources) {
    if (source.file_path) {
      try {
        await stat(source.file_path);
        return source.file_path;
      } catch {
        /* next */
      }
    }
  }

  const inputsDir = join(assetRoot, 'inputs');
  try {
    const files = await readdir(inputsDir);
    const image = files.find((f) => /\.(png|jpe?g|webp)$/i.test(f));
    if (image) return join(inputsDir, image);
  } catch {
    /* next */
  }

  throw new Error('Aucune référence source — uploadez une image dans 01_source ou attach reference');
}

export interface StageRunResult {
  asset_id: string;
  stage: AssetStageId;
  status: 'success' | 'failed';
  outputs: string[];
  report?: Record<string, unknown>;
  error?: string;
}

export interface StageStatus {
  id: AssetStageId;
  label: string;
  labelFr: string;
  complete: boolean;
  artifacts: string[];
}

export class AssetPipelineService {
  async listStages(projectId: string, assetId: string): Promise<StageStatus[]> {
    const snapshot = await getGameProjectSnapshot(projectId);
    if (!snapshot) throw new Error('Project not found');
    const asset = snapshot.assets.find((a) => a.id === assetId);
    if (!asset) throw new Error('Asset not found');

    const assetRoot = getAssetWorkspaceRoot(snapshot.project, asset);
    const statuses: StageStatus[] = [];

    for (const stage of ASSET_PIPELINE_STAGES) {
      const stageDir = join(assetRoot, stage.id === '08_remote_jobs' ? '08_inpaint' : stage.folder);
      let artifacts: string[] = [];
      let complete = false;
      try {
        const files = await readdir(stageDir);
        artifacts = files.filter((f) => !f.startsWith('.'));
        complete = artifacts.length > 0;
      } catch {
        complete = false;
      }
      statuses.push({
        id: stage.id,
        label: stage.label,
        labelFr: stage.labelFr,
        complete,
        artifacts,
      });
    }
    return statuses;
  }

  async runStage(projectId: string, assetId: string, stageId: AssetStageId): Promise<StageRunResult> {
    const snapshot = await getGameProjectSnapshot(projectId);
    if (!snapshot) throw new Error('Project not found');
    const asset = snapshot.assets.find((a) => a.id === assetId);
    if (!asset) throw new Error('Asset not found');

    getStage(stageId);
    const assetRoot = getAssetWorkspaceRoot(snapshot.project, asset);
    const sources = snapshot.asset_sources.filter((s) => s.asset_id === assetId);
    const stageDir = join(assetRoot, stageId);
    await mkdir(stageDir, { recursive: true });

    try {
      const sourcePath = await findSourceImage(assetRoot, sources);
      const outputs: string[] = [];

      if (stageId === '02_cutouts') {
        await mkdir(join(assetRoot, '01_source'), { recursive: true });
        const ref = join(assetRoot, '01_source', 'reference.png');
        try {
          await stat(ref);
        } catch {
          await copyFile(sourcePath, ref);
        }
        const result = await runCutoutsStage({ sourcePath: ref, outputDir: stageDir });
        outputs.push(result.cutoutPath, result.maskPath, result.manifestPath, ...result.parts);
      } else if (stageId === '03_cleanup') {
        const cutoutsDir = join(assetRoot, '02_cutouts');
        const result = await runCleanupStage({ cutoutsDir, outputDir: stageDir });
        outputs.push(result.silhouettePath, result.reportPath);
        if (asset.role === 'hero') {
          const cutoutPath = join(cutoutsDir, 'cutout-alpha.png');
          try {
            await stat(cutoutPath);
            const heroPack = await generateHeroRuntimePack({
              sourcePath: cutoutPath,
              assetRoot,
            });
            outputs.push(heroPack.cleanCutoutPath, heroPack.atlasPath, heroPack.qaPath);
          } catch {
            /* cutout absent — cleanup standard seulement */
          }
        }
      } else if (stageId === '04_rig') {
        const cleanupDir = join(assetRoot, '03_cleanup');
        const result = await runRigStage({ cleanupDir, outputDir: stageDir });
        outputs.push(result.rigPath, result.pivotPath);
      } else if (stageId === '05_animation') {
        const cleanupSilhouette = join(assetRoot, '03_cleanup', 'silhouette-clean.png');
        let animSource = sourcePath;
        try {
          await stat(cleanupSilhouette);
          animSource = cleanupSilhouette;
        } catch {
          /* use source */
        }
        const result = await runAnimationStage({ sourcePath: animSource, outputDir: stageDir });
        outputs.push(result.walkSheetPath, result.idleSheetPath, result.stateMachinePath);
      } else if (stageId === '06_exports') {
        const result = await runExportsStage({
          animationDir: join(assetRoot, '05_animation'),
          rigDir: join(assetRoot, '04_rig'),
          outputDir: stageDir,
        });
        outputs.push(result.atlasPath, result.runtimeManifestPath, result.gdlRefPath);
      } else if (stageId === '07_qa') {
        const result = await runQaStage({
          exportsDir: join(assetRoot, '06_exports'),
          outputDir: stageDir,
          assetRoot,
        });
        outputs.push(result.reportPath, result.blockersPath);
        if (!result.passed) {
          const report = {
            stage: stageId,
            asset_id: assetId,
            outputs: outputs.map((p) => p.replace(/\\/g, '/')),
            completed_at: new Date().toISOString(),
            qa: { passed: false, blockers: result.fidelity },
          };
          await writeFile(join(stageDir, 'stage-result.json'), JSON.stringify(report, null, 2));
          return {
            asset_id: assetId,
            stage: stageId,
            status: 'failed',
            outputs,
            report,
            error: 'QA fidelity gate failed — export bloqué jusqu’à correction IoU',
          };
        }
      } else if (stageId === '08_remote_jobs') {
        const result = await autoRetouchAssetPack(assetRoot, asset.role);
        const outDir = join(assetRoot, '08_inpaint');
        await mkdir(outDir, { recursive: true });
        outputs.push(...result.outputs);
        const report = {
          stage: stageId,
          operation: result.operation,
          asset_id: assetId,
          iou: result.iou,
          shipping_ready: result.shipping_ready,
          agent_instruction: result.agent_instruction,
          outputs: outputs.map((p) => p.replace(/\\/g, '/')),
          completed_at: new Date().toISOString(),
        };
        await writeFile(join(outDir, 'stage-result.json'), JSON.stringify(report, null, 2));
        if (!result.ok && result.iou != null && result.iou < 0.72) {
          return {
            asset_id: assetId,
            stage: stageId,
            status: 'failed',
            outputs,
            report,
            error: result.agent_instruction,
          };
        }
      } else if (stageId === '01_source') {
        await mkdir(stageDir, { recursive: true });
        const ref = join(stageDir, 'reference.png');
        await copyFile(sourcePath, ref);
        outputs.push(ref);
      } else {
        const stub = join(stageDir, 'stage-pending.json');
        await writeFile(
          stub,
          JSON.stringify({ stage: stageId, status: 'pending', agents: getStage(stageId).agents }),
        );
        outputs.push(stub);
      }

      const report = {
        stage: stageId,
        asset_id: assetId,
        outputs: outputs.map((p) => p.replace(/\\/g, '/')),
        completed_at: new Date().toISOString(),
      };
      await writeFile(join(stageDir, 'stage-result.json'), JSON.stringify(report, null, 2));

      return { asset_id: assetId, stage: stageId, status: 'success', outputs, report };
    } catch (err) {
      return {
        asset_id: assetId,
        stage: stageId,
        status: 'failed',
        outputs: [],
        error: err instanceof Error ? err.message : 'Stage failed',
      };
    }
  }
}
