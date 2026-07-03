import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { TaskSpec, Scene } from '@ellipse/shared';
import {
  compileVisualBoardToPlayableSlice,
  derivePreset,
  generateLevelLayout,
  buildSceneFromBoard,
  checkSceneTraversability,
  layoutToBoard,
  type GameDimension,
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
    const gameType = String(task.input.game_type ?? task.input.genre ?? genre);
    const prompt = this.getPromptExcerpt(task) || String(task.input.prompt ?? '');
    const sourceImages = (task.input.images as string[] | undefined) ?? (task.input.source_images as string[] | undefined) ?? [];
    const layout = generateLevelLayout(genre, width, height, preset);

    const board = layoutToBoard(layout, 'level_01', genre);
    const scene = buildSceneFromBoard(board);
    const mergedLayout = { ...scene.layout, ...layout, platforms: layout.platforms };
    const productionPreset = derivePreset({
      game_type: gameType,
      dimension: task.input.dimension as GameDimension | undefined,
      mechanic_modules: task.input.mechanic_modules as string[] | undefined,
    });
    const playableSlice = compileVisualBoardToPlayableSlice({
      preset: productionPreset,
      prompt,
      sourceImages,
      qualityTarget: 'vertical_slice',
    }, mergedLayout as NonNullable<Scene['layout']>);
    const sceneWithLayout: Scene = {
      ...scene,
      layout: mergedLayout as Scene['layout'],
      playable_volume: {
        spatial_model: playableSlice.spatial_model,
        layers: playableSlice.volume_layers,
        critical_path: playableSlice.critical_path,
        encounters: playableSlice.encounters,
      },
      story_beats: playableSlice.story_beats,
      asset_extraction_manifest: playableSlice.asset_extraction_manifest,
    };
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
        { op: 'replace', path: '/scenes/0/playable_volume', value: sceneWithLayout.playable_volume },
        { op: 'replace', path: '/scenes/0/story_beats', value: playableSlice.story_beats },
        { op: 'replace', path: '/scenes/0/asset_extraction_manifest', value: playableSlice.asset_extraction_manifest },
      ],
      agent_notes: `${layout.platforms.length} plateformes · ${layout.collectibles.length} collectibles · ${playableSlice.critical_path.length} beats de volume · spawn (${layout.spawn.x},${layout.spawn.y}) · ${travNote}${preset ? ` · preset ${preset}` : ''}`,
    });
  }
}
