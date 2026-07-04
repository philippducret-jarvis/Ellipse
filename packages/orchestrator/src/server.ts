import { mkdir } from 'node:fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { loadEnv } from '@ellipse/shared/load-env';
import { GameFactoryService } from './game-factory.js';
import { MasterAI } from './master-ai.js';
import { findProjectRoot, getGameWorkspacesDir, getGeneratedDir, getUploadDir } from './project-paths.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerCognitionRoutes } from './routes/cognition.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerAssetStageRoutes } from './routes/asset-stages.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerExportRoutes } from './routes/export.js';
import { registerWorkflowRoutes } from './routes/workflows.js';
import { registerWorkOrderRoutes } from './routes/work-orders.js';
import { registerAssistantRoutes } from './routes/assistant.js';
import { registerWebSocketRoutes } from './ws/generate.js';
import type { ServerContext } from './routes/context.js';

loadEnv();

const ROOT = findProjectRoot();

export async function createServer() {
  const app = Fastify({ logger: true });
  const ctx: ServerContext = {
    root: ROOT,
    uploadDir: getUploadDir(ROOT),
    generatedDir: getGeneratedDir(ROOT),
    workspacesDir: getGameWorkspacesDir(ROOT),
    master: new MasterAI(),
    factory: new GameFactoryService(getGameWorkspacesDir(ROOT)),
  };

  await mkdir(ctx.uploadDir, { recursive: true });
  await mkdir(ctx.generatedDir, { recursive: true });
  await mkdir(ctx.workspacesDir, { recursive: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(websocket);

  await app.register(fastifyStatic, { root: ctx.uploadDir, prefix: '/uploads/', decorateReply: false });
  await app.register(fastifyStatic, { root: ctx.generatedDir, prefix: '/generated/', decorateReply: false });
  await app.register(fastifyStatic, { root: ctx.workspacesDir, prefix: '/workspaces/', decorateReply: false });

  await registerHealthRoutes(app);
  registerCognitionRoutes(app, ctx);
  registerSessionRoutes(app);
  registerProjectRoutes(app, ctx);
  registerAssetStageRoutes(app);
  registerUploadRoutes(app, ctx);
  registerExportRoutes(app, ctx);
  registerWorkflowRoutes(app, ctx);
  registerWorkOrderRoutes(app, ctx);
  registerAssistantRoutes(app);
  registerWebSocketRoutes(app, ctx);

  return app;
}

async function main() {
  const port = Number(process.env.ORCHESTRATOR_PORT ?? 4400);
  const app = await createServer();
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Ellipse Orchestrator → http://localhost:${port}`);
}

main().catch(console.error);
