/**
 * Preview Veloria — VeloriaEngine Pixi (hub + combat GACHA HD).
 * Build : pnpm veloria:hd
 */
const statusNode = document.getElementById('status');

function setStatus(msg) {
  if (statusNode) statusNode.textContent = msg;
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + url);
  return r.json();
}

function normalizeAsset(u) {
  if (!u) return u;
  if (u.startsWith('http') || u.startsWith('/workspaces/')) return u;
  return '../../' + u.replace(/^\.?\//, '');
}

const manifest = await fetchJson('./preview-manifest.json').catch(() => ({}));
const gdlUrl = manifest.gdl || '../../05_runtime/gdl/veloria.preview.gdl.json';
const gdl = await fetchJson(gdlUrl);

const res = gdl.meta?.resolution ?? [720, 1280];
const width = res[0] ?? 720;
const height = res[1] ?? 1280;

const canvas = document.getElementById('preview');
let container = document.getElementById('engine-host');
if (!container) {
  container = document.createElement('div');
  container.id = 'engine-host';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.minHeight = `${height}px`;
  if (canvas?.parentElement) canvas.replaceWith(container);
  else document.body.appendChild(container);
}

const playerEntity = gdl.entities?.find((e) => e.id === 'player');
const atlas = gdl.meta?.asset_atlas ?? {};
const heroUrl = normalizeAsset(playerEntity?.assets?.sprite ?? atlas.aureline);
const hubUrl = normalizeAsset(atlas.pavillon_veilles ?? gdl.scenes?.[0]?.background?.image);
const hudUrl = normalizeAsset('03_assets/ui/ui__combat-hud-shell/06_exports/hud_overlay.png');

const { VeloriaEngine } = await import('./engine/ellipse-engine.js');
const engine = new VeloriaEngine();
await engine.init({
  container,
  width,
  height,
  heroSpriteUrl: heroUrl,
  hubBgUrl: hubUrl,
  hudOverlayUrl: hudUrl,
});
await engine.loadGDL(gdl);

const params = new URLSearchParams(location.search);
if (params.get('start') === 'combat') {
  await engine.switchLevel(0);
}

setStatus('VeloriaEngine Pixi — hub · invocation · combat 2.5D · bénédictions.');
window.__veloriaEngine = engine;
