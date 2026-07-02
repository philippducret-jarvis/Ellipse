import { buildLevel01Pack } from './lib/level-01/index.mjs';

const result = await buildLevel01Pack();
console.log(JSON.stringify(result, null, 2));
