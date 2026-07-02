import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GameDefinition, TaskSpec } from '@ellipse/shared';
import { collectAssetRefs } from '@ellipse/shared';
import { getGeneratedDir } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class IntegrationAgent extends BaseAgent {
  readonly id = 'integration' as const;
  readonly name = "L'Assembleur";
  readonly description = 'Validation refs assets, métadonnées export, cohérence finale';

  async execute(task: TaskSpec) {
    const targets = (task.input.export_targets as string[]) ?? ['web_preview'];
    const gdl = task.input.gdl_snapshot as GameDefinition | undefined;
    const sessionId = this.getSessionId(task);
    const missing: string[] = [];

    if (gdl && task.input.validate_refs) {
      const refs = collectAssetRefs(gdl);
      for (const ref of refs) {
        if (!ref.startsWith('/generated/')) continue;
        const fullPath = join(getGeneratedDir(), ref.replace(/^\/generated\//, ''));
        if (!existsSync(fullPath)) missing.push(ref);
      }
    }

    if (missing.length > 0) {
      return this.partial(task, {
        gdl_patches: [
          {
            op: 'replace',
            path: '/export',
            value: {
              targets,
              built_at: new Date().toISOString(),
              engine: 'ellipse-v0',
              warnings: missing,
            },
          },
        ],
        agent_notes: `Assemblage partiel — refs manquantes: ${missing.join(', ')}`,
      });
    }

    return this.success(task, {
      gdl_patches: [
        { op: 'replace', path: '/meta/version', value: '1.0.0' },
        {
          op: 'replace',
          path: '/export',
          value: {
            targets,
            session_id: sessionId,
            built_at: new Date().toISOString(),
            engine: 'ellipse-v0',
            status: 'ready',
          },
        },
      ],
      agent_notes: `Export prêt · ${targets.join(', ')} · refs validées · ${this.getModelHint()}`,
    });
  }
}
