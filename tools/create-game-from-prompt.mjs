#!/usr/bin/env node
/**
 * CLI générique : prompt (+ images optionnelles) → jeu 2D HD complet.
 *
 * Usage:
 *   pnpm create:game -- "Un platformer pixel art dans une forêt magique"
 *   pnpm create:game -- --title "Mon Jeu" --image ./hero.png "survivors dark fantasy portrait"
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();

function parseArgs(argv) {
  const images = [];
  let title;
  const promptParts = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title' && argv[i + 1]) {
      title = argv[++i];
      continue;
    }
    if ((a === '--image' || a === '-i') && argv[i + 1]) {
      images.push(argv[++i]);
      continue;
    }
    if (a === '--no-autostart') continue;
    if (a.startsWith('-')) continue;
    promptParts.push(a);
  }
  const prompt = promptParts.join(' ').trim();
  return { prompt, title, images, autostart: !argv.includes('--no-autostart') };
}

async function loadModule(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href);
}

async function ensureBuild() {
  const { spawn } = await import('node:child_process');
  const pnpm = join(ROOT, 'node_modules/pnpm/bin/pnpm.cjs');
  for (const pkg of ['@ellipse/shared', '@ellipse/engine', '@ellipse/pipeline', '@ellipse/orchestrator']) {
    const distMarker =
      pkg === '@ellipse/orchestrator'
        ? join(ROOT, 'packages/orchestrator/dist/server.js')
        : join(ROOT, `packages/${pkg.replace('@ellipse/', '')}/dist/index.js`);
    if (existsSync(distMarker)) continue;
    await new Promise((resolve, reject) => {
      console.log(`▶ Build ${pkg}`);
      const child = spawn(process.execPath, [pnpm, '--filter', pkg, 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: false,
      });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${pkg} build failed`))));
    });
  }
}

async function uploadImage(ctx, filePath) {
  const abs = join(ROOT, filePath);
  if (!existsSync(abs)) throw new Error(`Image introuvable: ${filePath}`);
  const data = await readFile(abs);
  const name = filePath.split(/[/\\]/).pop() ?? 'reference.png';
  const boundary = `----ellipse${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(`http://127.0.0.1:${ctx.port}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Upload échoué: ${res.status}`);
  const json = await res.json();
  return json.url ?? json.path;
}

async function main() {
  const { prompt, title, images, autostart } = parseArgs(process.argv.slice(2));
  if (!prompt) {
    console.error('Usage: pnpm create:game -- [--title T] [--image path] "votre prompt de jeu"');
    process.exit(1);
  }

  console.log('— Ellipse · création autonome de jeu HD 2D —\n');
  await ensureBuild();

  const { GameFactoryService } = await loadModule('packages/orchestrator/dist/game-factory/service.js');
  const { MasterAI } = await loadModule('packages/orchestrator/dist/master-ai.js');
  const { runAutonomousProductionForProject } = await loadModule(
    'packages/orchestrator/dist/game-factory/autonomous-producer.js',
  );
  const { findProjectRoot, getUploadDir, getGeneratedDir, getGameWorkspacesDir } = await loadModule(
    'packages/orchestrator/dist/project-paths.js',
  );
  const { createServer } = await loadModule('packages/orchestrator/dist/server.js');

  const root = findProjectRoot();
  const ctx = {
    root,
    uploadDir: getUploadDir(root),
    generatedDir: getGeneratedDir(root),
    workspacesDir: getGameWorkspacesDir(root),
    master: new MasterAI({ useQueue: false }),
    factory: new GameFactoryService(getGameWorkspacesDir(root)),
  };

  const app = await createServer();
  const port = Number(process.env.ORCHESTRATOR_PORT ?? 4400);
  await app.listen({ port, host: '127.0.0.1' });
  ctx.port = port;

  const imageUrls = [];
  for (const img of images) {
    console.log(`▶ Upload ${img}`);
    imageUrls.push(await uploadImage(ctx, img));
  }

  console.log('▶ Bootstrap projet…');
  const snapshot = await ctx.factory.bootstrapProject({ prompt, title, images: imageUrls });

  if (!autostart) {
    console.log(JSON.stringify({ project_id: snapshot.project.id, slug: snapshot.project.slug }, null, 2));
    await app.close();
    return;
  }

  console.log('▶ Production autonome (GDL → assets → workflow → preview)…');
  const result = await runAutonomousProductionForProject(ctx, snapshot.project.id, {
    maxLoops: Number(process.env.AUTOPRODUCE_MAX_LOOPS ?? 48),
    maxStepsPerLoop: Number(process.env.AUTOPRODUCE_STEPS ?? 3),
  });

  const out = {
    project_id: result.projectId,
    slug: snapshot.project.slug,
    status: result.status,
    steps: `${result.stepsPassed}/${result.stepsTotal}`,
    preview_url: result.previewUrl
      ? `http://127.0.0.1:${port}${result.previewUrl}`
      : undefined,
    studio_url: `http://127.0.0.1:5173/?project=${snapshot.project.id}`,
  };

  console.log('\n✓ Jeu créé');
  console.log(JSON.stringify(out, null, 2));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
