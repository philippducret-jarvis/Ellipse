import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_TITLE } from './constants.mjs';

export async function buildVeloriaPreviewFiles() {
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${PROJECT_TITLE} — Preview GACHA</title>
    <link rel="stylesheet" href="./preview.css" />
  </head>
  <body>
    <main class="gacha-shell">
      <div class="phone-frame">
        <canvas id="preview" width="720" height="1280" aria-label="Veloria GACHA HD"></canvas>
      </div>
      <p class="status-bar" id="status">Chargement…</p>
    </main>
    <script type="module" src="./preview.js"></script>
  </body>
</html>`;

  const css = `:root {
  --bg: #07060a;
  --gold: #c9a227;
  --text: #f0e1ba;
  --muted: #9a8a72;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 0%, rgba(90, 58, 114, 0.35), transparent 55%), var(--bg);
  color: var(--text);
  font-family: Georgia, "Times New Roman", serif;
}
.gacha-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  gap: 10px;
}
.phone-frame {
  width: min(100vw - 24px, 360px);
  aspect-ratio: 720 / 1280;
  border-radius: 20px;
  padding: 3px;
  background: linear-gradient(145deg, rgba(201, 162, 39, 0.55), rgba(90, 58, 114, 0.45));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(201, 162, 39, 0.2);
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 17px;
  background: #0a0810;
}
.status-bar {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
  text-align: center;
  max-width: 360px;
  line-height: 1.4;
}`;

  const staticDir = join(process.cwd(), 'tools', 'lib', 'veloria', 'static');
  const js = await readFile(join(staticDir, 'gacha-preview.js'), 'utf8');
  const rendererJs = await readFile(join(staticDir, 'gacha-renderer.js'), 'utf8');
  const systemsJs = await readFile(join(staticDir, 'veloria-systems.js'), 'utf8');

  return { html, css, js, rendererJs, systemsJs };
}
