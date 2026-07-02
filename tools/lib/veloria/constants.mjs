import { join } from 'node:path';

export const PROJECT_ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const PROJECT_SLUG = 'veloria-veille-des-lames';
export const PROJECT_TITLE = 'Veloria — Veille des Lames';

export const WORKSPACE_ROOT = join(process.cwd(), 'workspaces', PROJECT_SLUG);
export const REFERENCES_ROOT = join(WORKSPACE_ROOT, '01_inputs', 'references');
export const DESIGN_ROOT = join(WORKSPACE_ROOT, '02_design', 'specs');
export const ASSETS_ROOT = join(WORKSPACE_ROOT, '03_assets');
export const REGISTRY_ROOT = join(ASSETS_ROOT, 'registry');
export const SCENES_ROOT = join(WORKSPACE_ROOT, '04_scenes', 'level_01');
export const RUNTIME_ROOT = join(WORKSPACE_ROOT, '05_runtime', 'config');
export const OPS_ROOT = join(WORKSPACE_ROOT, '08_ops', 'manifests');

export const PUBLIC_WORKSPACE_ROOT = `/workspaces/${PROJECT_SLUG}`;

export function toWorkspaceFile(...parts) {
  return parts.join('/').replace(/\\/g, '/');
}
