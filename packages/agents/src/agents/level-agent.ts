import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { TaskSpec, Scene } from '@ellipse/shared';
import {
  generateLevelLayout,
  buildSceneFromBoard,
  checkSceneTraversability,
  layoutToBoard,
} from '@ellipse/shared';
import { getGeneratedDir } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class LevelAgent extends BaseAgent {
  readonly id = 'level' as const;
  readonly name = "L'Architecte";
  readonly description = 'Layout jouable — plateformes, spawns, collectibles, goal';

  async execute(task: TaskSpec) {
    const genre = this.getGenre(task);
    const sessionId = this.getSessionId(task);
    const width = typeof task.input.width === 'number' ? (task.input.width as number) : 1280;
    const height = typeof task.input.height === 'number' ? (task.input.height as number) : 720;
    const preset = typeof task.input.layout_preset === 'string' ? (task.input.layout_preset as string) : undefined;
    const layout = generateLevelLayout(genre, width, height, preset);

    const board = layoutToBoard(layout, 'level_01', genre);
    const scene = buildSceneFromBoard(board);
    const mergedLayout = { ...scene.layout, ...layout, platforms: layout.platforms };
    const sceneWithLayout: Scene = { ...scene, layout: mergedLayout as Scene['layout'] };
    const traversability = checkSceneTraversability(sceneWithLayout);

    const sessionDir = join(getGeneratedDir(), sessionId);
    await mkdir(sessionDir, { recursive: true });
    const tilemapPath = join(sessionDir, 'level_01.json');
    await writeFile(tilemapPath, JSON.stringify(sceneWithLayout, null, 2), 'utf8');

    const travNote = traversability.ok
      ? 'traversabilité OK'
      : `traversabilité : ${traversability.warnings.join('; ')}`;

    return this.success(task, {
      artifacts: [
        {
          type: 'tilemap',
          path: tilemapPath,
          meta: {
            genre,
            platforms: layout.platforms.length,
            traversable: traversability.ok,
          },
        },
      ],
      gdl_patches: [
        { op: 'replace', path: '/scenes/0/id', value: sceneWithLayout.id },
        { op: 'replace', path: '/scenes/0/layout', value: mergedLayout },
        { op: 'replace', path: '/scenes/0/spawn', value: layout.spawn },
        { op: 'replace', path: '/scenes/0/background', value: sceneWithLayout.background },
      ],
      agent_notes: `${layout.platforms.length} plateformes · ${layout.collectibles.length} collectibles · spawn (${layout.spawn.x},${layout.spawn.y}) · ${travNote}${preset ? ` · preset ${preset}` : ''}`,
    });
  }
}
