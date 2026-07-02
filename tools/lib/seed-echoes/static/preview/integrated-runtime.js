/**
 * Echoes — runtime scène INTÉGRÉE (board_master).
 * Panorama assemblé depuis level_test_01 ; collision invisible (layout JSON).
 * Acteurs = régions de planche conservées avec leur contexte visuel.
 * Build : pnpm echoes:hd
 */
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const legend = document.getElementById('legend');
const statusNode = document.getElementById('status');
const VIEW_W = canvas.width, VIEW_H = canvas.height;

function setStatus(m) { statusNode.textContent = m; }

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch failed ' + url);
  return r.json();
}
function abs(u) { return u && u.startsWith('/workspaces/') ? u : u; }
function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

// ─── données ────────────────────────────────────────────────────────────────
const manifest = await fetchJson('./preview-manifest.json').catch(() => ({}));
const gdl = await fetchJson(manifest.gdl || '../../05_runtime/gdl/echoes.preview.gdl.json');
const isc = await fetchJson('./integrated-manifest.json');
const scene = gdl.scenes[0];
const L = scene.layout;
const LEVEL_W = L.width, GROUND_Y = L.ground_y ?? 632;
const DEBUG_COLLISION = new URLSearchParams(location.search).get('debug') === '1';

const heroImg = await loadImage(abs(isc.hero?.asset));
const enemyImgs = {};
for (const [kind, url] of Object.entries(isc.enemies ?? {})) enemyImgs[kind] = await loadImage(abs(url));
const sceneLayers = {
  sky: await loadImage(abs(isc.scene?.sky?.asset)),
  far: await loadImage(abs(isc.scene?.layers?.far?.asset)),
  mid: await loadImage(abs(isc.scene?.layers?.mid?.asset)),
  playfield: await loadImage(abs(isc.scene?.layers?.playfield?.asset)),
  foreground: await loadImage(abs(isc.scene?.layers?.foreground?.asset)),
};
const layerMeta = isc.scene?.layers ?? {};

// ─── tuning ennemis (taille/hauteur de rendu + comportement par kind) ─────────
const ENEMY_TUNE = {
  sporeling: { h: 84, dmg: 1, stompable: true },
  rampore: { h: 104, dmg: 1, stompable: true },
  porteur_sporeal: { h: 116, dmg: 1, stompable: true },
  chevalier_fongique: { h: 132, dmg: 1, stompable: false },
  moussu_furieux: { h: 110, dmg: 1, stompable: true },
  root_guardian_boss: { h: 250, dmg: 1, stompable: false, boss: true },
};

// ─── état ────────────────────────────────────────────────────────────────────
const ECHO_MAX = 100;
const player = {
  x: L.spawn.x, y: L.spawn.y, w: 46, h: 78, vx: 0, vy: 0,
  speed: 232, jump: 470, onGround: false, face: 1, t: 0,
  hp: 3, maxHp: 3, invuln: 0, score: 0, spores: 0, shards: 0,
  echo: 0, // ENRICHISSEMENT : « Écho de Spores » — jauge de résonance fongique
};
// onde d'impulsion d'Écho (vide quand inactive)
let pulse = null;
let respawn = { x: L.spawn.x, y: L.spawn.y };
let cameraX = 0;
let zoneLabel = '';
let zoneTimer = 0;
let won = false;

const enemies = (L.enemies || []).map((e) => {
  const tune = ENEMY_TUNE[e.kind] || ENEMY_TUNE.sporeling;
  return {
    kind: e.kind, homeX: e.x, x: e.x, y: e.y, patrol: e.patrol || 0,
    speed: e.speed || 0, dir: -1, alive: true, t: Math.random() * 6, stun: 0,
    h: tune.h, dmg: tune.dmg, stompable: tune.stompable, boss: !!tune.boss,
    img: enemyImgs[e.kind] || null,
  };
});
const collectibles = (L.collectibles || []).map((c) => ({ ...c, taken: false, t: Math.random() * 6 }));

drawLegendUI();
setStatus('Scène intégrée — ← → · Espace sauter · E : Écho de Spores · Le décor vient des planches ; collision invisible.');

