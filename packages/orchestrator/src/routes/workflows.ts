import type { FastifyInstance } from 'fastify';
import { getDurableWorkflowCatalog } from '../durable-workflows.js';
import type { ServerContext } from './context.js';
import {
  advanceAutonomousWorkflow,
  assessAutonomousWorkflowForProject,
  loadAutonomousRun,
} from '../autonomous-workflow-runner.js';
import { resolveWorkspaceRoot } from '../workspace-browser.js';

export function registerWorkflowRoutes(app: FastifyInstance, ctx?: ServerContext): void {
  app.get('/api/workflows/catalog', async () => ({
    workflows: getDurableWorkflowCatalog(),
  }));

  if (!ctx) return;

  /** État du workflow autonome (scores + actions proposées). */
  app.get<{ Params: { id: string }; Querystring: { runId?: string } }>(
    '/api/projects/:id/workflow/autonomous',
    async (req, reply) => {
      try {
        const run = await assessAutonomousWorkflowForProject(ctx, req.params.id, req.query.runId);
        return { run };
      } catch (e) {
        return reply.status(404).send({ error: e instanceof Error ? e.message : 'Erreur' });
      }
    },
  );

  /** Lance ou avance le workflow (1+ steps avec retry). */
  app.post<{
    Params: { id: string };
    Body: { runId?: string; maxSteps?: number; actionId?: string };
  }>('/api/projects/:id/workflow/autonomous/run', async (req, reply) => {
    try {
      const run = await advanceAutonomousWorkflow(ctx, req.params.id, req.body?.runId, {
        maxSteps: req.body?.maxSteps ?? 3,
        actionId: req.body?.actionId,
      });
      return { run };
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : 'Workflow échoué' });
    }
  });

  /** Exécute une action proposée sur l'étape courante. */
  app.post<{
    Params: { id: string };
    Body: { runId: string; actionId: string };
  }>('/api/projects/:id/workflow/autonomous/action', async (req, reply) => {
    try {
      const run = await advanceAutonomousWorkflow(ctx, req.params.id, req.body.runId, {
        maxSteps: 1,
        actionId: req.body.actionId,
      });
      return { run };
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : 'Action échouée' });
    }
  });

  /** Reprend un run existant. */
  app.post<{ Params: { id: string }; Body: { runId: string; maxSteps?: number } }>(
    '/api/projects/:id/workflow/autonomous/resume',
    async (req, reply) => {
      const snap = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snap) return reply.status(404).send({ error: 'Projet introuvable' });
      const root = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
      const existing = await loadAutonomousRun(root, req.body.runId);
      if (!existing) return reply.status(404).send({ error: 'Run introuvable' });
      try {
        const run = await advanceAutonomousWorkflow(ctx, req.params.id, req.body.runId, {
          maxSteps: req.body.maxSteps ?? 5,
        });
        return { run };
      } catch (e) {
        return reply.status(422).send({ error: e instanceof Error ? e.message : 'Reprise échouée' });
      }
    },
  );
}
