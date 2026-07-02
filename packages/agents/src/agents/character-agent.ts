import type { TaskSpec } from '@ellipse/shared';
import {
  getGeneratedDir,
  generateProceduralHero,
  isComfyUIAvailable,
  runLot0Pipeline,
  runCutoutsStage,
  runCleanupStage,
  runAnimationStage,
  autoRetouchAssetPack,
  createProceduralImage,
  executeImageOperation,
} from '@ellipse/pipeline';
import type { ImageOperationId } from '@ellipse/shared';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BaseAgent } from '../base-agent.js';

export class CharacterAgent extends BaseAgent {
  readonly id = 'character' as const;
  readonly name = 'Le Héros';
  readonly description = 'Sprites personnage — photo, procédural ou weights Ellipse';

  async execute(task: TaskSpec) {
    const action = task.input.action as string | undefined;
    if (action === 'run_asset_stage') {
      return this.runAssetStageTask(task);
    }
    if (action === 'retouch_image') {
      return this.retouchImageTask(task);
    }
    if (action === 'create_image') {
      return this.createImageTask(task);
    }

    const sourceImages = (task.input.source_images as string[]) ?? [];
    const sessionId = this.getSessionId(task);
    const comfy = await isComfyUIAvailable();
    const model = this.getModelHint();

    try {
      if (sourceImages[0]) {
        const lot0 = await runLot0Pipeline({
          sourcePath: sourceImages[0]!,
          outputDir: getGeneratedDir(),
          sessionId,
          include3d: false,
        });
        const { manifest } = lot0;

        return this.success(task, {
          artifacts: [
            {
              type: 'sprite_sheet',
              path: manifest.sprite2d.path,
              meta: {
                url: manifest.sprite2d.url,
                frames: manifest.sprite2d.frameCount,
                frame_size: manifest.sprite2d.frameSize,
                source: manifest.source,
                palette: manifest.palette,
                model,
              },
            },
            {
              type: 'sprite_sheet',
              path: manifest.layeredSprite.path,
              meta: {
                url: manifest.layeredSprite.url,
                frames: manifest.layeredSprite.frameCount,
                frame_size: manifest.layeredSprite.frameSize,
                source: 'ellipse-lot0-layered',
                layers: manifest.layeredSprite.layerBindings,
              },
            },
            ...manifest.elements.map((el) => ({
              type: 'texture' as const,
              path: el.path,
              meta: { url: el.url, label: el.label, color: el.color, prominence: el.prominence },
            })),
          ],
          gdl_patches: [
            { op: 'replace', path: '/entities/0/assets/sprite', value: manifest.layeredSprite.url },
            {
              op: 'replace',
              path: '/entities/0/assets/layers',
              value: manifest.layeredSprite.layerBindings,
            },
            { op: 'replace', path: '/entities/0/assets/base_sprite', value: manifest.sprite2d.url },
            { op: 'replace', path: '/style/palette', value: manifest.palette },
            {
              op: 'replace',
              path: '/entities/0/assets/lot0_manifest',
              value: `/generated/${sessionId}/lot0/lot0_manifest.json`,
            },
            ...(manifest.learning
              ? [
                  {
                    op: 'replace' as const,
                    path: '/meta/learning',
                    value: manifest.learning,
                  },
                ]
              : []),
          ],
          agent_notes: `Lot 0 · ${manifest.elements.length} elements extraits · tentative ${manifest.learning?.attempt ?? 1} · score ${manifest.learning?.score ?? 'n/a'}/100 · ${comfy ? 'ComfyUI pret Phase 2' : 'vision sharp lot0'}`,
        });
      }

      const hue = hashHue(this.getPromptExcerpt(task));
      const result = await generateProceduralHero({
        outputDir: getGeneratedDir(),
        sessionId,
        hue,
        label: this.getPromptExcerpt(task).slice(0, 24),
      });

      return this.success(task, {
        artifacts: [
          {
            type: 'sprite_sheet',
            path: result.spriteSheetPath,
            meta: { url: result.spriteSheetUrl, source: 'procedural', model },
          },
        ],
        gdl_patches: [
          { op: 'replace', path: '/entities/0/assets/sprite', value: result.spriteSheetUrl },
          { op: 'replace', path: '/style/palette', value: result.palette },
        ],
        agent_notes: `Héros procédural généré (hue ${hue}) — uploadez une photo pour le pipeline Lot 0`,
      });
    } catch (err) {
      return this.fail(
        task,
        err instanceof Error ? err.message : 'Échec génération personnage',
        ['Vérifier sharp', 'pnpm dev:pipeline'],
      );
    }
  }

