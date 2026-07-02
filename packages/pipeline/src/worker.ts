import { loadEnv } from '@ellipse/shared/load-env';
import { startVisionWorker } from './index.js';

loadEnv();

console.log('🔬 Ellipse Pipeline Vision Worker');
console.log(`   Queue: ellipse:pipeline:vision`);

startVisionWorker();
console.log('   ✓ En écoute\n');