// ─── input ─────────────────────────────────────────────────────────────────
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// ─── update ──────────────────────────────────────────────────────────────────
function update(dt) {
  player.t += dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (zoneTimer > 0) zoneTimer -= dt;

  const left = keys.has('arrowleft') || keys.has('a') || keys.has('q');
  const right = keys.has('arrowright') || keys.has('d');
  const wantJump = keys.has(' ') || keys.has('arrowup') || keys.has('w') || keys.has('z');

  player.vx = left === right ? 0 : (left ? -player.speed : player.speed);
  if (player.vx !== 0) player.face = player.vx > 0 ? 1 : -1;
  if (wantJump && player.onGround) { player.vy = -player.jump; player.onGround = false; }
  player.vy += 1500 * dt;

  // ── ENRICHISSEMENT : « Écho de Spores » ───────────────────────────────────
  const wantPulse = keys.has('e') || keys.has('shift') || keys.has('f');
  if (wantPulse && player.echo >= ECHO_MAX && !pulse) {
    pulse = { x: player.x + player.w / 2, y: player.y + player.h / 2, r: 10, max: 360, t: 0 };
    player.echo = 0;
    setStatus('Écho de Spores libéré — le Réseau vacille.');
    burst(pulse.x, pulse.y, '#7ce0ff');
  }
  if (pulse) {
    pulse.t += dt;
    pulse.r = pulse.max * Math.min(1, pulse.t / 0.55);
    for (const e of enemies) {
      if (!e.alive || e.boss) continue;
      const a = enemyAabb(e);
      const d = Math.hypot((a.x + a.w / 2) - pulse.x, (a.y + a.h / 2) - pulse.y);
      if (d <= pulse.r && d >= pulse.r - 60) e.stun = Math.max(e.stun, 2.8);
    }
    if (pulse.t > 0.7) pulse = null;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  for (const p of L.platforms) {
    const rect = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (!intersects(player, rect)) continue;
    const prevBottom = player.y - player.vy * dt + player.h;
    if (prevBottom <= rect.y + 10 && player.vy >= 0) {
      player.y = rect.y - player.h; player.vy = 0; player.onGround = true;
    } else if (player.vy < 0 && player.y - player.vy * dt >= rect.y + rect.h - 4) {
      player.y = rect.y + rect.h; player.vy = 40;
    } else if (player.vx > 0) { player.x = rect.x - player.w; }
    else if (player.vx < 0) { player.x = rect.x + rect.w; }
  }

  // hazards
  for (const h of L.hazards || []) {
    if (intersects(player, { x: h.x, y: h.y - 6, w: h.w, h: h.h + 6 })) hurt(1, 'Les spores toxiques te brûlent !');
  }

  // enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    e.t += dt;
    if (e.stun > 0) e.stun -= dt;
    if (e.stun <= 0 && e.patrol > 0 && e.speed > 0) {
      e.x += e.dir * e.speed * dt;
      if (e.x < e.homeX - e.patrol) { e.x = e.homeX - e.patrol; e.dir = 1; }
      if (e.x > e.homeX + e.patrol) { e.x = e.homeX + e.patrol; e.dir = -1; }
    }
    const ar = enemyAabb(e);
    if (intersects(player, ar)) {
      const stomp = e.stompable && (e.stun > 0 || (player.vy > 0 && (player.y + player.h) - (player.vy * dt) <= ar.y + 14));
      if (stomp) {
        e.alive = false; player.vy = -300; player.score += e.stun > 0 ? 60 : 50;
        burst(e.x, ar.y, '#9b6bff');
        setStatus(e.stun > 0 ? 'Créature étourdie dissipée. +60' : 'Créature dissipée. +50');
      } else if (e.stun > 0) {
        // étourdie : pas de dégâts, le héros peut passer
      } else {
        hurt(e.dmg, e.boss ? 'Le Gardien des Racines t’assaille — franchis-le !' : 'Touché par une créature !');
        // recul franc pour les créatures ; léger pour le boss (passage possible en invuln)
        player.vx = (player.x < e.x ? -1 : 1) * (e.boss ? 70 : 220);
        player.vy = e.boss ? -120 : -200;
      }
    }
  }

  // collectibles
  for (const c of collectibles) {
    if (c.taken) continue;
    if (intersects(player, { x: c.x - 16, y: c.y - 16, w: 32, h: 32 })) {
      c.taken = true;
      if (c.type === 'spore') { player.spores++; player.score += 10; player.echo = Math.min(ECHO_MAX, player.echo + 20); }
      else if (c.type === 'memory_shard') { player.shards++; player.score += 25; player.echo = Math.min(ECHO_MAX, player.echo + 34); }
      else { player.score += 40; player.echo = Math.min(ECHO_MAX, player.echo + 40); }
      if (player.echo >= ECHO_MAX) setStatus('Écho de Spores prêt — appuie sur E pour libérer l’onde.');
      burst(c.x, c.y, '#5ec7ef');
    }
  }

  // checkpoints
  for (const cp of L.checkpoints || []) {
    if (Math.abs(player.x - cp.x) < 40 && Math.abs((player.y + player.h) - cp.y) < 80) {
      if (respawn.x !== cp.x) { respawn = { x: cp.x, y: cp.y - 40 }; pulseZone('Checkpoint — ' + cp.label); }
    }
  }

  // zones
  for (const z of L.zones || []) {
    if (player.x >= z.x && player.x < z.x + z.w && zoneLabel !== z.label) { zoneLabel = z.label; pulseZone(z.label); }
  }

  // chute mortelle
  if (player.y > VIEW_H + 240) hurt(1, 'Chute dans le vide.', true);

  // goal
  if (L.goal && !won && intersects(player, { x: L.goal.x - 8, y: L.goal.y - 96, w: 64, h: 120 })) {
    won = true; setStatus('🍄 Porte du Refuge atteinte — niveau fidèle bouclé ! Score ' + player.score);
  }

  player.x = Math.max(0, Math.min(LEVEL_W - player.w, player.x));

  // caméra suiveuse (clamp niveau)
  const targetCam = player.x + player.w / 2 - VIEW_W * 0.42;
  cameraX += (targetCam - cameraX) * Math.min(1, dt * 6);
  cameraX = Math.max(0, Math.min(LEVEL_W - VIEW_W, cameraX));
}

