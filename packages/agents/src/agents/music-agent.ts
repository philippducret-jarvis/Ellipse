import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TaskSpec } from '@ellipse/shared';
import { generateMusicLoopWav } from '@ellipse/shared';
import { getGeneratedDir } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class MusicAgent extends BaseAgent {
  readonly id = 'music' as const;
  readonly name = 'Le Musicien';
  readonly description = 'BGM loop procédural WAV — adaptive par mood';

  async execute(task: TaskSpec) {
    const sessionId = this.getSessionId(task);
    const mood = this.getGenre(task);
    const sessionDir = join(getGeneratedDir(), sessionId);
    await mkdir(sessionDir, { recursive: true });

    const filename = 'bgm_loop.wav';
    const path = join(sessionDir, filename);
    const wav = generateMusicLoopWav((task.input.adaptive as boolean) ? 4000 : 2500);
    await writeFile(path, wav);

    return this.success(task, {
      artifacts: [{ type: 'audio', path, meta: { mood, loop: true, format: 'wav' } }],
      gdl_patches: [
        {
          op: 'replace',
          path: '/audio/bgm',
          value: { url: `/generated/${sessionId}/${filename}`, mood, volume: 0.65, loop: true },
        },
      ],
      agent_notes: `BGM WAV ${Math.round(wav.length / 1024)} Ko · mood ${mood} · ${this.getModelHint()}`,
    });
  }
}
