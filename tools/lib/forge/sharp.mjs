/** Résolution partagée de sharp (installé dans @ellipse/pipeline, monorepo pnpm). */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', '..', 'packages', 'pipeline', 'package.json'));
const sharp = require('sharp');
export default sharp;
