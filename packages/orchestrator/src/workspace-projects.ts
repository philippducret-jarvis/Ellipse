/**
 * Repli « workspaces du disque = projets » (résilience sans DB).
 *
 * Quand la base est indisponible (ou vide), l'orchestrateur expose quand même les jeux présents
 * sur disque (`workspaces/<slug>/workspace.json`) comme projets, avec leurs assets lus de préférence
 * depuis `03_assets/registry/studio-asset-catalog.json`, sinon depuis
 * `03_assets/registry/generated-assets.json`.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  GameProject,
  GameProjectAsset,
  GameProjectAssetSource,
  GameProjectBuild,
  GameProjectDocument,
  GameProjectPrompt,
  GameProjectSnapshot,
} from '@ellipse/shared';

interface WorkspaceManifest {
  project_id?: string;
  slug?: string;
  title?: string;
  status?: string;
  dimension?: string;
  genre?: string;
  runtime?: string;
  camera_mode?: string;
  created_at?: string;
  updated_at?: string;
}

const VALID_STATUS = ['draft', 'planning', 'producing', 'review', 'ready', 'archived'];
const VALID_CAMERA = ['side_view', 'top_down', 'third_person', 'isometric'];

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** Genre depuis manifest workspace, puis GDL. */
async function readGenre(wsRoot: string, manifest?: WorkspaceManifest): Promise<string | null> {
  if (manifest?.genre?.trim()) return manifest.genre.trim();
  const gdlDir = join(wsRoot, '05_runtime', 'gdl');
  try {
    const files = await readdir(gdlDir);
    const gdlFile = files.find((f) => f.endsWith('.gdl.json'));
    if (!gdlFile) return null;
    const gdl = await readJson<{ meta?: { genre?: string } }>(join(gdlDir, gdlFile));
    return gdl?.meta?.genre ?? null;
  } catch {
    return null;
  }
}

function inferDocumentKind(filename: string): GameProjectDocument['kind'] {
  if (/pitch/i.test(filename)) return 'pitch';
  if (/game_design|gdd/i.test(filename)) return 'game_design_document';
  if (/narrative|story|lore/i.test(filename)) return 'narrative_bible';
  if (/art_direction/i.test(filename)) return 'art_direction';
  if (/technical/i.test(filename)) return 'technical_design';
  return 'game_design_document';
}

async function readBriefDocuments(wsRoot: string, projectId: string): Promise<GameProjectDocument[]> {
  const dir = join(wsRoot, '00_brief', 'documents');
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
    const docs: GameProjectDocument[] = [];
    for (const file of files) {
      const content = await readFile(join(dir, file), 'utf-8').catch(() => '');
      docs.push({
        id: randomUUID(),
        project_id: projectId,
        kind: inferDocumentKind(file),
        title: file.replace(/\.md$/i, ''),
        status: 'generated',
        content: content.slice(0, 8000),
        payload: {},
        created_by: 'workspace',
      });
    }
    return docs;
  } catch {
    return [];
  }
}

async function readWorkspacePrompts(wsRoot: string, projectId: string): Promise<GameProjectPrompt[]> {
  const dir = join(wsRoot, '01_inputs', 'prompts');
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
    const prompts: GameProjectPrompt[] = [];
    for (const file of files) {
      const content = await readFile(join(dir, file), 'utf-8').catch(() => '');
      prompts.push({
        id: randomUUID(),
        project_id: projectId,
        prompt: content.slice(0, 4000),
        source_images: [],
      });
    }
    return prompts;
  } catch {
    return [];
  }
}

