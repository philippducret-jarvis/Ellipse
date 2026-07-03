/**
 * Pont Forge — relie l'usine (projets, workflows durables) à la chaîne de
 * production réelle `tools/forge-game.mjs` : prompt → assets GÉNÉRÉS (identité
 * verrouillée + QA + rig squelettal) → runtime générique GDL → auto-play.
 *
 * Le jeu est forgé DANS le workspace du projet (`--id <slug>`) : le résultat
 * est immédiatement servi par le static `/workspaces/<slug>/05_runtime/`.
 * Contrat de sortie : `workspaces/<slug>/forge-build.json` (seeds, QA, bot).
 *
 * Le pont échoue proprement (ok:false + error) : hors-ligne, backend absent ou
 * niveau non complétable par le bot → l'appelant garde son fallback preview.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ForgeAutoplay {
  won: boolean;
  simSeconds: number;
  kills: number;
  deaths: number;
  score: number;
  progress: number | null;
}

export interface ForgeQaScore {
  score: number;
  pass: boolean;
}

export interface ForgeBuildReport {
  id: string;
  title: string;
  prompt: string;
  designBackend: string;
  backend: string;
  characters: Array<{ id: string; name: string; rigType: string; qa: ForgeQaScore }>;
  arenas: Array<{ id: string; layers: Array<{ id: string; qa: ForgeQaScore }> }>;
  autoplay?: ForgeAutoplay;
  generatedAt: string;
}

export interface ForgeRunResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export type ForgeRunner = (
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
) => Promise<ForgeRunResult>;

export interface ForgeGameOptions {
  prompt: string;
  /** slug du projet — impose le workspace cible. */
  id: string;
  timeoutMs?: number;
  /** injectable pour les tests (défaut : spawn node). */
  runner?: ForgeRunner;
}

export interface ForgeGameResult {
  ok: boolean;
  id: string;
  previewUrl?: string;
  report?: ForgeBuildReport;
  error?: string;
  durationMs: number;
}

const runNode: ForgeRunner = (cmd, args, { cwd, timeoutMs }) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err.message ?? err), timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? 124 : (code ?? 1), stdout, stderr, timedOut });
    });
  });

/** URL de la preview jouable d'un jeu forgé (servie par le static workspaces). */
export function forgePreviewUrl(id: string): string {
  return `/workspaces/${id}/05_runtime/index.html`;
}

/** La preview Forge est active par défaut ; ELLIPSE_FORGE_PREVIEW=0 la coupe. */
export function isForgePreviewEnabled(): boolean {
  return process.env.ELLIPSE_FORGE_PREVIEW !== '0';
}

/**
 * Forge un vrai jeu pour un projet. `root` = racine du dépôt (contient tools/
 * et workspaces/). Ne lève pas : toute erreur revient en `{ ok: false }`.
 */
export async function forgeGame(root: string, opts: ForgeGameOptions): Promise<ForgeGameResult> {
  const started = Date.now();
  const id = opts.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const done = (partial: Omit<ForgeGameResult, 'id' | 'durationMs'>): ForgeGameResult => ({
    id,
    durationMs: Date.now() - started,
    ...partial,
  });
  if (!opts.prompt || opts.prompt.trim().length < 8) return done({ ok: false, error: 'prompt trop court' });
  if (!id) return done({ ok: false, error: 'id (slug) vide après normalisation' });

  const runner = opts.runner ?? runNode;
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000;
  const script = join(root, 'tools', 'forge-game.mjs');

  const run = await runner(process.execPath, [script, '--prompt', opts.prompt, '--id', id], {
    cwd: root,
    timeoutMs,
  });

  const reportPath = join(root, 'workspaces', id, 'forge-build.json');
  let report: ForgeBuildReport | undefined;
  try {
    report = JSON.parse(await readFile(reportPath, 'utf-8')) as ForgeBuildReport;
  } catch {
    /* pas de rapport = échec avant build */
  }

  if (run.timedOut) return done({ ok: false, report, error: `forge timeout après ${timeoutMs}ms` });
  if (run.code !== 0) {
    const tail = (run.stderr || run.stdout).trim().split('\n').slice(-3).join(' | ');
    return done({ ok: false, report, error: `forge exit ${run.code} — ${tail}` });
  }
  if (!report) return done({ ok: false, error: 'forge-build.json introuvable après build' });
  if (report.autoplay && !report.autoplay.won) {
    return done({ ok: false, report, error: 'niveau non complétable par le bot' });
  }
  return done({ ok: true, report, previewUrl: forgePreviewUrl(id) });
}
