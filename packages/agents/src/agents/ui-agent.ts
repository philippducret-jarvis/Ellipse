import type { TaskSpec } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

export class UIAgent extends BaseAgent {
  readonly id = 'ui' as const;
  readonly name = "L'Interface";
  readonly description = 'HUD, menus pause/restart, typographie cohérente';

  async execute(task: TaskSpec) {
    const hudItems = (task.input.hud as string[]) ?? ['health', 'score'];
    const menus = (task.input.menu as string[]) ?? ['pause', 'restart'];
    const genre = this.getGenre(task);

    const hud = hudItems.map((h) => {
      if (h === 'health') return { type: 'health_bar', bind: 'player.health', style: 'pill' };
      if (h === 'score') return { type: 'score_label', bind: 'score', style: 'retro' };
      if (h === 'quest_log') return { type: 'quest_log', bind: 'narrative.quests', style: 'minimal' };
      return { type: `${h}_widget`, bind: h };
    });

    const menu = Object.fromEntries(
      menus.map((m) => [m, { label: m === 'pause' ? 'Pause' : 'Recommencer', action: m }]),
    );

    return this.success(task, {
      gdl_patches: [
        {
          op: 'replace',
          path: '/ui',
          value: {
            hud,
            menu,
            font: genre === 'rpg' ? 'serif' : 'system-ui',
            theme: { accent: '#e94560', surface: '#16161f' },
          },
        },
      ],
      agent_notes: `HUD: ${hudItems.join(', ')} · menus: ${menus.join(', ')}`,
    });
  }
}
