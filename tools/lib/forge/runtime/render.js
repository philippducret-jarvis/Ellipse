/**
 * RENDU — parallax 2,5D, squelettes, ombres de contact, HUD, overlays.
 * Générique : tout vient du GDL + manifests d'assets. Aucun code par titre.
 */
import { sampleClip, drawSkeleton } from './skeleton.js';

function hex(p, i, fb) { return (p && p[i]) || fb; }

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

function tileLayer(ctx, img, offsetX, y, drawW, drawH, vpW) {
  const start = -((offsetX % drawW) + drawW) % drawW;
  for (let x = start; x < vpW; x += drawW - 1) ctx.drawImage(img, x, y, drawW, drawH);
}

export function render(ctx, state, assets, dt) {
  const { vp } = state, pal = state.gdl.palette;
  const accent = state.gdl.ui?.accent ?? hex(pal, 3, '#e8c05a');
  ctx.clearRect(0, 0, vp.w, vp.h);
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * state.shake, (Math.random() - 0.5) * 8 * state.shake);

  // ── parallax (la couche near se dessine DEVANT les entités : vrai 2,5D) ──
  const scroll = state.genre === 'sidescroller' ? state.camX : state.time * 30;
  const near = assets.arena.layers.find((l) => l.id === 'near');
  for (const layer of assets.arena.layers) {
    const img = layer.img;
    if (!img || layer.id === 'near') continue;
    const h = vp.h, w = h * (img.width / img.height);
    tileLayer(ctx, img, scroll * layer.depth, 0, w, h, vp.w);
    if (layer.id === 'mid') {
      // sol lisible : bande sombre sous la ligne de sol
      const g = ctx.createLinearGradient(0, state.groundY, 0, vp.h);
      g.addColorStop(0, 'rgba(8,6,14,0.05)'); g.addColorStop(0.15, 'rgba(8,6,14,0.55)'); g.addColorStop(1, 'rgba(8,6,14,0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, state.groundY - 4, vp.w, vp.h - state.groundY + 4);
      drawWorld(ctx, state, assets, accent);
    }
  }

  drawEntities(ctx, state, assets);
  if (near?.img) {
    const h = vp.h * 0.45, w = h * (near.img.width / near.img.height);
    tileLayer(ctx, near.img, scroll * near.depth, vp.h - h, w, h, vp.w);
  }
  ctx.restore();

  // ── post : flash dégâts + vignette ──
  if (state.hero.hitT > 0) {
    ctx.fillStyle = `rgba(200,30,40,${0.35 * state.hero.hitT / 0.28})`;
    ctx.fillRect(0, 0, vp.w, vp.h);
  }
  const v = ctx.createRadialGradient(vp.w / 2, vp.h / 2, vp.h * 0.45, vp.w / 2, vp.h / 2, vp.h * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,2,10,0.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, vp.w, vp.h);

  drawHud(ctx, state, accent);
}

