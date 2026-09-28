/**
 * Veloria — preview GACHA HD (720×1280).
 * Boucle complète : hub → combat → bénédictions → victoire / game over.
 */
import { createGachaRenderer, GACHA_STYLE } from './gacha-renderer.js';
import {
  createLaneRunner,
  createWaveSpawner,
  createBlessingDraft,
  createHazardScheduler,
  createBossPhases,
  loadAssetAtlas,
  normalizeAsset,
} from './veloria-systems.js';

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusNode = document.getElementById('status');

const Screen = {
  HUB: 'hub',
  INVOKE: 'invoke',
  COMBAT: 'combat',
  VICTORY: 'victory',
  GAME_OVER: 'game_over',
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch ' + url);
  return res.json();
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function setStatus(msg) {
  if (statusNode) statusNode.textContent = msg;
}

const manifest = await fetchJson('./preview-manifest.json');
const gdl = await fetchJson(manifest.gdl);

let screen = Screen.HUB;
let levelIndex = 0;
let scene = gdl.scenes[levelIndex];
let layout = scene.layout;
let veloria = scene.veloria;

const playerEntity = gdl.entities.find((e) => e.id === 'player');
const assetAtlas = await loadAssetAtlas(gdl);
const heroImg = await loadImage(normalizeAsset(playerEntity?.assets?.sprite));
let hubBgImg = await loadImage(normalizeAsset(gdl.meta?.asset_atlas?.pavillon_veilles ?? scene.background?.image));
let bgImg = hubBgImg;

const gacha = createGachaRenderer(ctx, layout, {
  depthSpec: scene.depth ?? { mode: 'lane_perspective', horizon_y: 110, ground_y: layout.ground_y, scale_range: [0.5, 1.12] },
});

let laneRunner = null;
let waveSpawner = null;
let blessingDraft = null;
let hazard = null;
let hazardScript = null;
const bossPhases = createBossPhases();

let player = null;
let enemies = [];
let wave = 1;
let score = 0;
let combo = 0;
let gamePaused = false;
let hazardPulse = 0;
let autoTimer = 0;
let runTimer = 0;
let banner = null;
let bannerTimer = 0;
let invokeShown = false;
const attacks = [];
const keys = new Set();

function resetCombatState() {
  laneRunner = createLaneRunner(layout.lane_meta, layout.spawn);
  player = { ...laneRunner.state, hp: 10, maxHp: 10, attackCd: 0, attackRange: 260 };
  waveSpawner = createWaveSpawner(veloria.encounters, layout, assetAtlas, layout.lane_meta);
  blessingDraft = createBlessingDraft(veloria.blessings ?? [], waveSpawner.blessingBreaks);
  hazardScript = gdl.meta?.hazard_scripts?.[scene.id] ?? gdl.meta?.hazard_scripts?.default;
  hazard = createHazardScheduler(hazardScript, layout.lane_meta, layout);
  enemies = waveSpawner.spawnWave();
  wave = waveSpawner.currentWaveNumber();
  score = 0;
  combo = 0;
  runTimer = 0;
  gamePaused = false;
  banner = null;
  attacks.length = 0;
}

function startRun(fromHub = true) {
  resetCombatState();
  screen = fromHub && !invokeShown ? Screen.INVOKE : Screen.COMBAT;
  if (screen === Screen.INVOKE) invokeShown = true;
  setStatus('Veille — ' + (scene.title ?? scene.id));
}

async function resolveArenaBg(idx) {
  const background = gdl.scenes[idx]?.background;
  return loadImage(normalizeAsset(background?.layers?.[0]?.image ?? background?.image));
}

async function switchLevel(idx) {
  if (!gdl.scenes[idx]) return;
  levelIndex = idx;
  scene = gdl.scenes[levelIndex];
  layout = scene.layout;
  veloria = scene.veloria;
  bgImg = await resolveArenaBg(idx);
  resetCombatState();
  screen = Screen.COMBAT;
  setStatus('Arène : ' + (scene.title ?? scene.id));
}

function pickBlessing(id) {
  const b = blessingDraft.choose(id);
  gamePaused = false;
  screen = Screen.COMBAT;
  setStatus('Bénédiction : ' + (b?.label ?? id));
  banner = 'Bénédiction acquise';
  bannerTimer = 1.8;
  enemies = waveSpawner.spawnWave();
}

function confirmAction() {
  if (screen === Screen.HUB) startRun(true);
  else if (screen === Screen.INVOKE) {
    screen = Screen.COMBAT;
    banner = 'Vague 1';
    bannerTimer = 1.5;
  } else if (screen === Screen.VICTORY || screen === Screen.GAME_OVER) {
    screen = Screen.HUB;
    setStatus('Hub Veloria');
  }
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (k === 'enter' || k === ' ') {
    e.preventDefault();
    confirmAction();
  }

  if (screen === Screen.COMBAT && gamePaused && blessingDraft?.active) {
    const pick = blessingDraft.active.picks[Number(k) - 1];
    if (pick) pickBlessing(pick.id);
    return;
  }

  if (screen === Screen.HUB && k >= '1' && k <= '6') {
    const idx = parseInt(k, 10) - 1;
    switchLevel(idx).then(() => startRun(false));
  }

  if (screen === Screen.COMBAT && !gamePaused) {
    if (['arrowleft', 'a', 'q'].includes(k)) laneRunner.snap(-1);
    if (['arrowright', 'd'].includes(k)) laneRunner.snap(1);
  }

  if (['arrowleft', 'arrowright', 'a', 'd', 'q'].includes(k)) e.preventDefault();
});

