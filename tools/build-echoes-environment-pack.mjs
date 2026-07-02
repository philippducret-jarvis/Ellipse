import { resolve } from 'node:path';
import { generateEnvironmentKitPack } from '../packages/pipeline/dist/index.js';

const workspaceRoot = resolve(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm');
const sourcePath = resolve(workspaceRoot, '01_inputs', 'references', 'sporale_cliffs_board.png');
const assetRoot = resolve(workspaceRoot, '03_assets', 'environments', 'environment__origin-tree-level-kit');

const result = await generateEnvironmentKitPack({
  sourcePath,
  assetRoot,
});

console.log(
  JSON.stringify(
    {
      sourcePath,
      assetRoot,
      result,
    },
    null,
    2,
  ),
);
