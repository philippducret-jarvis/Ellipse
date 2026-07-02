import type { TaskSpec } from '@ellipse/shared';
import { extractStyleFromPhoto, generateDecorAssets, getGeneratedDir } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class DecorAgent extends BaseAgent {
  readonly id = 'decor' as const;
  readonly name = 'Le Décorateur';
  readonly description = 'Tilesets, props et arrière-plans cohérents avec la palette';

  async execute(task: TaskSpec) {
    const sessionId = this.getSessionId(task);
    const sourceImages = (task.input.source_images as string[]) ?? [];
    const genre = this.getGenre(task);

    try {
      let palette: string[] | undefined;
      if (sourceImages[0]) {
        palette = (await extractStyleFromPhoto(sourceImages[0]!)).palette;
      }

      const result = await generateDecorAssets({
        outputDir: getGeneratedDir(),
        sessionId,
        palette,
        genre,
        sourcePath: sourceImages[0],
      });

      return this.success(task, {
        artifacts: [
          { type: 'tilemap', path: result.tilesetPath, meta: { url: result.tilesetUrl, genre } },
          { type: 'texture', path: result.backgroundPath, meta: { url: result.backgroundUrl } },
        ],
        gdl_patches: [
          {
            op: 'replace',
            path: '/scenes/0/background',
            value: {
              color: result.palette[0],
              image: result.backgroundUrl,
              tileset: result.tilesetUrl,
              parallax_layers: 2,
            },
          },
          { op: 'replace', path: '/style/palette', value: result.palette },
        ],
        agent_notes: `Décor ${genre} — tileset 4 tuiles + fond 1280×720 · ${this.getModelHint()}`,
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Échec génération décor');
    }
  }
}
