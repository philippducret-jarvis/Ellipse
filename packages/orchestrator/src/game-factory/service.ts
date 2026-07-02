import { randomUUID } from 'node:crypto';
import type {
  GameProject,
  GameProjectAsset,
  GameProjectDocument,
  GameProjectSnapshot,
  GameProjectTask,
} from '@ellipse/shared';
import {
  createGameAsset,
  createGameAssetOutput,
  createGameAssetSource,
  createGameAssetVariant,
  createGameBuild,
  createGameDocument,
  createGameProject,
  createGamePrompt,
  createGameScene,
  createGameTask,
  ensureGameFactoryAgents,
  getGameProject,
  getGameProjectSnapshot,
  listGameProjects,
} from '@ellipse/db';
import { CortexMaster } from '@ellipse/cortex';
import {
  appendIterationWorkspaceRecord,
  ensureAssetWorkspace,
  registerAssetSourceInWorkspace,
  registerPrototypeInWorkspace,
  scaffoldGameWorkspace,
} from '../workspace-scaffold.js';
import { listWorkspaceProjects, getWorkspaceSnapshot } from '../workspace-projects.js';
import { buildAssetBlueprints, buildDocuments, buildTaskBlueprints } from './blueprints.js';
import { buildSummary, extractTitle, pickCameraMode, pickRuntime } from './intent-helpers.js';

export class GameFactoryService {
  private cortex = new CortexMaster();

  constructor(private workspacesDir?: string) {}

  /** Liste DB + repli disque (workspaces) si la base échoue ou n'a pas le projet. */
  async listProjects(): Promise<GameProject[]> {
    let dbProjects: GameProject[] = [];
    try {
      await ensureGameFactoryAgents();
      dbProjects = await listGameProjects();
    } catch (error) {
      console.warn('[factory] DB indisponible, repli sur les workspaces disque:', (error as Error).message);
    }
    const diskProjects = this.workspacesDir ? await listWorkspaceProjects(this.workspacesDir) : [];
    const ids = new Set(dbProjects.map((p) => p.id));
    return [...dbProjects, ...diskProjects.filter((p) => !ids.has(p.id))];
  }

  async getProjectSnapshot(projectId: string): Promise<GameProjectSnapshot | null> {
    try {
      await ensureGameFactoryAgents();
      const snapshot = await getGameProjectSnapshot(projectId);
      if (snapshot) return snapshot;
    } catch (error) {
      console.warn('[factory] DB indisponible pour snapshot, repli disque:', (error as Error).message);
    }
    if (this.workspacesDir) return getWorkspaceSnapshot(this.workspacesDir, projectId);
    return null;
  }

  async bootstrapProject(input: {
    prompt: string;
    title?: string;
    images?: string[];
  }): Promise<GameProjectSnapshot> {
    await ensureGameFactoryAgents();

    const intent = await this.cortex.parseIntentAsync(input.prompt, input.images ?? []);
    const title = input.title?.trim() || extractTitle(input.prompt);
    const project = await createGameProject({
      title,
      status: 'planning',
      sourcePrompt: input.prompt,
      summary: buildSummary(title, intent),
      genre: intent.genre ?? null,
      dimension: intent.dimension,
      targetRuntime: pickRuntime(intent),
      cameraMode: pickCameraMode(intent),
      sourceImages: intent.source_images,
      metadata: {
        mechanics: intent.mechanics,
        features: intent.features,
        learning_mode: intent.source_images.length > 0,
      },
    });

    await createGamePrompt({
      projectId: project.id,
      prompt: input.prompt,
      sourceImages: intent.source_images,
      intent: intent as unknown as Record<string, unknown>,
    });

    const createdDocuments: GameProjectDocument[] = [];
    for (const document of buildDocuments(title, input.prompt, intent)) {
      createdDocuments.push(
        await createGameDocument({
        projectId: project.id,
        kind: document.kind,
        title: document.title,
        status: 'generated',
        content: document.content,
        payload: document.payload,
        }),
      );
    }

    const createdTasks: GameProjectTask[] = [];
    for (const task of buildTaskBlueprints(intent)) {
      createdTasks.push(
        await createGameTask({
        id: task.id,
        projectId: project.id,
        agentId: task.agentId,
        kind: task.kind,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        acceptanceCriteria: task.acceptanceCriteria,
        dependsOn: task.dependsOn,
        payload: task.payload,
        }),
      );
    }

    const seededAssets = await Promise.all(
      buildAssetBlueprints(intent, input.prompt).map((asset) =>
        createGameAsset({
          projectId: project.id,
          kind: asset.kind,
          role: asset.role,
          title: asset.title,
          status: asset.status,
          sourcePrompt: input.prompt,
          spec: {
            ...asset.spec,
            genre: intent.genre,
            dimension: intent.dimension,
          },
        }),
      ),
    );

    const heroAsset = seededAssets.find((asset) => asset.role === 'hero');
    if (heroAsset && intent.source_images.length > 0) {
      for (const image of intent.source_images) {
        await createGameAssetSource({
          assetId: heroAsset.id,
          sourceType: 'photo_reference',
          url: image,
          filePath: image,
          metadata: { seeded_from_bootstrap: true },
        });
      }
    }

    await scaffoldGameWorkspace({
      project,
      primaryPrompt: input.prompt,
      sourceImages: intent.source_images,
      documents: createdDocuments,
      tasks: createdTasks,
      assets: seededAssets,
    });

    await createGameScene({
      projectId: project.id,
      slug: 'level_01',
      title: 'First playable slice',
      sceneType: 'level',
      status: 'draft',
      spec: {
        objective: 'Reach the level goal',
        camera_mode: pickCameraMode(intent),
        runtime: pickRuntime(intent),
      },
    });

    await createGameBuild({
      projectId: project.id,
      target: pickRuntime(intent) === 'ellipse_photo_3d' ? 'photo-runtime-preview' : 'web-preview',
      status: 'queued',
      manifest: {
        scene_slug: 'level_01',
        source_images: intent.source_images.length,
        learning_enabled: intent.source_images.length > 0,
      },
    });

    const snapshot = await getGameProjectSnapshot(project.id);
    if (!snapshot) throw new Error('Project bootstrap failed');
    return snapshot;
  }

