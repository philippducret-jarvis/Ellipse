import type { WorkspaceFilePayload, WorkspaceOverview } from '../client.js';
import { SHOWCASE_BASE, SHOWCASE_SLUG, SHOWCASE_WORKSPACE_PATHS } from './constants.js';
import { buildWorkspaceStats, createTreeFromPaths, fetchJsonMaybe, fetchTextMaybe, inferFileKind } from './helpers.js';

export async function buildShowcaseWorkspaceOverview(): Promise<WorkspaceOverview> {
  const refs = await fetchJsonMaybe<{ copied_references: Array<{ workspace_file: string }> }>(`${SHOWCASE_BASE}/01_inputs/references/reference-index.json`);
  const paths = [...SHOWCASE_WORKSPACE_PATHS, ...(refs?.copied_references.map((entry) => entry.workspace_file) ?? [])];
  const uniquePaths = [...new Set(paths)];

  return {
    root_path: `workspaces/${SHOWCASE_SLUG}`,
    public_base: SHOWCASE_BASE,
    tree: createTreeFromPaths(uniquePaths, SHOWCASE_BASE),
    stats: buildWorkspaceStats(uniquePaths),
    highlights: {
      preview_url: `${SHOWCASE_BASE}/07_exports/web/preview.html`,
      preview_manifest_url: `${SHOWCASE_BASE}/07_exports/web/preview-manifest.json`,
      preview_gdl_url: `${SHOWCASE_BASE}/05_runtime/gdl/veloria.preview.gdl.json`,
      keyart_url: `${SHOWCASE_BASE}/01_inputs/references/menu_keyart.jpeg`,
      workspace_manifest_url: `${SHOWCASE_BASE}/08_ops/manifests/veloria-workspace.json`,
      deliverable_manifest_url: `${SHOWCASE_BASE}/08_ops/manifests/flagship-deliverable.json`,
      readme_url: `${SHOWCASE_BASE}/README.md`,
      reference_index_url: `${SHOWCASE_BASE}/01_inputs/references/reference-index.json`,
    },
  };
}

export async function buildShowcaseWorkspaceFile(path: string): Promise<WorkspaceFilePayload> {
  const url = `${SHOWCASE_BASE}/${path}`;
  const kind = inferFileKind(path);
  const payload: WorkspaceFilePayload = {
    path,
    name: path.split('/').pop() ?? path,
    ext: path.includes('.') ? path.slice(path.lastIndexOf('.')).toLowerCase() : '',
    kind,
    url,
    size: 0,
  };

  if (kind === 'json' || kind === 'markdown' || kind === 'html' || kind === 'text') {
    const content = await fetchTextMaybe(url);
    payload.content = content ?? '';
    payload.truncated = false;
    payload.size = content?.length ?? 0;
  }

  return payload;
}
