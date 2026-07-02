import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readJson<T>(relativePath: string): Promise<T> {
  const fileUrl = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(fileUrl, 'utf8')) as T;
}

const workspaceRoot = path.resolve(import.meta.dirname, '../../../workspaces/echoes-of-the-mushroom-realm');

async function expectWorkspaceFile(relativePath: string) {
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  await expect(access(absolutePath)).resolves.toBeUndefined();
}

describe('workspace surface links', () => {
  it('keeps production HQ links and work orders attached to real files', async () => {
    const production = await readJson<{
      links: Record<string, string>;
      work_orders: Array<{
        asset_root: string;
        source_refs: Array<{ workspace_file: string }>;
      }>;
    }>('../../../workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/production-hq.json');

    for (const relativePath of Object.values(production.links)) {
      await expectWorkspaceFile(relativePath);
    }

    for (const order of production.work_orders) {
      await expectWorkspaceFile(order.asset_root);
      for (const source of order.source_refs) {
        await expectWorkspaceFile(source.workspace_file);
      }
    }
  });

  it('keeps systems board and construction graph surfaces clickable', async () => {
    const systemsBoard = await readJson<{
      palette: {
        categories: Array<{
          items: Array<{ file: string }>;
        }>;
      };
    }>('../../../workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/systems-board.json');
    const constructionGraph = await readJson<{
      views: Record<
        string,
        {
          nodes?: Array<{ file?: string }>;
          surfaces?: Array<{ file: string }>;
        }
      >;
    }>('../../../workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/construction-graph.json');

    for (const category of systemsBoard.palette.categories) {
      for (const item of category.items) {
        await expectWorkspaceFile(item.file);
      }
    }

    for (const view of Object.values(constructionGraph.views)) {
      for (const node of view.nodes ?? []) {
        if (node.file) await expectWorkspaceFile(node.file);
      }
      for (const surface of view.surfaces ?? []) {
        await expectWorkspaceFile(surface.file);
      }
    }
  });
});
