import { syncEchoesConstructionStack } from './lib/construction-stack/index.mjs';

const report = await syncEchoesConstructionStack();
console.log(JSON.stringify(report, null, 2));
