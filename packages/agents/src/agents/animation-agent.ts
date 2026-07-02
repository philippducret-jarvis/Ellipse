import type { TaskSpec } from '@ellipse/shared';
import { getGeneratedDir, readLot0Manifest } from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

const FALLBACK_ANIM: Record<string, { frames: number[]; fps: number }> = {
  idle: { frames: [0], fps: 1 },
  run: { frames: [0, 1, 2, 3], fps: 10 },
  jump: { frames: [2], fps: 1 },
  attack: { frames: [1, 2, 3], fps: 12 },
};

export class AnimationAgent extends BaseAgent {
  readonly id = 'animation' as const;
  readonly name = 'Le Mouvement';
  readonly description = 'State machine animation — idle, run, jump, attaque (Lot 0 si photo)';

  async execute(task: TaskSpec) {
    const requested = (task.input.animations as string[]) ?? ['idle', 'run', 'jump'];
    const dimension = (task.input.dimension as string) ?? '2d';
    const sessionId = this.getSessionId(task);
    const lot0 = await readLot0Manifest(getGeneratedDir(), sessionId);

    const stateMachine = lot0?.animations ?? {
      default: 'idle',
      transitions: [
        { from: 'idle', to: 'run', on: 'move' },
        { from: 'run', to: 'idle', on: 'stop' },
        { from: '*', to: 'jump', on: 'jump' },
        { from: 'idle', to: 'attack', on: 'attack' },
      ],
    };

    const lot0Anims = lot0?.animations.animations;
    const animations = Object.fromEntries(
      requested.map((name) => {
        const preset = lot0Anims?.[name] ?? FALLBACK_ANIM[name] ?? { frames: [0], fps: 8 };
        return [name, { frames: preset.frames, fps: preset.fps }];
      }),
    );

    const frameCount = lot0?.sprite2d.frameCount ?? 4;

    return this.success(task, {
      gdl_patches: [
        { op: 'replace', path: '/entities/0/assets/animations', value: animations },
        { op: 'replace', path: '/entities/0/assets/animation_state', value: stateMachine },
        { op: 'replace', path: '/entities/0/assets/frame_count', value: frameCount },
        ...(lot0
          ? [
              {
                op: 'replace' as const,
                path: '/entities/0/assets/animation_lot0',
                value: { layer_bindings: lot0.layeredSprite.layerBindings },
              },
            ]
          : []),
      ],
      agent_notes: lot0
        ? `Animations Lot 0 · ${frameCount} frames · éléments recouverts synchronisés · ${this.getModelHint()}`
        : `Animations ${requested.join(', ')} · machine à états ${dimension} · ${this.getModelHint()}`,
    });
  }
}
