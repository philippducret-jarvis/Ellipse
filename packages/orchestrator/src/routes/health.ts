import type { FastifyInstance } from 'fastify';
import { checkDatabaseConnection } from '@ellipse/db';
import { isBusAvailable } from '@ellipse/bus';
import { isComfyUIAvailable } from '@ellipse/pipeline';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const [db, bus, comfy] = await Promise.all([
      checkDatabaseConnection(),
      isBusAvailable(),
      isComfyUIAvailable(),
    ]);
    return {
      status: 'ok',
      service: 'ellipse-orchestrator',
      checks: { database: db ? 'up' : 'down', bus: bus ? 'up' : 'down', comfyui: comfy ? 'up' : 'off' },
    };
  });
}
