import { syncEchoesProductionHq } from './lib/production-hq/index.mjs';

const report = await syncEchoesProductionHq();
console.log(JSON.stringify(report, null, 2));
