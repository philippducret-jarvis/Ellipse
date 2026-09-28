/**
 * Entrée web unique de Veloria. Le rendu, les écrans et la simulation viennent
 * tous de @ellipse/engine afin que Studio, export et workspace restent identiques.
 */
const statusNode = document.getElementById('status');

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} — ${url}`);
  return response.json();
}

function normalizeAsset(url) {
  if (!url) return url;
  if (/^(?:https?:|data:|blob:)/.test(url) || url.startsWith('/workspaces/')) return url;
  if (url.startsWith('./') || url.startsWith('../')) return url;
  return `../../${url.replace(/^\//, '')}`;
}

function firstSceneImage(scene) {
  return scene?.background?.layers?.[0]?.image ?? scene?.background?.image;
}

async function boot() {
  const manifest = await fetchJson('./preview-manifest.json');
  const gdlUrl = manifest.gdl || '../../05_runtime/gdl/veloria.preview.gdl.json';
  const gdl = await fetchJson(gdlUrl);
  const [width = 720, height = 1280] = gdl.meta?.resolution ?? [];

  const container = document.getElementById('engine-host');
  if (!container) throw new Error('Conteneur #engine-host absent.');

  const player = gdl.entities?.find((entity) => entity.id === 'player');
  const atlas = gdl.meta?.asset_atlas ?? {};
  const heroUrl = normalizeAsset(player?.assets?.sprite ?? atlas.aureline);
  const hubUrl = normalizeAsset(atlas.pavillon_veilles ?? firstSceneImage(gdl.scenes?.[0]));

  const { VeloriaEngine } = await import('./engine/ellipse-engine.js');
  const engine = new VeloriaEngine();
  await engine.init({ container, width, height, heroSpriteUrl: heroUrl, hubBgUrl: hubUrl });
  await engine.loadGDL(gdl);

  if (new URLSearchParams(location.search).get('start') === 'combat') {
    await engine.switchLevel(0);
  }

  setStatus('Veloria prête. Glissez pour changer de voie, touchez les compétences pour combattre.');
  window.__veloriaEngine = engine;
  window.__VELORIA_BUILD__ = {
    mode: manifest.mode,
    generatedAt: manifest.generated_at,
    gdlVersion: gdl.meta?.version,
  };
}

boot().catch((error) => {
  console.error('[Veloria] Échec du démarrage', error);
  setStatus(`Échec du démarrage : ${error.message}`);
  const host = document.getElementById('engine-host');
  if (host) {
    host.innerHTML = `<div style="display:grid;place-items:center;height:100%;padding:2rem;color:#f0d9a6;background:#07060a;text-align:center">Veloria n’a pas pu charger.<br>${String(error.message)}</div>`;
  }
});
