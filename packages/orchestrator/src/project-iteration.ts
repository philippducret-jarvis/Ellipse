import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenerationPlan } from '@ellipse/shared';
import { saveSession } from '@ellipse/db';
import type { ServerContext } from './routes/context.js';
import { resolveWorkspaceRoot } from './workspace-browser.js';

const ITERATION_AGENTS = new Set([
  'level',
  'gameplay',
  'decor',
  'sfx',
  'music',
  'ui',
  'qa',
  'integration',
  'character',
  'camera',
  'vfx',
  'narrative',
  'animation',
]);

export function filterIterationPlan(plan: GenerationPlan, images: string[]): GenerationPlan {
  const allowed = new Set(ITERATION_AGENTS);
  if (!images.length) allowed.delete('character');
  if (!images.length) allowed.delete('animation');
  const tasks = plan.tasks.filter((t) => allowed.has(t.agent));
  return { ...plan, tasks };
}

export interface IterationResult {
  session_id: string;
  status: string;
  gdl_path: string;
  task_count: number;
}

/** Lance MasterAI sur un prompt d'itération et persiste le GDL dans le workspace projet. */
export async function runProjectIteration(
  ctx: ServerContext,
  projectId: string,
  prompt: string,
  images: string[] = [],
): Promise<IterationResult> {
  const snap = await ctx.factory.getProjectSnapshot(projectId);
  if (!snap) throw new Error('Project not found');

  const genreHint = snap.project.genre ? ` [projet existant : ${snap.project.genre}]` : '';
  const plan = await ctx.master.createPlan(`${prompt}${genreHint}`, images);
  const filtered = filterIterationPlan(plan, images);

  const session = await ctx.master.executePlan(filtered, true);

  await saveSession({
    id: session.session_id,
    projectId,
    prompt: plan.user_intent.raw_prompt,
    status: session.status,
    plan: filtered,
    gdl: session.gdl,
    masterNotes: plan.master_notes,
  });

  const root = resolveWorkspaceRoot(ctx.workspacesDir, snap.project.slug);
  const gdlRel = `05_runtime/gdl/${snap.project.slug.split('-')[0]}.preview.gdl.json`;
  await mkdir(join(root, '05_runtime', 'gdl'), { recursive: true });
  await writeFile(join(root, gdlRel), JSON.stringify(session.gdl, null, 2), 'utf-8');

  const opsDir = join(root, '08_ops', 'manifests');
  await mkdir(opsDir, { recursive: true });
  const logPath = join(opsDir, 'iteration-runs.json');
  let runs: Record<string, unknown>[] = [];
  if (existsSync(logPath)) {
    try {
      const parsed = JSON.parse(await readFile(logPath, 'utf-8')) as unknown;
      runs = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
    } catch {
      runs = [];
    }
  }
  runs.push({
    session_id: session.session_id,
    prompt,
    status: session.status,
    at: new Date().toISOString(),
    agents: session.results.map((r) => r.agent),
    task_count: session.results.length,
  });
  await writeFile(logPath, JSON.stringify(runs, null, 2), 'utf-8');

  return {
    session_id: session.session_id,
    status: session.status,
    gdl_path: gdlRel,
    task_count: session.results.length,
  };
}
