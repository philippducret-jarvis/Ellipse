import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildVeloriaPrepPack } from './lib/veloria/index.mjs';
import { HEROES } from './lib/veloria/data.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './lib/veloria/constants.mjs';
import { produceRefinedHeroPack } from './lib/veloria/hero-refinement.mjs';
import { produceAllHdPacks } from './lib/veloria/hd-factory.mjs';
import { ALL_ASSETS } from './lib/veloria/data.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildRoadmapArtifacts } from './lib/veloria/roadmap.mjs';
import { writeJson } from './lib/veloria/io.mjs';
import { SILHOUETTE_GATE } from './lib/veloria/pixel-diff-gate.mjs';

const wsUrl = (rel) => `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;

async function wireGdl(hdResults) {
  const gdl = await buildVeloriaGdl();
  const aureline = hdResults.find((r) => r.asset?.key === 'aureline');
  const cloister = hdResults.find((r) => r.asset?.key === 'ruined_cloister');
  const player = gdl.entities.find((e) => e.id === 'player');

  if (player && aureline) {
    player.assets = {
      sprite: aureline.atlasUrl,
      frame_count: aureline.manifest.frame_count,
      atlas: aureline.manifest.atlas.json.replace(/^.*?03_assets/, '/workspaces/veloria-veille-des-lames/03_assets'),
      animations: aureline.manifest.clips,
    };
  }
  if (gdl.scenes?.[0] && cloister) {
    gdl.scenes[0].background = {
      ...gdl.scenes[0].background,
      image: cloister.atlasUrl,
      alpha: 0.85,
    };
  }
  for (const enemy of gdl.scenes[0]?.layout?.enemies ?? []) {
    const pack = hdResults.find((r) => r.asset?.key === enemy.kind);
    if (pack) enemy.sprite = pack.atlasUrl;
  }

  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2));
  return gdlPath;
}

async function main() {
  console.log('═══ Veloria Sprint B — Raffinement héroïnes vs planches ═══\n');

  console.log('▶ Prep (planches + cutouts)');
  await buildVeloriaPrepPack();

  console.log('\n▶ Raffinement 6 héroïnes (pixel-diff gate + hybrid)');
  const heroResults = [];
  for (const hero of HEROES) {
    process.stdout.write(`  ▸ ${hero.title.padEnd(12)}`);
    const result = await produceRefinedHeroPack(hero);
    const method = result.qa.method;
    const iou = result.qa.diff.iou;
    console.log(` → ${method} (IoU ${iou})`);
    heroResults.push(result);
  }

  console.log('\n▶ Assets non-héros (pipeline standard)');
  const nonHeroes = ALL_ASSETS.filter((a) => a.pack_root && a.role !== 'hero');
  const otherResults = await produceAllHdPacks(nonHeroes, (a) => process.stdout.write(`  ▸ ${a.title}\n`));

  const allResults = [...heroResults, ...otherResults];

  const sprintReport = {
    sprint: 'B',
    generated_at: new Date().toISOString(),
    gate: SILHOUETTE_GATE,
    heroes: heroResults.map((r) => ({
      key: r.asset.key,
      title: r.asset.title,
      method: r.qa.method,
      iou: r.qa.diff.iou,
      symmetric_diff_pct: r.qa.diff.symmetric_diff_pct,
      passed: r.qa.diff.passed,
      strong_pass: r.qa.diff.strong_pass,
      pack_root: r.asset.pack_root,
      qa_report: `${r.asset.pack_root}/07_qa/silhouette-diff-report.json`,
    })),
    summary: {
      total_heroes: heroResults.length,
      hybrid_count: heroResults.filter((r) => r.qa.method === 'board_hybrid_refined').length,
      procedural_pass_count: heroResults.filter((r) => r.qa.method === 'procedural_gate_pass').length,
      avg_iou: Number(
        (heroResults.reduce((s, r) => s + r.qa.diff.iou, 0) / Math.max(1, heroResults.length)).toFixed(4),
      ),
    },
  };

  const reportPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'sprint-b-hero-refinement.json');
  await writeJson(reportPath, sprintReport);

  const biblePath = join(WORKSPACE_ROOT, '02_design', 'specs', 'hero-silhouette-gates.json');
  await writeJson(biblePath, {
    generated_at: sprintReport.generated_at,
    gate: SILHOUETTE_GATE,
    note: 'Seuils QA silhouette Sprint B — comparer master HD vs cutout planche normalisé.',
    heroes: sprintReport.heroes,
  });

  const gdlPath = await wireGdl(allResults);
  const roadmap = await buildRoadmapArtifacts(allResults.length, { sprintBComplete: true });

  console.log('\n═══ Sprint B terminé ═══');
  console.log(`  Héroïnes hybrid : ${sprintReport.summary.hybrid_count}/${HEROES.length}`);
  console.log(`  Procédural pass : ${sprintReport.summary.procedural_pass_count}/${HEROES.length}`);
  console.log(`  IoU moyen       : ${sprintReport.summary.avg_iou}`);
  console.log(`  Rapport         : ${wsUrl('08_ops/manifests/sprint-b-hero-refinement.json')}`);
  console.log(`  GDL             : ${gdlPath}`);
  console.log(`  Roadmap         : ${roadmap.completion_pct}%`);
  console.log(`\nPreview : http://localhost:3000${wsUrl('07_exports/web/preview.html')}`);
}

main().catch((e) => {
  console.error('ECHEC Sprint B:', e);
  process.exit(1);
});