  async appendPrompt(input: {
    projectId: string;
    prompt: string;
    images?: string[];
  }): Promise<GameProjectSnapshot> {
    await ensureGameFactoryAgents();

    const project = await getGameProject(input.projectId);
    if (!project) throw new Error('Project not found');

    const intent = await this.cortex.parseIntentAsync(input.prompt, input.images ?? []);
    await createGamePrompt({
      projectId: input.projectId,
      prompt: input.prompt,
      sourceImages: intent.source_images,
      intent: intent as unknown as Record<string, unknown>,
    });

    const iterationBrief = await createGameDocument({
      projectId: input.projectId,
      kind: 'iteration_brief',
      title: `Iteration brief ${new Date().toISOString().slice(0, 10)}`,
      status: 'generated',
      content: `# Iteration request
${input.prompt}

## Intent summary
- Genre: ${intent.genre ?? project.genre ?? 'hybrid'}
- Dimension: ${intent.dimension}
- Mechanics touched: ${intent.mechanics.join(', ') || 'to refine'}
- Source images in play: ${intent.source_images.length}

## Expected outcome
- Improve the current project rather than restart it
- Keep previous validated structure when possible
- Feed QA and build tasks with the new delta`,
      payload: { source_images: intent.source_images, iteration: true },
    });

    await appendIterationWorkspaceRecord({
      project,
      prompt: input.prompt,
      sourceImages: intent.source_images,
      brief: iterationBrief,
    });

    const qaFollowUp = randomUUID();
    const buildFollowUp = randomUUID();

    await createGameTask({
      projectId: input.projectId,
      agentId: 'producer',
      kind: 'vision',
      title: 'Review the iteration request',
      description: 'Translate the new prompt into bounded updates for the existing MVP.',
      status: 'ready',
      priority: 9,
      acceptanceCriteria: [
        'Delta scope is explicit',
        'Existing validated pieces stay preserved when possible',
      ],
      payload: { iteration_prompt: input.prompt },
    });

    await createGameTask({
      projectId: input.projectId,
      agentId: intent.source_images.length > 0 ? 'asset_direction' : 'game_design',
      kind: intent.source_images.length > 0 ? 'asset' : 'document',
      title: intent.source_images.length > 0 ? 'Improve reference-driven asset quality' : 'Refine gameplay scope',
      description:
        intent.source_images.length > 0
          ? 'Use the new prompt and references to improve fidelity, motion and consistency while keeping the current structure.'
          : 'Adjust the current gameplay slice using the new prompt without breaking the existing MVP.',
      status: 'backlog',
      priority: 8,
      acceptanceCriteria: [
        'The requested improvement is reflected in specs',
        'The existing project remains coherent after the change',
      ],
      payload: { source_images: intent.source_images, learning_pass: intent.source_images.length > 0 },
    });

    await createGameTask({
      id: qaFollowUp,
      projectId: input.projectId,
      agentId: 'qa',
      kind: 'qa',
      title: 'Re-run QA after iteration',
      description: 'Validate the project again after the new change set lands.',
      status: 'backlog',
      priority: 7,
      acceptanceCriteria: ['Regressions are listed', 'Improvement outcome is measured'],
    });

    await createGameTask({
      id: buildFollowUp,
      projectId: input.projectId,
      agentId: 'build_release',
      kind: 'build',
      title: 'Queue a new preview build',
      description: 'Prepare a fresh browser preview after the iteration is validated.',
      status: 'backlog',
      priority: 6,
      dependsOn: [qaFollowUp],
      acceptanceCriteria: ['A new preview build can be reviewed in browser'],
    });

    const snapshot = await getGameProjectSnapshot(input.projectId);
    if (!snapshot) throw new Error('Iteration update failed');
    return snapshot;
  }

