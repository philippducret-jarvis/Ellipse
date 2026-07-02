#!/usr/bin/env node
/**
 * Tests communication MasterAI ↔ agents — rapport JSON pour CI / ops.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const VELORIA_WS = join(ROOT, 'workspaces', 'veloria-veille-des-lames');

function run(cmd, args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function testMasterAIChain() {
  const { MasterAI } = await import('../packages/orchestrator/dist/master-ai.js');
  const master = new MasterAI({ useQueue: false });
  const prompt = `Veloria survivors-like — valider communication agents.
lane_runner, wave_spawner, blessing_draft, dark fantasy mobile.`;

  const plan = await master.createPlan(prompt, []);
  const agents = new Set(['level', 'gameplay', 'character', 'decor', 'qa', 'integration']);
  const tasks = plan.tasks.filter((t) => agents.has(t.agent));
  const ids = new Set(tasks.map((t) => t.task_id));
  const filtered = {
    ...plan,
    tasks: tasks.map((t) => ({
      ...t,
      depends_on: t.depends_on.filter((dep) => ids.has(dep)),
    })),
  };

  const trace = [];
  const wsOpts = existsSync(VELORIA_WS)
    ? { workspaceRoot: VELORIA_WS, projectSlug: 'veloria-veille-des-lames', autoCorrect: true, knowledgeQuery: 'veloria lane aureline' }
    : { autoCorrect: true };

  const session = await master.executePlan(filtered, false, (ev) => {
    if (ev.type === 'status') trace.push({ type: 'status', message: ev.message });
    if (ev.type === 'task_start') trace.push({ type: 'task_start', agent: ev.task.agent });
    if (ev.type === 'task_complete') {
      trace.push({
        type: 'task_complete',
        agent: ev.result.agent,
        status: ev.result.status,
        notes: ev.result.agent_notes?.slice(0, 200),
        recovery: ev.result.recovery_hints,
      });
    }
  }, wsOpts);

  return {
    name: 'master_ai_chain',
    session_status: session.status,
    task_count: filtered.tasks.length,
    results: session.results.map((r) => ({
      agent: r.agent,
      status: r.status,
      notes: r.agent_notes?.slice(0, 120),
      error: r.error,
    })),
    trace,
    knowledge_loaded: Boolean(wsOpts.workspaceRoot),
  };
}

async function testVitestCommunication() {
  const r = await run('npx', ['vitest', 'run', 'src/master-ai.communication.test.ts'], join(ROOT, 'packages', 'orchestrator'));
  return {
    name: 'vitest_communication',
    exit_code: r.code,
    passed: r.code === 0,
    stdout_tail: r.stdout.slice(-1500),
    stderr_tail: r.stderr.slice(-800),
  };
}

async function testKnowledgeIndex() {
  if (!existsSync(VELORIA_WS)) {
    return { name: 'knowledge_index', skipped: true };
  }
  const { indexWorkspaceKnowledge } = await import('../packages/orchestrator/dist/knowledge/workspace-indexer.js');
  const index = await indexWorkspaceKnowledge(VELORIA_WS, 'veloria-veille-des-lames');
  return { name: 'knowledge_index', chunk_count: index.chunk_count, indexed_at: index.indexed_at };
}

async function main() {
  console.log('═══ Tests communication IA / agents ═══\n');

  await run(process.execPath, [join(ROOT, 'tools', 'sync-studio-capability-manifest.mjs')]).catch(() => {});

  const results = [];
  results.push(await testKnowledgeIndex());
  console.log('▶ MasterAI chain in-process…');
  results.push(await testMasterAIChain());
  console.log('▶ Vitest communication…');
  results.push(await testVitestCommunication());

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      master_ai: results.find((r) => r.name === 'master_ai_chain')?.session_status,
      vitest_passed: results.find((r) => r.name === 'vitest_communication')?.passed,
      knowledge_chunks: results.find((r) => r.name === 'knowledge_index')?.chunk_count ?? 0,
    },
    tests: results,
  };

  const outDir = join(VELORIA_WS, '08_ops', 'manifests');
  if (existsSync(VELORIA_WS)) {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'agent-communication-test-report.json'), JSON.stringify(report, null, 2));
  }
  await writeFile(join(ROOT, 'generated', 'agent-communication-test-report.json'), JSON.stringify(report, null, 2));

  const ok = report.summary.vitest_passed !== false && report.summary.master_ai === 'completed';
  console.log(`\n${ok ? '✅' : '⚠'} Rapport → generated/agent-communication-test-report.json`);
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
