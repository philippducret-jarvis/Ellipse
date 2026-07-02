import type { FastifyInstance } from 'fastify';
import type { ServerContext } from './context.js';

export function registerCognitionRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.post<{ Body: { prompt: string; images?: string[] } }>('/api/plan', async (req) => {
    const { prompt, images = [] } = req.body;
    return ctx.master.createPlan(prompt, images);
  });

  app.post<{ Body: { prompt: string; images?: string[] } }>('/api/generate', async (req) => {
    const { prompt, images = [] } = req.body;
    const plan = await ctx.master.createPlan(prompt, images);
    return ctx.master.executePlan(plan, true);
  });
}
