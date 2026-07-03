import type { TaskSpec } from '@ellipse/shared';
import {
  buildFactoryToolchainPlan,
  buildGameCreationProcedure,
  derivePreset,
  type GameDimension,
} from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

export class ProducerAgent extends BaseAgent {
  readonly id = 'producer' as const;
  readonly name = 'Le Producteur';
  readonly description = 'Scope, sous-type, toolchain, work orders et gates de production';

  async execute(task: TaskSpec) {
    const gameType = String(task.input.game_type ?? task.input.genre ?? this.getGenre(task) ?? 'platformer');
    const dimension = task.input.dimension as GameDimension | undefined;
    const platforms = (task.input.platforms as string[] | undefined) ?? ['web'];
    const mechanicModules = (task.input.mechanic_modules as string[] | undefined) ?? [];
    const prompt = this.getPromptExcerpt(task) || String(task.input.prompt ?? '');

    try {
      const preset = derivePreset({
        game_type: gameType,
        dimension,
        platforms,
        mechanic_modules: mechanicModules,
      });
      const procedure = buildGameCreationProcedure({ preset, prompt });
      const toolchain = buildFactoryToolchainPlan({
        game_type: preset.game_type,
        dimension: preset.dimension,
        platforms: preset.platforms,
        mechanic_modules: preset.mechanic_modules,
      });
      const plan = {
        game_type: preset.game_type,
        subtype: procedure.subtype,
        type_chain: procedure.type_chain,
        north_star: {
          prompt,
          dimension: preset.dimension,
          perspective: preset.perspective,
          art_style: preset.art_style,
          platforms: preset.platforms,
        },
        production_steps: procedure.steps,
        procedural_libraries: procedure.libraries,
        work_orders: procedure.backlog_templates,
        toolchain,
        blocking_gates: [
          ...toolchain.qa_gates,
          ...procedure.libraries.qa_gates,
        ],
      };

      return this.success(task, {
        gdl_patches: [
          { op: 'replace', path: '/meta/factory_operational_plan', value: plan },
          { op: 'replace', path: '/meta/toolchain_plan', value: toolchain },
        ],
        agent_notes: `Plan ${preset.game_type}/${procedure.subtype.id} · ${procedure.backlog_templates.length} work orders · ${toolchain.required_tools.length} outils requis`,
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Production plan failed', [
        'Verifier game_type dans le catalogue',
        'Relancer Cortex intent',
      ]);
    }
  }
}
