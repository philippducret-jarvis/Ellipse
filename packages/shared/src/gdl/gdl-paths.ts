/** Préfixe fichier GDL preview dérivé du slug workspace (ex. veloria-veille → veloria). */
export function gdlPreviewPrefixFromSlug(slug: string): string {
  const token = slug.split('-')[0]?.trim();
  return token && token.length > 0 ? token : 'game';
}

export function gdlPreviewFileName(slug: string): string {
  return `${gdlPreviewPrefixFromSlug(slug)}.preview.gdl.json`;
}

function joinWorkspacePath(root: string, ...segments: string[]): string {
  const base = root.replace(/\/+$/, '');
  return `${base}/${segments.join('/')}`;
}

export function resolveGdlPreviewPath(workspaceRoot: string, slug: string): string {
  return joinWorkspacePath(workspaceRoot, '05_runtime', 'gdl', gdlPreviewFileName(slug));
}

export function resolveGdlPreviewRelativePath(slug: string): string {
  return `05_runtime/gdl/${gdlPreviewFileName(slug)}`;
}
