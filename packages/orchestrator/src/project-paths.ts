import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export function findProjectRoot(startDir = process.cwd()): string {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = join(dir, '..');
  }
  return startDir;
}

export function resolveProjectPath(candidate: string | undefined, fallback: string, root = findProjectRoot()): string {
  if (!candidate) return fallback;
  const normalized = candidate.trim();
  return isAbsolute(normalized) ? normalized : resolve(root, normalized);
}

export function getUploadDir(root = findProjectRoot()): string {
  return resolveProjectPath(process.env.UPLOAD_DIR, join(root, 'uploads'), root);
}

export function getGeneratedDir(root = findProjectRoot()): string {
  return resolveProjectPath(process.env.GENERATED_DIR, join(root, 'generated'), root);
}

export function getGameWorkspacesDir(root = findProjectRoot()): string {
  return resolveProjectPath(process.env.GAME_WORKSPACES_DIR, join(root, 'workspaces'), root);
}
