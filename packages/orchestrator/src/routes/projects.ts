import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import type { GameProjectAsset } from '@ellipse/shared';
import { registerUpload } from '@ellipse/db';
import { extractSubject } from '@ellipse/pipeline';
import { buildMobileExport } from '@ellipse/shared';
import {
  buildWorkspaceOverview,
  readWorkspaceFile,
  resolveWorkspaceRoot,
  sanitizeWorkspaceRelativePath,
} from '../workspace-browser.js';
import type { ServerContext } from './context.js';
import { runProjectIteration } from '../project-iteration.js';
import { evaluateProjectExportQaGate, appendTelemetryEvent } from '../qa/export-gate.js';
import { evaluateFullExportGate } from '../qa/intent-gate.js';
import { exportGdlToGodot } from '../export/godot-adapter.js';
import { runSyntheticPlaytest, loadGdlForPlaytest } from '@ellipse/engine';
import { buildSemanticGraphFromGdl, GameDefinitionSchema } from '@ellipse/shared';
import { readAgentMemory, formatAgentMemoryForContext, appendAgentMemory } from '../agents/agent-memory.js';
import {
  getAutonomousProductionStatus,
  queueAutonomousProduction,
  runAutonomousProductionForProject,
} from '../game-factory/autonomous-producer.js';
import { FLAGSHIP_GAME, FLAGSHIP_PATHS } from '@ellipse/shared';
import { readVeloriaFidelityStatus, runVeloriaFidelityPipeline } from '../veloria/fidelity-runner.js';

function safeName(input: string): string {
  return (input || 'asset').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'asset';
}

