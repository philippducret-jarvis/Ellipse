import { loadEnv } from '@ellipse/shared/load-env';
import { getBusConnection, startAgentWorker } from '@ellipse/bus';
import { getAgentRegistry } from './registry.js';

async function main() {
  loadEnv();
  const agentFilter = process.env.AGENT_ID;
  const registry = getAgentRegistry();
  const connection = getBusConnection();
  const agents = agentFilter
    ? registry.list().filter((a) => a.id === agentFilter)
    : registry.list();

  console.log('🤖 Ellipse Agent Workers');
  console.log(`   Redis: ${process.env.REDIS_URL ?? 'redis://localhost:6379'}`);
  console.log(`   Agents spécialisés : ${agents.length}`);

  for (const agent of agents) {
    startAgentWorker(agent.id, (task) => agent.execute(task), connection);
    console.log(`   ✓ ${agent.id} — ${agent.name}`);
  }

  console.log('\nEn attente de tâches…');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
