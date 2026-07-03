import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { forgeGame, forgePreviewUrl, type ForgeRunner } from './forge-bridge.js';

const REPORT = {
  id: 'mon-projet',
  title: 'Mon Projet',
  prompt: 'une chevalière dans une citadelle',
  designBackend: 'heuristic',
  backend: 'pollinations',
  characters: [{ id: 'hero', name: 'Héros', rigType: 'humanoid', qa: { score: 70, pass: true } }],
  arenas: [{ id: 'arena-01', layers: [{ id: 'mid', qa: { score: 88, pass: true } }] }],
  autoplay: { won: true, simSeconds: 19, kills: 5, deaths: 1, score: 500, progress: 100 },
  generatedAt: new Date().toISOString(),
};

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function makeRoot(report: object | null): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'forge-bridge-'));
  if (report) {
    await mkdir(join(root, 'workspaces', 'mon-projet'), { recursive: true });
    await writeFile(join(root, 'workspaces', 'mon-projet', 'forge-build.json'), JSON.stringify(report));
  }
  return root;
}

const okRunner: ForgeRunner = async () => ({ code: 0, stdout: '✔ forgé', stderr: '', timedOut: false });

describe('forge-bridge', () => {
  it('forge un jeu et renvoie la preview jouable du workspace projet', async () => {
    const r = await forgeGame(await makeRoot(REPORT), { prompt: 'une chevalière dans une citadelle gothique', id: 'Mon Projet', runner: okRunner });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('mon-projet'); // slug normalisé
    expect(r.previewUrl).toBe('/workspaces/mon-projet/05_runtime/index.html');
    expect(r.report?.autoplay?.won).toBe(true);
  });

  it('passe --prompt et --id normalisé au CLI forge', async () => {
    let seen: string[] = [];
    const spyRunner: ForgeRunner = async (_cmd, args) => {
      seen = args;
      return { code: 0, stdout: '', stderr: '', timedOut: false };
    };
    await forgeGame(await makeRoot(REPORT), { prompt: 'un ninja néon cyberpunk', id: 'Mon Projet', runner: spyRunner });
    expect(seen[0]).toContain(join('tools', 'forge-game.mjs'));
    expect(seen).toContain('--prompt');
    expect(seen).toContain('un ninja néon cyberpunk');
    expect(seen[seen.indexOf('--id') + 1]).toBe('mon-projet');
  });

  it('échoue proprement quand le CLI sort en erreur (hors-ligne…)', async () => {
    const failRunner: ForgeRunner = async () => ({ code: 1, stdout: '', stderr: '✗ Aucun backend génératif joignable.', timedOut: false });
    const r = await forgeGame(await makeRoot(null), { prompt: 'une chevalière dans une citadelle gothique', id: 'mon-projet', runner: failRunner });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('exit 1');
    expect(r.previewUrl).toBeUndefined();
  });

  it('refuse un jeu dont le bot ne gagne pas (porte auto-play)', async () => {
    const losing = { ...REPORT, autoplay: { ...REPORT.autoplay, won: false, progress: 42 } };
    const r = await forgeGame(await makeRoot(losing), { prompt: 'une chevalière dans une citadelle gothique', id: 'mon-projet', runner: okRunner });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('bot');
  });

  it('échoue proprement sur timeout', async () => {
    const slowRunner: ForgeRunner = async () => ({ code: 124, stdout: '', stderr: '', timedOut: true });
    const r = await forgeGame(await makeRoot(null), { prompt: 'une chevalière dans une citadelle gothique', id: 'mon-projet', runner: slowRunner, timeoutMs: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('timeout');
  });

  it('valide prompt et slug en entrée', async () => {
    const r1 = await forgeGame(await makeRoot(null), { prompt: 'court', id: 'x', runner: okRunner });
    expect(r1.ok).toBe(false);
    const r2 = await forgeGame(root, { prompt: 'un prompt suffisamment long', id: '///', runner: okRunner });
    expect(r2.ok).toBe(false);
  });

  it('forgePreviewUrl pointe vers le runtime auto-porteur', () => {
    expect(forgePreviewUrl('abc')).toBe('/workspaces/abc/05_runtime/index.html');
  });
});
