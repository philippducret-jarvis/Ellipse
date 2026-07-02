import Fastify from 'fastify';
import cors from '@fastify/cors';
import proxy from '@fastify/http-proxy';
import { loadEnv } from '@ellipse/shared/load-env';

loadEnv();

const ORCHESTRATOR = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4400';
const STUDIO = process.env.STUDIO_URL ?? 'http://localhost:4273';

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'ellipse-gateway',
    upstream: { orchestrator: ORCHESTRATOR, studio: STUDIO },
  }));

  await app.register(proxy, {
    upstream: ORCHESTRATOR,
    prefix: '/api',
    rewritePrefix: '/api',
  });

  await app.register(proxy, {
    upstream: ORCHESTRATOR,
    prefix: '/ws',
    rewritePrefix: '/ws',
    websocket: true,
  });

  await app.register(proxy, {
    upstream: ORCHESTRATOR,
    prefix: '/uploads',
    rewritePrefix: '/uploads',
  });

  await app.register(proxy, {
    upstream: ORCHESTRATOR,
    prefix: '/generated',
    rewritePrefix: '/generated',
  });

  await app.register(proxy, {
    upstream: ORCHESTRATOR,
    prefix: '/workspaces',
    rewritePrefix: '/workspaces',
  });

  await app.register(proxy, {
    upstream: STUDIO,
    prefix: '/',
    rewritePrefix: '/',
  });

  const port = Number(process.env.GATEWAY_PORT ?? 4480);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Ellipse Gateway → http://localhost:${port}`);
}

main().catch(console.error);
