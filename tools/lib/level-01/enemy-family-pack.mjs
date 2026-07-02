import { join } from 'node:path';
import { enemyCutSpecs } from './board-specs.mjs';
import { REFERENCE_FILES, ENEMY_PACK_ROOT } from './constants.mjs';
import { cropBoardRegion } from './crop-utils.mjs';
import { writeJson, writeText } from './io.mjs';
import { readJson } from './io.mjs';

function sourceRef(role, fileName, sourcePath) {
  return {
    role,
    source: sourcePath,
    workspace_file: `01_inputs/references/${fileName}`,
    url: `/workspaces/echoes-of-the-mushroom-realm/01_inputs/references/${fileName}`,
  };
}

export async function buildEnemyFamilyPack() {
  const outputs = [];

  for (const spec of enemyCutSpecs) {
    const target = join(ENEMY_PACK_ROOT, '02_cutouts', `${spec.id}.png`);
    const result = await cropBoardRegion(REFERENCE_FILES[spec.source], target, spec.box);
    outputs.push({
      id: spec.id,
      enemy: spec.enemy,
      category: spec.category,
      file: `03_assets/characters/enemy__sporeling-family/02_cutouts/${spec.id}.png`,
      width: result.width,
      height: result.height,
      source: spec.source,
      extract: result.extract,
    });
  }

  const lineup = outputs.filter((entry) => entry.category === 'keyart').map((entry) => ({
    id: entry.enemy,
    label: entry.enemy.replaceAll('_', ' '),
    portrait: entry.file,
  }));

  const hdSheet = await readJson(join(ENEMY_PACK_ROOT, '06_exports', 'sporeling_hd_runtime_manifest.json'));

  const runtimeManifest = {
    source: 'ellipse-level01-enemy-family-v1',
    board_lock: ['enemy_family_board', 'sporeling_detail_board', 'tutorial_overview_board'],
    lineup,
    clips: {
      sporeling: ['idle', 'walk', 'double_jump', 'spore_pulse', 'hit', 'death'],
      rampore: ['idle', 'charge', 'headbutt', 'ground_slam', 'stun', 'death'],
      porteur_sporeal: ['idle', 'walk', 'lob_projectile', 'burst_sack', 'hit', 'death'],
      chevalier_fongique: ['idle', 'guard', 'slash_combo', 'dash_cut', 'parry', 'death'],
      moussu_furieux: ['idle', 'vine_whip', 'grapple', 'burrow_burst', 'rooted_stagger', 'death'],
    },
    combat_roles: {
      sporeling: 'swarm and pressure',
      rampore: 'frontline charger',
      porteur_sporeal: 'projectile and denial',
      chevalier_fongique: 'elite duelist',
      moussu_furieux: 'control bruiser',
    },
    level01_usage: {
      awakening: [],
      descent: ['sporeling'],
      battlefield: ['sporeling', 'rampore', 'porteur_sporeal'],
      weapon_trial: ['sporeling', 'rampore'],
      boss_foyer: ['chevalier_fongique', 'moussu_furieux'],
    },
    production_upgrades: {
      sporeling: hdSheet
        ? {
            tier: hdSheet.production_tier,
            preview: hdSheet.preview,
            atlas: hdSheet.atlas,
            atlas_manifest: hdSheet.atlas_manifest,
            pose_frames: hdSheet.pose_frames,
          }
        : null,
      remaining_family_members: ['rampore', 'porteur_sporeal', 'chevalier_fongique', 'moussu_furieux'],
    },
  };

  const motionMatrix = {
    source: 'ellipse-level01-enemy-family-v1',
    movement_profiles: [
      { id: 'sporeling', jump_arc: 'short', pressure: 'group harass', weak_to: 'fire' },
      { id: 'rampore', jump_arc: 'none', pressure: 'single lane charge', weak_to: 'air control' },
      { id: 'porteur_sporeal', jump_arc: 'short', pressure: 'mid-range denial', weak_to: 'interrupt' },
      { id: 'chevalier_fongique', jump_arc: 'dash only', pressure: 'timed melee', weak_to: 'perfect parry' },
      { id: 'moussu_furieux', jump_arc: 'heavy', pressure: 'zone control', weak_to: 'fire and mobility' },
    ],
  };

  const qa = {
    source: 'ellipse-level01-enemy-family-v1',
    extracted_cells: outputs.length,
    warnings: [
      'Enemy reference crops come from annotated boards and remain presentation-grade inputs.',
      'Sporeling now includes a transparent HD sheet and atlas, but the rest of the family still needs the same upgrade pass.',
    ],
    blockers: [],
  };

  const sourceSnapshot = {
    source_refs: [
      sourceRef('enemy_board', 'enemy_family_board.png', REFERENCE_FILES.enemyBoard),
      sourceRef('enemy_detail', 'sporeling_detail_board.png', REFERENCE_FILES.sporelingBoard),
      sourceRef('tutorial_overview', 'tutorial_overview_board.png', REFERENCE_FILES.tutorialBoard),
    ],
    generated_at: new Date().toISOString(),
    outputs: outputs.map((entry) => entry.file),
  };

  const workOrderPath = join(ENEMY_PACK_ROOT, '08_remote_jobs', 'production.workorder.json');
  const workOrder = {
    asset_id: 'synthetic-1',
    asset_title: 'Sporeling enemy family',
    role: 'enemy',
    kind: 'character',
    asset_root: '03_assets/characters/enemy__sporeling-family',
    status: 'source_ready',
    execution_profile: ['cpu_local', 'remote_gpu_optional'],
    assigned_agents: ['asset_direction', 'animation', 'gameplay_programming', 'qa', 'build_release'],
    source_refs: sourceSnapshot.source_refs,
    expected_outputs: [
      '02_cutouts/*.png',
      '04_rig/enemy_family_motion_matrix.json',
      '05_animation/enemy_family_attack_patterns.json',
      '06_exports/enemy_runtime_manifest.json',
      '07_qa/enemy_family_qa.json',
    ],
    stages: [
      { id: 'reference_lock', title: 'Reference lock', status: 'done', agents: ['asset_direction'], preferred_tools: ['board-cutter'], quality_gates: ['Reference board linked'] },
      { id: 'generation', title: 'Generation', status: 'done', agents: ['asset_direction', 'animation'], preferred_tools: ['board-cutter', 'sam2', 'rembg'], quality_gates: ['Output bundle exists'] },
      { id: 'runtime_export', title: 'Runtime export', status: 'in_progress', agents: ['build_release', 'gameplay_programming'], preferred_tools: ['aseprite_export'], quality_gates: ['Manifest registered'] },
    ],
    queue_state: 'in_progress',
  };

  await writeJson(join(ENEMY_PACK_ROOT, '01_source', 'source.snapshot.json'), sourceSnapshot);
  await writeJson(join(ENEMY_PACK_ROOT, '04_rig', 'enemy_family_motion_matrix.json'), motionMatrix);
  await writeJson(join(ENEMY_PACK_ROOT, '05_animation', 'enemy_family_attack_patterns.json'), runtimeManifest.clips);
  await writeJson(join(ENEMY_PACK_ROOT, '06_exports', 'enemy_runtime_manifest.json'), runtimeManifest);
  await writeJson(join(ENEMY_PACK_ROOT, '07_qa', 'enemy_family_qa.json'), qa);
  await writeJson(workOrderPath, workOrder);
  await writeText(
    join(ENEMY_PACK_ROOT, 'README.md'),
    `# Sporeling enemy family\n\n- Role: enemy family\n- Kind: character\n- Statut: source_ready\n\nThis pack is locked to the Echoes level-01 combat boards and provides board-derived portraits, motion coverage notes, and runtime usage for the first playable level.\n`,
  );

  return {
    runtimeManifest,
    outputs: outputs.map((entry) => entry.file),
    workOrderPath,
  };
}
