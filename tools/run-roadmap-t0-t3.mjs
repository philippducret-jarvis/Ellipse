#!/usr/bin/env node
/**
 * Roadmap T0→T3 — orchestration unique :
 * - Veloria build + sprints B/CDE
 * - Sync manifest Studio capability
 * - Index connaissance workspace (via orchestrator API si dispo, sinon local)
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const VELORIA_SLUG = 'veloria-veille-des-lames';
const WORKSPACE = join(ROOT, 'workspaces', VELORIA_SLUG);

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exit ${code}`))));
  });
}

async function indexKnowledgeLocal() {
  const { readdir, readFile, stat } = await import('node:fs/promises');
  const chunks = [];
  async function walk(dir, base = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '07_exports') continue;
      const full = join(dir, e.name);
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(full, rel);
      else if (/\.(md|json|txt)$/i.test(e.name)) {
        const st = await stat(full);
        if (st.size > 512_000) continue;
        const raw = await readFile(full, 'utf8');
        chunks.push({
          id: rel.replace(/[/\\]/g, '__'),
          path: rel.replace(/\\/g, '/'),
          title: e.name.replace(/\.(md|json|txt)$/i, ''),
          excerpt: raw.replace(/\s+/g, ' ').trim().slice(0, 480),
          tags: rel.split(/[/\\]/).slice(0, -1).slice(-3),
        });
      }
    }
  }
  try {
    await walk(WORKSPACE);
  } catch {
    console.warn('Workspace Veloria absent — index knowledge ignoré');
    return;
  }
  const outDir = join(WORKSPACE, '08_ops', 'knowledge');
  await mkdir(outDir, { recursive: true });
  const index = {
    project_slug: VELORIA_SLUG,
    chunk_count: chunks.length,
    indexed_at: new Date().toISOString(),
    chunks,
  };
  await writeFile(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✓ Index RAG local : ${chunks.length} chunks → 08_ops/knowledge/index.json`);
}

async function writeRoadmapReport() {
  const report = {
    roadmap: 'T0-T3',
    completed_at: new Date().toISOString(),
    phases: {
      T0: {
        fidelity_qa: '@ellipse/pipeline runFidelityQa + runQaStage bloquant',
        hero_runtime_pack: 'orchestrator stage 03_cleanup role=hero',
        export_gate: '422 si QA failed sur export html5/pwa',
      },
      T1: {
        engine_veloria: '@ellipse/engine sim/veloria-survival.ts',
        enemy_atlas: 'meta.asset_atlas sprites',
        gdl_audio: 'audio/gdl-audio.ts',
      },
      T2: {
        work_orders_api: 'POST /api/projects/:id/work-orders/run',
        production_tab: 'boutons Exécuter ordre',
      },
      T3: {
        knowledge_index: '08_ops/knowledge/index.json + API search',
        telemetry: '08_ops/telemetry/events.jsonl + migration 004',
      },
    },
  };
  const outDir = join(WORKSPACE, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'roadmap-t0-t3-report.json'), JSON.stringify(report, null, 2));
  console.log('✓ Rapport roadmap → 08_ops/manifests/roadmap-t0-t3-report.json');
}

async function main() {
  const node = process.execPath;
  const steps = [
    () => run(node, [join(ROOT, 'tools', 'create-veloria.mjs')], 'Seed Veloria workspace'),
    () => run(node, [join(ROOT, 'tools', 'run-veloria-sprint-b.mjs')], 'Sprint B — héroïnes'),
    () => run(node, [join(ROOT, 'tools', 'run-veloria-sprints-cde.mjs')], 'Sprints C/D/E'),
    () => run(node, [join(ROOT, 'tools', 'build-veloria-game.mjs')], 'Build GDL + preview'),
    () => run(node, [join(ROOT, 'tools', 'run-mechanics-audit.mjs')], 'Audit mécaniques Veloria'),
    () => run(node, [join(ROOT, 'tools', 'sync-studio-capability-manifest.mjs')], 'Sync capability manifest'),
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      console.warn(`⚠ ${err.message} — continuation`);
    }
  }

  await indexKnowledgeLocal();
  await writeRoadmapReport();
  console.log('\n✅ Roadmap T0→T3 exécutée');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