function enemyFeet(e) { return e.boss ? GROUND_Y : e.y; }
function enemyAabb(e) {
  const img = e.img;
  const w = img ? e.h * (img.naturalWidth / img.naturalHeight) : e.h * 0.7;
  const feet = enemyFeet(e);
  return { x: e.x - w * 0.30, y: feet - e.h * 0.9, w: w * 0.6, h: e.h * 0.88 };
}

function hurt(n, msg, fall = false) {
  if (player.invuln > 0 && !fall) return;
  player.hp -= n; player.invuln = 1.1;
  if (player.hp <= 0) {
    player.hp = player.maxHp; player.x = respawn.x; player.y = respawn.y;
    player.vx = 0; player.vy = 0; setStatus('Tu renais à la sève de l’Arbre-Originel.');
  } else if (fall) {
    player.x = respawn.x; player.y = respawn.y; player.vx = 0; player.vy = 0; setStatus(msg);
  } else setStatus(msg);
}

const bursts = [];
function burst(x, y, color) {
  for (let i = 0; i < 10; i++) bursts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 180 - 40, life: 0.6, color });
}
function pulseZone(label) { zoneLabel = label; zoneTimer = 2.6; }

// ─── render ──────────────────────────────────────────────────────────────────
function drawParallaxLayer(img, factor, dy = 0, h = VIEW_H) {
  if (!img) return;
  ctx.drawImage(img, -cameraX * factor, dy, img.naturalWidth, h);
}

function drawShadow(cx, groundY, w, alpha = 0.32) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Acteur intégré : région de planche posée naturellement au sol (contexte conservé). */
function drawIntegratedActor(img, worldX, feetY, drawH, { flip = false, dy = 0, alpha = 1 } = {}) {
  if (!img) return;
  const w = drawH * (img.naturalWidth / img.naturalHeight);
  const sx = worldX - cameraX, sy = feetY - drawH + dy;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) { ctx.translate(sx * 2, 0); ctx.scale(-1, 1); ctx.drawImage(img, sx - w / 2, sy, w, drawH); }
  else ctx.drawImage(img, sx - w / 2, sy, w, drawH);
  ctx.restore();
}

function drawDebugCollision() {
  if (!DEBUG_COLLISION) return;
  ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = '#7ce0ff'; ctx.lineWidth = 1;
  for (const p of L.platforms) {
    ctx.strokeRect(p.x - cameraX, p.y, p.w, p.h);
  }
  ctx.restore();
}

