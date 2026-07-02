/**
 * BOOT — charge game.gdl.json + assets, câble l'input, boucle rAF.
 * Ce fichier est copié tel quel dans chaque workspace : générique.
 */
import { createGame, step } from './logic.js';
import { render, renderOverlay } from './render.js';

const loadJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); });
const loadImage = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`image: ${u}`)); i.src = u; });

async function loadRigPack(baseDir, rigPath, clipsPath) {
  const rig = await loadJson(rigPath);
  const clips = await loadJson(clipsPath);
  const dir = rigPath.split('/').slice(0, -1).join('/');
  const images = {};
  await Promise.all(rig.parts.map(async (p) => { images[p.id] = await loadImage(`${dir}/${p.file}`); }));
  return { rig, clips, images };
}

async function boot() {
  const gdl = await loadJson('game.gdl.json');
  const vp = gdl.world.viewport;
  const canvas = document.getElementById('game');
  canvas.width = vp.w; canvas.height = vp.h;
  const ctx = canvas.getContext('2d');
  document.title = gdl.title;
  const titleEl = document.getElementById('game-title');
  if (titleEl) titleEl.textContent = `${gdl.title} — Forge Ellipse`;

  // assets du niveau 1
  const level = gdl.levels[0];
  const parallax = await loadJson(level.arena);
  const arenaDir = level.arena.split('/').slice(0, -1).join('/');
  const layers = await Promise.all(parallax.layers.map(async (l) => ({ ...l, img: await loadImage(`${arenaDir}/${l.file}`) })));
  const rigs = {};
  await Promise.all(Object.entries(gdl.entities).map(async ([kind, e]) => { rigs[kind] = await loadRigPack('.', e.rig, e.clips); }));
  const assets = { arena: { layers }, rigs };

  // input
  const input = { left: false, right: false, jump: false, attack: false, laneLeft: false, laneRight: false };
  const KEYS = {
    ArrowLeft: ['left', 'laneLeft'], KeyA: ['left', 'laneLeft'], KeyQ: ['left', 'laneLeft'],
    ArrowRight: ['right', 'laneRight'], KeyD: ['right', 'laneRight'],
    Space: ['jump'], ArrowUp: ['jump'], KeyW: ['jump'], KeyZ: ['jump'],
    KeyX: ['attack'], KeyJ: ['attack'], Enter: ['attack'],
  };
  let phase = 'title', overlayT = 0;
  let state = createGame(gdl, 0);

  const setKeys = (code, v) => { for (const k of KEYS[code] ?? []) input[k] = v; };
  addEventListener('keydown', (e) => {
    if (phase === 'title') { phase = 'playing'; return; }
    if (phase === 'won' && e.code === 'KeyR') { state = createGame(gdl, 0); phase = 'playing'; return; }
    setKeys(e.code, true);
    if (KEYS[e.code]) e.preventDefault();
  });
  addEventListener('keyup', (e) => setKeys(e.code, false));
  canvas.addEventListener('pointerdown', () => { if (phase === 'title') phase = 'playing'; });

  // boucle
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    overlayT += dt;
    if (phase === 'playing') {
      step(state, input, dt);
      if (state.phase === 'won') phase = 'won';
    }
    render(ctx, state, assets, dt);
    if (phase !== 'playing') renderOverlay(ctx, state, phase, overlayT);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('boot-error');
  if (el) { el.hidden = false; el.textContent = `Erreur de chargement : ${e.message}`; }
});
