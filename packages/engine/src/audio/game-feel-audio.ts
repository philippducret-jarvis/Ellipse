import type { SimEventType } from '../sim/world.js';

const PRESETS: Partial<Record<SimEventType, { freq: number; dur: number; type: OscillatorType }>> = {
  jump: { freq: 520, dur: 0.09, type: 'square' },
  collect: { freq: 880, dur: 0.11, type: 'sine' },
  enemy_killed: { freq: 320, dur: 0.14, type: 'triangle' },
  damage: { freq: 140, dur: 0.18, type: 'sawtooth' },
  checkpoint: { freq: 660, dur: 0.2, type: 'sine' },
  win: { freq: 740, dur: 0.35, type: 'sine' },
  lose: { freq: 110, dur: 0.4, type: 'triangle' },
};

/** Audio procédural navigateur (Lot 8) — consomme les SimEvent sans samples tiers. */
export class GameFeelAudio {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(type: SimEventType): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const preset = PRESETS[type];
    if (!preset) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = preset.type;
    osc.frequency.value = preset.freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + preset.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + preset.dur + 0.02);
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
