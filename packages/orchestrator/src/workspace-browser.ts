import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, normalize, resolve } from 'node:path';

export interface WorkspaceTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  ext?: string;
  size?: number;
  modified_at?: string;
  url?: string;
  children?: WorkspaceTreeEntry[];
}

export interface WorkspaceStats {
  files: number;
  directories: number;
  images: number;
  json: number;
  markdown: number;
}

export interface WorkspaceOverview {
  root_path: string;
  public_base: string;
  tree: WorkspaceTreeEntry[];
  stats: WorkspaceStats;
  highlights: {
    preview_url?: string;
    preview_manifest_url?: string;
    preview_gdl_url?: string;
    keyart_url?: string;
    workspace_manifest_url?: string;
    readme_url?: string;
    reference_index_url?: string;
  };
}

export interface WorkspaceFilePayload {
  path: string;
  name: string;
  ext: string;
  kind: 'json' | 'markdown' | 'html' | 'text' | 'image' | 'binary';
  url: string;
  size: number;
  modified_at?: string;
  content?: string;
  truncated?: boolean;
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.css', '.html', '.yml', '.yaml']);

function toPublicUrl(publicBase: string, relativePath: string): string {
  return `${publicBase}/${relativePath.replaceAll('\\', '/')}`;
}

function createStats(): WorkspaceStats {
  return {
    files: 0,
    directories: 0,
    images: 0,
    json: 0,
    markdown: 0,
  };
}

function inferKind(ext: string): WorkspaceFilePayload['kind'] {
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'markdown';
  if (ext === '.html') return 'html';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (TEXT_EXTS.has(ext)) return 'text';
  return 'binary';
}

export function resolveWorkspaceRoot(workspacesDir: string, projectSlug: string): string {
  return join(workspacesDir, projectSlug);
}

export function sanitizeWorkspaceRelativePath(input: string | undefined): string {
  const raw = (input ?? '').trim().replaceAll('\\', '/');
  const normalized = normalize(raw).replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized === '.') return '';
  if (normalized.split('/').some((part) => part === '..')) {
    throw new Error('Invalid workspace path');
  }
  return normalized;
}

async function readTree(
  rootDir: string,
  currentDir: string,
  publicBase: string,
  stats: WorkspaceStats,
): Promise<WorkspaceTreeEntry[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const result: WorkspaceTreeEntry[] = [];

  for (const entry of entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  })) {
    const absolutePath = join(currentDir, entry.name);
    const relativePath = normalize(absolutePath.slice(rootDir.length + 1)).replaceAll('\\', '/');
    const meta = await stat(absolutePath);

    if (entry.isDirectory()) {
      stats.directories += 1;
      result.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        modified_at: meta.mtime.toISOString(),
        children: await readTree(rootDir, absolutePath, publicBase, stats),
      });
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    stats.files += 1;
    if (IMAGE_EXTS.has(ext)) stats.images += 1;
    if (ext === '.json') stats.json += 1;
    if (ext === '.md') stats.markdown += 1;

    result.push({
      name: entry.name,
      path: relativePath,
      type: 'file',
      ext,
      size: meta.size,
      modified_at: meta.mtime.toISOString(),
      url: toPublicUrl(publicBase, relativePath),
    });
  }

  return result;
}

export async function buildWorkspaceOverview(
  workspacesDir: string,
  projectSlug: string,
): Promise<WorkspaceOverview | null> {
  const rootDir = resolveWorkspaceRoot(workspacesDir, projectSlug);
  if (!existsSync(rootDir)) return null;

  const stats = createStats();
  const publicBase = `/workspaces/${projectSlug}`;
  const tree = await readTree(rootDir, rootDir, publicBase, stats);

  return {
    root_path: rootDir,
    public_base: publicBase,
    tree,
    stats,
    highlights: {
      preview_url: `${publicBase}/07_exports/web/preview.html`,
      preview_manifest_url: `${publicBase}/07_exports/web/preview-manifest.json`,
      preview_gdl_url: `${publicBase}/05_runtime/gdl/echoes.preview.gdl.json`,
      keyart_url: `${publicBase}/01_inputs/references/menu_keyart.jpeg`,
      workspace_manifest_url: `${publicBase}/08_ops/manifests/echoes-workspace.json`,
      readme_url: `${publicBase}/README.md`,
      reference_index_url: `${publicBase}/01_inputs/references/reference-index.json`,
    },
  };
}

export async function readWorkspaceFile(
  workspacesDir: string,
  projectSlug: string,
  relativePathInput: string,
): Promise<WorkspaceFilePayload> {
  const rootDir = resolveWorkspaceRoot(workspacesDir, projectSlug);
  const relativePath = sanitizeWorkspaceRelativePath(relativePathInput);
  const absolutePath = resolve(rootDir, relativePath);

  if (!absolutePath.startsWith(rootDir) || !existsSync(absolutePath)) {
    throw new Error('Workspace file not found');
  }

  const meta = await stat(absolutePath);
  if (meta.isDirectory()) {
    throw new Error('Workspace path is a directory');
  }

  const ext = extname(absolutePath).toLowerCase();
  const kind = inferKind(ext);
  const payload: WorkspaceFilePayload = {
    path: relativePath,
    name: basename(absolutePath),
    ext,
    kind,
    url: toPublicUrl(`/workspaces/${projectSlug}`, relativePath),
    size: meta.size,
    modified_at: meta.mtime.toISOString(),
  };

  if (kind === 'json' || kind === 'markdown' || kind === 'html' || kind === 'text') {
    const content = await readFile(absolutePath, 'utf8');
    const maxLength = 120_000;
    payload.content = content.slice(0, maxLength);
    payload.truncated = content.length > maxLength;
  }

  return payload;
}
