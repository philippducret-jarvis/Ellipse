import type { FastifyInstance } from 'fastify';

/**
 * Pont vers Jarvis (assistant conversationnel). Le cerveau vit dans `tools/`
 * (keyless, hors build TS) et tourne comme service HTTP autonome
 * (`pnpm forge:assistant`, défaut :4310). L'orchestrateur ne fait que relayer,
 * pour que le Studio parle à une seule origine.
 */
export function registerAssistantRoutes(app: FastifyInstance): void {
  const target = process.env.FORGE_ASSISTANT_URL ?? 'http://localhost:4310';

  app.get('/api/assistant/health', async () => {
    try {
      const r = await fetch(`${target}/health`, { signal: AbortSignal.timeout(3000) });
      return await r.json();
    } catch {
      return { ok: false, brain: null, hint: 'Lance `pnpm forge:assistant` (Jarvis).' };
    }
  });

  app.post('/api/assistant', async (req, reply) => {
    try {
      const r = await fetch(`${target}/assistant`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body ?? {}),
        signal: AbortSignal.timeout(180_000),
      });
      reply.code(r.status);
      return await r.json();
    } catch {
      reply.code(503);
      return { error: 'Jarvis indisponible. Démarre-le avec `pnpm forge:assistant`.' };
    }
  });
}
