import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '@ellipse/shared/load-env';
import { getPool } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  loadEnv();
  const pool = getPool();
  const migrationDir = join(__dirname, '../migrations');
  const files = readdirSync(migrationDir)
    .filter((entry) => entry.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const version = file.replace(/\.sql$/u, '');
    const alreadyApplied = await pool.query<{ version: string }>(
      `SELECT version FROM schema_migrations WHERE version = $1`,
      [version],
    );

    if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) continue;

    const sql = readFileSync(join(migrationDir, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      // Certaines migrations historiques s’enregistraient elles-mêmes, pas toutes.
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [version]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
