import { join } from 'node:path';
import { homedir } from 'node:os';

const GENERATED_ROOT = join(
  homedir(),
  '.codex',
  'generated_images',
  '019edafd-2e25-7162-a023-04e3bd5cc41d',
);

export const sporelingProductionSpec = {
  assetId: 'sporeling',
  externalSource: join(
    GENERATED_ROOT,
    'ig_0d13015f4cac2d81016a36d4c1d9688191ad1beaa3525790a5.png',
  ),
  editorialReference: join(
    GENERATED_ROOT,
    'ig_04284f88a7868a69016a36d0a4b6cc8191a53d65a101555d75.png',
  ),
  workspaceSource: join('01_source', 'sporeling_hd_sheet_source.png'),
  workspaceEditorialReference: join('01_source', 'sporeling_hd_sheet_reference.png'),
  alphaSheet: join('03_cleanup', 'sporeling_hd_sheet_alpha.png'),
  preview: join('03_cleanup', 'sporeling_hd_master_preview.png'),
  atlasImage: join('06_exports', 'sporeling_hd_pose_atlas.png'),
  atlasJson: join('06_exports', 'sporeling_hd_pose_atlas.json'),
  runtimeManifest: join('06_exports', 'sporeling_hd_runtime_manifest.json'),
  clipManifest: join('05_animation', 'sporeling_hd_clip_sequences.json'),
  poseCuts: [
    {
      id: 'sporeling_hd_master_preview',
      box: { x: 0.02, y: 0.13, width: 0.31, height: 0.71 },
      output: join('03_cleanup', 'sporeling_hd_master_preview.png'),
      includeInAtlas: false,
      role: 'preview',
    },
    {
      id: 'sporeling_hd_idle',
      box: { x: 0.40, y: 0.18, width: 0.14, height: 0.28 },
      output: join('02_cutouts', 'sporeling_hd_idle.png'),
      includeInAtlas: true,
      clip: 'idle',
    },
    {
      id: 'sporeling_hd_walk',
      box: { x: 0.56, y: 0.18, width: 0.18, height: 0.30 },
      output: join('02_cutouts', 'sporeling_hd_walk.png'),
      includeInAtlas: true,
      clip: 'walk',
    },
    {
      id: 'sporeling_hd_leap',
      box: { x: 0.76, y: 0.14, width: 0.18, height: 0.31 },
      output: join('02_cutouts', 'sporeling_hd_leap.png'),
      includeInAtlas: true,
      clip: 'double_jump',
    },
    {
      id: 'sporeling_hd_slash',
      box: { x: 0.34, y: 0.55, width: 0.24, height: 0.26 },
      output: join('02_cutouts', 'sporeling_hd_slash.png'),
      includeInAtlas: true,
      clip: 'slash_attack',
    },
    {
      id: 'sporeling_hd_cast',
      box: { x: 0.58, y: 0.53, width: 0.18, height: 0.27 },
      output: join('02_cutouts', 'sporeling_hd_cast.png'),
      includeInAtlas: true,
      clip: 'spore_pulse',
    },
    {
      id: 'sporeling_hd_death',
      box: { x: 0.80, y: 0.68, width: 0.18, height: 0.15 },
      output: join('02_cutouts', 'sporeling_hd_death.png'),
      includeInAtlas: true,
      clip: 'death',
    },
  ],
};

export const rootGuardianProductionSpec = {
  assetId: 'root_guardian',
  externalSource: join(
    GENERATED_ROOT,
    'ig_0d13015f4cac2d81016a36d531b80881918c5065388912609f.png',
  ),
  editorialReference: join(
    GENERATED_ROOT,
    'ig_04284f88a7868a69016a36d1d1aaa88191b8b8e589df863ba3.png',
  ),
  workspaceSource: join('01_source', 'root_guardian_hd_sheet_source.png'),
  workspaceEditorialReference: join('01_source', 'root_guardian_hd_sheet_reference.png'),
  alphaSheet: join('03_cleanup', 'root_guardian_hd_sheet_alpha.png'),
  preview: join('03_cleanup', 'root_guardian_hd_master_preview.png'),
  atlasImage: join('06_exports', 'root_guardian_hd_phase_atlas.png'),
  atlasJson: join('06_exports', 'root_guardian_hd_phase_atlas.json'),
  runtimeManifest: join('06_exports', 'root_guardian_hd_runtime_manifest.json'),
  clipManifest: join('05_animation', 'root_guardian_hd_phase_clips.json'),
  poseCuts: [
    {
      id: 'root_guardian_hd_master_preview',
      box: { x: 0.02, y: 0.03, width: 0.43, height: 0.70 },
      output: join('03_cleanup', 'root_guardian_hd_master_preview.png'),
      includeInAtlas: false,
      role: 'preview',
    },
    {
      id: 'phase_01_sentinel_hd',
      box: { x: 0.49, y: 0.14, width: 0.16, height: 0.41 },
      output: join('02_cutouts', 'phase_01_sentinel_hd.png'),
      includeInAtlas: true,
      clip: 'phase_01_sentinel',
    },
    {
      id: 'phase_02_mycelium_hd',
      box: { x: 0.64, y: 0.12, width: 0.18, height: 0.44 },
      output: join('02_cutouts', 'phase_02_mycelium_hd.png'),
      includeInAtlas: true,
      clip: 'phase_02_mycelium',
    },
    {
      id: 'phase_03_network_heart_hd',
      box: { x: 0.80, y: 0.12, width: 0.19, height: 0.45 },
      output: join('02_cutouts', 'phase_03_network_heart_hd.png'),
      includeInAtlas: true,
      clip: 'phase_03_network_heart',
    },
    {
      id: 'root_guardian_hd_face_closeup',
      box: { x: 0.49, y: 0.69, width: 0.15, height: 0.28 },
      output: join('02_cutouts', 'root_guardian_hd_face_closeup.png'),
      includeInAtlas: false,
      role: 'detail',
    },
    {
      id: 'root_guardian_hd_core_closeup',
      box: { x: 0.65, y: 0.69, width: 0.15, height: 0.28 },
      output: join('02_cutouts', 'root_guardian_hd_core_closeup.png'),
      includeInAtlas: false,
      role: 'detail',
    },
    {
      id: 'root_guardian_hd_claw_closeup',
      box: { x: 0.82, y: 0.69, width: 0.14, height: 0.28 },
      output: join('02_cutouts', 'root_guardian_hd_claw_closeup.png'),
      includeInAtlas: false,
      role: 'detail',
    },
  ],
};
