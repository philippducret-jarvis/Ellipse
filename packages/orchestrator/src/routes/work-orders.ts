import type { FastifyInstance } from 'fastify';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { ServerContext } from './context.js';
import { resolveWorkspaceRoot } from '../workspace-browser.js';
import { indexWorkspaceKnowledge, searchKnowledgeIndex } from '../knowledge/workspace-indexer.js';
import { appendTelemetryEvent } from '../qa/export-gate.js';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ALLOWED_SCRIPTS: Record<string, string> = {
  'veloria:sprint-b': 'run-veloria-sprint-b.mjs',
  'veloria:sprints-cde': 'run-veloria-sprints-cde.mjs',
  'veloria:all': 'build-veloria-pipeline.mjs',
  'veloria:refine-all': 'run-veloria-refine-all.mjs',
  'veloria:refine-failed': 'run-veloria-refine-failed.mjs',
  'veloria:shipping-pass': 'run-veloria-shipping-pass.mjs',
  'veloria:prep': 'build-veloria-prep-pack.mjs',
  'agents:communication-test': 'run-agent-communication-tests.mjs',
  'veloria:build': 'build-veloria-game.mjs',
  'studio:capability-manifest': 'sync-studio-capability-manifest.mjs',
  'roadmap:t0-t3': 'run-roadmap-t0-t3.mjs',
};

function runNodeScript(root: string, scriptFile: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const scriptPath = join(root, 'tools', scriptFile);
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export function registerWorkOrderRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.post<{ Params: { id: string }; Body: { script: string; work_order_id?: string } }>(
    '/api/projects/:id/work-orders/run',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });

      const scriptKey = req.body?.script;
      const scriptFile = ALLOWED_SCRIPTS[scriptKey];
      if (!scriptFile) {
        return reply.status(400).send({ error: 'Script inconnu', allowed: Object.keys(ALLOWED_SCRIPTS) });
      }

      const slug = snapshot.project.slug;
      const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, slug);
      const started = Date.now();

      const result = await runNodeScript(ctx.root, scriptFile);
      await appendTelemetryEvent(workspaceRoot, {
        type: 'work_order_run',
        script: scriptKey,
        work_order_id: req.body.work_order_id ?? null,
        exit_code: result.code,
        duration_ms: Date.now() - started,
      });

      if (result.code !== 0) {
        return reply.status(500).send({
          error: 'Ordre de travail échoué',
          script: scriptKey,
          stderr: result.stderr.slice(-4000),
          stdout: result.stdout.slice(-4000),
        });
      }

      return {
        ok: true,
        script: scriptKey,
        duration_ms: Date.now() - started,
        stdout_tail: result.stdout.slice(-2000),
      };
    },
  );

  app.post<{ Params: { id: string } }>('/api/projects/:id/knowledge/index', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snapshot.project.slug);
    const index = await indexWorkspaceKnowledge(workspaceRoot, snapshot.project.slug);
    return { index: { chunk_count: index.chunk_count, indexed_at: index.indexed_at } };
  });

  app.get<{ Params: { id: string }; Querystring: { q?: string; limit?: string } }>(
    '/api/projects/:id/knowledge/search',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
      const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, snapshot.project.slug);
      const indexPath = join(workspaceRoot, '08_ops', 'knowledge', 'index.json');
      if (!existsSync(indexPath)) {
        return reply.status(404).send({ error: 'Index absent — POST /knowledge/index d’abord' });
      }
      const raw = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(raw) as Awaited<ReturnType<typeof indexWorkspaceKnowledge>>;
      const q = req.query.q ?? '';
      const limit = Math.min(50, Number(req.query.limit ?? 12) || 12);
      return { results: searchKnowledgeIndex(index, q, limit) };
    },
  );
}
