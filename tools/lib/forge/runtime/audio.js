/**
 * AUDIO PROCÉDURAL — WebAudio pur, zéro asset, zéro réseau.
 * SFX synthétisés par événement de jeu + nappe d'ambiance accordée sur le
 * thème (seed du GDL). M pour couper. Générique : aucun code par titre.
 */

export function createAudio(gdl) {
  const A = { ctx: null, muted: false, master: null, padNodes: [], seed: gdl.seed ?? 1 };

  function ensure() {
    if (A.ctx) return true;
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.5;
      A.master.connect(A.ctx.destination);
      return true;
    } catch { return false; }
  }

  const now = () => A.ctx.currentTime;

  /** Bip synthétisé : osc + enveloppe + bruit optionnel. */
  function tone({ type = 'sine', from = 440, to = null, dur = 0.15, vol = 0.3, delay = 0, noise = 0 }) {
    if (A.muted || !ensure()) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    const t0 = now() + delay;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    g.connect(A.master);
    const o = A.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur * 0.9);
    o.connect(g);
    o.start(t0); o.stop(t0 + dur + 0.02);
    if (noise > 0) {
      const len = Math.ceil(A.ctx.sampleRate * dur);
      const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = A.ctx.createBufferSource();
      src.buffer = buf;
      const ng = A.ctx.createGain(); ng.gain.value = vol * noise;
      const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (from + (to ?? from)) / 2;
      src.connect(f); f.connect(ng); ng.connect(A.master);
      src.start(t0);
    }
  }

  const SFX = {
    jump: () => tone({ type: 'square', from: 180, to: 420, dur: 0.14, vol: 0.16 }),
    land: () => tone({ type: 'sine', from: 140, to: 60, dur: 0.12, vol: 0.22, noise: 0.5 }),
    attack: () => tone({ type: 'sawtooth', from: 700, to: 180, dur: 0.1, vol: 0.14, noise: 0.7 }),
    hit: () => tone({ type: 'square', from: 320, to: 120, dur: 0.1, vol: 0.2, noise: 0.4 }),
    kill: () => { tone({ type: 'triangle', from: 500, to: 90, dur: 0.25, vol: 0.22, noise: 0.6 }); tone({ type: 'sine', from: 900, to: 1400, dur: 0.12, vol: 0.08, delay: 0.03 }); },
    bosskill: () => { for (let i = 0; i < 4; i++) tone({ type: 'triangle', from: 400 - i * 60, to: 60, dur: 0.4, vol: 0.2, delay: i * 0.09, noise: 0.5 }); },
    hurt: () => tone({ type: 'sawtooth', from: 220, to: 70, dur: 0.22, vol: 0.24, noise: 0.3 }),
    death: () => { tone({ type: 'sine', from: 330, to: 55, dur: 0.5, vol: 0.25 }); },
    pickup: () => { tone({ type: 'sine', from: 660, to: 990, dur: 0.09, vol: 0.16 }); tone({ type: 'sine', from: 990, to: 1320, dur: 0.1, vol: 0.12, delay: 0.07 }); },
    checkpoint: () => { [523, 659, 784].forEach((f, i) => tone({ type: 'sine', from: f, dur: 0.16, vol: 0.13, delay: i * 0.08 })); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.16, delay: i * 0.12 })); },
    ui: () => tone({ type: 'sine', from: 520, to: 640, dur: 0.06, vol: 0.1 }),
    relic: () => { [392, 523, 659, 784].forEach((f, i) => tone({ type: 'sine', from: f, dur: 0.25, vol: 0.13, delay: i * 0.07 })); },
    dialogue: () => tone({ type: 'sine', from: 840, dur: 0.03, vol: 0.05 }),
  };

  /** Nappe d'ambiance : accord mineur seedé, très discret. Coupée en niveau. */
  function pad(on) {
    if (!ensure()) return;
    for (const n of A.padNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch {} }
    A.padNodes = [];
    if (!on || A.muted) return;
    const roots = [110, 123.47, 130.81, 146.83];
    const root = roots[A.seed % roots.length];
    for (const [ratio, vol] of [[1, 0.05], [1.1892, 0.035], [1.4983, 0.04], [2, 0.02]]) {
      const o = A.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = root * ratio;
      const g = A.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(vol, now() + 2.5);
      const lfo = A.ctx.createOscillator(); lfo.frequency.value = 0.1 + Math.random() * 0.1;
      const lg = A.ctx.createGain(); lg.gain.value = vol * 0.4;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(A.master);
      o.start(); lfo.start();
      A.padNodes.push(o, lfo, g);
    }
  }

  return {
    /** Événements logiques → SFX. */
    onEvents(events) {
      for (const e of events) {
        if (e.type === 'jump') SFX.jump();
        else if (e.type === 'land') SFX.land();
        else if (e.type === 'attack') SFX.attack();
        else if (e.type === 'hit') SFX.hit();
        else if (e.type === 'kill') (e.boss ? SFX.bosskill : SFX.kill)();
        else if (e.type === 'hurt') SFX.hurt();
        else if (e.type === 'death') SFX.death();
        else if (e.type === 'pickup') SFX.pickup();
        else if (e.type === 'checkpoint') SFX.checkpoint();
        else if (e.type === 'win') SFX.win();
      }
    },
    ui: SFX.ui, relic: SFX.relic, dialogue: SFX.dialogue, win: SFX.win,
    ambient: (on) => pad(on),
    toggleMute() {
      A.muted = !A.muted;
      if (A.master) A.master.gain.value = A.muted ? 0 : 0.5;
      return A.muted;
    },
  };
}
