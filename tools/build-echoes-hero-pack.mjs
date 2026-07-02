import { resolve } from 'node:path';
import { generateHeroRuntimePack } from '../packages/pipeline/dist/index.js';

const workspaceRoot = resolve(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm');
const sourcePath = resolve(workspaceRoot, '01_inputs', 'references', 'hero_echo_front.png');
const assetRoot = resolve(workspaceRoot, '03_assets', 'characters', 'hero__the-echo-main-hero');

const result = await generateHeroRuntimePack({
  sourcePath,
  assetRoot,
  atlasFrames: 6,
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