  async createAssetSlot(input: {
    projectId: string;
    title: string;
    role: GameProjectAsset['role'];
    kind: GameProjectAsset['kind'];
    prompt?: string;
  }): Promise<GameProjectSnapshot> {
    await ensureGameFactoryAgents();
    const project = await getGameProject(input.projectId);
    if (!project) throw new Error('Project not found');

    const asset = await createGameAsset({
      projectId: input.projectId,
      kind: input.kind,
      role: input.role,
      title: input.title,
      status: 'concept',
      sourcePrompt: input.prompt ?? project.source_prompt,
      spec: {
        project_title: project.title,
        requested_role: input.role,
      },
    });

    await ensureAssetWorkspace(project, asset);

    const snapshot = await getGameProjectSnapshot(input.projectId);
    if (!snapshot) throw new Error('Asset creation failed');
    return snapshot;
  }

  async attachAssetSource(input: {
    projectId: string;
    assetId: string;
    sourceType: string;
    url: string;
    filePath: string;
    originalName: string;
  }): Promise<GameProjectSnapshot> {
    await ensureGameFactoryAgents();
    const snapshot = await getGameProjectSnapshot(input.projectId);
    if (!snapshot) throw new Error('Project not found');
    const asset = snapshot.assets.find((entry) => entry.id === input.assetId);
    if (!asset) throw new Error('Asset not found');

    const source = await createGameAssetSource({
      assetId: input.assetId,
      sourceType: input.sourceType,
      url: input.url,
      filePath: input.filePath,
      metadata: { original_name: input.originalName },
    });

    await registerAssetSourceInWorkspace({
      project: snapshot.project,
      asset,
      source,
    });

    const next = await getGameProjectSnapshot(input.projectId);
    if (!next) throw new Error('Asset source attach failed');
    return next;
  }

  async generateAssetPrototypes(input: {
    projectId: string;
    assetId: string;
    presets?: string[];
  }): Promise<GameProjectSnapshot> {
    await ensureGameFactoryAgents();
    const snapshot = await getGameProjectSnapshot(input.projectId);
    if (!snapshot) throw new Error('Project not found');
    const asset = snapshot.assets.find((entry) => entry.id === input.assetId);
    if (!asset) throw new Error('Asset not found');
    const sources = snapshot.asset_sources.filter((entry) => entry.asset_id === input.assetId);
    const preview = sources[0]?.url ?? sources[0]?.file_path ?? null;

    const defaults =
      asset.role === 'hero'
        ? ['hd_sprite_sheet', 'model_25d_turn', 'model_3d_motion', 'idle_motion_pack']
        : asset.role === 'boss'
          ? ['boss_encounter_proto', 'model_25d_turn', 'combat_pose_pack']
          : asset.role === 'enemy' || asset.role === 'monster'
            ? ['hd_sprite_sheet', 'idle_motion_pack']
            : asset.role === 'environment'
              ? ['hd_sprite_sheet']
              : ['hd_sprite_sheet'];

    const presets = input.presets && input.presets.length > 0 ? input.presets : defaults;

    for (const preset of presets) {
      const variant = await createGameAssetVariant({
        assetId: input.assetId,
        label: preset,
        status: preview ? 'review' : 'queued',
        score: preview ? 72 : null,
        settings: {
          asset_role: asset.role,
          target_runtime: snapshot.project.target_runtime,
          source_count: sources.length,
        },
      });

      const output = await createGameAssetOutput({
        variantId: variant.id,
        outputType: preset,
        url: preview,
        filePath: preview,
        metadata: {
          preview_ready: Boolean(preview),
          next_step: preview ? 'validate and refine' : 'attach source references first',
        },
      });

      await registerPrototypeInWorkspace({
        project: snapshot.project,
        asset,
        variantLabel: preset,
        output,
      });
    }

    const next = await getGameProjectSnapshot(input.projectId);
    if (!next) throw new Error('Prototype generation failed');
    return next;
  }
}
