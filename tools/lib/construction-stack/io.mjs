import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function resolveEchoesWorkspaceRoot(cwd = process.cwd()) {
  return resolve(cwd, 'workspaces', 'echoes-of-the-mushroom-realm');
}

export async function readWorkspaceJson(workspaceRoot, relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  return JSON.parse(await readFile(absolutePath, 'utf8'));
}

export async function writeWorkspaceFiles(workspaceRoot, files) {
  for (const file of files) {
    const absolutePath = resolve(workspaceRoot, file.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, 'utf8');
  }
}

export async function readStaticTemplate(relativePath, moduleUrl) {
  const absolutePath = resolve(fileURLToPath(new URL('.', moduleUrl)), relativePath);
  return readFile(absolutePath, 'utf8');
}
