/**
 * RENDU v2 — parallax 2,5D, squelettes FONDUS (blend anti-pantin), particules,
 * sol texturé généré, HUD (cœurs, score, reliques, barre de boss), écrans de
 * campagne (carte-monde, dialogues avec portrait, choix de relique, crédits).
 * Générique : tout vient du GDL + manifests. Aucun code par titre.
 */
import { drawPuppet } from './skeleton.js';

const hex = (p, i, fb) => (p && p[i]) || fb;

/** Contexte d'effets persistant (créé par main.js, passé à chaque frame). */
export function createFx() {
  return { particles: [], slashes: [], entStates: new WeakMap(), toast: null, toastT: 0, time: 0 };
}

// ═══ PARTICULES ═══
function spawn(fx, n, opts) {
  for (let i = 0; i < n; i++) {
    const a = (opts.angle ?? 0) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2);
    const sp = (opts.speed ?? 60) * (0.5 + Math.random());
    fx.particles.push({
      x: opts.x + (Math.random() - 0.5) * (opts.jitter ?? 8),
      y: opts.y + (Math.random() - 0.5) * (opts.jitter ?? 8),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: opts.gravity ?? 0, drag: opts.drag ?? 0.9,
      life: 0, maxLife: (opts.life ?? 0.5) * (0.6 + Math.random() * 0.8),
      size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8),
      color: opts.color, add: opts.add ?? false, world: opts.world ?? true,
    });
  }
}

/** Traduit les événements de logique en particules/toasts. */
export function fxFromEvents(fx, events, state, accent) {
  const gy = state.groundY;
  for (const e of events) {
    if (e.type === 'land') spawn(fx, 10, { x: e.x, y: gy + 2, angle: -Math.PI / 2, spread: 2.4, speed: 90, gravity: 300, life: 0.45, size: 5, color: 'rgba(190,180,170,0.55)' });
    if (e.type === 'jump') spawn(fx, 6, { x: state.hero.x, y: gy + 2, angle: -Math.PI / 2, spread: 2.8, speed: 60, gravity: 200, life: 0.35, size: 4, color: 'rgba(190,180,170,0.45)' });
    if (e.type === 'attack') {
      const hh = state.vp.h * state.hero.scale;
      fx.slashes.push({ x: state.hero.x, y: state.hero.y - hh * 0.52, r: hh * 0.62, facing: state.hero.facing, t: 0, color: accent });
      spawn(fx, 6, { x: state.hero.x + state.hero.facing * 60, y: state.hero.y - hh * 0.5, angle: state.hero.facing > 0 ? 0 : Math.PI, spread: 1.1, speed: 260, drag: 0.85, life: 0.25, size: 4, color: accent, add: true });
    }
    if (e.type === 'hit') spawn(fx, 12, { x: e.x ?? state.hero.x, y: (e.y ?? gy) - 60, speed: 200, drag: 0.85, life: 0.35, size: 4, color: '#ffd9a0', add: true });
    if (e.type === 'kill') spawn(fx, e.boss ? 46 : 22, { x: e.x, y: (e.y ?? gy) - 50, speed: e.boss ? 320 : 220, drag: 0.88, life: e.boss ? 0.9 : 0.55, size: 5, color: accent, add: true });
    if (e.type === 'hurt') spawn(fx, 14, { x: state.hero.x, y: state.hero.y - 60, speed: 180, drag: 0.86, life: 0.4, size: 4, color: '#ff6b6b', add: true });
    if (e.type === 'pickup') spawn(fx, 12, { x: state.hero.x, y: state.hero.y - 70, angle: -Math.PI / 2, spread: 1.6, speed: 130, life: 0.5, size: 4, color: e.kind === 'heart' ? '#ff8595' : accent, add: true });
    if (e.type === 'checkpoint') fx.toast = { text: 'Point de passage', t: 0 };
  }
}

