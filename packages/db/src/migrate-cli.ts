#!/usr/bin/env node
import { loadEnv } from '@ellipse/shared/load-env';
import { getDatabaseUrl } from './client.js';
import { runMigrations } from './migrate.js';
import { closePool } from './client.js';

async function main() {
  loadEnv();
  console.log('🗄️  Ellipse — migration PostgreSQL');
  console.log(`   → ${getDatabaseUrl().replace(/:[^:@]+@/, ':****@')}`);

  try {
    await runMigrations();
    console.log('✅ Migration 001_init appliquée');
  } catch (err) {
    console.error('❌ Échec migration:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
