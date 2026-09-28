import { ECHOES_RUNTIME_MODE } from './gdl-assembler.mjs';

export const ECHOES_PREVIEW_MODE = ECHOES_RUNTIME_MODE;

const HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#05070a" />
    <title>Echoes of the Mushroom Realm</title>
    <link rel="stylesheet" href="./preview.css" />
  </head>
  <body>
    <main class="game-shell">
      <div id="engine-host" class="game-frame" role="application" aria-label="Echoes of the Mushroom Realm"></div>
      <p class="status-bar" id="status" role="status">Chargement d’Echoes of the Mushroom Realm…</p>
    </main>
    <script type="module" src="./preview.js"></script>
  </body>
</html>`;

const CSS = `:root { color-scheme: dark; --ink: #05070a; --gold: #c9a66b; }
* { box-sizing: border-box; }
html, body { width: 100%; min-height: 100%; margin: 0; overflow: hidden; background: var(--ink); }
body { min-height: 100dvh; touch-action: none; user-select: none; }
.game-shell {
  width: 100%; min-height: 100dvh; display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 50%, #23172e 0%, #09070d 62%, #05070a 100%);
}
.game-frame {
  position: relative; overflow: hidden; isolation: isolate; aspect-ratio: 16 / 9;
  width: min(100vw, calc(100dvh * 1.7777778), 1600px);
  height: min(100dvh, calc(100vw * .5625), 900px);
  border: 3px solid #382b25; border-radius: 18px;
  background: #09070d url("../../03_assets/faithful/menu_keyart.jpeg") center / cover no-repeat;
  box-shadow: 0 24px 90px rgba(0, 0, 0, .82), 0 0 0 1px rgba(201, 166, 107, .5), 0 0 44px rgba(139, 75, 184, .14);
}
.game-frame::after { position: absolute; z-index: 3; inset: 6px; border: 1px solid rgba(201, 166, 107, .3); border-radius: 12px; content: ''; pointer-events: none; }
.game-frame canvas { display: block; width: 100% !important; height: 100% !important; touch-action: none; }
.status-bar { position: fixed; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 900px), (max-height: 640px) { .game-frame { border: 0; border-radius: 0; box-shadow: none; } .game-frame::after { inset: 3px; border-radius: 5px; } }`;

const JS = `const statusNode = document.getElementById('status');

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(\`${'${response.status}'} — ${'${url}'}\`);
  return response.json();
}

async function boot() {
  const manifest = await fetchJson('./preview-manifest.json');
  const gdl = await fetchJson(manifest.gdl || '../../05_runtime/gdl/echoes.preview.gdl.json');
  const [width = 1280, height = 720] = gdl.meta?.resolution ?? [];
  const container = document.getElementById('engine-host');
  if (!container) throw new Error('Conteneur #engine-host absent.');

  const { EchoesEngine } = await import('./engine/ellipse-engine.js');
  const engine = new EchoesEngine();
  await engine.init({
    container,
    width,
    height,
    assetAtlas: gdl.meta?.asset_atlas ?? {},
    seed: 0x4543484f,
  });
  await engine.loadGDL(gdl);

  setStatus('Echoes prêt. Entrée pour commencer, flèches ou ZQSD pour se déplacer.');
  window.__echoesEngine = engine;
  window.__ECHOES_BUILD__ = {
    mode: manifest.mode,
    generatedAt: manifest.generated_at,
    gdlVersion: gdl.meta?.version,
  };
}

boot().catch((error) => {
  console.error('[Echoes] Échec du démarrage', error);
  setStatus(\`Échec du démarrage : ${'${error.message}'}\`);
  const host = document.getElementById('engine-host');
  if (host) host.innerHTML = \`<div style="display:grid;place-items:center;height:100%;padding:2rem;color:#f0d9a6;background:#05070a;text-align:center">Echoes n’a pas pu charger.<br>${'${String(error.message)}'}</div>\`;
});
`;

export function buildEchoesPreviewFiles() {
  return { html: HTML, css: CSS, js: JS, mode: ECHOES_PREVIEW_MODE };
}
