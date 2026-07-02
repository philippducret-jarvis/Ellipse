import pg from 'pg';
import { loadEnv } from '@ellipse/shared/load-env';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5435';
  const db = process.env.POSTGRES_DB ?? 'ellisphere';
  const user = process.env.POSTGRES_USER ?? 'ellisphere';
  const password = process.env.POSTGRES_PASSWORD ?? '';
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:${port}/${db}`;
}

export function getPool(): pg.Pool {
  if (!pool) {
    loadEnv();
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
