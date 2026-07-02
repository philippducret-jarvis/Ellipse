import type { TaskSpec } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

export class CameraAgent extends BaseAgent {
  readonly id = 'camera' as const;
  readonly name = 'Le Cadreur';
  readonly description = 'Caméra follow, bounds, dead zone, cinématiques légères';

  async execute(task: TaskSpec) {
    const mode = (task.input.mode as string) ?? 'side_scroll';
    const is3d = mode === 'third_person';

    return this.success(task, {
      gdl_patches: [
        {
          op: 'replace',
          path: '/scenes/0/camera',
          value: {
            mode,
            follow: 'player',
            bounds: task.input.bounds ?? true,
            smoothing: is3d ? 0.08 : 0.12,
            dead_zone: { x: 80, y: 40 },
            intro_pan_ms: this.getPromptExcerpt(task).includes('cinémat') ? 1200 : 0,
          },
        },
      ],
      agent_notes: `Caméra ${mode} · follow joueur · ${this.getModelHint()}`,
    });
  }
}
