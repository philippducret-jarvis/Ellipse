import type { FastifyInstance } from 'fastify';
import { getSession, getTaskResults, listSessions } from '@ellipse/db';

export function registerSessionRoutes(app: FastifyInstance): void {
  app.get('/api/sessions', async () => {
    const sessions = await listSessions();
    return { sessions };
  });

  app.get('/api/observability', async () => {
    const sessions = await listSessions(40);
    const agentStats: Record<string, { success: number; failed: number; partial: number }> = {};
    let sessionsCompleted = 0;
    let sessionsFailed = 0;
    let taskTotal = 0;
    let taskFailed = 0;

    for (const s of sessions) {
      if (s.status === 'completed') sessionsCompleted += 1;
      if (s.status === 'failed') sessionsFailed += 1;
      const results = await getTaskResults(s.id);
      taskTotal += results.length;
      for (const r of results) {
        agentStats[r.agent] ??= { success: 0, failed: 0, partial: 0 };
        const bucket = agentStats[r.agent]!;
        if (r.status === 'success') bucket.success += 1;
        else if (r.status === 'partial') bucket.partial += 1;
        else {
          bucket.failed += 1;
          taskFailed += 1;
        }
      }
    }

    return {
      sessions_total: sessions.length,
      sessions_completed: sessionsCompleted,
      sessions_failed: sessionsFailed,
      tasks_total: taskTotal,
      tasks_failed: taskFailed,
      agent_stats: agentStats,
      recent_sessions: sessions.slice(0, 12),
    };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: 'Session introuvable' });
    return session;
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/results', async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: 'Session introuvable' });
    const results = await getTaskResults(req.params.id);
    return { session_id: req.params.id, results };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/gdl', async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session?.gdl) return reply.status(404).send({ error: 'GDL introuvable' });
    reply.header('Content-Type', 'application/json');
    return session.gdl;
  });
}