window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  if (screen !== Screen.COMBAT) {
    confirmAction();
    return;
  }
  if (gamePaused && blessingDraft?.active) {
    const index = Math.max(0, Math.min(2, Math.floor((x / canvas.width) * 3)));
    const pick = blessingDraft.active.picks[index];
    if (pick) pickBlessing(pick.id);
    return;
  }
  if (x < player.x + player.w / 2) laneRunner.snap(-1);
  else laneRunner.snap(1);
});

const urlParams = new URLSearchParams(location.search);
if (urlParams.get('start') === 'combat') {
  resetCombatState();
  screen = Screen.COMBAT;
  banner = 'Vague 1';
  bannerTimer = 1.5;
  bgImg = await resolveArenaBg(levelIndex);
} else {
  setStatus('Veloria GACHA HD — [Entrée] pour commencer');
}

function updateCombat(dt) {
  if (gamePaused || screen !== Screen.COMBAT) return;

  runTimer += dt;
  if (bannerTimer > 0) bannerTimer -= dt;
  if (bannerTimer <= 0) banner = null;

  player.x = laneRunner.state.x;
  player.lane = laneRunner.state.lane;

  hazard.update(dt, enemies);
  hazardPulse += dt;
  if (hazard.damagesPlayer(laneRunner.laneId())) {
    player.hazardCd = Math.max(0, (player.hazardCd ?? 0) - dt);
    if (player.hazardCd <= 0) {
      player.hp -= hazardScript?.damage_on_active ?? 1;
      player.hazardCd = 0.65;
      combo = 0;
      setStatus('Hazard ! ' + (hazardScript?.label ?? ''));
    }
  } else {
    player.hazardCd = Math.max(0, (player.hazardCd ?? 0) - dt);
  }

  const mods = blessingDraft.modifiers();
  player.attackCd = Math.max(0, player.attackCd - dt);
  autoTimer += dt;
  const atkInterval = 0.5 / mods.atkSpeed;

  if (autoTimer > atkInterval && player.attackCd <= 0) {
    autoTimer = 0;
    player.attackCd = 0.4 / mods.atkSpeed;
    attacks.push({ x: player.x + player.w / 2, y: player.y + player.h * 0.3, r: 48, life: 0.35 });
    let hit = false;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x + enemy.w / 2 - (player.x + player.w / 2);
      const dy = enemy.y + enemy.h / 2 - (player.y + player.h / 2);
      if (Math.hypot(dx, dy) < player.attackRange) {
        hit = true;
        const dmg = Math.round(1 * mods.dmg);
        if (enemy.isBoss) bossPhases.onBossHit(enemy, dmg);
        else {
          enemy.hp -= dmg;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            score += enemy.isBoss ? 500 : 50;
            combo += 1;
          }
        }
      }
    }
    if (!hit) combo = 0;
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.y += enemy.vy * dt;
    if (enemy.y + enemy.h > layout.ground_y - 8) {
      enemy.alive = false;
      player.hp -= enemy.isBoss ? 2 : 1;
      combo = 0;
      setStatus(enemy.isBoss ? 'Le Bourreau a franchi la ligne !' : 'Créature en zone sûre !');
    }
  }

  const next = waveSpawner.advanceIfClear();
  if (next !== null) {
    wave = waveSpawner.currentWaveNumber();
    if (blessingDraft.shouldOffer(wave - 1)) {
      blessingDraft.open(wave - 1);
      gamePaused = true;
      setStatus('Choisissez une bénédiction [1/2/3]');
    } else if (wave >= waveSpawner.totalWaves && enemies.every((e) => !e.alive)) {
      screen = Screen.VICTORY;
      setStatus('Victoire ! [Entrée] Hub');
    } else {
      banner = `Vague ${wave} — ${scene.title ?? ''}`;
      bannerTimer = 2;
      setStatus('Vague ' + wave);
      enemies = waveSpawner.spawnWave();
    }
  }

  if (player.hp <= 0) {
    screen = Screen.GAME_OVER;
    setStatus('Veille rompue — [Entrée] Hub');
  }

  for (let i = attacks.length - 1; i >= 0; i--) {
    attacks[i].life -= dt;
    if (attacks[i].life <= 0) attacks.splice(i, 1);
  }
}

