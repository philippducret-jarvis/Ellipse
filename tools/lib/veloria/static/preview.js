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
const statsNode = document.getElementById('stats');

const palette = {
  lane: 'rgba(201, 162, 39, 0.08)',
  laneLine: 'rgba(201, 162, 39, 0.22)',
  player: '#c9a227',
  enemy: '#9e4f5c',
  attack: 'rgba(94, 199, 239, 0.55)',
  boss: '#702030',
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
  statusNode.textContent = msg;
}

function stat(label, value) {
  return '<span class="stat-chip"><strong>' + label + '</strong> ' + value + '</span>';
}

const manifest = await fetchJson('./preview-manifest.json');
const gdl = await fetchJson(manifest.gdl);

let levelIndex = 0;
let scene = gdl.scenes[levelIndex];
let layout = scene.layout;
let veloria = scene.veloria;

const playerEntity = gdl.entities.find((e) => e.id === 'player');
const assetAtlas = await loadAssetAtlas(gdl);
const heroImg = await loadImage(normalizeAsset(playerEntity?.assets?.sprite));
let bgImg = await loadImage(normalizeAsset(scene.background?.image));

const laneRunner = createLaneRunner(layout.lane_meta, layout.spawn);
const player = { ...laneRunner.state, hp: 3, attackCd: 0, attackRange: 220 };
let waveSpawner = createWaveSpawner(veloria.encounters, layout, assetAtlas, layout.lane_meta);
let blessingDraft = createBlessingDraft(veloria.blessings ?? [], waveSpawner.blessingBreaks);
let hazardScript = gdl.meta?.hazard_scripts?.[scene.id] ?? gdl.meta?.hazard_scripts?.default;
let hazard = createHazardScheduler(hazardScript, layout.lane_meta, layout);
const bossPhases = createBossPhases();

let enemies = waveSpawner.spawnWave();
let wave = waveSpawner.currentWaveNumber();
let score = 0;
let gamePaused = false;
let hazardPulse = 0;
let autoTimer = 0;
const attacks = [];
const keys = new Set();

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) e.preventDefault();
  if (gamePaused && blessingDraft.active) {
    if (k === '1' && blessingDraft.active.picks[0]) pickBlessing(blessingDraft.active.picks[0].id);
    if (k === '2' && blessingDraft.active.picks[1]) pickBlessing(blessingDraft.active.picks[1].id);
    if (k === '3' && blessingDraft.active.picks[2]) pickBlessing(blessingDraft.active.picks[2].id);
  }
  if (k >= '1' && k <= '6' && !gamePaused) switchLevel(parseInt(k, 10) - 1);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function pickBlessing(id) {
  const b = blessingDraft.choose(id);
  gamePaused = false;
  setStatus('Bénédiction : ' + (b?.label ?? id));
  waveSpawner.spawnWave();
}

async function switchLevel(idx) {
  if (!gdl.scenes[idx]) return;
  levelIndex = idx;
  scene = gdl.scenes[levelIndex];
  layout = scene.layout;
  veloria = scene.veloria;
  bgImg = await loadImage(normalizeAsset(scene.background?.image));
  waveSpawner = createWaveSpawner(veloria.encounters, layout, assetAtlas, layout.lane_meta);
  blessingDraft = createBlessingDraft(veloria.blessings ?? [], waveSpawner.blessingBreaks);
  hazardScript = gdl.meta?.hazard_scripts?.[scene.id] ?? gdl.meta?.hazard_scripts?.default;
  hazard = createHazardScheduler(hazardScript, layout.lane_meta, layout);
  laneRunner.state.x = layout.spawn.x;
  laneRunner.state.y = layout.spawn.y;
  player.x = layout.spawn.x;
  player.y = layout.spawn.y;
  enemies = waveSpawner.spawnWave();
  wave = waveSpawner.currentWaveNumber();
  player.hp = 3;
  gamePaused = false;
  setStatus('Arène : ' + (scene.title ?? scene.id));
}

function updateStats() {
  const mods = blessingDraft.modifiers();
  statsNode.innerHTML = [
    stat('Arène', levelIndex + 1 + '/6'),
    stat('Vague', wave + '/' + waveSpawner.totalWaves),
    stat('Score', score),
    stat('PV', player.hp),
    stat('Bén.', mods.count),
    stat('Voie', layout.lane_meta?.lanes?.[player.lane]?.label ?? ''),
  ].join('');
}

setStatus('Veloria — 3 voies, vagues 1-12, bénédictions aux vagues 3/6/9. Touches 1-6 : changer d arène.');
updateStats();

