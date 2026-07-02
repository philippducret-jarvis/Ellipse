/**
 * Preview Veloria complète (veloria-systems.js + preview.js statiques).
 * Utilisée pour le jeu livrable flagship — pas la preview générique simplifiée.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FLAGSHIP_GAME, FLAGSHIP_PATHS } from '@ellipse/shared';
import { findProjectRoot } from '../project-paths.js';
import type { PreviewBuildResult } from './preview-builder.js';

async function tryBuildEngineBundle(exportDir: string): Promise<void> {
  const root = findProjectRoot();
  const script = join(root, 'tools', 'lib', 'engine-preview', 'build-browser-bundle.mjs');
  if (!existsSync(script)) return;
  const { buildEngineBrowserBundle } = await import(script);
  await buildEngineBrowserBundle(exportDir);
}
const VELORIA_TITLE = FLAGSHIP_GAME.title;

function buildVeloriaHtml(title: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title} — Preview GACHA</title>
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
}

const VELORIA_CSS = `:root {
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

export async function buildVeloriaPreviewBundle(
  workspaceRoot: string,
  slug: string,
  title: string = VELORIA_TITLE,
): Promise<PreviewBuildResult> {
  const root = findProjectRoot();
  const staticDir = join(root, 'tools', 'lib', 'veloria', 'static');
  const exportDir = join(workspaceRoot, '07_exports', 'web');
  await mkdir(exportDir, { recursive: true });

  const previewJsSrc = join(staticDir, 'gacha-preview.js');
  const rendererJsSrc = join(staticDir, 'gacha-renderer.js');
  const systemsJsSrc = join(staticDir, 'veloria-systems.js');
  const enginePreviewSrc = join(staticDir, 'veloria-engine-preview.js');

  if (!existsSync(previewJsSrc) && !existsSync(enginePreviewSrc)) {
    throw new Error(`Preview Veloria introuvable dans ${staticDir}`);
  }

  await writeFile(join(exportDir, 'preview.html'), buildVeloriaHtml(title));
  await writeFile(join(exportDir, 'preview.css'), VELORIA_CSS);

  if (existsSync(enginePreviewSrc)) {
    await copyFile(enginePreviewSrc, join(exportDir, 'preview.js'));
    await tryBuildEngineBundle(exportDir);
  } else if (existsSync(previewJsSrc)) {
    await copyFile(previewJsSrc, join(exportDir, 'preview.js'));
  }
  if (existsSync(rendererJsSrc)) {
    await copyFile(rendererJsSrc, join(exportDir, 'gacha-renderer.js'));
  }
  if (existsSync(systemsJsSrc)) {
    await copyFile(systemsJsSrc, join(exportDir, 'veloria-systems.js'));
  }

  await writeFile(
    join(exportDir, 'preview-manifest.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        title,
        slug,
        mode: 'veloria_engine_pixi',
        flagship: true,
        gdl: '../../05_runtime/gdl/veloria.preview.gdl.json',
        preview_url: FLAGSHIP_PATHS.previewUrl,
      },
      null,
      2,
    ),
  );

  return {
    exportDir,
    previewHtml: join(exportDir, 'preview.html'),
    previewUrl: `/workspaces/${slug}/07_exports/web/preview.html`,
    mode: 'survivors',
  };
}

/** Copie la preview existante du workspace si déjà buildée par veloria:build. */
export async function ensureVeloriaPreviewFromWorkspace(workspaceRoot: string, slug: string): Promise<boolean> {
  const existing = join(workspaceRoot, '07_exports', 'web', 'preview.html');
  if (existsSync(existing)) return true;
  await buildVeloriaPreviewBundle(workspaceRoot, slug);
  return true;
}

export async function readVeloriaStaticPreviewJs(): Promise<string> {
  const root = findProjectRoot();
  return readFile(join(root, 'tools', 'lib', 'veloria', 'static', 'gacha-preview.js'), 'utf-8');
}
