import { join } from 'node:path';
import { environmentCutSpecs } from './board-specs.mjs';
import { REFERENCE_FILES, ENVIRONMENT_LEVEL_ROOT } from './constants.mjs';
import { cropBoardRegion } from './crop-utils.mjs';
import { writeJson } from './io.mjs';

export async function buildEnvironmentLevelPack() {
  const outputs = [];
  for (const spec of environmentCutSpecs) {
    const outPath = join(ENVIRONMENT_LEVEL_ROOT, spec.outputDir, `${spec.id}.png`);
    const result = await cropBoardRegion(REFERENCE_FILES[spec.source], outPath, spec.box, { trim: false, padding: 0 });
    outputs.push({
      id: spec.id,
      file: `03_assets/environments/level_01/${spec.outputDir}/${spec.id}.png`,
      source: spec.source,
      width: result.width,
      height: result.height,
    });
  }

  const manifest = {
    source: 'ellipse-level01-environment-v1',
    board_lock: ['level_test_01_board', 'level_test_01_alt_board', 'sporale_cliffs_board', 'world_map_board'],
    modules: outputs,
    composition: {
      awakening: 'awakening_module',
      descent: 'descent_module',
      weapon_trial: 'weapon_trial_module',
      final_choice: 'final_altar_module',
      progression_strip: 'progression_strip',
    },
    parallax_layers: [
      '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_far.png',
      '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_mid.png',
      '03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png',
      '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/foreground_glow.png',
    ],
    tile_references: {
      modular_tiles: '03_assets/environments/level_01/decor_modules/modular_tiles_reference.png',
      interactive_decor: '03_assets/environments/level_01/decor_modules/interactive_decor_reference.png',
      dynamic_elements: '03_assets/environments/level_01/decor_modules/dynamic_elements_reference.png',
      lighting_variants: '03_assets/environments/level_01/decor_modules/lighting_variants_reference.png',
    },
    ambience_profiles: [
      { id: 'awakening', palette: ['#20243a', '#37537b', '#6b63d1', '#75d8ff'] },
      { id: 'battlefield', palette: ['#342635', '#6b3b4d', '#c84d58', '#f3c674'] },
      { id: 'altar_final', palette: ['#260b18', '#7e132a', '#ff3d53', '#f2d9ad'] },
    ],
  };

  await writeJson(join(ENVIRONMENT_LEVEL_ROOT, 'first_level_environment_manifest.json'), manifest);
  return manifest;
}

