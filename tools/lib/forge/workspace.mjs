/**
 * ENREGISTREMENT WORKSPACE — rend chaque jeu forgé visible dans le Studio.
 *
 * Le frontend (orchestrateur → workspace-projects.ts) ne liste que les
 * workspaces ayant un `workspace.json`, lit les assets dans
 * `03_assets/registry/generated-assets.json` et les builds depuis
 * `07_exports/web/preview.html`. La Forge écrit donc ces contrats.
 *
 * Politique de FUSION (renforcer les jeux existants, jamais les abîmer) :
 *   - workspace.json existant → on préserve tout (titre, statut, preview_url…),
 *     on ajoute seulement le bloc `forge` + updated_at ;
 *   - registre d'assets → on remplace uniquement les entrées `source:"forge"`,
 *     les assets historiques restent ;
 *   - 07_exports/web/preview.html → jamais écrasé s'il existe (redirection
 *     créée seulement pour les workspaces neufs) ;
 *   - prompt/pitch → créés seulement s'ils n'existent pas.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}
async function writeJson(path, obj) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(obj, null, 2), 'utf8');
}

const GENRE_MAP = { sidescroller: 'platformer', 'vertical-arena': 'survivors_like' };
const CAMERA_MAP = { sidescroller: 'side_view', 'vertical-arena': 'top_down' };

function forgeAssetEntries(wsId, gdl, wsDir) {
  const base = `/workspaces/${wsId}/05_runtime/assets`;
  const entries = [];
  for (const [kind, e] of Object.entries(gdl.entities ?? {})) {
    const dir = e.role === 'hero' ? 'hero' : 'enemies';
    const candidates = [`${kind}.apose.png`, `${kind}.creature.png`];
    const file = candidates.find((f) => existsSync(join(wsDir, '05_runtime', 'assets', dir, f)));
    if (!file) continue;
    entries.push({
      id: `forge_${kind}`,
      family: e.role === 'hero' ? 'hero' : 'enemy',
      url: `${base}/${dir}/${file}`,
      source: 'forge',
    });
  }
  for (const level of gdl.levels ?? []) {
    const parallax = level.arena?.split('/').pop()?.replace('.parallax.json', '');
    if (!parallax) continue;
    for (const layer of ['sky', 'far', 'mid', 'near']) {
      const file = `${parallax}.${layer}.png`;
      if (!existsSync(join(wsDir, '05_runtime', 'assets', 'arenas', file))) continue;
      entries.push({ id: `forge_${parallax}_${layer}`, family: 'environment', url: `${base}/arenas/${file}`, source: 'forge' });
    }
  }
  return entries;
}

/**
 * Enregistre (ou renforce) le workspace d'un jeu forgé.
 * @returns {Promise<{created:boolean, previewUrl:string}>}
 */
export async function registerForgedGame(wsDir, wsId, { gdl, prompt, report }) {
  const now = new Date().toISOString();
  const forgeUrl = `/workspaces/${wsId}/05_runtime/index.html`;

  // ── workspace.json : créer OU fusionner sans rien casser ──
  const manifestPath = join(wsDir, 'workspace.json');
  const existing = await readJson(manifestPath);
  const forgeBlock = {
    url: forgeUrl,
    gdl_url: `/workspaces/${wsId}/05_runtime/game.gdl.json`,
    built_at: report?.generatedAt ?? now,
    backend: report?.backend ?? null,
    autoplay: report?.autoplay ?? null,
  };
  if (existing) {
    // le jeu forgé DEVIENT la preview principale (feedback utilisateur :
    // le Studio doit ouvrir le vrai jeu) ; l'ancienne reste en legacy.
    const legacy = existing.preview_url && !existing.preview_url.includes('05_runtime/index.html')
      ? existing.preview_url
      : existing.legacy_preview_url;
    await writeJson(manifestPath, {
      ...existing,
      preview_url: forgeUrl,
      legacy_preview_url: legacy ?? null,
      updated_at: now,
      forge: forgeBlock,
    });
  } else {
    await writeJson(manifestPath, {
      project_id: randomUUID(),
      slug: wsId,
      title: gdl.title,
      status: 'ready',
      dimension: '2.5d',
      genre: GENRE_MAP[gdl.genre] ?? gdl.genre,
      runtime: 'ellipse_web_2d',
      camera_mode: CAMERA_MAP[gdl.genre] ?? 'side_view',
      created_at: now,
      updated_at: now,
      preview_url: forgeUrl,
      gdl_url: `/workspaces/${wsId}/05_runtime/game.gdl.json`,
      forge: forgeBlock,
    });
  }

  // ── prompt + pitch : seulement si absents ──
  const promptPath = join(wsDir, '01_inputs', 'prompts', '0001_bootstrap.prompt.md');
  if (!existsSync(promptPath) && prompt) {
    await mkdir(join(wsDir, '01_inputs', 'prompts'), { recursive: true });
    await writeFile(promptPath, `# Bootstrap\n\n## Prompt\n\n${prompt}\n`, 'utf8');
  }
  const pitchPath = join(wsDir, '00_brief', 'documents', '00_pitch.md');
  if (!existsSync(pitchPath) && gdl.subtitle) {
    await mkdir(join(wsDir, '00_brief', 'documents'), { recursive: true });
    await writeFile(pitchPath, `# ${gdl.title}\n\n${gdl.subtitle}\n`, 'utf8');
  }

  // ── registre d'assets : fusion (les entrées forge remplacent les leurs) ──
  const registryPath = join(wsDir, '03_assets', 'registry', 'generated-assets.json');
  const registry = (await readJson(registryPath)) ?? { assets: [] };
  const kept = (registry.assets ?? []).filter((a) => a.source !== 'forge');
  registry.assets = [...kept, ...forgeAssetEntries(wsId, gdl, wsDir)];
  registry.updated_at = now;
  await writeJson(registryPath, registry);

  // ── build web : redirection UNIQUEMENT pour un workspace neuf ──
  const previewPath = join(wsDir, '07_exports', 'web', 'preview.html');
  let created = false;
  if (!existsSync(previewPath)) {
    created = true;
    await mkdir(join(wsDir, '07_exports', 'web'), { recursive: true });
    await writeFile(previewPath, `<!doctype html>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=../../05_runtime/index.html">
<title>${gdl.title}</title>
<p>Redirection vers le <a href="../../05_runtime/index.html">jeu forgé</a>…</p>
`, 'utf8');
  }

  return { created, previewUrl: forgeUrl };
}