function drawWorld(ctx, state, assets, accent) {
  if (state.genre !== 'sidescroller') return;
  const gy = state.groundY;
  const toScreen = (x) => x - state.camX;

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
      ctx.save(); ctx.translate(sx, p.y + bob); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = accent; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.fillRect(-9, -9, 18, 18); ctx.strokeRect(-9, -9, 18, 18); ctx.restore();
    }
  }
  for (const c of state.level.checkpoints ?? []) {
    const sx = toScreen(c);
    if (sx < -40 || sx > state.vp.w + 40) continue;
    const active = state.hero.checkpoint >= c;
    ctx.strokeStyle = 'rgba(230,230,240,0.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 110); ctx.stroke();
    ctx.fillStyle = active ? accent : 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(sx, gy - 110); ctx.lineTo(sx + 46, gy - 96); ctx.lineTo(sx, gy - 82); ctx.closePath(); ctx.fill();
  }
  const ex = toScreen(state.level.exit?.x ?? -1);
  if (ex > -80 && ex < state.vp.w + 80) {
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 4);
    const g = ctx.createRadialGradient(ex, gy - 90, 8, ex, gy - 90, 95);
    g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ex, gy - 90, 60, 105, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function drawEntities(ctx, state, assets) {
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
      if (sx < -160 || sx > vp.w + 160) continue;
      height = e.scale * vp.h;
    } else {
      const depth = Math.max(0.1, Math.min(1, e.y / state.groundY));
      sx = e.x; sy = e.y; height = e.scale * vp.h * (isHero ? 1 : 0.55 + 0.45 * depth);
    }
    const deadFade = e.dead ? Math.max(0, 1 - e.deadT / 1.1) : 1;
    if (deadFade <= 0) continue;
    // ombre de contact
    ctx.save();
    ctx.globalAlpha = 0.35 * deadFade;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, state.genre === 'sidescroller' ? state.groundY + 6 : sy + 4, height * 0.22, height * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const blink = isHero && e.invulnT > 0 && !e.dead && Math.floor(state.time * 12) % 2 === 0;
    const pose = sampleClip(pack.clips, e.anim, e.animT);
    drawSkeleton(ctx, pack.rig, pack.images, pose, {
      x: sx, y: sy, height,
      flip: (e.facing ?? e.dir ?? 1) < 0,
      alpha: (blink ? 0.35 : 1) * deadFade,
      flash: e.hitT > 0.12,
    });
  }
}

function drawHud(ctx, state, accent) {
  const { vp } = state, h = state.hero, hud = state.gdl.ui?.hud ?? [];
  ctx.save();
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  if (hud.includes('hearts')) for (let i = 0; i < h.maxHp; i++) drawHeart(ctx, 34 + i * 34, 36, 13, i < h.hp, '#e5484d');
  if (hud.includes('score')) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'right';
    ctx.fillText(String(state.score).padStart(5, '0'), vp.w - 26, 36);
  }
  if (hud.includes('progress') && state.genre === 'sidescroller') {
    const w = vp.w * 0.42, x = (vp.w - w) / 2, y = vp.h - 26;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = accent; ctx.fillRect(x, y, w * Math.min(1, state.hero.x / (state.level.exit?.x ?? state.level.length)), 6);
  }
  if (hud.includes('wave') && state.genre === 'vertical-arena') {
    const total = (state.level.waves ?? []).length;
    const spawned = (state.level.waves ?? []).filter((w) => w._spawned).length;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'center';
    ctx.fillText(`Vague ${spawned}/${total}`, vp.w / 2, 36);
  }
  ctx.restore();
}

/** Écrans title / victoire — retourne l'opacité du voile pour le fondu. */
export function renderOverlay(ctx, state, phase, t) {
  const { vp } = state;
  const accent = state.gdl.ui?.accent ?? '#e8c05a';
  ctx.save();
  ctx.fillStyle = 'rgba(6,4,14,0.72)';
  ctx.fillRect(0, 0, vp.w, vp.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.round(vp.w * 0.055)}px Georgia, serif`;
  if (phase === 'title') {
    ctx.fillText(state.gdl.title, vp.w / 2, vp.h * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '400 19px system-ui, sans-serif';
    wrapText(ctx, state.gdl.subtitle ?? '', vp.w / 2, vp.h * 0.48, vp.w * 0.7, 26);
    if (Math.floor(t * 1.6) % 2 === 0) ctx.fillText('— Appuie sur une touche pour jouer —', vp.w / 2, vp.h * 0.62);
  } else if (phase === 'won') {
    ctx.fillText('Victoire', vp.w / 2, vp.h * 0.42);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '400 20px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score} · ${state.deaths} chute${state.deaths > 1 ? 's' : ''}`, vp.w / 2, vp.h * 0.5);
    ctx.fillText('R pour rejouer', vp.w / 2, vp.h * 0.58);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  if (line.trim()) ctx.fillText(line.trim(), x, yy);
}
