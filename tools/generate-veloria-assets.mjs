import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { writeAssetSpecPng } from '../packages/pipeline/dist/index.js';
import { generateSfxWav, generateMusicLoopWav } from '../packages/shared/dist/index.js';
import {
  ALL_ASSETS,
  HEROES,
  ENEMIES,
  BOSSES,
  ENVIRONMENTS,
} from './lib/veloria/data.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT, PROJECT_SLUG } from './lib/veloria/constants.mjs';
import { produceAllHdPacks, produceHdPack } from './lib/veloria/hd-factory.mjs';
import { produceRefinedHeroPack } from './lib/veloria/hero-refinement.mjs';
import { buildFxSpec, buildUiSpec, VELORIA_PALETTE } from './lib/veloria/procedural-builders.mjs';
import { writeJson } from './lib/veloria/io.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildAgentHdPlaybookMarkdown } from './lib/veloria/agent-hd-playbook.mjs';
import { buildRoadmapArtifacts } from './lib/veloria/roadmap.mjs';

const wsUrl = (rel) => `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;

async function ensureExtraPacks(registry, results) {
  const uiFx = [
    { key: 'blessing_card', dir: '03_assets/ui/ui__blessing-card', kind: 'ui' },
    { key: 'hp_orb', dir: '03_assets/ui/ui__hp-orb', kind: 'ui' },
    { key: 'holy_slash', dir: '03_assets/fx/fx__holy-slash', kind: 'fx' },
    { key: 'collapse', dir: '03_assets/fx/fx__collapse-hazard', kind: 'fx' },
  ];

  for (const item of uiFx) {
    const packRoot = item.dir;
    const spec = item.kind === 'ui' ? buildUiSpec(item.key) : buildFxSpec(item.key);
    const outDir = join(WORKSPACE_ROOT, packRoot, '06_exports');
    await mkdir(outDir, { recursive: true });
    const png = join(outDir, `${item.key}.png`);
    await writeAssetSpecPng(spec, png, { profile: 'high' });
    registry.push({
      id: item.key,
      family: item.kind,
      path: png,
      url: wsUrl(`${packRoot}/06_exports/${item.key}.png`),
      source: 'procedural_hd:veloria',
    });
    results.push({ atlasUrl: wsUrl(`${packRoot}/06_exports/${item.key}.png`) });
  }
}

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

async function generateAudio(registry) {
  const audioDir = join(WORKSPACE_ROOT, '03_assets', 'audio');
  await mkdir(audioDir, { recursive: true });
  await writeFile(join(audioDir, 'bgm_run_tension.wav'), generateMusicLoopWav(4200));
  registry.push({ id: 'bgm_run_tension', family: 'audio', path: join(audioDir, 'bgm_run_tension.wav'), source: 'procedural:music' });
  for (const ev of ['attack', 'dash', 'blessing', 'hazard', 'boss_hit', 'ui_confirm']) {
    const p = join(audioDir, `sfx_${ev}.wav`);
    await writeFile(p, generateSfxWav(ev === 'attack' ? 'hit' : ev === 'blessing' ? 'collect' : ev));
    registry.push({ id: `sfx_${ev}`, family: 'audio', path: p, source: 'procedural:sfx' });
  }
}

async function main() {
  console.log('— Veloria HD Asset Factory (vectoriel CPU, sans GPU) —\n');

  const targets = ALL_ASSETS.filter((a) => a.pack_root);
  console.log(`Packs à produire : ${targets.length}\n`);

  const registry = [];
  const hdResults = [];
  for (const asset of targets) {
    process.stdout.write(`  ▸ ${asset.title.padEnd(28)}`);
    const result =
      asset.role === 'hero' ? await produceRefinedHeroPack(asset) : await produceHdPack(asset);
    hdResults.push(result);
  }

  console.log('\n');
  for (const r of hdResults) {
    console.log(`  ✓ ${r.asset.title} — ${r.frameCount} frames → ${r.manifest.atlas.image}`);
    registry.push({
      id: r.asset.key,
      asset_id: r.asset.id,
      family: r.asset.role,
      pack_root: r.asset.pack_root,
      path: r.masterPath,
      atlas: r.manifest.atlas.url,
      frame_count: r.frameCount,
      source: 'procedural_hd_pipeline_03_06',
    });
  }

  await ensureExtraPacks(registry, hdResults);
  await generateAudio(registry);

  const regPath = join(WORKSPACE_ROOT, '03_assets', 'registry', 'generated-assets-hd.json');
  await writeJson(regPath, {
    project: PROJECT_SLUG,
    generated_at: new Date().toISOString(),
    method: 'procedural_hd_vector + pipeline stages 03-06',
    palette: VELORIA_PALETTE,
    counts: {
      heroes: HEROES.length,
      enemies: ENEMIES.length,
      bosses: BOSSES.length,
      environments: ENVIRONMENTS.length,
      total_packs: hdResults.length,
    },
    assets: registry,
  });

  const gdlPath = await wireGdl(hdResults);

  await writeFile(
    join(WORKSPACE_ROOT, '08_ops', 'manifests', 'hd-asset-factory-playbook.md'),
    buildAgentHdPlaybookMarkdown(),
    'utf8',
  );

  const roadmap = await buildRoadmapArtifacts(hdResults.length, { sprintBComplete: true });
  console.log(`\n✓ Registre HD : ${wsUrl('03_assets/registry/generated-assets-hd.json')}`);
  console.log(`✓ GDL câblé : ${gdlPath}`);
  console.log(`✓ Playbook agents : 08_ops/manifests/hd-asset-factory-playbook.md`);
  console.log(`✓ Roadmap : ${roadmap.statusPath} (${roadmap.completion_pct}% phase assets)`);
  console.log(`\nTotal artefacts HD : ${registry.length}`);
}

main().catch((e) => {
  console.error('ECHEC:', e);
  process.exit(1);
});
