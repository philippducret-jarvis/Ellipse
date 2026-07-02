/**
 * Lance une itération MasterAI pour Veloria (hors serveur HTTP).
 * Explique aux agents ce qu'on attend via un prompt structuré.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MasterAI } from '../packages/orchestrator/dist/master-ai.js';
import { WORKSPACE_ROOT, PROJECT_SLUG } from './lib/veloria/constants.mjs';

const ITERATION_PROMPT = `Projet Veloria — Veille des Lames (survivors-like mobile vertical, dark fantasy premium).

Contexte déjà intégré :
- 12 planches concept-art importées et découpées (29 assets preview)
- Niveau 1 "Cloître en Ruine" : 3 lanes, 12 vagues, hazard effondrement, héroïne Auréline
- GDL portrait 720x1280 avec physics_topdown et roster complet en meta

Mission agents :
1. level — enrichir la scène avec les vagues 5-12 et le boss Bourreau (3 phases)
2. gameplay — déclarer auto_attack, wave_spawner, blessing_draft dans les systèmes
3. character — binder le sprite Auréline depuis les assets workspace
4. decor — fond cloître en ruine premium
5. sfx + music — ambiance tension montante dark fantasy
6. ui — HUD minimal : PV, vague, timer 3 min
7. qa — valider GDL portrait mobile
8. integration — prêt export HTML5

Conserver : palette or/violet/carmin, lisibilité mobile, max 5 ennemis simultanés.`;

async function main() {
  console.log('— Itération agents Veloria (MasterAI) —\n');

  const master = new MasterAI({ useQueue: false });
  const plan = await master.createPlan(ITERATION_PROMPT, []);
  console.log(`Plan : ${plan.tasks.length} tâches — ${plan.master_notes}\n`);

  const iterationAgents = new Set([
    'level', 'gameplay', 'decor', 'sfx', 'music', 'ui', 'qa', 'integration', 'camera',
  ]);
  const filtered = { ...plan, tasks: plan.tasks.filter((t) => iterationAgents.has(t.agent)) };

  const session = await master.executePlan(filtered, false, (ev) => {
    if (ev.type === 'task_start') console.log(`  → ${ev.task.agent}…`);
    if (ev.type === 'task_complete') {
      const r = ev.result;
      console.log(`    ${r.status} — ${r.agent_notes?.slice(0, 80) ?? r.error ?? ''}`);
    }
    if (ev.type === 'status') console.log(`  ℹ ${ev.message}`);
  }, {
    workspaceRoot: WORKSPACE_ROOT,
    projectSlug: PROJECT_SLUG,
    autoCorrect: true,
    knowledgeQuery: 'veloria lane_runner blessing',
  });

  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  if (session.status === 'completed') {
    await writeFile(gdlPath, JSON.stringify(session.gdl, null, 2), 'utf8');
    console.log(`  GDL mis à jour : ${gdlPath}`);
  } else {
    console.log(`  GDL conservé (session ${session.status}) — relancez pnpm veloria:build`);
  }

  const logPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', `iteration-${session.session_id.slice(0, 8)}.json`);
  await writeFile(
    logPath,
    JSON.stringify(
      {
        session_id: session.session_id,
        status: session.status,
        prompt: ITERATION_PROMPT,
        results: session.results.map((r) => ({
          agent: r.agent,
          status: r.status,
          notes: r.agent_notes,
        })),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\n✓ Session ${session.session_id} — ${session.status}`);
  console.log(`  Journal : ${logPath}`);
}

main().catch((err) => {
  console.error('Itération échouée (DB/bus optionnels) :', err.message);
  process.exit(1);
});
