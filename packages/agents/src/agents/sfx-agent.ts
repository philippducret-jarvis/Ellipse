import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TaskSpec } from '@ellipse/shared';
import { generateSfxWav, SFX_PRESETS } from '@ellipse/shared';
import { getGeneratedDir } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class SfxAgent extends BaseAgent {
  readonly id = 'sfx' as const;
  readonly name = "L'Effeteur";
  readonly description = 'SFX gameplay procéduraux — jump, collect, hit…';

  async execute(task: TaskSpec) {
    const sessionId = this.getSessionId(task);
    const events = (task.input.events as string[]) ?? Object.keys(SFX_PRESETS);
    const sessionDir = join(getGeneratedDir(), sessionId);
    await mkdir(sessionDir, { recursive: true });

    const sfxMap: Record<string, string> = {};
    const artifacts = [];

    for (const event of events) {
      const filename = `sfx_${event}.wav`;
      const path = join(sessionDir, filename);
      await writeFile(path, generateSfxWav(event));
      sfxMap[event] = `/generated/${sessionId}/${filename}`;
      artifacts.push({ type: 'audio' as const, path, meta: { event } });
    }

    return this.success(task, {
      artifacts,
      gdl_patches: [{ op: 'replace', path: '/audio/sfx', value: sfxMap }],
      agent_notes: `${events.length} SFX WAV générés · mapping GDL events · ${this.getModelHint()}`,
    });
  }
}