function render() {
  const w = layout.width;
  const h = layout.height;

  if (screen === Screen.HUB) {
    gacha.drawHubScreen({
      title: gdl.meta?.title ?? 'Veloria',
      heroImg,
      bgImg: hubBgImg,
      arenas: gdl.scenes.map((s) => ({ title: s.title ?? s.id })),
    });
    return;
  }

  if (screen === Screen.INVOKE) {
    gacha.drawInvokeScreen(1);
    return;
  }

  if (screen === Screen.VICTORY) {
    gacha.drawFrame({
      bgImg,
      laneMeta: layout.lane_meta,
      groundY: layout.ground_y,
      player,
      heroImg,
      enemies: [],
      attacks: [],
      hud: null,
    });
    gacha.drawVictoryScreen(score, scene.title);
    return;
  }

  if (screen === Screen.GAME_OVER) {
    gacha.drawFrame({
      bgImg,
      laneMeta: layout.lane_meta,
      groundY: layout.ground_y,
      player,
      heroImg,
      enemies,
      attacks,
      hazard,
      hazardPulse,
      hud: null,
    });
    gacha.drawGameOverScreen(score);
    return;
  }

  const mods = blessingDraft?.modifiers?.() ?? { count: 0 };
  const enemyDraw = enemies.map((e) => ({
    ...e,
    spriteImg: e.sprite,
  }));

  gacha.drawFrame({
    bgImg,
    laneMeta: layout.lane_meta,
    groundY: layout.ground_y,
    player,
    heroImg,
    enemies: enemyDraw,
    attacks,
    hazard,
    hazardPulse,
    banner: bannerTimer > 0 ? banner : null,
    blessingPicks: gamePaused && blessingDraft?.active ? blessingDraft.active.picks : null,
    hud: gamePaused && blessingDraft?.active ? null : {
      wave,
      totalWaves: waveSpawner?.totalWaves ?? 12,
      timerSec: runTimer,
      arenaTitle: scene.title ?? scene.id,
      hp: player.hp,
      maxHp: player.maxHp,
      combo,
      ultReady: combo >= 8,
      skills: mods.activeBlessings ?? [],
    },
  });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  if (screen === Screen.COMBAT && player?.hp > 0) updateCombat(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
