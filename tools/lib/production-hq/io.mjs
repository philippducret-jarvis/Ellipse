import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export function resolveEchoesWorkspaceRoot(cwd = process.cwd()) {
  return resolve(cwd, 'workspaces', 'echoes-of-the-mushroom-realm');
}

export async function readWorkspaceJson(workspaceRoot, relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  return JSON.parse(await readFile(absolutePath, 'utf8'));
}

export async function writeWorkspaceText(workspaceRoot, relativePath, content) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
}

export async function writeWorkspaceFiles(workspaceRoot, files) {
  for (const file of files) {
    await writeWorkspaceText(workspaceRoot, file.path, file.content);
  }
}