export function registerProjectRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.get('/api/projects', async () => {
    const projects = await ctx.factory.listProjects();
    return { projects };
  });

  app.post<{ Body: { prompt: string; title?: string; images?: string[]; autostart?: boolean; autonomous?: boolean } }>(
    '/api/projects',
    async (req, reply) => {
      const prompt = req.body.prompt?.trim();
      if (!prompt) return reply.status(400).send({ error: 'Prompt requis' });
      const snapshot = await ctx.factory.bootstrapProject({
        prompt,
        title: req.body.title,
        images: req.body.images ?? [],
      });
      const autostart = req.body.autostart !== false && req.body.autonomous !== false;
      if (autostart) {
        void queueAutonomousProduction(ctx, snapshot.project.id).catch((err) => {
          req.log.error({ err, projectId: snapshot.project.id }, 'production autonome en arrière-plan');
        });
      }
      return {
        ...snapshot,
        autonomous: autostart ? { status: 'queued' as const } : { status: 'skipped' as const },
      };
    },
  );

  /** Production autonome complète (sync) — prompt/image → GDL → assets → preview. */
  app.post<{ Params: { id: string }; Body: { maxLoops?: number; maxSteps?: number } }>(
    '/api/projects/:id/autoproduce',
    async (req, reply) => {
      try {
        const result = await runAutonomousProductionForProject(ctx, req.params.id, {
          maxLoops: req.body?.maxLoops,
          maxStepsPerLoop: req.body?.maxSteps,
        });
        const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
        return { result, snapshot };
      } catch (error) {
        if (error instanceof Error && error.message === 'Project not found') {
          return reply.status(404).send({ error: 'Projet introuvable' });
        }
        return reply.status(422).send({ error: error instanceof Error ? error.message : 'Production échouée' });
      }
    },
  );

  /** Statut production autonome en cours. */
  app.get<{ Params: { id: string } }>('/api/projects/:id/autoproduce/status', async (req) => {
    return { project_id: req.params.id, status: getAutonomousProductionStatus(req.params.id) };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    return snapshot;
  });

  app.post<{ Params: { id: string }; Body: { prompt: string; images?: string[] } }>(
    '/api/projects/:id/prompts',
    async (req, reply) => {
      const prompt = req.body.prompt?.trim();
      if (!prompt) return reply.status(400).send({ error: 'Prompt requis' });
      try {
        const snapshot = await ctx.factory.appendPrompt({
          projectId: req.params.id,
          prompt,
          images: req.body.images ?? [],
        });
        void runProjectIteration(ctx, req.params.id, prompt, req.body.images ?? []).catch((err) => {
          req.log.error({ err, projectId: req.params.id }, 'iteration agents en arrière-plan');
        });
        return snapshot;
      } catch (error) {
        if (error instanceof Error && error.message === 'Project not found') {
          return reply.status(404).send({ error: 'Projet introuvable' });
        }
        throw error;
      }
    },
  );

  /** Itération agents synchrone (MasterAI → GDL workspace). */
  app.post<{ Params: { id: string }; Body: { prompt: string; images?: string[] } }>(
    '/api/projects/:id/iterate',
    async (req, reply) => {
      const prompt = req.body.prompt?.trim();
      if (!prompt) return reply.status(400).send({ error: 'Prompt requis' });
      try {
        const iteration = await runProjectIteration(
          ctx,
          req.params.id,
          prompt,
          req.body.images ?? [],
        );
        const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
        return { iteration, snapshot };
      } catch (error) {
        if (error instanceof Error && error.message === 'Project not found') {
          return reply.status(404).send({ error: 'Projet introuvable' });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>('/api/projects/:id/tasks', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    return { project_id: req.params.id, tasks: snapshot.tasks };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id/documents', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    return { project_id: req.params.id, documents: snapshot.documents };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id/assets', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    return {
      project_id: req.params.id,
      assets: snapshot.assets,
      asset_sources: snapshot.asset_sources,
      asset_variants: snapshot.asset_variants,
      asset_outputs: snapshot.asset_outputs,
    };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id/scenes', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    return { project_id: req.params.id, scenes: snapshot.scenes, builds: snapshot.builds };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id/workspace', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const workspace = await buildWorkspaceOverview(ctx.workspacesDir, snapshot.project.slug);
    if (!workspace) return reply.status(404).send({ error: 'Workspace introuvable' });
    return { project_id: req.params.id, project_slug: snapshot.project.slug, workspace };
  });

  app.get<{ Params: { id: string }; Querystring: { path?: string } }>(
    '/api/projects/:id/workspace/file',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
      const filePath = req.query.path?.trim();
      if (!filePath) return reply.status(400).send({ error: 'Path requis' });
      try {
        const file = await readWorkspaceFile(ctx.workspacesDir, snapshot.project.slug, filePath);
        return { project_id: req.params.id, project_slug: snapshot.project.slug, file };
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Workspace')) {
          return reply.status(404).send({ error: 'Fichier workspace introuvable' });
        }
        if (error instanceof Error && error.message === 'Invalid workspace path') {
          return reply.status(400).send({ error: 'Path invalide' });
        }
        throw error;
      }
    },
  );

  // Import d'une planche/référence directement dans 01_inputs/references du projet.
  app.post<{ Params: { id: string } }>('/api/projects/:id/references', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Fichier requis' });

    const slug = snapshot.project.slug;
    const refsDir = join(resolveWorkspaceRoot(ctx.workspacesDir, slug), '01_inputs', 'references');
    await mkdir(refsDir, { recursive: true });

    const dot = (data.filename ?? '').lastIndexOf('.');
    const ext = dot >= 0 ? data.filename!.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'png';
    const base = safeName((data.filename ?? 'planche').replace(/\.[^.]+$/, ''));
    const filename = `${base}.${ext}`;
    await writeFile(join(refsDir, filename), await data.toBuffer());

    const rel = `01_inputs/references/${filename}`;
    return { name: filename, path: rel, url: `/workspaces/${slug}/${rel}` };
  });

  // Détourage par sélection : une boîte sur une planche → sprite détouré ajouté aux assets.
  app.post<{
    Params: { id: string };
    Body: {
      source: string;
      name: string;
      family?: string;
      box: { left: number; top: number; width: number; height: number };
      tolerance?: number;
      targetHeight?: number;
    };
  }>('/api/projects/:id/extract', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const slug = snapshot.project.slug;
    const root = resolveWorkspaceRoot(ctx.workspacesDir, slug);

    let rel: string;
    try {
      rel = sanitizeWorkspaceRelativePath(req.body.source);
    } catch {
      return reply.status(400).send({ error: 'Source invalide' });
    }
    const srcAbs = join(root, rel);
    if (!existsSync(srcAbs)) return reply.status(404).send({ error: 'Image source introuvable' });
    if (!req.body.box || req.body.box.width < 4 || req.body.box.height < 4) {
      return reply.status(400).send({ error: 'Boîte de sélection invalide' });
    }

    const name = safeName(req.body.name);
    const family = req.body.family ?? 'prop';
    const outRel = join('03_assets', 'extracted', `${name}.png`);
    const outAbs = join(root, outRel);
    await mkdir(join(root, '03_assets', 'extracted'), { recursive: true });

    const result = await extractSubject(srcAbs, outAbs, {
      box: {
        left: Math.round(req.body.box.left),
        top: Math.round(req.body.box.top),
        width: Math.round(req.body.box.width),
        height: Math.round(req.body.box.height),
      },
      tolerance: req.body.tolerance ?? 90,
      targetHeight: req.body.targetHeight ?? 220,
    });

    // Ajout au registre (consommé par le repli disque → visible dans le studio).
    const regPath = join(root, '03_assets', 'registry', 'generated-assets.json');
    let reg: { assets?: unknown[] } = { assets: [] };
    try {
      reg = JSON.parse(await readFile(regPath, 'utf-8')) as { assets?: unknown[] };
    } catch {
      reg = { assets: [] };
    }
    const url = `/workspaces/${slug}/${outRel.replaceAll('\\', '/')}`;
    (reg.assets ??= []).push({
      id: name,
      family,
      path: outAbs,
      url,
      width: result.width,
      height: result.height,
      source: `detourage-selection:${rel}`,
    });
    await mkdir(join(root, '03_assets', 'registry'), { recursive: true });
    await writeFile(regPath, JSON.stringify(reg, null, 2));

    return { id: name, name, family, url, width: result.width, height: result.height, removed_ratio: result.removedRatio };
  });

  app.post<{
    Params: { id: string };
    Body: { title: string; role: GameProjectAsset['role']; kind: GameProjectAsset['kind']; prompt?: string };
  }>('/api/projects/:id/assets', async (req, reply) => {
    const title = req.body.title?.trim();
    if (!title) return reply.status(400).send({ error: 'Titre asset requis' });
    try {
      return await ctx.factory.createAssetSlot({
        projectId: req.params.id,
        title,
        role: req.body.role,
        kind: req.body.kind,
        prompt: req.body.prompt,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        return reply.status(404).send({ error: 'Projet introuvable' });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string; assetId: string } }>(
    '/api/projects/:id/assets/:assetId/upload',
    async (req, reply) => {
      const data = await req.file();
      if (!data) return reply.status(400).send({ error: 'Fichier requis' });

      const buffer = await data.toBuffer();
      const uploadId = uuidv4();
      const ext = data.filename?.split('.').pop() ?? 'bin';
      const filename = `${uploadId}.${ext}`;
      const storagePath = join(ctx.uploadDir, filename);
      const publicUrl = `/uploads/${filename}`;

      const { writeFile } = await import('node:fs/promises');
      await writeFile(storagePath, buffer);
      await registerUpload({
        id: uploadId,
        projectId: req.params.id,
        gameAssetId: req.params.assetId,
        originalName: data.filename ?? filename,
        storagePath,
        mimeType: data.mimetype,
        sizeBytes: buffer.length,
      });

      try {
        return await ctx.factory.attachAssetSource({
          projectId: req.params.id,
          assetId: req.params.assetId,
          sourceType: 'photo_reference',
          url: publicUrl,
          filePath: storagePath,
          originalName: data.filename ?? filename,
        });
      } catch (error) {
        if (error instanceof Error && (error.message === 'Project not found' || error.message === 'Asset not found')) {
          return reply.status(404).send({
            error: error.message === 'Project not found' ? 'Projet introuvable' : 'Asset introuvable',
          });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { id: string; assetId: string }; Body: { presets?: string[] } }>(
    '/api/projects/:id/assets/:assetId/prototypes',
    async (req, reply) => {
      try {
        return await ctx.factory.generateAssetPrototypes({
          projectId: req.params.id,
          assetId: req.params.assetId,
          presets: req.body?.presets,
        });
      } catch (error) {
        if (error instanceof Error && (error.message === 'Project not found' || error.message === 'Asset not found')) {
          return reply.status(404).send({
            error: error.message === 'Project not found' ? 'Projet introuvable' : 'Asset introuvable',
          });
        }
        throw error;
      }
    },
  );

  /** Persiste le GDL édité depuis le Studio (éditeur de scène). */
  app.put<{ Params: { id: string }; Body: { path?: string; gdl: unknown } }>(
    '/api/projects/:id/gdl',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
      const rel = req.body.path?.trim() || '05_runtime/gdl/echoes.preview.gdl.json';
      let safe: string;
      try {
        safe = sanitizeWorkspaceRelativePath(rel);
      } catch {
        return reply.status(400).send({ error: 'Chemin GDL invalide' });
      }
      const root = resolveWorkspaceRoot(ctx.workspacesDir, snapshot.project.slug);
      const abs = join(root, safe);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, JSON.stringify(req.body.gdl, null, 2), 'utf-8');
      return { ok: true, path: safe, url: `/workspaces/${snapshot.project.slug}/${safe}` };
    },
  );

  /** Export HTML5 bundle (preview + GDL + assets workspace). */
  app.get<{ Params: { id: string } }>('/api/projects/:id/export/html5', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const slug = snapshot.project.slug;
    const root = resolveWorkspaceRoot(ctx.workspacesDir, slug);
    const qaGate = await evaluateProjectExportQaGate(root);
    let gdlParsed: { systems?: string[]; meta?: Record<string, unknown> } | undefined;
    for (const p of [
      join(root, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
      join(root, '05_runtime', 'gdl', `${slug.split('-')[0]}.preview.gdl.json`),
    ]) {
      if (existsSync(p)) {
        try {
          gdlParsed = JSON.parse(await readFile(p, 'utf-8'));
        } catch {
          /* ignore */
        }
        break;
      }
    }
    const fullGate = await evaluateFullExportGate(root, qaGate, gdlParsed);
    if (fullGate.blocked) {
      await appendTelemetryEvent(root, { type: 'export_blocked', format: 'html5', reason: fullGate.reason });
      await appendAgentMemory(root, {
        agent: 'integration',
        kind: 'failure',
        subject: 'export_html5',
        detail: fullGate.reason ?? 'Gate export bloquée',
      });
      return reply.status(422).send({ error: fullGate.reason, qa_reports: qaGate.reports.filter((r) => !r.passed) });
    }
    const previewPath = join(root, '07_exports', 'web', 'preview.html');
    const gdlCandidates = [
      join(root, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
      join(root, '05_runtime', 'gdl', `${slug.split('-')[0]}.preview.gdl.json`),
    ];

    let previewHtml = '';
    try {
      previewHtml = await readFile(previewPath, 'utf-8');
    } catch {
      previewHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${snapshot.project.title}</title></head><body><p>Preview non générée — lancez la compilation.</p></body></html>`;
    }

    let gdlJson = '{}';
    for (const p of gdlCandidates) {
      if (existsSync(p)) {
        gdlJson = await readFile(p, 'utf-8');
        break;
      }
    }

    const bundle: Record<string, string> = {
      'index.html': previewHtml,
      'gdl.json': gdlJson,
      'manifest.json': JSON.stringify(
        {
          title: snapshot.project.title,
          slug,
          exported_at: new Date().toISOString(),
          target: 'html5',
        },
        null,
        2,
      ),
    };

    const exportsWeb = join(root, '07_exports', 'web');
    if (existsSync(exportsWeb)) {
      const collect = async (dir: string, prefix: string): Promise<void> => {
        const entries = await import('node:fs/promises').then((m) => m.readdir(dir, { withFileTypes: true }));
        for (const entry of entries) {
          const full = join(dir, entry.name);
          const key = `${prefix}/${entry.name}`;
          if (entry.isDirectory()) await collect(full, key);
          else {
            const buf = await readFile(full);
            if (buf.length < 5 * 1024 * 1024) bundle[key] = buf.toString('base64');
          }
        }
      };
      await collect(exportsWeb, 'web');
    }

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${slug}-html5.json"`);
    return bundle;
  });

  /** Export PWA (manifest + service worker + descripteur mobile). */
  app.get<{ Params: { id: string }; Querystring: { profile?: string } }>(
    '/api/projects/:id/export/pwa',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
      const slug = snapshot.project.slug;
      const root = resolveWorkspaceRoot(ctx.workspacesDir, slug);
      const qaGate = await evaluateProjectExportQaGate(root);
      if (qaGate.blocked) {
        await appendTelemetryEvent(root, { type: 'export_blocked', format: 'pwa', reason: qaGate.reason });
        await appendAgentMemory(root, {
          agent: 'integration',
          kind: 'failure',
          subject: 'export_pwa',
          detail: qaGate.reason ?? 'QA export bloquée',
        });
        return reply.status(422).send({ error: qaGate.reason, qa_reports: qaGate.reports.filter((r) => !r.passed) });
      }
      const gdlCandidates = [
        join(root, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
        join(root, '05_runtime', 'gdl', `${slug.split('-')[0]}.preview.gdl.json`),
      ];

      let gdlJson = '{}';
      for (const p of gdlCandidates) {
        if (existsSync(p)) {
          gdlJson = await readFile(p, 'utf-8');
          break;
        }
      }

      const gdl = JSON.parse(gdlJson) as Parameters<typeof buildMobileExport>[0];
      const profile = (req.query.profile === 'low' || req.query.profile === 'high' ? req.query.profile : 'mid') as
        | 'low'
        | 'mid'
        | 'high';
      const mobile = buildMobileExport(gdl, profile, ['./index.html', './gdl.json', './manifest.webmanifest']);

      const bundle = {
        'manifest.webmanifest': JSON.stringify(mobile.manifest, null, 2),
        'sw.js': mobile.service_worker,
        'export-descriptor.json': JSON.stringify(
          {
            title: mobile.title,
            profile: mobile.profile,
            pixel_ratio: mobile.pixel_ratio,
            max_texture_size: mobile.max_texture_size,
            exported_at: new Date().toISOString(),
            slug,
          },
          null,
          2,
        ),
        'gdl.json': gdlJson,
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="${slug}-pwa.json"`);
      return bundle;
    },
  );

  /** Playtest synthétique headless (F3+). */
  app.post<{ Params: { id: string }; Body: { runs?: number } }>(
    '/api/projects/:id/playtest/synthetic',
    async (req, reply) => {
      const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
      if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
      const slug = snapshot.project.slug;
      const root = resolveWorkspaceRoot(ctx.workspacesDir, slug);
      const gdlPaths = [
        join(root, '05_runtime', 'gdl', `${slug.split('-')[0]}.preview.gdl.json`),
        join(root, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
        join(root, '05_runtime', 'gdl', 'veloria.preview.gdl.json'),
      ];
      let raw: unknown = null;
      for (const p of gdlPaths) {
        if (existsSync(p)) {
          raw = JSON.parse(await readFile(p, 'utf-8'));
          break;
        }
      }
      if (!raw) return reply.status(404).send({ error: 'GDL introuvable' });
      const gdl = loadGdlForPlaytest(raw);
      const report = runSyntheticPlaytest(gdl, { runs: req.body?.runs ?? 24 });
      const outPath = join(root, '08_ops', 'manifests', 'synthetic-playtest-report.json');
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, JSON.stringify(report, null, 2), 'utf-8');
      const gsg = buildSemanticGraphFromGdl(gdl);
      await appendTelemetryEvent(root, { type: 'synthetic_playtest', wins: report.wins, losses: report.losses });
      return { report, semantic_graph_nodes: gsg.nodes.length, path: '08_ops/manifests/synthetic-playtest-report.json' };
    },
  );

  /** Export projet Godot minimal. */
  app.post<{ Params: { id: string } }>('/api/projects/:id/export/godot', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const slug = snapshot.project.slug;
    const root = resolveWorkspaceRoot(ctx.workspacesDir, slug);
    const gdlPaths = [
      join(root, '05_runtime', 'gdl', `${slug.split('-')[0]}.preview.gdl.json`),
      join(root, '05_runtime', 'gdl', 'veloria.preview.gdl.json'),
    ];
    let raw: unknown = null;
    for (const p of gdlPaths) {
      if (existsSync(p)) {
        raw = JSON.parse(await readFile(p, 'utf-8'));
        break;
      }
    }
    if (!raw) return reply.status(404).send({ error: 'GDL introuvable' });
    const gdl = GameDefinitionSchema.parse(raw);
    const outDir = join(root, '07_exports', 'godot');
    const result = await exportGdlToGodot(gdl, outDir, snapshot.project.title);
    return { ok: true, ...result, public_base: `/workspaces/${slug}/07_exports/godot` };
  });

  /** Mémoire agents + GSG pour Studio. */
  app.get<{ Params: { id: string } }>('/api/projects/:id/revolution/context', async (req, reply) => {
    const snapshot = await ctx.factory.getProjectSnapshot(req.params.id);
    if (!snapshot) return reply.status(404).send({ error: 'Projet introuvable' });
    const root = resolveWorkspaceRoot(ctx.workspacesDir, snapshot.project.slug);
    const memory = await readAgentMemory(root);
    let gsg = { nodes: [] as unknown[], edges: [] as unknown[] };
    const gdlPath = join(root, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
    if (existsSync(gdlPath)) {
      const gdl = GameDefinitionSchema.parse(JSON.parse(await readFile(gdlPath, 'utf-8')));
      gsg = buildSemanticGraphFromGdl(gdl);
    }
    return {
      agent_memory: memory,
      agent_memory_summary: formatAgentMemoryForContext(memory),
      semantic_graph: gsg,
    };
  });

  /** Jeu livrable final Ellipse — Veloria. */
  app.get('/api/flagship/veloria', async (_req, reply) => {
    const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, FLAGSHIP_GAME.slug);
    const deliverablePath = join(workspaceRoot, '08_ops', 'manifests', 'flagship-deliverable.json');
    const auditPath = join(workspaceRoot, '08_ops', 'manifests', 'training-audit-report.json');
    const previewPath = join(workspaceRoot, '07_exports', 'web', 'preview.html');
    const gdlPath = join(workspaceRoot, '05_runtime', 'gdl', FLAGSHIP_GAME.gdlFile);

    let deliverable = null;
    let audit = null;
    try {
      if (existsSync(deliverablePath)) deliverable = JSON.parse(await readFile(deliverablePath, 'utf-8'));
    } catch {
      /* optional */
    }
    try {
      if (existsSync(auditPath)) audit = JSON.parse(await readFile(auditPath, 'utf-8'));
    } catch {
      /* optional */
    }

    const snapshot = await ctx.factory.getProjectSnapshot(FLAGSHIP_GAME.id);
    const productionStatus = getAutonomousProductionStatus(FLAGSHIP_GAME.id);
    const fidelity = await readVeloriaFidelityStatus(workspaceRoot);

    return {
      flagship: FLAGSHIP_GAME,
      paths: FLAGSHIP_PATHS,
      deliverable,
      audit_summary: audit?.summary ?? null,
      fidelity,
      artifacts: {
        preview_ready: existsSync(previewPath),
        gdl_ready: existsSync(gdlPath),
        fidelity_ready: fidelity.ready,
        preview_url: FLAGSHIP_PATHS.previewUrl,
        gdl_url: FLAGSHIP_PATHS.gdlUrl,
      },
      production_status: productionStatus,
      snapshot: snapshot ? { id: snapshot.project.id, title: snapshot.project.title, status: snapshot.project.status } : null,
    };
  });

  /** Relance pipeline fidélité photo Veloria (prep → refine → shipping). */
  app.post<{ Body: { force?: boolean } }>('/api/flagship/veloria/fidelity', async (req, reply) => {
    try {
      const fidelity = await runVeloriaFidelityPipeline(ctx.root, { force: req.body?.force ?? true });
      return { ok: true, fidelity };
    } catch (error) {
      const workspaceRoot = resolveWorkspaceRoot(ctx.workspacesDir, FLAGSHIP_GAME.slug);
      const fidelity = await readVeloriaFidelityStatus(workspaceRoot);
      return reply.status(422).send({
        error: error instanceof Error ? error.message : 'Pipeline fidélité échoué',
        fidelity,
      });
    }
  });
}
