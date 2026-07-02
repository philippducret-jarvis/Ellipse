import { seedEchoesWorkspace } from './lib/seed-echoes/index.mjs';

const report = await seedEchoesWorkspace();
console.log(JSON.stringify(report, null, 2));
