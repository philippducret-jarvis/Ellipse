import { join } from 'node:path';
import { bossCutSpecs } from './board-specs.mjs';
import { REFERENCE_FILES, BOSS_PACK_ROOT } from './constants.mjs';
import { cropBoardRegion } from './crop-utils.mjs';
import { readJson, writeJson, writeText } from './io.mjs';

function sourceRef(role, fileName, sourcePath) {
  return {
    role,
    source: sourcePath,
    workspace_file: `01_inputs/references/${fileName}`,
    url: `/workspaces/echoes-of-the-mushroom-realm/01_inputs/references/${fileName}`,
  };
}

export async function buildBossPack() {
  const cuts = [];
  for (const spec of bossCutSpecs) {
    const outPath = join(BOSS_PACK_ROOT, '02_cutouts', `${spec.id}.png`);
    const result = await cropBoardRegion(REFERENCE_FILES[spec.source], outPath, spec.box);
    cuts.push({
      id: spec.id,
      file: `03_assets/characters/boss__root-guardian-boss/02_cutouts/${spec.id}.png`,
      width: result.width,
      height: result.height,
      extract: result.extract,
    });
  }

  const rigSpec = {
    source: 'ellipse-level01-root-guardian-v1',
    skeleton_hint: 'multi-anchor boss cutout',
    anchor_points: [
      { id: 'root_mass', x: 0.5, y: 0.72 },
      { id: 'crown', x: 0.5, y: 0.2 },
      { id: 'left_arm', x: 0.22, y: 0.49 },
      { id: 'right_arm', x: 0.78, y: 0.49 },
      { id: 'core', x: 0.5, y: 0.48 },
    ],
    notes: [
      'Arms should be authored as whip-like limbs with heavy anticipation.',
      'Core exposure drives phase readability and player focus.',
    ],
  };

  const phasePack = {
    source: 'ellipse-level01-root-guardian-v1',
    phases: [
      {
        id: 'phase_01_sentinel',
        hp_window: [1.0, 0.7],
        mood: 'rooted and punitive',
        attacks: ['frappe_racinaire', 'ecrasement', 'jet_de_spores'],
      },
      {
        id: 'phase_02_mycelium',
        hp_window: [0.7, 0.3],
        mood: 'spread control',
        attacks: ['fouet_racinaire', 'invocation_fongique', 'nuage_toxique'],
      },
      {
        id: 'phase_03_network_heart',
        hp_window: [0.3, 0.0],
        mood: 'arena pressure and desperation',
        attacks: ['racines_du_reseau', 'fouet_racinaire', 'ecrasement_final'],
      },
    ],
    arena_flags: ['explosive_mushrooms', 'restore_seed', 'exit_unlock'],
  };

  const hdSheet = await readJson(join(BOSS_PACK_ROOT, '06_exports', 'root_guardian_hd_runtime_manifest.json'));

  const runtimeManifest = {
    source: 'ellipse-level01-root-guardian-v1',
    keyart: hdSheet?.preview ?? '03_assets/characters/boss__root-guardian-boss/02_cutouts/root_guardian_keyart.png',
    phase_frames: phasePack.phases.map((phase) => {
      const hdPhase = hdSheet?.phase_frames?.find((frame) => frame.clip === phase.id);
      return {
        id: phase.id,
        reference: hdPhase?.file ?? `03_assets/characters/boss__root-guardian-boss/02_cutouts/${phase.id}.png`,
        attacks: phase.attacks,
      };
    }),
    reward_drop: ['essence_de_racine', 'fragment_de_spores', 'checkpoint_unlock'],
    level_usage: {
      scene: 'level_01',
      zone: 'boss_arena',
      checkpoint_before: 'guardian_threshold',
      exit_after: 'refuge_exit',
    },
    production_upgrade: hdSheet
      ? {
          tier: hdSheet.production_tier,
          preview: hdSheet.preview,
          atlas: hdSheet.atlas,
          atlas_manifest: hdSheet.atlas_manifest,
          phase_frames: hdSheet.phase_frames,
        }
      : null,
  };

  const qa = {
    source: 'ellipse-level01-root-guardian-v1',
    extracted_cells: cuts.length,
    warnings: [
      'Boss references come from presentation boards with typography and callouts around the art.',
      'Root Guardian now includes a transparent HD sheet and phase atlas, but full gameplay animation still needs an authored rigging pass.',
    ],
    blockers: [],
  };

  const sourceSnapshot = {
    source_refs: [
      sourceRef('boss_board', 'boss_guardian_board.png', REFERENCE_FILES.bossBoard),
      sourceRef('enemy_board', 'enemy_family_board.png', REFERENCE_FILES.enemyBoard),
      sourceRef('character_sheet', 'main_cast_board.png', REFERENCE_FILES.characterSheet),
    ],
    generated_at: new Date().toISOString(),
    outputs: cuts.map((entry) => entry.file),
  };

  const workOrderPath = join(BOSS_PACK_ROOT, '08_remote_jobs', 'production.workorder.json');
  const workOrder = {
    asset_id: '20000000-0000-0000-0000-000000000003',
    asset_title: 'Root Guardian boss',
    role: 'boss',
    kind: 'character',
    asset_root: '03_assets/characters/boss__root-guardian-boss',
    status: 'source_ready',
    execution_profile: ['cpu_local', 'remote_gpu_recommended'],
    assigned_agents: ['producer', 'asset_direction', 'animation', 'gameplay_programming', 'qa', 'build_release'],
    source_refs: sourceSnapshot.source_refs,
    expected_outputs: [
      '02_cutouts/*.png',
      '04_rig/boss_rig_spec.json',
      '05_animation/boss_phase_motion_pack.json',
      '06_exports/boss_runtime_manifest.json',
    ],
    stages: [
      { id: 'intake_and_reference_lock', title: 'Intake and reference lock', status: 'done', agents: ['producer', 'asset_direction'], preferred_tools: ['board-cutter'], quality_gates: ['Reference bundle locked'] },
      { id: 'segmentation_and_cutout', title: 'Segmentation and cutout', status: 'done', agents: ['asset_direction'], preferred_tools: ['board-cutter', 'sam2', 'rembg'], quality_gates: ['Core silhouette extracted'] },
      { id: 'runtime_rig', title: 'Runtime rig', status: 'in_progress', agents: ['animation', 'gameplay_programming'], preferred_tools: ['godot-2d-skeleton'], quality_gates: ['Boss anchor map defined'] },
      { id: 'atlas_and_export', title: 'Atlas and export', status: 'queued', agents: ['build_release'], preferred_tools: ['aseprite-export'], quality_gates: ['Manifest registered'] },
    ],
    queue_state: 'in_progress',
  };

  await writeJson(join(BOSS_PACK_ROOT, '01_source', 'source.snapshot.json'), sourceSnapshot);
  await writeJson(join(BOSS_PACK_ROOT, '04_rig', 'boss_rig_spec.json'), rigSpec);
  await writeJson(join(BOSS_PACK_ROOT, '05_animation', 'boss_phase_motion_pack.json'), phasePack);
  await writeJson(join(BOSS_PACK_ROOT, '06_exports', 'boss_runtime_manifest.json'), runtimeManifest);
  await writeJson(join(BOSS_PACK_ROOT, '07_qa', 'boss_pack_qa.json'), qa);
  await writeJson(workOrderPath, workOrder);
  await writeText(
    join(BOSS_PACK_ROOT, 'README.md'),
    `# Root Guardian boss\n\n- Role: boss\n- Kind: character\n- Statut: source_ready\n\nThis pack is derived from the Echoes boss board and locks the three-phase Root Guardian encounter for level 01.\n`,
  );

  return {
    outputs: cuts.map((entry) => entry.file),
    runtimeManifest,
    workOrderPath,
  };
}
