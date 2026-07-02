import type { FastifyInstance } from 'fastify';
import type { GameFactoryService } from '../game-factory.js';
import type { MasterAI } from '../master-ai.js';

export interface ServerContext {
  root: string;
  uploadDir: string;
  generatedDir: string;
  workspacesDir: string;
  master: MasterAI;
  factory: GameFactoryService;
}

export type RouteRegistrar = (app: FastifyInstance, ctx: ServerContext) => Promise<void> | void;
