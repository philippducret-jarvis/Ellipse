import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const envPath = resolve(dir, '.env');
    if (existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
    dir = resolve(dir, '..');
  }
  config();
}
