import type { TaskSpec } from '@ellipse/shared';
import {
  generateMeshFromSilhouette,
  generateMeshStubGlb,
  getGeneratedDir,
  readLot0Manifest,
  writeLot0Manifest,
  lot0ManifestPath,
} from '@ellipse/pipeline';
import { BaseAgent } from '../base-agent.js';

export class Mesh3DAgent extends BaseAgent {
  readonly id = 'mesh_3d' as const;
  readonly name = 'Le Sculpteur';
  readonly description = 'Modèles 3D glTF — silhouette photo Lot 0 ou stub TripoSR Phase 2';

  async execute(task: TaskSpec) {
    const sessionId = this.getSessionId(task);
    const sourceImages = (task.input.source_images as string[]) ?? [];
    const outputDir = getGeneratedDir();

    try {
      const existing = await readLot0Manifest(outputDir, sessionId);
      if (existing?.mesh3d) {
        return this.success(task, {
          artifacts: [
            {
              type: 'model',
              path: existing.mesh3d.path,
              meta: {
                format: 'gltf',
                url: existing.mesh3d.url,
                texture: existing.mesh3d.textureUrl,
                source: 'ellipse-lot0-mesh-v0',
              },
            },
          ],
          gdl_patches: [
            { op: 'replace', path: '/entities/0/assets/model', value: existing.mesh3d.url },
            { op: 'replace', path: '/entities/0/assets/model_texture', value: existing.mesh3d.textureUrl },
            { op: 'replace', path: '/meta/dimension', value: '3d' },
            ...(existing.learning
              ? [{ op: 'replace' as const, path: '/meta/learning', value: existing.learning }]
              : []),
          ],
          agent_notes: `Mesh Lot 0 2.5D depuis manifest · ${existing.mesh3d.vertexCount} sommets · tentative ${existing.learning?.attempt ?? 1} · meilleur score ${existing.learning?.bestScore ?? 'n/a'}/100 · ${this.getModelHint()}`,
        });
      }

      if (sourceImages[0]) {
        const mesh = await generateMeshFromSilhouette({
          sourcePath: sourceImages[0]!,
          outputDir,
          sessionId,
        });

        if (existing) {
          existing.mesh3d = {
            path: mesh.path,
            url: mesh.url,
            textureUrl: mesh.textureUrl,
            vertexCount: mesh.vertexCount,
          };
          await writeLot0Manifest(lot0ManifestPath(outputDir, sessionId), existing);
        }

        return this.success(task, {
          artifacts: [
            {
              type: 'model',
              path: mesh.path,
              meta: { format: 'gltf', url: mesh.url, texture: mesh.textureUrl, source: mesh.source },
            },
          ],
          gdl_patches: [
            { op: 'replace', path: '/entities/0/assets/model', value: mesh.url },
            { op: 'replace', path: '/entities/0/assets/model_texture', value: mesh.textureUrl },
            { op: 'replace', path: '/meta/dimension', value: '3d' },
            ...(existing?.learning
              ? [{ op: 'replace' as const, path: '/meta/learning', value: existing.learning }]
              : []),
          ],
          agent_notes: `Mesh 2.5D texture depuis photo · ${mesh.vertexCount} sommets · ${this.getModelHint()}`,
        });
      }

      const mesh = await generateMeshStubGlb({
        outputDir,
        sessionId,
        label: this.getPromptExcerpt(task).slice(0, 32) || 'hero',
      });

      return this.success(task, {
        artifacts: [{ type: 'model', path: mesh.path, meta: { format: 'glb', url: mesh.url } }],
        gdl_patches: [
          { op: 'replace', path: '/entities/0/assets/model', value: mesh.url },
          { op: 'replace', path: '/meta/dimension', value: '3d' },
        ],
        agent_notes: `Mesh glTF stub · uploadez une photo pour le pipeline Lot 0 3D (${this.getModelHint()})`,
      });
    } catch (err) {
      return this.fail(task, err instanceof Error ? err.message : 'Échec mesh 3D');
    }
  }
}
