#!/usr/bin/env node
import { MasterAI } from '../master-ai.js';

const prompt = process.argv.slice(2).join(' ') || 'Platformer 2D avec un chat ninja';

async function main() {
  const master = new MasterAI();
  console.log('\n🌑 Ellipse — IA Maîtresse\n');
  console.log(`Prompt: "${prompt}"\n`);

  const plan = await master.createPlan(prompt);
  console.log('📋 Generation Plan:\n');
  console.log(JSON.stringify(plan, null, 2));

  console.log('\n⏳ Exécution des agents (mode mock)…\n');
  const session = await master.executePlan(plan);
  console.log(`✅ Session ${session.session_id}`);
  console.log(`   Statut: ${session.status}`);
  console.log(`   Tâches: ${session.results.length}`);
  console.log(`   Jeu: "${session.gdl.meta.title}" (${session.gdl.meta.dimension})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
