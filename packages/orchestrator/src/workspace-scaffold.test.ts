import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameProject, GameProjectAsset, GameProjectDocument, GameProjectTask } from '@ellipse/shared';
import { scaffoldGameWorkspace } from './workspace-scaffold.js';

describe('workspace scaffold', () => {
  it('creates the expected workspace contract surfaces', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'ellipse-scaffold-'));
    const previous = process.env.GAME_WORKSPACES_DIR;
    process.env.GAME_WORKSPACES_DIR = tempRoot;

    const project: GameProject = {
      id: '8c1d9d74-9d59-4d05-a6ab-111111111111',
      title: 'Echoes of the Mushroom Realm',
      slug: 'echoes-of-the-mushroom-realm',
      status: 'planning',
      source_prompt: 'prompt',
      dimension: '2d',
      target_runtime: 'ellipse_web_2d',
      camera_mode: 'side_view',
      source_images: [],
      metadata: {},
    };
    const documents: GameProjectDocument[] = [
      {
        id: 'doc-1',
        project_id: project.id,
        kind: 'pitch',
        title: 'Pitch',
        status: 'generated',
        content: '# Pitch',
        payload: {},
        created_by: 'test',
      },
    ];
    const tasks: GameProjectTask[] = [
      {
        id: 'task-1',
        project_id: project.id,
        agent_id: 'producer',
        kind: 'vision',
        title: 'Lock vision',
        description: 'Description',
        status: 'ready',
        priority: 10,
        acceptance_criteria: ['One scope'],
        depends_on: [],
        payload: {},
      },
    ];
    const assets: GameProjectAsset[] = [
      {
        id: 'asset-1',
        project_id: project.id,
        kind: 'character',
        role: 'hero',
        title: 'The Echo main hero',
        status: 'source_ready',
        source_prompt: 'prompt',
        spec: {},
      },
    ];

    try {
      const workspace = await scaffoldGameWorkspace({
        project,
        primaryPrompt: project.source_prompt,
        sourceImages: [],
        documents,
        tasks,
        assets,
      });

      await access(join(workspace.rootDir, 'README.md'));
      await access(join(workspace.rootDir, '00_brief', 'documents', '00_pitch.md'));
      await access(join(workspace.rootDir, '03_assets', 'characters', 'hero__the-echo-main-hero', 'pipeline.contract.json'));
      await access(join(workspace.rootDir, '08_ops', 'manifests', 'project-context.json'));

      const registry = JSON.parse(await readFile(join(workspace.rootDir, '03_assets', 'registry', 'assets.json'), 'utf8'));
      expect(registry).toHaveLength(1);
      expect(registry[0].title).toBe('The Echo main hero');
    } finally {
      process.env.GAME_WORKSPACES_DIR = previous;
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
