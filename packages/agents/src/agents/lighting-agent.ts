import type { TaskSpec } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

const MOOD_LIGHTING: Record<string, { ambient: string; directional: string; intensity: number }> = {
  platformer: { ambient: '#404060', directional: '#fff8e7', intensity: 0.9 },
  rpg: { ambient: '#2a3040', directional: '#c9d6ff', intensity: 0.75 },
  fighting: { ambient: '#302028', directional: '#ff8866', intensity: 1.0 },
  runner: { ambient: '#203050', directional: '#88ccff', intensity: 0.85 },
};

export class LightingAgent extends BaseAgent {
  readonly id = 'lighting' as const;
  readonly name = "L'Éclairagiste";
  readonly description = 'Presets éclairage 3D mood + time of day';

  async execute(task: TaskSpec) {
    const mood = this.getGenre(task);
    const preset = MOOD_LIGHTING[mood] ?? MOOD_LIGHTING.platformer!;

    return this.success(task, {
      gdl_patches: [
        {
          op: 'replace',
          path: '/scenes/0/lighting',
          value: {
            ambient: { color: preset.ambient, intensity: 0.4 },
            directional: { color: preset.directional, intensity: preset.intensity, shadows: true },
            mood,
            time_of_day: task.input.time_of_day ?? 'day',
          },
        },
      ],
      agent_notes: `Éclairage mood "${mood}" · bake PBR (${this.getModelHint()})`,
    });
  }
}