function drawHazard(h) {
  const x = h.x - cameraX, y = h.y;
  if (x + h.w < -20 || x > VIEW_W + 20) return;
  // brume toxique montante
  ctx.save();
  const haze = ctx.createLinearGradient(0, y - 28, 0, y + h.h + 4);
  haze.addColorStop(0, 'rgba(150,70,190,0)');
  haze.addColorStop(1, 'rgba(120,40,120,0.42)');
  ctx.globalAlpha = 0.7 + 0.15 * Math.sin(player.t * 2 + x * 0.05);
  ctx.fillStyle = haze; ctx.fillRect(x - 6, y - 28, h.w + 12, h.h + 32);
  ctx.restore();
  // grappe de spores luisantes (capsules organiques)
  const n = Math.max(2, Math.floor(h.w / 22));
  for (let i = 0; i < n; i++) {
    const sx = x + (i + 0.5) * (h.w / n);
    const pulse = 0.5 + 0.5 * Math.sin(player.t * 3 + i);
    const r = 6 + pulse * 2;
    ctx.save(); ctx.globalAlpha = 0.5;
    const gl = ctx.createRadialGradient(sx, y + 2, 0, sx, y + 2, r * 2.4);
    gl.addColorStop(0, 'rgba(206,128,236,0.8)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, y + 2, r * 2.4, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#7a3a86';
    ctx.beginPath(); ctx.ellipse(sx, y + 5, r * 0.72, r, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#cf95e4';
    ctx.beginPath(); ctx.arc(sx, y - r * 0.25, r * 0.5, 0, 7); ctx.fill();
  }
}

function drawCollectible(c) {
  if (c.taken) return;
  const x = c.x - cameraX, y = c.y + Math.sin(c.t + player.t * 2) * 5;
  if (x < -20 || x > VIEW_W + 20) return;
  const col = c.type === 'spore' ? '#7ce0ff' : c.type === 'memory_shard' ? '#b98bff'
    : c.type === 'weapon_echo' ? '#ffd47e' : c.type === 'root_essence' ? '#7bf0a8' : '#ff9bd0';
  ctx.save();
  const gl = ctx.createRadialGradient(x, y, 0, x, y, 20);
  gl.addColorStop(0, col); gl.addColorStop(0.4, col); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.42 + 0.16 * Math.sin(player.t * 4 + c.t); ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
  // étincelle en croix tournante
  ctx.globalAlpha = 0.85; ctx.strokeStyle = col; ctx.lineWidth = 1.4;
  const a = player.t * 2 + c.t, R = 9;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * R, y - Math.sin(a) * R); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
  ctx.moveTo(x - Math.cos(a + 1.57) * R, y - Math.sin(a + 1.57) * R); ctx.lineTo(x + Math.cos(a + 1.57) * R, y + Math.sin(a + 1.57) * R);
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  if (!e.alive) return;
  const sx = e.x - cameraX;
  const w = e.img ? e.h * (e.img.naturalWidth / e.img.naturalHeight) : e.h * 0.7;
  if (sx + w < -60 || sx - w > VIEW_W + 60) return;
  const feetY = enemyFeet(e);
  drawShadow(sx, feetY, w * (e.boss ? 0.7 : 0.9), e.boss ? 0.4 : 0.3);
  if (e.boss) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.12 * Math.sin(e.t * 2);
    const gl = ctx.createRadialGradient(sx, feetY - e.h * 0.5, 0, sx, feetY - e.h * 0.5, e.h * 0.7);
    gl.addColorStop(0, 'rgba(150,70,210,0.6)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx - e.h, feetY - e.h * 1.1, e.h * 2, e.h * 1.2);
    ctx.restore();
  }
  const bob = e.boss ? 0 : (e.stun > 0 ? 0 : Math.sin(e.t * 4) * 2);
  drawIntegratedActor(e.img, e.x, feetY, e.h, { flip: e.dir > 0 && !e.boss, dy: bob, alpha: e.stun > 0 ? 0.75 : 1 });
  if (e.stun > 0) {
    // halo de résonance fongique + spores figées
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(e.t * 10);
    const gl = ctx.createRadialGradient(sx, feetY - e.h * 0.5, 0, sx, feetY - e.h * 0.5, e.h * 0.55);
    gl.addColorStop(0, 'rgba(120,224,255,0.5)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx - e.h, feetY - e.h, e.h * 2, e.h);
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#bfeeff';
    for (let k = 0; k < 4; k++) {
      const ang = e.t * 2 + k * 1.57;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(ang) * e.h * 0.32, feetY - e.h * 0.55 + Math.sin(ang) * e.h * 0.3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#120f18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // scène intégrée : ciel → lointain → médian → playfield (panorama planche)
  if (sceneLayers.sky) drawParallaxLayer(sceneLayers.sky, isc.scene?.sky?.parallax ?? 0.08, 0, isc.scene?.sky?.height ?? 80);
  drawParallaxLayer(sceneLayers.far, layerMeta.far?.parallax ?? 0.18);
  ctx.save(); ctx.globalAlpha = 0.95;
  drawParallaxLayer(sceneLayers.mid, layerMeta.mid?.parallax ?? 0.42);
  ctx.restore();
  drawParallaxLayer(sceneLayers.playfield, layerMeta.playfield?.parallax ?? 1.0);

  // gameplay (collision invisible — le décor du playfield porte le visuel)
  drawDebugCollision();
  for (const h of L.hazards || []) drawHazard(h);
  for (const cp of L.checkpoints || []) drawCheckpoint(cp);
  for (const c of collectibles) drawCollectible(c);
  for (const e of enemies) drawEnemy(e);
  if (L.goal) drawGoal(L.goal);

  if (pulse) {
    const px2 = pulse.x - cameraX, alpha = Math.max(0, 1 - pulse.t / 0.7);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85; ctx.lineWidth = 8; ctx.strokeStyle = '#9fe8ff';
    ctx.beginPath(); ctx.arc(px2, pulse.y, pulse.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  const hcx = player.x + player.w / 2 - cameraX, hfeet = player.y + player.h;
  const bob = player.onGround ? Math.sin(player.t * 12) * (Math.abs(player.vx) > 10 ? 2 : 0.8) : 0;
  drawShadow(hcx, hfeet, player.w * 1.2, 0.28);
  const flicker = player.invuln > 0 && Math.floor(player.t * 18) % 2 === 0;
  if (!flicker) {
    drawIntegratedActor(heroImg, player.x + player.w / 2, hfeet + 2, 155, { flip: player.face < 0, dy: bob });
  }

  // glow extrait du playfield (spores/lampes de la planche)
  if (sceneLayers.foreground) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    drawParallaxLayer(sceneLayers.foreground, layerMeta.foreground?.parallax ?? 1.12);
    ctx.restore();
  }

  for (const b of bursts) {
    ctx.save(); ctx.globalAlpha = Math.max(0, b.life / 0.6);
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x - cameraX, b.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawHud();
  if (won) drawWin();
}

function drawCheckpoint(cp) {
  const x = cp.x - cameraX;
  if (x < -20 || x > VIEW_W + 20) return;
  const lit = respawn.x === cp.x;
  ctx.save();
  ctx.fillStyle = lit ? '#caa6ff' : '#5b4a78';
  ctx.fillRect(x - 3, cp.y - 46, 6, 46);
  ctx.globalAlpha = lit ? 0.7 + 0.25 * Math.sin(player.t * 4) : 0.4;
  const gl = ctx.createRadialGradient(x, cp.y - 50, 0, x, cp.y - 50, 16);
  gl.addColorStop(0, lit ? '#d8c2ff' : '#6a5a88'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, cp.y - 50, 16, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawGoal(g) {
  const x = g.x - cameraX;
  ctx.save();
  const grd = ctx.createLinearGradient(0, g.y - 96, 0, g.y);
  grd.addColorStop(0, '#7b4ad0'); grd.addColorStop(1, '#2a1840');
  ctx.fillStyle = grd;
  ctx.fillRect(x, g.y - 96, 46, 96);
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(player.t * 2.5);
  const gl = ctx.createRadialGradient(x + 23, g.y - 48, 0, x + 23, g.y - 48, 60);
  gl.addColorStop(0, 'rgba(170,110,255,0.8)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(x - 30, g.y - 110, 110, 120);
  ctx.restore();
}

function drawHud() {
  // cœurs
  for (let i = 0; i < player.maxHp; i++) {
    const hx = 20 + i * 30, hy = 24, on = i < player.hp;
    ctx.save();
    ctx.fillStyle = on ? '#e0556c' : 'rgba(120,80,90,0.5)';
    ctx.beginPath();
    ctx.moveTo(hx + 10, hy + 6);
    ctx.bezierCurveTo(hx + 10, hy + 2, hx + 16, hy - 4, hx + 20, hy + 4);
    ctx.bezierCurveTo(hx + 24, hy + 12, hx + 10, hy + 20, hx + 10, hy + 22);
    ctx.bezierCurveTo(hx + 10, hy + 20, hx - 4, hy + 12, hx, hy + 4);
    ctx.bezierCurveTo(hx + 4, hy - 4, hx + 10, hy + 2, hx + 10, hy + 6);
    ctx.fill(); ctx.restore();
  }
  // jauge d'Écho de Spores (sous les cœurs)
  const ex = 20, ey = 52, ew = 160, eh = 11, ratio = player.echo / ECHO_MAX;
  ctx.save();
  ctx.fillStyle = 'rgba(10,18,28,0.7)'; ctx.fillRect(ex, ey, ew, eh);
  const eg = ctx.createLinearGradient(ex, 0, ex + ew, 0);
  eg.addColorStop(0, '#2f7fa8'); eg.addColorStop(1, '#7ce0ff');
  ctx.fillStyle = eg; ctx.fillRect(ex, ey, ew * ratio, eh);
  ctx.strokeStyle = ratio >= 1 ? '#bfeeff' : 'rgba(160,210,235,0.5)';
  ctx.lineWidth = ratio >= 1 ? 2 : 1;
  if (ratio >= 1) ctx.globalAlpha = 0.7 + 0.3 * Math.sin(player.t * 6);
  ctx.strokeRect(ex, ey, ew, eh);
  ctx.globalAlpha = 1; ctx.fillStyle = ratio >= 1 ? '#dff6ff' : '#9fc6da';
  ctx.font = '11px Georgia'; ctx.textAlign = 'left';
  ctx.fillText(ratio >= 1 ? 'ÉCHO DE SPORES — [E]' : 'Écho de Spores', ex + 2, ey - 4);
  ctx.restore();
  // score + récoltes
  ctx.save();
  ctx.font = '600 17px Georgia'; ctx.textAlign = 'right';
  ctx.fillStyle = '#f0d9a6';
  ctx.fillText('Score ' + player.score, VIEW_W - 18, 30);
  ctx.font = '14px Georgia'; ctx.fillStyle = '#9fd6ff';
  ctx.fillText('🌀 ' + player.spores + '   ◆ ' + player.shards, VIEW_W - 18, 52);
  ctx.restore();
  // bandeau de zone
  if (zoneTimer > 0 && zoneLabel) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, zoneTimer / 0.5) * 0.9;
    ctx.textAlign = 'center'; ctx.font = '600 26px Georgia';
    ctx.fillStyle = 'rgba(8,6,14,0.6)'; ctx.fillRect(VIEW_W / 2 - 240, 70, 480, 44);
    ctx.fillStyle = '#f3e6c8';
    ctx.fillText(zoneLabel, VIEW_W / 2, 100);
    ctx.restore();
  }
}

function drawWin() {
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,18,0.66)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#caa6ff'; ctx.font = '700 44px Georgia';
  ctx.fillText('Refuge des Échos atteint', VIEW_W / 2, VIEW_H / 2 - 16);
  ctx.fillStyle = '#f0d9a6'; ctx.font = '20px Georgia';
  ctx.fillText('Niveau 01 « Falaises Sporales » bouclé — Score ' + player.score, VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.restore();
}

function drawLegendUI() {
  legend.innerHTML = [
    ['Scène planche', '#5a3a72'], ['Spores / éclats', '#7ce0ff'], ['Créatures', '#9b6bff'],
    ['Dangers', '#c8508c'], ['Sortie', '#aa6eff'],
  ].map(([l, c]) => '<div class="legend-item"><span class="legend-chip" style="background:' + c + '"></span><span>' + l + '</span></div>').join('');
}

// hook QA (lecture seule) pour smoke-tests
window.__echoState = () => ({
  echo: Math.round(player.echo), pulse: !!pulse, hp: player.hp, score: player.score,
  stunned: enemies.filter((e) => e.alive && e.stun > 0).length, x: Math.round(player.x), won,
});

// ─── loop ──────────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  if (!won) update(dt);
  for (const b of bursts) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 400 * dt; b.life -= dt; }
  for (let i = bursts.length - 1; i >= 0; i--) if (bursts[i].life <= 0) bursts.splice(i, 1);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
