/**
 * Hazards Veloria — zones lane telegraph/active (parité veloria-systems render).
 */
import { Container, Graphics } from 'pixi.js';
import type { VeloriaSimState } from '../sim/veloria-survival.js';

export interface HazardScriptLike {
  telegraph_duration_ms?: number;
  active_duration_ms?: number;
  visual?: { color?: string; pulse_hz?: number };
}

export interface VeloriaHazardLayerOptions {
  lanes: { id: string; center_x: number }[];
  zones: { id: string; x: number; y: number; w: number; h: number }[];
  groundY: number;
  script?: HazardScriptLike | null;
}

export class VeloriaHazardLayer {
  readonly root = new Container();
  private gfx = new Graphics();
  private pulse = 0;

  constructor(private opts: VeloriaHazardLayerOptions) {
    this.root.addChild(this.gfx);
    this.root.zIndex = 50_000;
  }

  update(v: VeloriaSimState | null | undefined, dtSec: number): void {
    this.gfx.clear();
    if (!v || v.hazardPhase === 'idle') return;

    this.pulse += dtSec;
    const script = this.opts.script;
    if (v.hazardPhase === 'telegraph') {
      const hz = script?.visual?.pulse_hz ?? 4;
      if (Math.sin(this.pulse * hz * Math.PI * 2) <= 0.2) return;
    }

    const color = parseColor(script?.visual?.color ?? 'rgba(158, 79, 92, 0.75)');
    for (const laneId of activeLaneIds(v, this.opts.lanes)) {
      const zone = this.opts.zones.find((z) => z.id === laneId);
      const lane = this.opts.lanes.find((l) => l.id === laneId);
      if (zone) {
        this.gfx.rect(zone.x, zone.y, zone.w, zone.h);
      } else if (lane) {
        this.gfx.rect(lane.center_x - 90, 140, 180, this.opts.groundY - 140);
      }
      this.gfx.fill(color);
      this.gfx.stroke({ color: 0xf0d9a6, width: 2, alpha: 0.6 });
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}

function activeLaneIds(v: VeloriaSimState, lanes: { id: string }[]): string[] {
  if (v.hazardLaneId === 'all') return lanes.map((l) => l.id);
  return [v.hazardLaneId];
}

function parseColor(css: string): number {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return (parseInt(m[1], 10) << 16) + (parseInt(m[2], 10) << 8) + parseInt(m[3], 10);
  return 0x9e4f5c;
}
