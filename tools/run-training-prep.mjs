#!/usr/bin/env node
/**
 * Préparation training Veloria — playtest synthétique, specs NPC/enemy, intent contract.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_ROOT, PROJECT_SLUG } from './lib/veloria/constants.mjs';

const ROOT = process.cwd();

async function loadModule(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href);
}

async function loadGdl() {
  const p = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, 'utf-8'));
}

async function main() {
  console.log('— Training prep Veloria —\n');
  const steps = [];

  const raw = await loadGdl();
  if (!raw) {
    console.error('GDL Veloria introuvable');
    process.exit(1);
  }

  const {
    createDefaultNpcRoutinesPack,
    createSurvivorsEnemyAiPack,
    deriveIntentContract,
    INTENT_CONTRACT_PATH,
    generateNarrative,
    mergeNpcRoutinesIntoGdl,
    normalizeGdlForParse,
    GameDefinitionSchema,
  } = await loadModule('packages/shared/dist/index.js');

  const specsDir = join(WORKSPACE_ROOT, '02_design', 'specs');
  await mkdir(specsDir, { recursive: true });

  const npcPath = join(specsDir, 'npc-routines.json');
  if (!existsSync(npcPath)) {
    await writeFile(npcPath, JSON.stringify(createDefaultNpcRoutinesPack(), null, 2));
    console.log('✓ npc-routines.json créé');
  }
  steps.push({ id: 'npc_specs', ok: true });

  const enemyPath = join(specsDir, 'enemy-ai-pack.json');
  if (!existsSync(enemyPath)) {
    await writeFile(enemyPath, JSON.stringify(createSurvivorsEnemyAiPack(), null, 2));
    console.log('✓ enemy-ai-pack.json créé');
  }
  steps.push({ id: 'enemy_specs', ok: true });

  const intentPath = join(WORKSPACE_ROOT, ...INTENT_CONTRACT_PATH.split('/'));
  if (!existsSync(intentPath)) {
    const contract = deriveIntentContract({
      title: raw.meta?.title ?? 'Veloria — Veille des Lames',
      prompt: 'Veloria survivors portrait dark fantasy',
      genre: raw.meta?.genre ?? 'survivors_like',
      dimension: '2d',
      mechanics: ['lane_runner', 'wave_spawner', 'blessing_draft'],
    });
    await writeFile(intentPath, JSON.stringify(contract, null, 2));
    console.log('✓ intent-contract.json créé');
  }
  steps.push({ id: 'intent', ok: true });

  // Bootstrap GDL : narrative, audio, vfx, balance (sans LLM)
  const gdlPath = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  const gdlRaw = JSON.parse(await readFile(gdlPath, 'utf-8'));
  if (!gdlRaw.narrative || !Object.keys(gdlRaw.narrative).length) {
    const pack = generateNarrative('rpg', 'Veloria Veille des Lames dark fantasy survivors', true);
    pack.dialogues.push(
      { id: 'dlg_boss_intro', speaker: 'Bourreau', text: 'La Veille exige un tribut de sang.', next: 'dlg_boss_taunt' },
      { id: 'dlg_boss_taunt', speaker: 'Bourreau', text: 'Tes lames ne suffiront pas.' },
      { id: 'dlg_merchant_greet', speaker: 'Marchand', text: 'Des reliques pour les braves — choisissez avec sagesse.' },
    );
    pack.quests.push({
      id: 'veloria_survive',
      title: 'Tenir la Veille',
      status: 'active',
      objective: 'Survivre 12 vagues et vaincre le Bourreau du Crépuscule',
    });
    const npcPack = createDefaultNpcRoutinesPack();
    gdlRaw.narrative = mergeNpcRoutinesIntoGdl(pack, npcPack);
    steps.push({ id: 'bootstrap_narrative', ok: true });
    console.log('✓ gdl.narrative bootstrap (3+ dialogues, NPC routines)');
  }
  if (!gdlRaw.audio?.bgm) {
    gdlRaw.audio = {
      bgm: '/workspaces/veloria-veille-des-lames/03_assets/audio/bgm_veloria_loop.wav',
      sfx: {
        jump: 'procedural:jump',
        hit: 'procedural:hit',
        hurt: 'procedural:hurt',
        collect: 'procedural:collect',
        victory: 'procedural:victory',
        draft: 'procedural:draft',
      },
    };
    steps.push({ id: 'bootstrap_audio', ok: true });
    console.log('✓ gdl.audio bootstrap');
  }
  if (!gdlRaw.vfx || !Object.keys(gdlRaw.vfx).length) {
    gdlRaw.vfx = { hazards: { enabled: true }, hit_sparks: { enabled: true }, draft_flash: { enabled: true } };
    steps.push({ id: 'bootstrap_vfx', ok: true });
    console.log('✓ gdl.vfx bootstrap');
  }
  const player = gdlRaw.entities?.find((e) => e.id === 'player');
  if (player) {
    const healthComp = player.components?.find((c) => c.health);
    if (healthComp) {
      healthComp.health.max = 15;
      healthComp.health.current = 15;
    }
  }
  const scene0 = gdlRaw.scenes?.[0];
  if (scene0?.id && gdlRaw.meta?.hazard_scripts?.[scene0.id]) {
    gdlRaw.meta.hazard_scripts[scene0.id].damage_on_active = 0;
  }
  const waves = scene0?.veloria?.encounters?.waves;
  if (waves) {
    for (const wave of waves.slice(0, 4)) {
      for (const group of wave.enemies ?? []) {
        if ((group.count ?? 0) > 2) group.count = 2;
      }
    }
  }
  await writeFile(gdlPath, JSON.stringify(gdlRaw, null, 2), 'utf-8');

  const { runSyntheticPlaytest, loadGdlForPlaytest } = await loadModule('packages/engine/dist/index.js');
  const gdl = loadGdlForPlaytest(normalizeGdlForParse(JSON.parse(await readFile(gdlPath, 'utf-8'))));
  GameDefinitionSchema.parse(gdl);
  const report = runSyntheticPlaytest(gdl, { runs: 24 });
  const playtestPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'synthetic-playtest-report.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeFile(playtestPath, JSON.stringify(report, null, 2), 'utf-8');
  steps.push({ id: 'playtest', ok: true, wins: report.wins, losses: report.losses, win_rate: report.wins / Math.max(report.wins + report.losses, 1) });
  console.log(`✓ Playtest 24 runs — wins ${report.wins}/${report.wins + report.losses} (policy ${report.policy})`);

  const out = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'training-prep-report.json');
  await writeFile(
    out,
    JSON.stringify({ generated_at: new Date().toISOString(), project: PROJECT_SLUG, steps }, null, 2),
    'utf-8',
  );
  console.log(`\n✓ Prep → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
