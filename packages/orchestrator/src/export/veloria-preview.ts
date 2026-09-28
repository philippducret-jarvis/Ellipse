/**
 * Export du runtime flagship VeloriaEngine. Aucun fallback Forge/Canvas ne doit
 * pouvoir remplacer silencieusement ce livrable.
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
    <meta name="theme-color" content="#07060a" />
    <title>${title}</title>
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
}

const VELORIA_CSS = `:root {
  --bg: #07060a;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body {
  width: 100%;
  margin: 0;
  min-height: 100%;
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
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at 50% 12%, rgba(90, 58, 114, 0.28), transparent 48%), #07060a;
}
.game-frame {
  width: min(100vw, calc(100dvh * 0.5625), 540px);
  height: min(100dvh, calc(100vw * 1.7777778), 960px);
  aspect-ratio: 9 / 16;
  position: relative;
  overflow: hidden;
  background: #09070d;
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(201, 162, 39, 0.35);
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
    box-shadow: none;
  }
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

  const enginePreviewSrc = join(staticDir, 'veloria-engine-preview.js');

  if (!existsSync(enginePreviewSrc)) {
    throw new Error(`Entrée flagship Veloria introuvable : ${enginePreviewSrc}`);
  }

  await writeFile(join(exportDir, 'preview.html'), buildVeloriaHtml(title));
  await writeFile(join(exportDir, 'preview.css'), VELORIA_CSS);

  await copyFile(enginePreviewSrc, join(exportDir, 'preview.js'));
  await tryBuildEngineBundle(exportDir);

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
  return readFile(join(root, 'tools', 'lib', 'veloria', 'static', 'veloria-engine-preview.js'), 'utf-8');
}
