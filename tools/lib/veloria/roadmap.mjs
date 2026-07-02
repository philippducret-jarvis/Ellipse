import { join } from 'node:path';
import { WORKSPACE_ROOT } from './constants.mjs';
import { writeJson, writeText } from './io.mjs';

const PHASES = [
  { id: 'P0', name: 'Lecture planches & intent', weight: 5 },
  { id: 'P1', name: 'Verrouillage produit (GDD, preset)', weight: 8 },
  { id: 'P2', name: 'Bible artistique', weight: 7 },
  { id: 'P3', name: 'Assets HD pipeline 03-06', weight: 30 },
  { id: 'P4', name: 'Cartes & niveaux (6 arènes)', weight: 15 },
  { id: 'P5', name: 'Systèmes gameplay runtime', weight: 20 },
  { id: 'P6', name: 'Méta gacha / runes / reliques', weight: 8 },
  { id: 'P7', name: 'Audio & UI complete', weight: 4 },
  { id: 'P8', name: 'Assemblage & exports', weight: 2 },
  { id: 'P9', name: 'QA & compliance', weight: 1 },
];

function status(done, partial, total) {
  if (done >= total) return 'done';
  if (partial > 0 || done > 0) return 'in_progress';
  return 'pending';
}

export async function buildRoadmapArtifacts(hdPackCount = 0, options = {}) {
  const totalPacks = 29;
  const sprintB = options.sprintBComplete === true;
  const sprintCDE = options.sprintsCDEComplete === true;
  const phaseProgress = {
    P0: { done: 12, total: 12, note: '12 planches importées' },
    P1: { done: 6, total: 6, note: 'Docs bootstrap + preset survivors_like' },
    P2: {
      done: sprintB ? 4 : 1,
      total: 4,
      note: sprintB ? 'Sprint B — profils héro + pixel-diff gate' : 'Palette + builders procéduraux',
    },
    P3: { done: hdPackCount, total: totalPacks, note: 'Packs HD stages 03-06' },
    P4: {
      done: sprintCDE ? 6 : 1,
      total: 6,
      note: sprintCDE ? '6 arènes + hazard scripts' : 'Level 01 spec only',
    },
    P5: {
      done: sprintCDE ? 12 : 1,
      total: 12,
      note: sprintCDE ? 'lane_runner + wave_spawner + blessing_draft' : 'physics_topdown partiel',
    },
    P6: { done: sprintCDE ? 6 : 4, total: 8, note: sprintCDE ? 'Catalogues + draft pool' : 'Catalogues JSON' },
    P7: { done: sprintCDE ? 3 : 1, total: 5, note: sprintCDE ? 'HUD + blessing cards + SFX' : 'SFX procédural base' },
    P8: { done: sprintCDE ? 4 : 2, total: 4, note: sprintCDE ? 'GDL 6 scènes + preview runtime' : 'GDL + preview web' },
    P9: { done: sprintCDE ? 2 : 0, total: 6, note: sprintCDE ? 'Gates sprint CDE' : 'Gates QA genre' },
  };

  let weightedDone = 0;
  let weightedTotal = 0;
  const phases = PHASES.map((p) => {
    const prog = phaseProgress[p.id];
    const pct = Math.round((prog.done / prog.total) * 100);
    weightedDone += (prog.done / prog.total) * p.weight;
    weightedTotal += p.weight;
    return {
      ...p,
      progress: prog,
      percent: pct,
      status: status(prog.done, prog.done, prog.total),
    };
  });

  const completion_pct = Math.round((weightedDone / weightedTotal) * 100);

  const markdown = `# Veloria — Roadmap de production

Progression globale estimée : **${completion_pct}%**

| Phase | Statut | Avancement | Note |
|-------|--------|------------|------|
${phases.map((p) => `| ${p.id} ${p.name} | ${p.status} | ${p.percent}% (${p.progress.done}/${p.progress.total}) | ${p.progress.note} |`).join('\n')}

## Commandes fabrique

\`\`\`bash
pnpm veloria:create    # scaffold workspace
pnpm veloria:prep      # planches + crops + specs
pnpm veloria:assets    # HD pipeline 03-06 (TOUS les packs)
pnpm veloria:build     # GDL + preview + playbook
pnpm veloria:all       # enchaîne tout
\`\`\`

## Sprint actuel recommandé

1. ~~**Sprint B** — Affiner builders héro vs planches~~ ✓
2. ~~**Sprint C** — Ennemis HD + boss Bourreau en runtime~~ ✓
3. ~~**Sprint D** — 6 arènes tileables + hazards scripts~~ ✓
4. ~~**Sprint E** — lane_runner + wave_spawner + blessing_draft~~ ✓

Commandes : \`pnpm veloria:sprint-b\` · \`pnpm veloria:sprints-cde\` · \`pnpm veloria:build\`

Voir \`08_ops/manifests/hd-asset-factory-playbook.md\` pour la méthode assets.
`;

  const specsDir = join(WORKSPACE_ROOT, '02_design', 'specs');
  const opsDir = join(WORKSPACE_ROOT, '08_ops', 'manifests');
  const mdPath = join(specsDir, 'veloria-production-roadmap.md');
  const statusPath = join(opsDir, 'roadmap-status.json');

  await writeText(mdPath, markdown);
  await writeJson(statusPath, {
    generated_at: new Date().toISOString(),
    completion_pct,
    phases,
    commands: {
      create: 'pnpm veloria:create',
      prep: 'pnpm veloria:prep',
      assets: 'pnpm veloria:assets',
      sprint_b: 'pnpm veloria:sprint-b',
      sprints_cde: 'pnpm veloria:sprints-cde',
      build: 'pnpm veloria:build',
      all: 'pnpm veloria:all',
    },
  });

  return { mdPath, statusPath, completion_pct };
}
