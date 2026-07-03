import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listWorkspaceProjects, getWorkspaceSnapshot } from './workspace-projects.js';

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

/** Reproduit ce que registerForgedGame écrit pour un jeu forgé. */
async function seedForgedWorkspace(slug: string): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'ws-forge-'));
  const ws = join(dir, slug);
  await mkdir(join(ws, '05_runtime'), { recursive: true });
  await mkdir(join(ws, '03_assets', 'registry'), { recursive: true });
  await mkdir(join(ws, '07_exports', 'web'), { recursive: true });
  await writeFile(
    join(ws, 'workspace.json'),
    JSON.stringify({
      project_id: '3f2f8f5e-1111-4222-8333-444455556666',
      slug,
      title: 'Citadelle Maudite',
      status: 'ready',
      dimension: '2.5d',
      genre: 'platformer',
      runtime: 'ellipse_web_2d',
      camera_mode: 'side_view',
      preview_url: `/workspaces/${slug}/05_runtime/index.html`,
      forge: { url: `/workspaces/${slug}/05_runtime/index.html`, autoplay: { won: true } },
    }),
  );
  await writeFile(join(ws, '05_runtime', 'index.html'), '<!doctype html>');
  await writeFile(join(ws, '07_exports', 'web', 'preview.html'), '<!doctype html>');
  await writeFile(
    join(ws, '03_assets', 'registry', 'generated-assets.json'),
    JSON.stringify({
      assets: [
        { id: 'forge_hero', family: 'hero', url: `/workspaces/${slug}/05_runtime/assets/hero/hero.apose.png`, source: 'forge' },
        { id: 'forge_arena_mid', family: 'environment', url: `/workspaces/${slug}/05_runtime/assets/arenas/arena-01.mid.png`, source: 'forge' },
      ],
    }),
  );
  return ws;
}

describe('workspace-projects × Forge', () => {
  it('liste un jeu forgé comme projet Studio (id stable, titre, statut)', async () => {
    await seedForgedWorkspace('citadelle-maudite');
    const projects = await listWorkspaceProjects(dir);
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe('Citadelle Maudite');
    expect(projects[0].status).toBe('ready');
    expect(projects[0].id).toBe('3f2f8f5e-1111-4222-8333-444455556666');
  });

  it('expose le runtime forgé comme build + les assets forge dans le snapshot', async () => {
    await seedForgedWorkspace('citadelle-maudite');
    const snap = await getWorkspaceSnapshot(dir, '3f2f8f5e-1111-4222-8333-444455556666');
    expect(snap).not.toBeNull();
    const targets = snap!.builds.map((b) => b.target).sort();
    expect(targets).toEqual(['forge_runtime', 'web_preview']);
    const forgeBuild = snap!.builds.find((b) => b.target === 'forge_runtime');
    expect(forgeBuild?.output_url).toContain('index.html');
    const roles = snap!.assets.map((a) => a.role);
    expect(roles).toContain('hero');
    expect(roles).toContain('environment');
  });
});
