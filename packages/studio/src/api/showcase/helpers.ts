import type { WorkspaceFilePayload, WorkspaceOverview, WorkspaceTreeEntry } from '../client.js';

export function inferFileKind(path: string): WorkspaceFilePayload['kind'] {
  const lower = path.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.html')) return 'html';
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return 'image';
  if (/\.(js|ts|tsx|css|txt|yml|yaml)$/.test(lower)) return 'text';
  return 'binary';
}

export function createTreeFromPaths(paths: string[], publicBase: string): WorkspaceTreeEntry[] {
  const root: WorkspaceTreeEntry[] = [];
  const byPath = new Map<string, WorkspaceTreeEntry>();

  for (const path of paths.sort()) {
    const segments = path.split('/');
    let current = root;
    let builtPath = '';

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      builtPath = builtPath ? `${builtPath}/${segment}` : segment;
      const isFile = index === segments.length - 1;
      let existing = byPath.get(builtPath);

      if (!existing) {
        existing = {
          name: segment,
          path: builtPath,
          type: isFile ? 'file' : 'directory',
          ext: isFile ? builtPath.slice(builtPath.lastIndexOf('.')).toLowerCase() : undefined,
          url: isFile ? `${publicBase}/${builtPath}` : undefined,
          children: isFile ? undefined : [],
        };
        byPath.set(builtPath, existing);
        current.push(existing);
      }

      if (!isFile) current = existing.children ?? [];
    }
  }

  return root;
}

export async function fetchTextMaybe(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function fetchJsonMaybe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export function buildWorkspaceStats(paths: string[]): WorkspaceOverview['stats'] {
  return {
    files: paths.length,
    directories: new Set(paths.flatMap((path) => path.split('/').slice(0, -1).map((_, index, parts) => parts.slice(0, index + 1).join('/')))).size,
    images: paths.filter((path) => inferFileKind(path) === 'image').length,
    json: paths.filter((path) => inferFileKind(path) === 'json').length,
    markdown: paths.filter((path) => inferFileKind(path) === 'markdown').length,
  };
}
