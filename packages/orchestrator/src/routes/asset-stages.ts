import type { FastifyInstance } from 'fastify';
import type { AssetStageId, ImageOperationId } from '@ellipse/shared';
import { autoRetouchAssetPack, executeImageOperation } from '@ellipse/pipeline';
import { AssetPipelineService } from '../asset-pipeline/service.js';
import { getGameProjectSnapshot } from '@ellipse/db';
import { getAssetWorkspaceRoot } from '../workspace-scaffold.js';
import { appendAgentMemory } from '../agents/agent-memory.js';
import { resolveWorkspaceRoot } from '../workspace-browser.js';
import { getGameWorkspacesDir } from '../project-paths.js';

const pipeline = new AssetPipelineService();

export function registerAssetStageRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string; assetId: string } }>(
    '/api/projects/:id/assets/:assetId/stages',
    async (req, reply) => {
      try {
        const stages = await pipeline.listStages(req.params.id, req.params.assetId);
        return { project_id: req.params.id, asset_id: req.params.assetId, stages };
      } catch (error) {
        if (error instanceof Error && (error.message === 'Project not found' || error.message === 'Asset not found')) {
          return reply.status(404).send({ error: error.message === 'Project not found' ? 'Projet introuvable' : 'Asset introuvable' });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { id: string; assetId: string; stageId: AssetStageId } }>(
    '/api/projects/:id/assets/:assetId/stages/:stageId/run',
    async (req, reply) => {
      try {
        const result = await pipeline.runStage(req.params.id, req.params.assetId, req.params.stageId);
        if (result.status === 'failed') {
          return reply.status(422).send(result);
        }
        return result;
      } catch (error) {
        if (error instanceof Error && (error.message === 'Project not found' || error.message === 'Asset not found')) {
          return reply.status(404).send({ error: error.message === 'Project not found' ? 'Projet introuvable' : 'Asset introuvable' });
        }
        throw error;
      }
    },
  );

  /** Retouche / création image pilotée par agents (CPU v1). */
  app.post<{
    Params: { id: string; assetId: string };
    Body: { operation?: ImageOperationId; auto?: boolean };
  }>('/api/projects/:id/assets/:assetId/image/retouch', async (req, reply) => {
    const snapshot = await getGameProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const asset = snapshot.assets.find((a) => a.id === req.params.assetId);
    if (!asset) return reply.status(404).send({ error: 'Asset introuvable' });

    const assetRoot = getAssetWorkspaceRoot(snapshot.project, asset);
    const workspaceRoot = resolveWorkspaceRoot(getGameWorkspacesDir(), snapshot.project.slug);

    try {
      const result =
        req.body?.auto !== false && !req.body?.operation
          ? await autoRetouchAssetPack(assetRoot, asset.role)
          : await executeImageOperation(req.body?.operation ?? 'retouch_inpaint_cpu', {
              packRoot: assetRoot,
              role: asset.role,
            });

      if (!result.ok) {
        await appendAgentMemory(workspaceRoot, {
          agent: 'character',
          kind: 'failure',
          subject: `retouch_${result.operation}`,
          detail: result.agent_instruction,
          iou: result.iou,
          asset_path: assetRoot,
        });
        return reply.status(422).send(result);
      }

      await appendAgentMemory(workspaceRoot, {
        agent: 'character',
        kind: result.shipping_ready ? 'success' : 'lesson',
        subject: `retouch_${result.operation}`,
        detail: result.agent_instruction,
        iou: result.iou,
        asset_path: assetRoot,
      });

      return { asset_id: asset.id, ...result };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Retouche échouée',
      });
    }
  });
}