function update(dt) {
  if (gamePaused) return;

  if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) laneRunner.snap(-1);
  if (keys.has('arrowright') || keys.has('d')) laneRunner.snap(1);
  player.x = laneRunner.state.x;
  player.lane = laneRunner.state.lane;

  hazard.update(dt, enemies);
  hazardPulse += dt;
  if (hazard.damagesPlayer(laneRunner.laneId())) {
    player.hp -= hazardScript?.damage_on_active ?? 1;
    setStatus('Hazard ! ' + (hazardScript?.label ?? ''));
  }

  const mods = blessingDraft.modifiers();
  player.attackCd = Math.max(0, player.attackCd - dt);
  autoTimer += dt;
  const atkInterval = 0.55 / mods.atkSpeed;

  if (autoTimer > atkInterval && player.attackCd <= 0) {
    autoTimer = 0;
    player.attackCd = 0.45 / mods.atkSpeed;
    attacks.push({ x: player.x + player.w / 2, y: player.y - 8, r: 8, life: 0.35 });
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x + enemy.w / 2 - (player.x + player.w / 2);
      const dy = enemy.y + enemy.h / 2 - (player.y + player.h / 2);
      if (Math.hypot(dx, dy) < player.attackRange) {
        const dmg = Math.round(1 * mods.dmg);
        if (enemy.isBoss) bossPhases.onBossHit(enemy, dmg);
        else {
          enemy.hp -= dmg;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            score += enemy.isBoss ? 500 : 50;
          }
        }
      }
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.y += enemy.vy * dt;
    if (enemy.y + enemy.h > layout.ground_y - 8) {
      enemy.alive = false;
      player.hp -= enemy.isBoss ? 2 : 1;
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
      setStatus('Run terminée — victoire ! Touche 1-6 pour une autre arène.');
    } else {
      setStatus('Vague ' + wave);
      enemies = waveSpawner.spawnWave();
    }
  }

  if (player.hp <= 0) setStatus('Veille rompue — rechargez ou changez d arène (1-6).');

  for (let i = attacks.length - 1; i >= 0; i--) {
    attacks[i].life -= dt;
    attacks[i].r += 180 * dt;
    if (attacks[i].life <= 0) attacks.splice(i, 1);
  }
  updateStats();
}

function drawSprite(img, x, y, w, h, fallback) {
  if (img) ctx.drawImage(img, x, y, w, h);
  else {
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, w, h);
  }
}

function render() {
  const w = layout.width;
  const h = layout.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#120f18';
  ctx.fillRect(0, 0, w, h);

  if (bgImg) {
    ctx.globalAlpha = scene.background?.alpha ?? 0.72;
    ctx.drawImage(bgImg, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  for (const zone of layout.zones ?? []) {
    ctx.fillStyle = palette.lane;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  }
  for (const lane of layout.lane_meta?.lanes ?? []) {
    ctx.strokeStyle = palette.laneLine;
    ctx.beginPath();
    ctx.moveTo(lane.center_x, 120);
    ctx.lineTo(lane.center_x, layout.ground_y);
    ctx.stroke();
  }

  hazard.render(ctx, layout, hazardPulse);

  for (const atk of attacks) {
    ctx.strokeStyle = palette.attack;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(atk.x, atk.y, atk.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    drawSprite(enemy.sprite, enemy.x, enemy.y, enemy.w, enemy.h, enemy.isBoss ? palette.boss : palette.enemy);
    if (enemy.isBoss) {
      ctx.fillStyle = 'rgba(240,217,166,0.9)';
      ctx.font = '11px Georgia';
      ctx.fillText('P' + enemy.phase, enemy.x, enemy.y - 4);
    }
  }

  drawSprite(heroImg, player.x - 6, player.y - 10, player.w + 12, player.h + 14, palette.player);

  if (blessingDraft.active) {
    ctx.fillStyle = 'rgba(7, 6, 10, 0.82)';
    ctx.fillRect(0, h * 0.38, w, h * 0.28);
    ctx.fillStyle = '#c9a227';
    ctx.font = '16px Georgia';
    ctx.fillText('Bénédiction — [1] [2] [3]', 24, h * 0.42);
    blessingDraft.active.picks.forEach((b, i) => {
      ctx.fillStyle = '#f0d9a6';
      ctx.font = '13px Georgia';
      ctx.fillText('[' + (i + 1) + '] ' + b.label + ' — ' + b.rarity, 32, h * 0.46 + i * 28);
    });
  }

  ctx.fillStyle = 'rgba(240, 225, 186, 0.9)';
  ctx.font = '14px Georgia';
  ctx.fillText(scene.title ?? 'Veloria', 16, 28);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  if (player.hp > 0) update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