async function readSourcePrompt(wsRoot: string): Promise<string> {
  const bootstrap = join(wsRoot, '01_inputs', 'prompts', '0001_bootstrap.prompt.md');
  if (existsSync(bootstrap)) {
    const raw = await readFile(bootstrap, 'utf-8').catch(() => '');
    const match = raw.match(/## Prompt\s*\n([\s\S]*?)(?:\n##|$)/);
    if (match?.[1]?.trim()) return match[1].trim().slice(0, 2000);
    return raw.slice(0, 2000);
  }
  const readme = join(wsRoot, 'README.md');
  if (existsSync(readme)) return (await readFile(readme, 'utf-8').catch(() => '')).slice(0, 500);
  return '';
}

async function readProjectSummary(wsRoot: string): Promise<string | null> {
  const pitch = join(wsRoot, '00_brief', 'documents', '00_pitch.md');
  if (existsSync(pitch)) {
    const raw = await readFile(pitch, 'utf-8').catch(() => '');
    const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    if (lines[0]) return lines[0].trim().slice(0, 500);
  }
  return null;
}

function readWorkspaceBuilds(wsRoot: string, projectId: string): GameProjectBuild[] {
  const preview = join(wsRoot, '07_exports', 'web', 'preview.html');
  if (!existsSync(preview)) return [];
  return [
    {
      id: randomUUID(),
      project_id: projectId,
      target: 'web_preview',
      status: 'ready',
      output_url: join('07_exports', 'web', 'preview.html'),
      manifest: { from_workspace: true },
    },
  ];
}

function toProject(slug: string, m: WorkspaceManifest, genre: string | null): GameProject {
  const dimension = (m.dimension === '2.5d' || m.dimension === '3d' ? m.dimension : '2d') as GameProject['dimension'];
  return {
    id: m.project_id && /^[0-9a-f-]{36}$/i.test(m.project_id) ? m.project_id : randomUUID(),
    title: m.title ?? slug,
    slug,
    status: (VALID_STATUS.includes(m.status ?? '') ? m.status : 'planning') as GameProject['status'],
    source_prompt: '',
    summary: null,
    genre,
    dimension,
    target_runtime: m.runtime === 'ellipse_photo_3d' ? 'ellipse_photo_3d' : 'ellipse_web_2d',
    camera_mode: (VALID_CAMERA.includes(m.camera_mode ?? '') ? m.camera_mode : 'side_view') as GameProject['camera_mode'],
    source_images: [],
    metadata: { from_workspace: true },
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

async function enrichProjectFromWorkspace(wsRoot: string, project: GameProject): Promise<GameProject> {
  const source_prompt = await readSourcePrompt(wsRoot);
  const summary = await readProjectSummary(wsRoot);
  return {
    ...project,
    source_prompt: source_prompt || project.source_prompt,
    summary: summary ?? project.summary,
  };
}

const FAMILY_MAP: Record<string, [GameProjectAsset['role'], GameProjectAsset['kind']]> = {
  character: ['hero', 'character'],
  hero: ['hero', 'character'],
  npc: ['npc', 'character'],
  enemy: ['enemy', 'character'],
  boss: ['boss', 'model'],
  collectible: ['collectible', 'prop'],
  prop: ['prop', 'prop'],
  environment: ['environment', 'environment'],
  audio: ['music', 'audio'],
  ui: ['ui', 'ui'],
  fx: ['fx', 'fx'],
};
/** Familles non-asset à ignorer (fichiers techniques). */
const SKIP_FAMILIES = new Set(['runtime']);

interface RegistryAsset {
  id: string;
  family: string;
  url?: string;
  source?: string;
  width?: number;
  height?: number;
}

interface AssetBundle {
  assets: GameProjectAsset[];
  sources: GameProjectAssetSource[];
}

interface StudioAssetCatalog {
  assets: GameProjectAsset[];
  asset_sources: GameProjectAssetSource[];
}

async function resolveAssetQaStatus(
  wsRoot: string,
  asset: GameProjectAsset,
): Promise<GameProjectAsset['status']> {
  const packRoot = (asset.spec as { pack_root?: string })?.pack_root;
  if (!packRoot) return asset.status;
  const qaPath = join(wsRoot, packRoot.replace(/\//g, '\\'), '07_qa', 'qa-report.json');
  const qaPathPosix = join(wsRoot, ...packRoot.split('/'), '07_qa', 'qa-report.json');
  const report = (await readJson<{ passed?: boolean }>(existsSync(qaPath) ? qaPath : qaPathPosix));
  if (report?.passed) return 'approved';
  return asset.status;
}

async function readRegistryAssets(wsRoot: string, projectId: string): Promise<AssetBundle> {
  const assets: GameProjectAsset[] = [];
  const sources: GameProjectAssetSource[] = [];
  const seen = new Set<string>();

  // 1. Catalogue studio (assets déjà typés), s'il existe.
  const studioCatalog = await readJson<StudioAssetCatalog>(
    join(wsRoot, '03_assets', 'registry', 'studio-asset-catalog.json'),
  );
  if (studioCatalog?.assets?.length) {
    for (const asset of studioCatalog.assets) {
      assets.push({ ...asset, project_id: projectId });
      seen.add(asset.title);
    }
    for (const s of studioCatalog.asset_sources ?? []) if (s.asset_id) sources.push(s);
  }

  // 2. Registre généré (procédural + détourages) — TOUJOURS fusionné (sinon extractions invisibles).
  const reg = await readJson<{ assets: RegistryAsset[] }>(
    join(wsRoot, '03_assets', 'registry', 'generated-assets.json'),
  );
  for (const a of reg?.assets ?? []) {
    if (SKIP_FAMILIES.has(a.family)) continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    const map = FAMILY_MAP[a.family] ?? ['prop', 'prop'];
    const assetId = randomUUID();
    assets.push({
      id: assetId,
      project_id: projectId,
      kind: map[1],
      role: map[0],
      title: a.id,
      status: 'approved',
      source_prompt: null,
      spec: { url: a.url, source: a.source, width: a.width, height: a.height },
    });
    if (a.url && a.family !== 'audio') {
      sources.push({
        id: randomUUID(),
        asset_id: assetId,
        source_type: 'generated_seed',
        url: a.url,
        file_path: a.url,
        metadata: { generated: true, source: a.source },
      });
    }
  }
  const enriched = await enrichAssetsFromQa(wsRoot, assets);
  return { assets: enriched, sources };
}

async function enrichAssetsFromQa(wsRoot: string, assets: GameProjectAsset[]): Promise<GameProjectAsset[]> {
  return Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      status: await resolveAssetQaStatus(wsRoot, asset),
    })),
  );
}

export async function listWorkspaceProjects(workspacesDir: string): Promise<GameProject[]> {
  if (!existsSync(workspacesDir)) return [];
  const entries = await readdir(workspacesDir, { withFileTypes: true });
  const projects: GameProject[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const wsRoot = join(workspacesDir, e.name);
    const manifest = await readJson<WorkspaceManifest>(join(wsRoot, 'workspace.json'));
    if (!manifest) continue;
    projects.push(toProject(e.name, manifest, await readGenre(wsRoot, manifest)));
  }
  return projects;
}

export async function getWorkspaceSnapshot(
  workspacesDir: string,
  projectId: string,
): Promise<GameProjectSnapshot | null> {
  if (!existsSync(workspacesDir)) return null;
  const entries = await readdir(workspacesDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const wsRoot = join(workspacesDir, e.name);
    const manifest = await readJson<WorkspaceManifest>(join(wsRoot, 'workspace.json'));
    if (!manifest) continue;
    const project = await enrichProjectFromWorkspace(
      wsRoot,
      toProject(e.name, manifest, await readGenre(wsRoot, manifest)),
    );
    if (project.id !== projectId) continue;
    const { assets, sources } = await readRegistryAssets(wsRoot, project.id);
    const [documents, prompts] = await Promise.all([
      readBriefDocuments(wsRoot, project.id),
      readWorkspacePrompts(wsRoot, project.id),
    ]);
    return {
      project,
      prompts,
      documents,
      tasks: [],
      assets,
      asset_sources: sources,
      asset_variants: [],
      asset_outputs: [],
      scenes: [],
      builds: readWorkspaceBuilds(wsRoot, project.id),
    };
  }
  return null;
}
