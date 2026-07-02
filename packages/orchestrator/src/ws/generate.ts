import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../routes/context.js';
import type { ExecuteProgressEvent } from '../master-ai.js';

export function registerWebSocketRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket) => {
      socket.on('message', async (raw: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            prompt?: string;
            images?: string[];
          };
          if (msg.type === 'generate' && msg.prompt) {
            const send = (payload: unknown) => socket.send(JSON.stringify(payload));
            send({ type: 'status', message: 'Planification Ellipse Cortex…' });
            const plan = await ctx.master.createPlan(msg.prompt, msg.images ?? []);
            send({ type: 'plan', data: plan });
            send({ type: 'status', message: 'Pipeline photo + agents…' });
            const session = await ctx.master.executePlan(plan, true, (event: ExecuteProgressEvent) => {
              if (event.type === 'status') send({ type: 'status', message: event.message });
              if (event.type === 'task_start') send({ type: 'task_start', data: event.task });
              if (event.type === 'task_complete') send({ type: 'task_complete', data: event.result });
            });
            send({ type: 'complete', data: session });
          }
        } catch (err) {
          socket.send(
            JSON.stringify({
              type: 'error',
              message: err instanceof Error ? err.message : 'Erreur inconnue',
            }),
          );
        }
      });
    });
  });
}
