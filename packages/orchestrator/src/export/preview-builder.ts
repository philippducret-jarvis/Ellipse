/**
 * Génère un bundle preview HTML5 générique depuis le GDL workspace (tous genres 2D).
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  GameDefinitionSchema,
  normalizeGdlForParse,
  resolveGdlPreviewPath,
  resolveGdlPreviewRelativePath,
} from '@ellipse/shared';

export interface PreviewBuildResult {
  exportDir: string;
  previewHtml: string;
  previewUrl: string;
  mode: 'survivors' | 'topdown' | 'platformer' | 'merge_drop';
}

function detectMode(gdl: { systems?: string[] }): 'survivors' | 'topdown' | 'platformer' | 'merge_drop' {
  const systems = gdl.systems ?? [];
  if (systems.includes('merge_drop_physics')) {
    return 'merge_drop';
  }
  if (systems.some((s) => ['lane_runner', 'wave_spawner', 'blessing_draft'].includes(s))) {
    return 'survivors';
  }
  if (systems.includes('physics_topdown')) {
    return 'topdown';
  }
  return 'platformer';
}

export function previewGdlRelativeUrl(slug: string): string {
  return '../../' + resolveGdlPreviewRelativePath(slug).replace(/\\/g, '/');
}

function buildHtml(title: string, slug: string, mode: string): string {
  const gdlRel = previewGdlRelativeUrl(slug);
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title} — Preview Ellipse</title>
    <link rel="stylesheet" href="./preview.css" />
  </head>
  <body>
    <main class="app-shell">
      <section class="hud-panel">
        <div>
          <p class="eyebrow">Ellipse · preview HD 2D</p>
          <h1>${title}</h1>
          <p class="lede" id="lede">Mode ${mode} · ${mode === 'merge_drop' ? 'toucher pour lacher, ESPACE pouvoir, G invocation' : mode === 'survivors' ? 'flèches ou WASD, touches 1-3 bénédictions' : mode === 'platformer' ? 'flèches ou WASD, Espace saut' : 'flèches ou WASD, exploration top-down'}</p>
        </div>
        <div class="stats" id="stats"></div>
      </section>
      <section class="canvas-panel">
        <canvas id="preview" width="720" height="1280" aria-label="Preview jeu"></canvas>
        <div class="status-bar" id="status">Chargement…</div>
      </section>
    </main>
    <script type="module" src="./preview.js"></script>
    <script type="application/json" id="ellipse-meta">${JSON.stringify({ slug, gdlPath: gdlRel })}</script>
  </body>
</html>`;
}

const PREVIEW_CSS = `:root {
  --bg: #07060a;
  --gold: #c9a227;
  --violet: #5a3a72;
  --text: #f0e1ba;
  --muted: #9a8a72;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  font-family: Georgia, "Times New Roman", serif;
  background: radial-gradient(circle at top, rgba(90, 58, 114, 0.25), transparent 40%), var(--bg);
}
.app-shell { max-width: 900px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
.hud-panel h1 { margin: 0.2rem 0; font-size: 1.35rem; color: var(--gold); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: var(--muted); margin: 0; }
.lede { color: var(--muted); line-height: 1.45; margin: 0.5rem 0 0; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.stat-chip { padding: 6px 10px; border: 1px solid rgba(201, 162, 39, 0.35); border-radius: 999px; font-size: 0.82rem; }
.canvas-panel { display: flex; flex-direction: column; align-items: center; gap: 8px; }
canvas { width: min(100%, 360px); height: auto; border: 1px solid rgba(201, 162, 39, 0.25); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.45); background: #120f18; }
.merge-host { width: min(100%, 420px); }
.merge-host canvas { width: 100%; display: block; }
.status-bar { font-size: 0.85rem; color: var(--muted); text-align: center; min-height: 1.2em; }
@media (max-width: 480px) {
  .app-shell { padding: 0; }
  .hud-panel, .status-bar { padding: 12px; }
  .merge-host { width: 100%; }
}
`;

const PREVIEW_JS = `const meta = JSON.parse(document.getElementById('ellipse-meta').textContent);
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const statusEl = document.getElementById('status');

const keys = new Set();
window.addEventListener('keydown', (e) => { keys.add(e.key); if (['1','2','3'].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup', (e) => keys.delete(e.key));

function chip(label, value) {
  const d = document.createElement('div');
  d.className = 'stat-chip';
  d.textContent = label + ': ' + value;
  return d;
}

async function loadGdl() {
  const res = await fetch(meta.gdlPath);
  if (!res.ok) throw new Error('GDL introuvable');
  return res.json();
}

function isSurvivors(gdl) {
  return (gdl.systems || []).some(s => ['lane_runner','wave_spawner'].includes(s));
}

function isTopdown(gdl) {
  return (gdl.systems || []).includes('physics_topdown');
}

function isMergeDrop(gdl) {
  return (gdl.systems || []).includes('merge_drop_physics');
}

async function initMergeDrop(gdl) {
  canvas.style.display = 'none';
  const host = document.createElement('div');
  host.className = 'merge-host';
  canvas.before(host);
  const { MergeDropEngine } = await import('./engine/ellipse-engine.js');
  const engine = new MergeDropEngine();
  await engine.init({ container: host, width: canvas.width, height: canvas.height });
  await engine.loadGDL(gdl);
  statsEl.replaceChildren(chip('Mode', 'Fusion'), chip('Sauvegarde', 'Locale'));
  statusEl.textContent = 'Orbes: toucher pour lacher, ESPACE pouvoir, G invocation';
}

function resizeCanvas(gdl) {
  const res = gdl.meta?.resolution;
  if (Array.isArray(res) && res.length === 2) {
    canvas.width = res[0];
    canvas.height = res[1];
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function initPlatformer(gdl) {
  const scene = gdl.scenes?.[0] || {};
  const bg = scene.background?.color || '#1a1a2e';
  const player = gdl.entities?.find(e => e.id === 'player');
  const t = player?.components?.find(c => c.transform)?.transform || { x: 100, y: 400 };
  const state = { x: t.x, y: t.y, vy: 0, grounded: false, score: 0, health: 3 };
  const W = canvas.width, H = canvas.height;
  const groundY = scene.layout?.ground_y ?? H - 80;

  function tick() {
    const left = keys.has('ArrowLeft') || keys.has('a');
    const right = keys.has('ArrowRight') || keys.has('d');
    const jump = keys.has(' ') || keys.has('ArrowUp') || keys.has('w');
    if (left) state.x -= 4;
    if (right) state.x += 4;
    state.vy += 0.6;
    state.y += state.vy;
    if (state.y >= groundY) { state.y = groundY; state.vy = 0; state.grounded = true; }
    else state.grounded = false;
    if (jump && state.grounded) state.vy = -14;
    state.x = Math.max(24, Math.min(W - 24, state.x));

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, groundY + 20, W, H - groundY);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(state.x - 16, state.y - 32, 32, 32);
    ctx.fillStyle = '#f0e1ba';
    ctx.font = '14px sans-serif';
    ctx.fillText('Score ' + state.score, 16, 28);

    statsEl.replaceChildren(chip('PV', state.health), chip('Score', state.score));
    statusEl.textContent = 'Platformer · ' + (gdl.meta?.title || 'Jeu');
    requestAnimationFrame(tick);
  }
  tick();
}

function initTopdown(gdl) {
  const scene = gdl.scenes?.[0] || {};
  const layout = scene.layout || {};
  const bg = scene.background?.color || '#101922';
  const player = gdl.entities?.find(e => e.id === 'player');
  const t = player?.components?.find(c => c.transform)?.transform || layout.spawn || { x: 100, y: 360 };
  const h = player?.components?.find(c => c.health)?.health;
  const state = { x: t.x, y: t.y, score: 0, health: h?.max || 4, won: false, lost: false, invuln: 0 };
  const size = 42;
  const blockers = layout.platforms || [];
  const pickups = (layout.collectibles || []).map(p => ({ ...p, got: false }));
  const enemies = (layout.enemies || []).map((e, i) => ({
    x: e.x,
    y: e.y,
    w: e.w || 40,
    h: e.h || 40,
    vx: e.speed || 48 + i * 4,
    left: e.x - (e.patrol || 70),
    right: e.x + (e.patrol || 70),
    hp: e.hp || 2,
    kind: e.kind || 'enemy',
  }));
  const goal = layout.goal ? { x: layout.goal.x - 20, y: layout.goal.y - 28, w: 48, h: 64 } : null;

  function blocked(box) {
    return blockers.some(b => overlap(box, { x: b.x, y: b.y, w: b.w, h: b.h }));
  }

  function tick() {
    const W = canvas.width, H = canvas.height;
    if (!state.won && !state.lost) {
      const dx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      const dy = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      const speed = 3.4;
      const nx = state.x + (dx / len) * speed;
      const ny = state.y + (dy / len) * speed;
      if (!blocked({ x: nx, y: state.y, w: size, h: size })) state.x = nx;
      if (!blocked({ x: state.x, y: ny, w: size, h: size })) state.y = ny;
      state.x = Math.max(0, Math.min(W - size, state.x));
      state.y = Math.max(0, Math.min(H - size, state.y));

      for (const e of enemies) {
        e.x += e.vx * 0.016;
        if (e.x < e.left) { e.x = e.left; e.vx = Math.abs(e.vx); }
        if (e.x > e.right) { e.x = e.right; e.vx = -Math.abs(e.vx); }
        if (state.invuln <= 0 && overlap({ x: state.x, y: state.y, w: size, h: size }, e)) {
          state.health -= 1;
          state.invuln = 70;
          if (state.health <= 0) state.lost = true;
        }
      }
      if (state.invuln > 0) state.invuln--;

      for (const p of pickups) {
        if (!p.got && overlap({ x: state.x, y: state.y, w: size, h: size }, { x: p.x - 12, y: p.y - 12, w: 24, h: 24 })) {
          p.got = true;
          state.score += 50;
        }
      }
      if (goal && overlap({ x: state.x, y: state.y, w: size, h: size }, goal)) state.won = true;
    }

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const z of layout.zones || []) {
      ctx.fillStyle = 'rgba(214,179,90,0.045)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
    }
    ctx.fillStyle = '#253247';
    for (const b of blockers) ctx.fillRect(b.x, b.y, b.w, b.h);
    if (goal) {
      ctx.fillStyle = '#d6b35a';
      ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    }
    for (const p of pickups) {
      if (p.got) continue;
      ctx.fillStyle = '#7bdff2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of enemies) {
      ctx.fillStyle = e.kind.includes('elite') ? '#d6b35a' : '#9e4f5c';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.fillStyle = state.invuln % 8 < 4 ? '#ef476f' : '#f0e1ba';
    ctx.fillRect(state.x, state.y, size, size);
    ctx.fillStyle = '#f0e1ba';
    ctx.font = '14px sans-serif';
    ctx.fillText('PV ' + state.health + '  Score ' + state.score, 16, 28);
    statsEl.replaceChildren(chip('PV', state.health), chip('Score', state.score), chip('Objectif', state.won ? 'OK' : 'Gate'));
    statusEl.textContent = state.won ? 'Victoire!' : state.lost ? 'Defaite' : 'Top-down · explorez et atteignez le gate';
    requestAnimationFrame(tick);
  }
  tick();
}

function initSurvivors(gdl) {
  const scene = gdl.scenes?.[0] || {};
  const lanes = scene.layout?.lane_meta?.lanes || [
    { id: 'lane_left', center_x: 180 },
    { id: 'lane_center', center_x: 360 },
    { id: 'lane_right', center_x: 540 },
  ];
  const veloria = scene.veloria || {};
  const waves = veloria.encounters?.waves || [];
  const state = {
    lane: 1,
    wave: 1,
    waveIdx: 0,
    health: 10,
    score: 0,
    enemies: [],
    timer: 0,
    hazardLane: -1,
    hazardPhase: 'idle',
    draft: false,
    draftOptions: veloria.blessings?.slice(0, 3) || [],
    won: false,
    lost: false,
  };

  function spawnWave() {
    state.enemies = [];
    const w = waves[state.waveIdx];
    if (!w) return;
    for (const grp of w.enemies || []) {
      const laneIdx = lanes.findIndex(l => l.id === grp.lane);
      const li = laneIdx >= 0 ? laneIdx : 1;
      for (let i = 0; i < (grp.count || 1); i++) {
        state.enemies.push({ lane: li, hp: 2, y: -40 - i * 30, type: grp.type || 'shade' });
      }
    }
    if (w.boss) {
      const li = lanes.findIndex(l => l.id === (w.boss.spawn_lane || 'lane_center'));
      state.enemies.push({ lane: li >= 0 ? li : 1, hp: 20, y: -60, type: 'boss', boss: true });
    }
  }
  spawnWave();

  function tick() {
    if (state.won || state.lost) {
      statusEl.textContent = state.won ? 'Victoire!' : 'Défaite';
      return requestAnimationFrame(tick);
    }
    if (state.draft) {
      if (keys.has('1') && state.draftOptions[0]) { state.draft = false; state.score += 50; }
      else if (keys.has('2') && state.draftOptions[1]) { state.draft = false; state.score += 50; }
      else if (keys.has('3') && state.draftOptions[2]) { state.draft = false; state.score += 50; }
    } else {
      if (keys.has('ArrowLeft') || keys.has('a')) state.lane = Math.max(0, state.lane - 1);
      if (keys.has('ArrowRight') || keys.has('d')) state.lane = Math.min(lanes.length - 1, state.lane + 1);
      state.timer++;
      if (state.timer % 180 === 0 && state.hazardPhase === 'idle') {
        state.hazardPhase = 'telegraph';
        state.hazardLane = Math.floor(Math.random() * lanes.length);
        setTimeout(() => { state.hazardPhase = 'active'; setTimeout(() => { state.hazardPhase = 'idle'; }, 400); }, 600);
      }
      if (state.hazardPhase === 'active' && state.hazardLane === state.lane) state.health -= 0.02;
      for (const e of state.enemies) {
        e.y += e.boss ? 0.8 : 1.2;
        if (e.lane === state.lane && e.y > 820 && e.y < 920) { e.hp -= 0.15; state.score += 0.5; }
        if (e.y > 950 && e.hp > 0) state.health -= e.boss ? 2 : 0.5;
      }
      state.enemies = state.enemies.filter(e => e.hp > 0 && e.y < 1100);
      if (state.enemies.length === 0) {
        const breaks = veloria.encounters?.blessing_breaks_after_waves || [2, 4];
        if (breaks.includes(state.wave)) { state.draft = true; state.draftOptions = (veloria.blessings || []).slice(0, 3); }
        state.waveIdx++;
        state.wave++;
        if (state.waveIdx >= waves.length) state.won = true;
        else spawnWave();
      }
      if (state.health <= 0) state.lost = true;
    }

    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#120f18';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < lanes.length; i++) {
      ctx.strokeStyle = 'rgba(201,162,39,0.15)';
      ctx.beginPath();
      ctx.moveTo(lanes[i].center_x, 0);
      ctx.lineTo(lanes[i].center_x, H);
      ctx.stroke();
      if (state.hazardPhase !== 'idle' && state.hazardLane === i) {
        ctx.fillStyle = state.hazardPhase === 'active' ? 'rgba(233,69,96,0.35)' : 'rgba(233,69,96,0.15)';
        ctx.fillRect(lanes[i].center_x - 60, 0, 120, H);
      }
    }
    for (const e of state.enemies) {
      const x = lanes[e.lane]?.center_x ?? 360;
      ctx.fillStyle = e.boss ? '#c9a227' : '#5a3a72';
      ctx.fillRect(x - 20, e.y, 40, e.boss ? 48 : 32);
    }
    const px = lanes[state.lane]?.center_x ?? 360;
    ctx.fillStyle = '#e94560';
    ctx.fillRect(px - 18, 880, 36, 36);
    if (state.draft) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f0e1ba';
      ctx.font = '18px sans-serif';
      ctx.fillText('Bénédiction — touche 1/2/3', 180, 400);
      state.draftOptions.forEach((b, i) => ctx.fillText((i+1) + '. ' + (b.label || b.id), 160, 440 + i * 32));
    }
    statsEl.replaceChildren(chip('Vague', state.wave), chip('PV', Math.ceil(state.health)), chip('Score', Math.floor(state.score)));
    statusEl.textContent = state.draft ? 'Choisissez une bénédiction' : 'Survivors · vague ' + state.wave;
    requestAnimationFrame(tick);
  }
  tick();
}

loadGdl().then(async gdl => {
  resizeCanvas(gdl);
  if (isMergeDrop(gdl)) await initMergeDrop(gdl);
  else if (isSurvivors(gdl)) initSurvivors(gdl);
  else if (isTopdown(gdl)) initTopdown(gdl);
  else initPlatformer(gdl);
}).catch(err => { statusEl.textContent = 'Erreur: ' + err.message; });
`;

export async function buildGenericPreviewBundle(
  workspaceRoot: string,
  slug: string,
  title: string,
): Promise<PreviewBuildResult> {
  const gdlPath = resolveGdlPreviewPath(workspaceRoot, slug);
  if (!existsSync(gdlPath)) {
    throw new Error(`GDL preview absent: ${gdlPath}`);
  }

  const raw = JSON.parse(await readFile(gdlPath, 'utf-8'));
  const gdl = GameDefinitionSchema.parse(normalizeGdlForParse(raw));
  const mode = detectMode(gdl);

  const exportDir = join(workspaceRoot, '07_exports', 'web');
  await mkdir(exportDir, { recursive: true });

  const previewHtml = join(exportDir, 'preview.html');
  const previewUrl = `/workspaces/${slug}/07_exports/web/preview.html`;

  await writeFile(previewHtml, buildHtml(title, slug, mode));
  await writeFile(join(exportDir, 'preview.css'), PREVIEW_CSS);
  await writeFile(join(exportDir, 'preview.js'), PREVIEW_JS);
  if (mode === 'merge_drop') {
    const engineDir = join(exportDir, 'engine');
    const browserBundle = join(workspaceRoot, '..', '..', 'packages', 'engine', 'dist-browser', 'ellipse-engine.js');
    if (!existsSync(browserBundle)) {
      throw new Error('Bundle navigateur @ellipse/engine absent. Executer le build du moteur avant export.');
    }
    await mkdir(engineDir, { recursive: true });
    await copyFile(browserBundle, join(engineDir, 'ellipse-engine.js'));
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    title,
    slug,
    mode,
    gdl_path: resolveGdlPreviewRelativePath(slug),
    preview_url: previewUrl,
  };
  await writeFile(join(exportDir, 'preview-manifest.json'), JSON.stringify(manifest, null, 2));

  return { exportDir, previewHtml, previewUrl, mode };
}