function stepAndDrawParticles(ctx, fx, state, dt) {
  const camX = state.genre === 'sidescroller' ? state.camX : 0;
  fx.particles = fx.particles.filter((p) => (p.life += dt) < p.maxLife);
  for (const p of fx.particles) {
    p.vy += p.g * dt;
    p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
    p.x += p.vx * dt; p.y += p.vy * dt;
    const a = 1 - p.life / p.maxLife;
    ctx.save();
    if (p.add) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - (p.world ? camX : 0), p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Croissants de slash — le VFX PORTE l'attaque (lisible avant tout). */
function drawSlashes(ctx, fx, state, dt) {
  const camX = state.genre === 'sidescroller' ? state.camX : 0;
  fx.slashes = fx.slashes.filter((s) => (s.t += dt) < 0.22);
  for (const s of fx.slashes) {
    const k = s.t / 0.22; // 0→1
    const sweep = (-0.65 + k * 1.5) * s.facing; // balayage haut → bas
    const alpha = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.9;
    ctx.save();
    ctx.translate(s.x - camX, s.y);
    ctx.scale(s.facing, 1);
    ctx.rotate(sweep);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    // croissant : deux arcs décalés
    const grad = ctx.createRadialGradient(0, 0, s.r * 0.4, 0, 0, s.r);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.72, s.color);
    grad.addColorStop(0.86, '#ffffff');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, s.r, -0.95, 0.95);
    ctx.arc(0, 0, s.r * 0.55, 0.8, -0.8, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Motes d'ambiance permanentes aux couleurs du jeu (profondeur vivante). */
function ambientMotes(ctx, fx, state, accent, dt) {
  if (Math.random() < dt * 8 && fx.particles.length < 260) {
    spawn(fx, 1, { x: state.camX + Math.random() * state.vp.w, y: Math.random() * state.vp.h * 0.8, speed: 12, life: 4, size: 2.5, color: accent, add: true, gravity: -6 });
  }
}

// ═══ DESSIN COMMUN ═══
function drawHeart(ctx, x, y, r, filled, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r, -r * 0.45, -r * 0.5, -r * 1.1, 0, -r * 0.35);
  ctx.bezierCurveTo(r * 0.5, -r * 1.1, r, -r * 0.45, 0, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,0.18)';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Tuilage MIROIR : une tuile sur deux est retournée → aucune couture visible. */
function tileLayer(ctx, img, offsetX, y, drawW, drawH, vpW) {
  const period = drawW * 2;
  const start = -((offsetX % period) + period) % period;
  for (let x = start - drawW; x < vpW; x += drawW) {
    const idx = Math.round((x - start) / drawW);
    if (idx % 2 === 0) {
      ctx.drawImage(img, x, y, drawW, drawH);
    } else {
      ctx.save();
      ctx.translate(x + drawW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();
    }
  }
}

// ═══ RENDU PRINCIPAL D'UN NIVEAU ═══
export function render(ctx, state, assets, dt, fx) {
  const { vp } = state, pal = state.gdl.palette;
  const accent = state.gdl.ui?.accent ?? hex(pal, 3, '#e8c05a');
  fx.time += dt;
  ctx.clearRect(0, 0, vp.w, vp.h);
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * state.shake, (Math.random() - 0.5) * 8 * state.shake);

  const scroll = state.genre === 'sidescroller' ? state.camX : state.time * 30;
  const near = assets.arena.layers.find((l) => l.id === 'near');
  const ground = assets.arena.layers.find((l) => l.id === 'ground');
  for (const layer of assets.arena.layers) {
    const img = layer.img;
    if (!img || layer.id === 'near' || layer.id === 'ground') continue;
    const h = vp.h, w = h * (img.width / img.height);
    tileLayer(ctx, img, scroll * layer.depth, 0, w, h, vp.w);
    if (layer.id === 'far') {
      // brume de séparation entre le lointain et le plan de jeu (réf. Hollow Knight)
      const fog = ctx.createLinearGradient(0, vp.h * 0.3, 0, vp.h * 0.9);
      fog.addColorStop(0, 'rgba(16,12,30,0)');
      fog.addColorStop(0.65, 'rgba(20,15,38,0.34)');
      fog.addColorStop(1, 'rgba(16,12,30,0.05)');
      ctx.fillStyle = fog; ctx.fillRect(0, 0, vp.w, vp.h);
    }
    if (layer.id === 'mid') {
      // LISIBILITÉ : pousser le décor en arrière au-dessus de la zone de jeu
      const push = ctx.createLinearGradient(0, 0, 0, state.groundY);
      push.addColorStop(0, 'rgba(6,4,14,0.30)');
      push.addColorStop(0.72, 'rgba(6,4,14,0.10)');
      push.addColorStop(1, 'rgba(6,4,14,0.0)');
      ctx.fillStyle = push; ctx.fillRect(0, 0, vp.w, state.groundY);
      drawGround(ctx, state, ground, accent);
      if (state.genre === 'vertical-arena') drawArenaLanes(ctx, state, accent);
      drawWorld(ctx, state, assets, accent);
    }
  }

  ambientMotes(ctx, fx, state, accent, dt);
  drawEntities(ctx, state, assets, fx, dt);
  drawSlashes(ctx, fx, state, dt);
  stepAndDrawParticles(ctx, fx, state, dt);
  if (near?.img) {
    const h = vp.h * 0.45, w = h * (near.img.width / near.img.height);
    tileLayer(ctx, near.img, scroll * near.depth, vp.h - h, w, h, vp.w);
  }
  ctx.restore();

  // post : flash dégâts + vignette + grade palette
  if (state.hero.hitT > 0) {
    ctx.fillStyle = `rgba(200,30,40,${0.35 * state.hero.hitT / 0.28})`;
    ctx.fillRect(0, 0, vp.w, vp.h);
  }
  const v = ctx.createRadialGradient(vp.w / 2, vp.h / 2, vp.h * 0.45, vp.w / 2, vp.h / 2, vp.h * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,2,10,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, vp.w, vp.h);

  drawHud(ctx, state, accent, fx, dt);
}

/**
 * Sol ANCRÉ — sobriété volontaire : bande sombre nette + liseré accent.
 * (La texture de sol générée est une mini-scène qui parasite la lecture ;
 * la ligne de jeu doit se lire instantanément.)
 */
function drawGround(ctx, state, ground, accent) {
  const { vp } = state, gy = state.groundY;
  if (state.genre !== 'sidescroller') return; // l'arène a sa propre ligne de défense
  const g = ctx.createLinearGradient(0, gy - 2, 0, vp.h);
  g.addColorStop(0, 'rgba(8,6,14,0.55)');
  g.addColorStop(0.25, 'rgba(8,6,14,0.8)');
  g.addColorStop(1, 'rgba(8,6,14,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, gy - 2, vp.w, vp.h - gy + 2);
  // arête du sol : ombre d'appui + fin liseré accent lumineux
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, gy - 4, vp.w, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = accent; ctx.globalAlpha = 0.35;
  ctx.fillRect(0, gy - 5, vp.w, 2);
  ctx.restore();
}

/**
 * Arène verticale — repères DIÉGÉTIQUES discrets (réf. mobile lane-battlers) :
 * pas de colonnes plaquées, juste des sceaux au sol à la ligne de défense.
 * L'alignement des ennemis communique les couloirs.
 */
function drawArenaLanes(ctx, state, accent) {
  const { vp } = state, lanes = state.gdl.world.lanes ?? 3, gy = state.groundY;
  const laneX = (l) => vp.w * (0.5 + (l - (lanes - 1) / 2) * 0.3);
  ctx.save();
  for (let l = 0; l < lanes; l++) {
    const x = laneX(l);
    const active = state.hero.lane === l;
    const pulse = active ? 0.55 + 0.25 * Math.sin(state.time * 5) : 0.16;
    // sceau au sol : ellipse gravée + lueur si couloir actif
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pulse;
    const g = ctx.createRadialGradient(x, gy + 4, 4, x, gy + 4, vp.w * 0.085);
    g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, gy + 4, vp.w * 0.085, vp.w * 0.028, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = active ? hexA(accent, 0.7) : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.beginPath(); ctx.ellipse(x, gy + 4, vp.w * 0.075, vp.w * 0.024, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function hexA(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function drawWorld(ctx, state, assets, accent) {
  if (state.genre !== 'sidescroller') return;
  const gy = state.groundY;
  const toScreen = (x) => x - state.camX;

  // plateformes traversantes : dalles suspendues, même langage visuel que le sol
  for (const p of state.platforms ?? []) {
    const sx = toScreen(p.x);
    if (sx + p.w < -60 || sx > state.vp.w + 60) continue;
    const top = p.top, th = 16;
    // ombre portée de la dalle
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(sx + p.w / 2, gy + 5, p.w * 0.42, 7, 0, 0, Math.PI * 2); ctx.fill();
    // corps de dalle
    const slab = ctx.createLinearGradient(0, top, 0, top + th + 26);
    slab.addColorStop(0, 'rgba(30,24,48,0.96)');
    slab.addColorStop(0.4, 'rgba(14,10,26,0.94)');
    slab.addColorStop(1, 'rgba(8,6,16,0.0)');
    ctx.fillStyle = slab;
    ctx.fillRect(sx, top, p.w, th + 26);
    // arête lumineuse (même liseré que le sol)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, top - 2, p.w, 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
    ctx.fillStyle = accent; ctx.fillRect(sx, top - 3, p.w, 2); ctx.restore();
  }

  for (const hz of state.hazards) {
    const sx = toScreen(hz.x);
    if (sx + hz.w < -50 || sx > state.vp.w + 50) continue;
    ctx.fillStyle = '#d8dbe6';
    for (let x = 0; x < hz.w - 8; x += 22) {
      ctx.beginPath();
      ctx.moveTo(sx + x, gy + 4); ctx.lineTo(sx + x + 11, gy - 20); ctx.lineTo(sx + x + 22, gy + 4);
      ctx.closePath(); ctx.fill();
    }
  }
  for (const p of state.pickups) {
    if (p.taken) continue;
    const sx = toScreen(p.x);
    if (sx < -30 || sx > state.vp.w + 30) continue;
    const bob = Math.sin(state.time * 3 + p.x) * 6;
    if (p.type === 'heart') drawHeart(ctx, sx, p.y + bob, 13, true, '#e5484d');
    else {
      ctx.save(); ctx.translate(sx, p.y + bob); ctx.rotate(Math.PI / 4 + state.time);
      ctx.fillStyle = accent; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.fillRect(-9, -9, 18, 18); ctx.strokeRect(-9, -9, 18, 18); ctx.restore();
    }
  }
  for (const c of state.level.checkpoints ?? []) {
    const sx = toScreen(c);
    if (sx < -40 || sx > state.vp.w + 40) continue;
    const active = state.hero.checkpoint >= c;
    // lanterne de veille : mât + orbe (allumée quand atteinte)
    ctx.strokeStyle = 'rgba(20,16,30,0.9)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 96); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,195,215,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 96); ctx.stroke();
    if (active) {
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 5);
      const g = ctx.createRadialGradient(sx, gy - 106, 2, sx, gy - 106, 34);
      g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse;
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, gy - 106, 34, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = active ? accent : 'rgba(160,155,175,0.6)';
    ctx.beginPath(); ctx.arc(sx, gy - 106, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (!state.level.boss) {
    const ex = toScreen(state.level.exit?.x ?? -1);
    if (ex > -80 && ex < state.vp.w + 80) {
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 4);
      const g = ctx.createRadialGradient(ex, gy - 90, 8, ex, gy - 90, 95);
      g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(ex, gy - 90, 60, 105, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

/**
 * Warp de marionnette selon l'état — les principes Don't Starve appliqués :
 * squash & stretch exagéré, anticipation, jamais de fausses articulations.
 */
function puppetWarp(e, state, isHero) {
  const t = state.time + (e.homeX ?? e.x ?? 0) * 0.01; // déphasage par entité
  const w = { breathe: Math.sin(t * 1.9), cloth: 1, clothAmp: 0.012, lean: 0, hop: 0, sx: 1, sy: 1 };
  const at = e.animT;

  if (e.dead) {
    const k = Math.min(1, e.deadT / 0.7);
    w.rot = -85 * k * k; w.hop = 0.03 * k; w.cloth = 0.4;
    return w;
  }
  switch (e.anim) {
    case 'run': {
      const freq = 9;
      const beat = Math.abs(Math.sin(t * freq));
      w.hop = -beat * 0.045;                      // bond
      const contact = 1 - beat;                    // squash au contact
      w.sy = 1 - contact * 0.06 + beat * 0.03;     // stretch en l'air
      w.sx = 1 + contact * 0.05 - beat * 0.02;
      w.lean = 7; w.cloth = 2.2; w.clothAmp = 0.016;
      break;
    }
    case 'attack': {
      if (at < 0.14) { w.lean = -9; w.sx = 0.95; w.sy = 1.03; }        // anticipation
      else if (at < 0.34) { w.lean = 16; w.sx = 1.1; w.sy = 0.96; w.hop = -0.012; w.cloth = 3; } // fente
      else { w.lean = 4; w.cloth = 1.6; }                               // retour
      break;
    }
    case 'hit': { w.lean = -12; w.sx = 1.07; w.sy = 0.93; w.tremble = 0.003; break; }
    case 'jump': { w.sy = 1.07; w.sx = 0.96; w.lean = 5; w.cloth = 2; break; }
    case 'land': { w.sy = 0.88; w.sx = 1.1; w.cloth = 1.6; break; }
    default: { // idle : respiration + balancement discret
      w.hop = Math.sin(t * 1.9) * 0.004;
      w.lean = Math.sin(t * 0.9) * 1.2;
    }
  }
  if (isHero && state.genre === 'sidescroller' && !e.onGround) {
    w.sy = 1.06; w.sx = 0.97; w.lean = Math.max(-6, Math.min(6, e.vy / 200));
  }
  return w;
}

function drawEntities(ctx, state, assets, fx, dt) {
  const vp = state.vp;
  const list = [...state.enemies, state.hero].filter(Boolean);
  if (state.genre === 'vertical-arena') list.sort((a, b) => a.y - b.y);

  for (const e of list) {
    const pack = assets.rigs[e.kind];
    if (!pack) continue;
    const isHero = e.role === 'hero';
    let sx, sy, height;
    if (state.genre === 'sidescroller') {
      sx = e.x - state.camX; sy = e.y;
      if (sx < -200 || sx > vp.w + 200) continue;
      height = e.scale * vp.h;
    } else {
      const depth = Math.max(0.1, Math.min(1, e.y / state.groundY));
      sx = e.x; sy = e.y; height = e.scale * vp.h * (isHero ? 1 : 0.55 + 0.45 * depth);
    }
    const deadFade = e.dead ? Math.max(0, 1 - e.deadT / 1.1) : 1;
    if (deadFade <= 0) continue;
    // poussière de course
    if (isHero && e.anim === 'run' && e.onGround && Math.random() < dt * 14) {
      spawn(fx, 1, { x: e.x - e.facing * 20, y: state.groundY, angle: -Math.PI / 2, spread: 1.4, speed: 40, gravity: 140, life: 0.4, size: 4, color: 'rgba(180,170,160,0.4)' });
    }
    // ombre de contact (plus marquée : elle ancre le personnage)
    ctx.save();
    ctx.globalAlpha = 0.5 * deadFade * (e.onGround === false ? Math.max(0.3, 1 - Math.abs(state.groundY - e.y) / 320) : 1);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const shadowY = state.genre === 'sidescroller' ? (isHero ? (e.supportY ?? state.groundY) : state.groundY) + 6 : sy + 4;
    ctx.ellipse(sx, shadowY, height * 0.24, height * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const blink = isHero && e.invulnT > 0 && !e.dead && Math.floor(state.time * 12) % 2 === 0;
    drawPuppet(ctx, pack.full, {
      x: sx, y: sy, height,
      flip: (e.facing ?? e.dir ?? 1) < 0,
      alpha: (blink ? 0.35 : 1) * deadFade,
      flash: e.hitT > 0.12,
      halo: height * 0.07,
      time: state.time,
      warp: puppetWarp(e, state, isHero),
    });
  }
}

function drawHud(ctx, state, accent, fx, dt) {
  const { vp } = state, h = state.hero, hud = state.gdl.ui?.hud ?? [];
  ctx.save();
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  if (hud.includes('hearts')) for (let i = 0; i < h.maxHp; i++) drawHeart(ctx, 34 + i * 34, 36, 13, i < h.hp, '#e5484d');
  if (hud.includes('score')) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'right';
    ctx.fillText(String(state.score).padStart(5, '0'), vp.w - 26, 36);
  }
  // reliques acquises
  if (state.relics?.length) {
    ctx.textAlign = 'left'; ctx.font = '600 13px system-ui, sans-serif';
    state.relics.forEach((r, i) => {
      const x = 36 + i * 30, y = 72;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = accent; ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
      ctx.fillStyle = '#1a1426'; ctx.textAlign = 'center';
      ctx.fillText(r.name[0].toUpperCase(), x, y + 1);
    });
  }
  // barre de boss
  const boss = state.enemies.find((e) => e.role === 'boss' && !e.dead);
  if (boss) {
    const w = vp.w * 0.5, x = (vp.w - w) / 2, y = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 3, y - 9, w + 6, 18);
    ctx.fillStyle = '#a31229'; ctx.fillRect(x, y - 6, w * Math.max(0, boss.hp / boss.stats.hp), 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(x - 3, y - 9, w + 6, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.textAlign = 'center'; ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(state.bossName ?? 'Boss', vp.w / 2, y - 20);
  }
  if (hud.includes('progress') && state.genre === 'sidescroller' && !state.level.boss) {
    const w = vp.w * 0.42, x = (vp.w - w) / 2, y = vp.h - 26;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = accent; ctx.fillRect(x, y, w * Math.min(1, state.hero.x / (state.level.exit?.x ?? state.level.length)), 6);
  }
  if (hud.includes('wave') && state.genre === 'vertical-arena') {
    const total = (state.level.waves ?? []).length;
    const spawned = (state.level.waves ?? []).filter((w) => w._spawned).length;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'center';
    ctx.fillText(`Vague ${spawned}/${total}`, vp.w / 2, 66);
  }
  // toast (nom de niveau, checkpoint…)
  if (fx.toast) {
    fx.toast.t += dt;
    const a = fx.toast.t < 0.4 ? fx.toast.t / 0.4 : fx.toast.t > 2.2 ? Math.max(0, 1 - (fx.toast.t - 2.2) / 0.5) : 1;
    if (fx.toast.t > 2.8) fx.toast = null;
    else {
      ctx.globalAlpha = a;
      ctx.fillStyle = accent; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(vp.w * 0.03)}px Georgia, serif`;
      ctx.fillText(fx.toast.text, vp.w / 2, vp.h * 0.16);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// ═══ ÉCRANS DE CAMPAGNE ═══

function panel(ctx, vp) {
  ctx.fillStyle = 'rgba(6,4,14,0.82)';
  ctx.fillRect(0, 0, vp.w, vp.h);
}

export function renderTitle(ctx, gdl, vp, t, bgLayers) {
  drawScreenBackdrop(ctx, vp, t, bgLayers);
  const accent = gdl.ui?.accent ?? '#e8c05a';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.shadowColor = accent; ctx.shadowBlur = 24;
  ctx.font = `700 ${Math.round(vp.w * 0.06)}px Georgia, serif`;
  ctx.fillText(gdl.title, vp.w / 2, vp.h * 0.36);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '400 19px system-ui, sans-serif';
  wrapText(ctx, gdl.subtitle ?? '', vp.w / 2, vp.h * 0.46, vp.w * 0.7, 26);
  if (Math.floor(t * 1.6) % 2 === 0) ctx.fillText('— Appuie sur une touche —', vp.w / 2, vp.h * 0.66);
  ctx.restore();
}

function drawScreenBackdrop(ctx, vp, t, bgLayers) {
  ctx.clearRect(0, 0, vp.w, vp.h);
  if (bgLayers?.length) {
    for (const layer of bgLayers) {
      if (!layer.img || layer.id === 'ground') continue;
      const h = vp.h, w = h * (layer.img.width / layer.img.height);
      tileLayer(ctx, layer.img, t * 12 * layer.depth, layer.id === 'near' ? vp.h * 0.55 : 0, w, layer.id === 'near' ? vp.h * 0.45 : h, vp.w);
    }
  }
  panel(ctx, vp);
}

/** Carte-monde : nœuds de niveaux, états verrouillé/fini, sélection. */
export function renderMap(ctx, gdl, campaign, vp, t, bgLayers, selectedIndex) {
  drawScreenBackdrop(ctx, vp, t, bgLayers);
  const accent = gdl.ui?.accent ?? '#e8c05a';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${Math.round(vp.w * 0.032)}px Georgia, serif`;
  ctx.fillText(gdl.map?.title ?? 'Carte du monde', vp.w / 2, vp.h * 0.12);
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`Score total ${campaign.totalScore} · ${campaign.relics.length} relique${campaign.relics.length > 1 ? 's' : ''}`, vp.w / 2, vp.h * 0.17);

  const nodes = gdl.map?.nodes ?? gdl.levels.map((l, i) => ({ level: l.id, x: 0.2 + (i * 0.6) / Math.max(1, gdl.levels.length - 1), y: 0.5 + (i % 2 ? -0.08 : 0.08), name: l.name ?? `Niveau ${i + 1}` }));
  // chemin
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
  ctx.beginPath();
  nodes.forEach((n, i) => { const x = n.x * vp.w, y = n.y * vp.h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke(); ctx.setLineDash([]);
  // nœuds
  nodes.forEach((n, i) => {
    const x = n.x * vp.w, y = n.y * vp.h;
    const unlocked = i < campaign.unlocked;
    const done = campaign.completed.includes(n.level);
    const isSel = i === selectedIndex;
    const r = isSel ? 26 + Math.sin(t * 5) * 3 : 20;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = done ? accent : unlocked ? 'rgba(255,255,255,0.85)' : 'rgba(120,120,140,0.4)';
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = isSel ? accent : 'rgba(0,0,0,0.5)'; ctx.stroke();
    ctx.fillStyle = done ? '#1a1426' : unlocked ? '#1a1426' : 'rgba(255,255,255,0.4)';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(done ? '✓' : unlocked ? String(i + 1) : '🔒', x, y + 1);
    ctx.fillStyle = isSel ? accent : 'rgba(255,255,255,0.75)';
    ctx.font = `${isSel ? 700 : 400} 14px system-ui, sans-serif`;
    ctx.fillText(n.name, x, y + r + 20);
    const lvl = gdl.levels[i];
    if (isSel && lvl?.boss) { ctx.fillStyle = '#ff8585'; ctx.fillText('⚔ BOSS', x, y + r + 40); }
  });
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillText('◀ ▶ choisir · Entrée/X jouer', vp.w / 2, vp.h * 0.9);
  ctx.restore();
}

/** Dialogue : portrait + nom + texte machine à écrire. */
export function renderDialogue(ctx, vp, beat, charT, portraitImg, accent) {
  const boxH = Math.min(200, vp.h * 0.3);
  const y = vp.h - boxH - 18;
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,16,0.92)';
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  roundRect(ctx, 18, y, vp.w - 36, boxH, 12); ctx.fill(); ctx.stroke();
  let textX = 40;
  if (portraitImg) {
    const ph = boxH - 28, pw = ph * (portraitImg.width / portraitImg.height);
    ctx.save(); roundRect(ctx, 32, y + 14, pw, ph, 8); ctx.clip();
    ctx.drawImage(portraitImg, 32, y + 14, pw, ph); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; roundRect(ctx, 32, y + 14, pw, ph, 8); ctx.stroke();
    textX = 32 + pw + 22;
  }
  ctx.fillStyle = accent;
  ctx.font = '700 17px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(beat.speaker ?? '', textX, y + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = '400 17px system-ui, sans-serif';
  const shown = beat.text.slice(0, Math.floor(charT * 45));
  wrapTextTop(ctx, shown, textX, y + 48, vp.w - textX - 50, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '400 13px system-ui, sans-serif';
  if (shown.length >= beat.text.length) ctx.fillText('▼ continuer', vp.w - 130, y + boxH - 24);
  ctx.restore();
}

/** Choix de relique : deux cartes. */
export function renderRelicChoice(ctx, vp, relics, selected, accent, t) {
  panel(ctx, vp);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.round(vp.w * 0.028)}px Georgia, serif`;
  ctx.fillText('Choisis une relique', vp.w / 2, vp.h * 0.2);
  const cw = Math.min(300, vp.w * 0.36), ch = vp.h * 0.4;
  relics.forEach((r, i) => {
    const x = vp.w / 2 + (i === 0 ? -cw - 20 : 20), y = vp.h * 0.3;
    const isSel = i === selected;
    ctx.fillStyle = isSel ? 'rgba(40,32,64,0.95)' : 'rgba(20,16,34,0.9)';
    ctx.strokeStyle = isSel ? accent : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = isSel ? 3 : 1.5;
    roundRect(ctx, x, y + (isSel ? Math.sin(t * 4) * 4 : 0), cw, ch, 14); ctx.fill(); ctx.stroke();
    const cy = y + (isSel ? Math.sin(t * 4) * 4 : 0);
    ctx.save(); ctx.translate(x + cw / 2, cy + ch * 0.28); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = accent; ctx.fillRect(-24, -24, 48, 48); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(r.name, x + cw / 2, cy + ch * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '400 15px system-ui, sans-serif';
    wrapText(ctx, r.desc ?? '', x + cw / 2, cy + ch * 0.68, cw - 40, 20);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillText('◀ ▶ choisir · Entrée/X prendre', vp.w / 2, vp.h * 0.85);
  ctx.restore();
}

export function renderCredits(ctx, gdl, campaign, vp, t) {
  panel(ctx, vp);
  const accent = gdl.ui?.accent ?? '#e8c05a';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.shadowColor = accent; ctx.shadowBlur = 20;
  ctx.font = `700 ${Math.round(vp.w * 0.05)}px Georgia, serif`;
  ctx.fillText('Victoire !', vp.w / 2, vp.h * 0.32);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '400 20px system-ui, sans-serif';
  ctx.fillText(`${gdl.title} — campagne terminée`, vp.w / 2, vp.h * 0.42);
  ctx.fillText(`Score total ${campaign.totalScore} · ${campaign.relics.length} reliques`, vp.w / 2, vp.h * 0.49);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '400 16px system-ui, sans-serif';
  ctx.fillText('Forgé par Ellipse — assets générés, jeu défini en GDL', vp.w / 2, vp.h * 0.6);
  if (Math.floor(t * 1.6) % 2 === 0) ctx.fillText('R : recommencer l’aventure', vp.w / 2, vp.h * 0.7);
  ctx.restore();
}

// ── utilitaires texte/formes ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  if (line.trim()) ctx.fillText(line.trim(), x, yy);
}

function wrapTextTop(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  if (line.trim()) ctx.fillText(line.trim(), x, yy);
}

export function setLevelToast(fx, text) { fx.toast = { text, t: 0 }; }
