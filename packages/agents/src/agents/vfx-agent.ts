import type { TaskSpec } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

const VFX_PRESETS: Record<string, { type: string; count: number; duration_ms: number; color?: string }> = {
  jump_dust: { type: 'particles', count: 8, duration_ms: 350, color: '#cccccc' },
  collect_spark: { type: 'particles', count: 16, duration_ms: 500, color: '#ffd700' },
  hit_flash: { type: 'flash', count: 1, duration_ms: 120, color: '#ff4444' },
  land_dust: { type: 'particles', count: 6, duration_ms: 280, color: '#888888' },
};

export class VfxAgent extends BaseAgent {
  readonly id = 'vfx' as const;
  readonly name = "L'Illusionniste";
  readonly description = 'Particules, flash, juice liés aux events gameplay';

  async execute(task: TaskSpec) {
    const effects = (task.input.effects as string[]) ?? ['jump_dust', 'collect_spark'];
    const vfx = Object.fromEntries(
      effects.map((e) => [e, VFX_PRESETS[e] ?? { type: 'particles', count: 12, duration_ms: 400 }]),
    );

    const eventBindings = {
      jump: 'jump_dust',
      land: 'land_dust',
      collect: 'collect_spark',
      damage: 'hit_flash',
    };

    return this.success(task, {
      gdl_patches: [
        { op: 'replace', path: '/vfx', value: vfx },
        { op: 'replace', path: '/vfx/event_bindings', value: eventBindings },
      ],
      agent_notes: `VFX ${effects.join(', ')} · bindings events gameplay · ${this.getModelHint()}`,
    });
  }
}
