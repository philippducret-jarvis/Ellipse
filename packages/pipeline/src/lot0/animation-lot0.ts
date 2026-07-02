export interface Lot0AnimationPreset {
  frames: number[];
  fps: number;
  layerBob?: number;
}

export interface Lot0AnimationSet {
  default: string;
  transitions: { from: string; to: string; on: string }[];
  animations: Record<string, Lot0AnimationPreset>;
}

export function buildLot0Animations(frameCount: number, motionScale = 1): Lot0AnimationSet {
  const runFrames = Array.from({ length: frameCount }, (_, i) => i);
  const attackFrames = Array.from(new Set([1, 2, 3, frameCount - 1].filter((f) => f >= 0 && f < frameCount)));
  const runFps = Math.round(10 * motionScale);
  const attackFps = Math.round(12 * motionScale);

  return {
    default: 'idle',
    transitions: [
      { from: 'idle', to: 'run', on: 'move' },
      { from: 'run', to: 'idle', on: 'stop' },
      { from: '*', to: 'jump', on: 'jump' },
      { from: 'idle', to: 'attack', on: 'attack' },
    ],
    animations: {
      idle: { frames: [0, Math.min(1, frameCount - 1)], fps: Math.max(1, Math.round(2 * motionScale)), layerBob: 1 * motionScale },
      run: { frames: runFrames, fps: Math.max(8, runFps), layerBob: 3 * motionScale },
      jump: { frames: [Math.min(2, frameCount - 1)], fps: 1, layerBob: 5 * motionScale },
      attack: {
        frames: attackFrames,
        fps: Math.max(10, attackFps),
        layerBob: 2 * motionScale,
      },
    },
  };
}
