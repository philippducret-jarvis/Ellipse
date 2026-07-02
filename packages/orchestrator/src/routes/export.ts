import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { getSession } from '@ellipse/db';
import type { ServerContext } from './context.js';

export function registerExportRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.get<{ Params: { id: string } }>('/api/sessions/:id/export', async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: 'Session introuvable' });

    const sessionAssetDir = join(ctx.generatedDir, req.params.id);
    const gdl = session.gdl ? JSON.stringify(session.gdl, null, 2) : '{}';
    const title = (session.gdl as { meta?: { title?: string } } | null)?.meta?.title ?? 'Ellipse Game';

    const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    canvas { display: block; max-width: 100vw; max-height: 100vh; }
  </style>
</head>
<body>
  <div id="game"></div>
  <script type="module">
    import { EllipseEngine } from './engine.js';
    const gdl = ${gdl};
    const engine = new EllipseEngine();
    await engine.init({ container: document.getElementById('game') });
    await engine.loadGDL(gdl);
  </script>
</body>
</html>`;

    const bundle: Record<string, string> = { 'index.html': indexHtml, 'gdl.json': gdl };

    if (existsSync(sessionAssetDir)) {
      const collectFiles = async (dir: string, prefix: string): Promise<void> => {
        try {
          const entries = await readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            const bundlePath = `${prefix}/${entry.name}`;
            if (entry.isDirectory()) {
              await collectFiles(fullPath, bundlePath);
            } else {
              const s = await stat(fullPath);
              if (s.size < 4 * 1024 * 1024) {
                const buf = await readFile(fullPath);
                bundle[bundlePath] = buf.toString('base64');
              }
            }
          }
        } catch {
          /* ignore */
        }
      };
      await collectFiles(sessionAssetDir, 'assets');
    }

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="ellipse-game-${req.params.id.slice(0, 8)}.json"`);
    return bundle;
  });
}