  private async runAssetStageTask(task: TaskSpec) {
    const stage = task.input.stage as string;
    const workspaceRoot = task.input.workspace_root as string;
    const sourcePath = (task.input.source_path as string) ?? join(workspaceRoot, '01_source', 'reference.png');

    try {
      const stageDir = join(workspaceRoot, stage);
      await mkdir(stageDir, { recursive: true });
      const artifacts: { type: 'texture' | 'sprite_sheet' | 'other'; path: string; meta?: Record<string, unknown> }[] = [];

      if (stage === '02_cutouts') {
        const result = await runCutoutsStage({ sourcePath, outputDir: stageDir });
        artifacts.push(
          { type: 'texture', path: result.cutoutPath, meta: { stage } },
          { type: 'texture', path: result.maskPath, meta: { stage, kind: 'mask' } },
        );
      } else if (stage === '03_cleanup') {
        const result = await runCleanupStage({ cutoutsDir: join(workspaceRoot, '02_cutouts'), outputDir: stageDir });
        artifacts.push({ type: 'texture', path: result.silhouettePath, meta: { stage, score: result.partCount } });
      } else if (stage === '05_animation') {
        const animSource = join(workspaceRoot, '03_cleanup', 'silhouette-clean.png');
        const result = await runAnimationStage({ sourcePath: animSource, outputDir: stageDir });
        artifacts.push(
          { type: 'sprite_sheet', path: result.walkSheetPath, meta: { stage, anim: 'walk' } },
          { type: 'sprite_sheet', path: result.idleSheetPath, meta: { stage, anim: 'idle' } },
        );
      } else {
        return this.fail(task, `Stage non supporté par character agent: ${stage}`, ['Utiliser integration ou animation agent']);
      }

      return this.success(task, {
        artifacts,
        agent_notes: `Stage ${stage} exécuté dans ${workspaceRoot}`,
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Échec stage asset', ['Vérifier source 01_source/reference.png']);
    }
  }

  /** Retouche automatique selon IoU — hybrid ou inpaint CPU. */
  private async retouchImageTask(task: TaskSpec) {
    const workspaceRoot = task.input.workspace_root as string;
    const role = (task.input.role as string) ?? 'hero';
    const operation = task.input.operation as ImageOperationId | undefined;

    try {
      const result = operation
        ? await executeImageOperation(operation, {
            packRoot: workspaceRoot,
            role,
            boardPath: task.input.board_path,
            masterPath: task.input.master_path,
            imagePath: task.input.image_path,
            outputPath: task.input.output_path,
          })
        : await autoRetouchAssetPack(workspaceRoot, role);

      return this.success(task, {
        artifacts: result.outputs.map((p) => ({
          type: 'texture' as const,
          path: p,
          meta: { operation: result.operation, iou: result.iou },
        })),
        agent_notes: `${result.operation} · IoU ${result.iou ?? 'n/a'} · ${result.agent_instruction}`,
        recovery_hints: result.shipping_ready ? [] : ['retouch_inpaint_cpu', 'create_comfyui_remote'],
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Retouche échouée', [
        'Vérifier 03_cleanup et 07_qa',
        'Consulter image-playbook retouch_hybrid_board',
      ]);
    }
  }

  /** Création image procédurale ou depuis photo Lot0. */
  private async createImageTask(task: TaskSpec) {
    const sourceImages = (task.input.source_images as string[]) ?? [];
    const sessionId = this.getSessionId(task);
    const prompt = this.getPromptExcerpt(task);
    const comfy = await isComfyUIAvailable();

    if (sourceImages[0]) {
      try {
        const lot0 = await runLot0Pipeline({
          sourcePath: sourceImages[0]!,
          outputDir: getGeneratedDir(),
          sessionId,
          include3d: false,
        });
        const { manifest } = lot0;
        return this.success(task, {
          artifacts: [
            {
              type: 'sprite_sheet',
              path: manifest.layeredSprite.path,
              meta: { url: manifest.layeredSprite.url, operation: 'create_lot0_photo' },
            },
          ],
          gdl_patches: [{ op: 'replace', path: '/entities/0/assets/sprite', value: manifest.layeredSprite.url }],
          agent_notes: `Lot0 photo · ${manifest.elements.length} éléments · ${comfy ? 'ComfyUI Phase 2 dispo' : 'sharp lot0'}`,
        });
      } catch (err) {
        return this.fail(task, err instanceof Error ? err.message : 'Lot0 échoué', ['Vérifier source image']);
      }
    }

    try {
      const result = await createProceduralImage({
        outputDir: getGeneratedDir(),
        sessionId,
        prompt,
      });
      const url = result.report.url as string;

      return this.success(task, {
        artifacts: result.outputs.map((p) => ({
          type: 'sprite_sheet' as const,
          path: p,
          meta: { operation: 'create_procedural', ...result.report },
        })),
        gdl_patches: [{ op: 'replace', path: '/entities/0/assets/sprite', value: url }],
        agent_notes: result.agent_instruction,
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Création image échouée', ['Vérifier sharp']);
    }
  }
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h) % 360;
}
