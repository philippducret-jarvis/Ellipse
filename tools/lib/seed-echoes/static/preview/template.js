const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const legend = document.getElementById('legend');
const statusNode = document.getElementById('status');

const palette = {
  platform: 'rgba(244, 229, 191, 0.22)',
  moving: 'rgba(116, 216, 255, 0.25)',
  hazard: 'rgba(203, 72, 94, 0.65)',
  collectible: '#8ce7ff',
  checkpoint: '#b682ff',
  goal: '#ffdf7e',
  zone: 'rgba(181, 123, 216, 0.08)',
};

function setStatus(message) {
  statusNode.textContent = message;
}

async function fetchJsonWithFallback(primary, fallback) {
  try {
    const response = await fetch(primary);
    if (!response.ok) throw new Error('primary fetch failed');
    return await response.json();
  } catch {
    const response = await fetch(fallback);
    if (!response.ok) throw new Error('fallback fetch failed');
    return await response.json();
  }
}

function normalizeWorkspaceAsset(path) {
  if (!path) return path;
  if (path.startsWith('/workspaces/')) {
    return '../../' + path.split('/').slice(4).join('/');
  }
  return path;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawLegend(items) {
  legend.innerHTML = items
    .map((item) => '<div class="legend-item"><span class="legend-chip" style="background:' + item.color + '"></span><span>' + item.label + '</span></div>')
    .join('');
}

const keys = new Set();
window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

const manifest = await fetchJsonWithFallback('./preview-manifest.json', './preview-manifest.json');
const gdl = await fetchJsonWithFallback(manifest.gdl, '../../05_runtime/gdl/echoes.preview.gdl.json');
const scene = gdl.scenes[0];
const layout = scene.layout;
const playerEntity = gdl.entities.find((entity) => entity.id === 'player');

const backgroundImage = await loadImage(normalizeWorkspaceAsset(scene.background?.image));
const playerImage = await loadImage(normalizeWorkspaceAsset(playerEntity?.assets?.sprite));

const player = {
  x: layout.spawn.x,
  y: layout.spawn.y,
  w: 54,
  h: 78,
  vx: 0,
  vy: 0,
  speed: 220,
  jump: 430,
  onGround: false,
};

drawLegend([
  { label: 'Plateformes', color: palette.platform },
  { label: 'Dangers', color: palette.hazard },
  { label: 'Checkpoints', color: palette.checkpoint },
  { label: 'Goal', color: palette.goal },
]);

setStatus('Preview charge. Atteins la porte doree a droite.');

let last = performance.now();

function update(dt) {
  const left = keys.has('arrowleft') || keys.has('a') || keys.has('q');
  const right = keys.has('arrowright') || keys.has('d');
  const wantsJump = keys.has(' ') || keys.has('arrowup') || keys.has('w') || keys.has('z');

  if (left === right) {
    player.vx = 0;
  } else {
    player.vx = left ? -player.speed : player.speed;
  }

  if (wantsJump && player.onGround) {
    player.vy = -player.jump;
    player.onGround = false;
  }

  player.vy += 980 * dt;

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  for (const platform of layout.platforms) {
    if (platform.type !== 'ground' && platform.type !== 'platform' && platform.type !== 'moving') continue;
    const rect = { x: platform.x, y: platform.y, w: platform.w, h: platform.h };
    if (!intersects(player, rect)) continue;
    const previousBottom = player.y - player.vy * dt + player.h;
    if (previousBottom <= rect.y + 8 && player.vy >= 0) {
      player.y = rect.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vx > 0) {
      player.x = rect.x - player.w;
    } else if (player.vx < 0) {
      player.x = rect.x + rect.w;
    }
  }

  for (const hazard of layout.hazards ?? []) {
    if (intersects(player, hazard)) {
      player.x = layout.spawn.x;
      player.y = layout.spawn.y;
      player.vx = 0;
      player.vy = 0;
      setStatus('Les spores t ont renvoye au point de depart.');
    }
  }

  if (scene.spawn) {
    if (player.y > layout.height + 200) {
      player.x = scene.spawn.x;
      player.y = scene.spawn.y;
      player.vx = 0;
      player.vy = 0;
      setStatus('Chute mortelle. Retour au reveil.');
    }
  }

  if (layout.goal && intersects(player, { x: layout.goal.x, y: layout.goal.y, w: 64, h: 96 })) {
    setStatus('Sortie atteinte. Le slice Echoes est valide.');
  }

  player.x = Math.max(0, Math.min(layout.width - player.w, player.x));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#120f18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (backgroundImage) {
    ctx.globalAlpha = scene.background?.alpha ?? 0.62;
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  for (const zone of layout.zones ?? []) {
    ctx.fillStyle = palette.zone;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = 'rgba(245, 229, 191, 0.72)';
    ctx.font = '18px Georgia';
    ctx.fillText(zone.label, zone.x + 12, 30);
  }

  for (const platform of layout.platforms) {
    ctx.fillStyle = platform.type === 'moving' ? palette.moving : palette.platform;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  }

  for (const hazard of layout.hazards ?? []) {
    ctx.fillStyle = palette.hazard;
    ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
  }

  for (const item of layout.collectibles ?? []) {
    ctx.beginPath();
    ctx.fillStyle = palette.collectible;
    ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const checkpoint of layout.checkpoints ?? []) {
    ctx.fillStyle = palette.checkpoint;
    ctx.fillRect(checkpoint.x - 8, checkpoint.y - 44, 16, 44);
    ctx.fillStyle = 'rgba(245, 229, 191, 0.82)';
    ctx.font = '14px Georgia';
    ctx.fillText(checkpoint.label, checkpoint.x + 14, checkpoint.y - 18);
  }

  if (layout.goal) {
    ctx.fillStyle = palette.goal;
    ctx.fillRect(layout.goal.x, layout.goal.y - 72, 18, 72);
    ctx.beginPath();
    ctx.arc(layout.goal.x + 9, layout.goal.y - 82, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  if (playerImage) {
    ctx.drawImage(playerImage, player.x - 10, player.y - 6, player.w + 20, player.h + 10);
  } else {
    ctx.fillStyle = '#d0475c';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
