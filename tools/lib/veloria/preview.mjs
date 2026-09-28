import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_TITLE } from './constants.mjs';

export const VELORIA_PREVIEW_MODE = 'veloria_engine_pixi';

const HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#07060a" />
    <title>${PROJECT_TITLE}</title>
    <link rel="stylesheet" href="./preview.css" />
  </head>
  <body>
    <main class="game-shell">
      <div id="engine-host" class="game-frame" role="application" aria-label="Veloria — La Veille des Lames"></div>
      <p class="status-bar" id="status" role="status">Chargement de Veloria…</p>
    </main>
    <script type="module" src="./preview.js"></script>
  </body>
</html>`;

const CSS = `:root {
  color-scheme: dark;
  --bg: #07060a;
  --gold: #c9a227;
  --muted: #a89982;
}
* { box-sizing: border-box; }
html, body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  overflow: hidden;
  background: #07060a;
}
body {
  min-height: 100dvh;
  font-family: Georgia, "Times New Roman", serif;
  touch-action: none;
  user-select: none;
}
.game-shell {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(ellipse at 50% 12%, rgba(90, 58, 114, 0.28), transparent 48%),
    #07060a;
}
.game-frame {
  width: min(100vw, calc(100dvh * 0.5625), 540px);
  height: min(100dvh, calc(100vw * 1.7777778), 960px);
  aspect-ratio: 9 / 16;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border: 4px solid #3b3027;
  border-radius: 28px;
  background: #09070d;
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(201, 162, 39, 0.6), inset 0 0 0 2px rgba(240, 217, 166, 0.18);
}
.game-frame::after {
  position: absolute;
  z-index: 3;
  inset: 5px;
  border: 1px solid rgba(240, 217, 166, 0.36);
  border-radius: 21px;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.25);
  content: '';
  pointer-events: none;
}
.game-frame canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}
.status-bar {
  position: fixed;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 600px), (max-height: 900px) {
  .game-frame {
    width: min(100vw, calc(100dvh * 0.5625));
    height: min(100dvh, calc(100vw * 1.7777778));
    border-width: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .game-frame::after { inset: 3px; border-radius: 6px; }
}`;

/**
 * Source unique de la preview flagship. Les anciens fichiers Canvas restent
 * disponibles pour les diagnostics, mais ne sont plus copiés dans le livrable.
 */
export async function buildVeloriaPreviewFiles() {
  const staticDir = join(process.cwd(), 'tools', 'lib', 'veloria', 'static');
  const js = await readFile(join(staticDir, 'veloria-engine-preview.js'), 'utf8');
  return { html: HTML, css: CSS, js, mode: VELORIA_PREVIEW_MODE };
}
