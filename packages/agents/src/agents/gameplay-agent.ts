import type { GameDefinition, TaskSpec } from '@ellipse/shared';
import { getGameplayTemplate, mergeGameplayTemplate } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

export class GameplayAgent extends BaseAgent {
  readonly id = 'gameplay' as const;
  readonly name = 'Le Game Designer';
  readonly description = 'Templates GDL + mécaniques — merge non-destructif';

  async execute(task: TaskSpec) {
    const templateName = (task.input.template as string) ?? this.getGenre(task);
    const mechanics = (task.input.mechanics as string[]) ?? [];
    const template = getGameplayTemplate(templateName);
    const current = (task.input.gdl_snapshot as GameDefinition | undefined) ?? {
      meta: { title: 'WIP', dimension: '2d', version: '0.1.0' },
      entities: [],
      scenes: [{ id: 'level_01', entities: ['player'] }],
      systems: [],
    };

    const merged = mergeGameplayTemplate(current, template, mechanics);

    return this.success(task, {
      gdl_patches: [
        { op: 'replace', path: '/systems', value: merged.systems },
        { op: 'replace', path: '/entities', value: merged.entities },
        { op: 'replace', path: '/scenes', value: merged.scenes },
        ...(merged.ui ? [{ op: 'replace' as const, path: '/ui', value: merged.ui }] : []),
      ],
      agent_notes: `Template "${templateName}" fusionné · mécaniques: ${mechanics.length ? mechanics.join(', ') : 'standard'} · sprite préservé`,
    });
  }
}
