/**
 * Caméra follow — dead zone, bounds, lerp (Unity-style parallax companion).
 */
import type { CameraSpec } from '@ellipse/shared';

export interface CameraTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraState {
  x: number;
  y: number;
}

export interface CameraView {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function resolveCameraMode(
  spec: CameraSpec | undefined,
  systems: string[],
  veloriaActive: boolean,
): 'follow_horizontal' | 'follow_target' | 'fixed' | 'top_down' {
  if (spec?.mode === 'top_down' || spec?.mode === 'follow_target') {
    return spec.mode === 'top_down' ? 'top_down' : 'follow_target';
  }
  if (veloriaActive) return 'top_down';
  if (systems.includes('physics_topdown')) return 'top_down';
  if (spec?.mode === 'fixed') return 'fixed';
  if (systems.includes('camera_follow')) return 'follow_horizontal';
  return 'follow_horizontal';
}

export function updateCameraFollow(
  state: CameraState,
  target: CameraTarget,
  view: CameraView,
  spec: CameraSpec | undefined,
  mode: ReturnType<typeof resolveCameraMode>,
): CameraState {
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const smoothing = spec?.smoothing ?? 1;
  const boundsOn = spec?.bounds !== false && spec?.bounds !== 'none';

  let desiredX = state.x;
  let desiredY = state.y;

  if (mode === 'fixed') {
    desiredX = 0;
    desiredY = 0;
  } else if (mode === 'top_down' || mode === 'follow_target') {
    desiredX = cx - view.width / 2;
    desiredY = cy - view.height / 2;
  } else {
    desiredX = cx - view.width / 2;
    desiredY = 0;
  }

  if (boundsOn) {
    desiredX = clamp(desiredX, 0, Math.max(0, view.worldWidth - view.width));
    desiredY = clamp(desiredY, 0, Math.max(0, view.worldHeight - view.height));
  }

  if (smoothing >= 1) {
    return { x: desiredX, y: desiredY };
  }
  return {
    x: state.x + (desiredX - state.x) * smoothing,
    y: state.y + (desiredY - state.y) * smoothing,
  };
}
