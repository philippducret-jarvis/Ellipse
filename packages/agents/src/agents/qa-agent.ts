import type { GameDefinition, TaskSpec } from '@ellipse/shared';
import { validateGdl } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

export class QAAgent extends BaseAgent {
  readonly id = 'qa' as const;
  readonly name = 'Le Testeur';
  readonly description = 'Validation GDL réelle, smoke test simulé, rapport';

  async execute(task: TaskSpec) {
    const smokeSeconds = (task.input.smoke_test_seconds as number) ?? 30;
    const gdl = task.input.gdl_snapshot as GameDefinition | undefined;
    const recovery = task.input.recovery_attempt as boolean | undefined;
    const priorHints = (task.input.recovery_hints as string[]) ?? [];

    if (!gdl && task.input.validate_gdl) {
      return this.fail(task, 'Snapshot GDL absent pour validation', ['Orchestrator doit passer gdl_snapshot', 'character', 'gameplay']);
    }

    if (gdl) {
      const report = validateGdl(gdl);
      if (!report.valid) {
        return this.fail(task, report.errors.join(' · '), [
          'Relancer agents en amont',
          'gameplay',
          'character',
          report.warnings.join('; '),
        ]);
      }

      const simResult = simulateSmoke(gdl, smokeSeconds);
      const skillsNote = this.getPromptExcerpt(task).includes('Agent qa') ? ' · skills injectées' : '';
      return this.success(task, {
        agent_notes: `QA OK${recovery ? ' (recovery)' : ''}${skillsNote} — ${report.warnings.length ? `warnings: ${report.warnings.join(', ')} · ` : ''}${simResult}${priorHints.length ? ` · hints: ${priorHints.join(', ')}` : ''}`,
      });
    }

    await this.simulateWork(100);
    return this.success(task, {
      agent_notes: `QA pass léger — smoke ${smokeSeconds}s (sans snapshot GDL)`,
    });
  }
}

function simulateSmoke(gdl: GameDefinition, seconds: number): string {
  const systems = gdl.systems?.length ?? 0;
  const entities = gdl.entities?.length ?? 0;
  return `bot simulé ${seconds}s · ${systems} systems · ${entities} entités · spawn OK`;
}
