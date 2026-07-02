import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = process.cwd();

export function resolveWorkspacePath(...parts) {
  return join(workspaceRoot, ...parts);
}

export function resolveStaticPath(...parts) {
  return join(moduleDir, 'static', ...parts);
}

export async function readStaticText(...parts) {
  return readFile(resolveStaticPath(...parts), 'utf8');
}

export async function writeWorkspaceFile(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

export async function writeWorkspaceFiles(files) {
  for (const file of files) {
    await writeWorkspaceFile(file.path, file.content);
  }
}

export async function safeCopy(source, target) {
  if (!existsSync(source)) {
    return { ok: false, source, target };
  }

  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  return { ok: true, source, target };
}

export function resolveDownloadPath(path) {
  return resolve(path);
}
