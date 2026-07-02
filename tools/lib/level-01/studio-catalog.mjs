import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BOSS_PACK_ROOT, ENEMY_PACK_ROOT, ENVIRONMENT_LEVEL_ROOT, REFERENCES_ROOT, REGISTRY_ROOT } from './constants.mjs';
import { cropBoardRegion } from './crop-utils.mjs';
import { writeJson } from './io.mjs';

const PROJECT_ID = '8c1d9d74-9d59-4d05-a6ab-111111111111';

function previewSource(assetId, filePath, metadata = {}) {
  return {
    id: `${assetId.slice(0, 8)}-0000-4000-8000-${assetId.slice(-12)}`,
    asset_id: assetId,
    source_type: 'concept_reference',
    url: `/workspaces/echoes-of-the-mushroom-realm/${filePath.replace(/\\/g, '/')}`,
    file_path: filePath.replace(/\\/g, '/'),
    metadata,
  };
}

function asset(id, role, kind, title, status, spec = {}) {
  return {
    id,
    project_id: PROJECT_ID,
    kind,
    role,
    title,
    status,
    source_prompt:
      'Board-derived preview locked to Echoes level 01. Keep painterly fungal dark fantasy, readable silhouettes, glowing spores, ruined stone, and weapon-choice / boss-gate progression.',
    spec,
  };
}

function pickPreviewPath(preferredPath, fallbackPath) {
  const absolutePreferred = join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', preferredPath);
  return existsSync(absolutePreferred) ? preferredPath : fallbackPath;
}

export async function buildStudioCatalog() {
  const mylaPreviewPath = join('03_assets', 'characters', 'npc__myla-guide', '02_cutouts', 'myla_keyart.png');
  const altarPreviewPath = join('03_assets', 'props', 'prop__weapon-altar-and-checkpoints', '02_cutouts', 'weapon_altars_showcase.png');
  const gatePreviewPath = join('03_assets', 'props', 'prop__weapon-altar-and-checkpoints', '02_cutouts', 'checkpoint_gate_reference.png');
  const fxPreviewPath = join('03_assets', 'fx', 'fx__spore-combat-pack', '02_cutouts', 'spore_fx_reference.png');
  const uiPreviewPath = join('03_assets', 'ui', 'ui__menu-hud-shell', '02_cutouts', 'menu_ui_reference.png');

  await cropBoardRegion(
    join(REFERENCES_ROOT, 'main_cast_board.png'),
    join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', mylaPreviewPath),
    { x: 0.03, y: 0.32, width: 0.29, height: 0.28 },
    { trim: false, padding: 0 },
  );
  await cropBoardRegion(
    join(REFERENCES_ROOT, 'level_test_01_board.png'),
    join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', altarPreviewPath),
    { x: 0.19, y: 0.54, width: 0.61, height: 0.18 },
    { trim: false, padding: 0 },
  );
  await cropBoardRegion(
    join(REFERENCES_ROOT, 'sporale_cliffs_board.png'),
    join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', gatePreviewPath),
    { x: 0.47, y: 0.50, width: 0.18, height: 0.24 },
    { trim: false, padding: 0 },
  );
  await cropBoardRegion(
    join(REFERENCES_ROOT, 'boss_guardian_board.png'),
    join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', fxPreviewPath),
    { x: 0.74, y: 0.39, width: 0.12, height: 0.16 },
    { trim: false, padding: 0 },
  );
  await cropBoardRegion(
    join(REFERENCES_ROOT, 'menu_keyart.jpeg'),
    join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', uiPreviewPath),
    { x: 0.0, y: 0.05, width: 0.28, height: 0.34 },
    { trim: false, padding: 0 },
  );

  const sporelingPreview = pickPreviewPath(
    join('03_assets', 'characters', 'enemy__sporeling-family', '03_cleanup', 'sporeling_hd_master_preview.png'),
    join('03_assets', 'characters', 'enemy__sporeling-family', '02_cutouts', 'sporeling_keyart.png'),
  );
  const rootGuardianPreview = pickPreviewPath(
    join('03_assets', 'characters', 'boss__root-guardian-boss', '03_cleanup', 'root_guardian_hd_master_preview.png'),
    join('03_assets', 'characters', 'boss__root-guardian-boss', '02_cutouts', 'root_guardian_keyart.png'),
  );

  const assets = [
    asset('71000000-0000-4000-8000-000000000001', 'hero', 'character', 'The Echo', 'source_ready', {
      pack_root: '03_assets/characters/hero__the-echo-main-hero',
      quality_tier: 'board-derived cutout',
    }),
    asset('71000000-0000-4000-8000-000000000002', 'guide', 'character', 'Myla', 'concept', {
      pack_root: '03_assets/characters/npc__myla-guide',
      quality_tier: 'board crop reference',
    }),
    asset('71000000-0000-4000-8000-000000000003', 'enemy', 'character', 'Sporeling', existsSync(join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'characters', 'enemy__sporeling-family', '03_cleanup', 'sporeling_hd_master_preview.png')) ? 'hd_sheet_ready' : 'source_ready', {
      pack_root: '03_assets/characters/enemy__sporeling-family',
      quality_tier: existsSync(join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'characters', 'enemy__sporeling-family', '03_cleanup', 'sporeling_hd_master_preview.png')) ? 'transparent hd sheet' : 'board-derived portrait',
    }),
    asset('71000000-0000-4000-8000-000000000004', 'enemy', 'character', 'Rampore', 'source_ready', {
      pack_root: '03_assets/characters/enemy__sporeling-family',
      quality_tier: 'board-derived portrait',
    }),
    asset('71000000-0000-4000-8000-000000000005', 'enemy', 'character', 'Porteur Sporeal', 'source_ready', {
      pack_root: '03_assets/characters/enemy__sporeling-family',
      quality_tier: 'board-derived portrait',
    }),
    asset('71000000-0000-4000-8000-000000000006', 'enemy', 'character', 'Chevalier Fongique', 'source_ready', {
      pack_root: '03_assets/characters/enemy__sporeling-family',
      quality_tier: 'board-derived portrait',
    }),
    asset('71000000-0000-4000-8000-000000000007', 'enemy', 'character', 'Moussu Furieux', 'source_ready', {
      pack_root: '03_assets/characters/enemy__sporeling-family',
      quality_tier: 'board-derived portrait',
    }),
    asset('71000000-0000-4000-8000-000000000008', 'boss', 'character', 'Root Guardian', existsSync(join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'characters', 'boss__root-guardian-boss', '03_cleanup', 'root_guardian_hd_master_preview.png')) ? 'hd_sheet_ready' : 'in_progress', {
      pack_root: '03_assets/characters/boss__root-guardian-boss',
      quality_tier: existsSync(join(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'characters', 'boss__root-guardian-boss', '03_cleanup', 'root_guardian_hd_master_preview.png')) ? 'transparent hd sheet' : 'board-derived boss pack',
    }),
    asset('71000000-0000-4000-8000-000000000009', 'environment', 'environment', 'Origin Tree level kit', 'source_ready', {
      pack_root: '03_assets/environments/environment__origin-tree-level-kit',
      quality_tier: 'board-derived environment kit',
    }),
    asset('71000000-0000-4000-8000-000000000010', 'tileset', 'tileset', 'First level modular cliffs kit', 'source_ready', {
      pack_root: '03_assets/environments/level_01',
      quality_tier: 'board-derived modular references',
    }),
    asset('71000000-0000-4000-8000-000000000011', 'altar', 'prop', 'Weapon altars showcase', 'source_ready', {
      pack_root: '03_assets/props/prop__weapon-altar-and-checkpoints',
      quality_tier: 'board-derived prop reference',
    }),
    asset('71000000-0000-4000-8000-000000000012', 'checkpoint', 'prop', 'Checkpoint and gate set', 'source_ready', {
      pack_root: '03_assets/props/prop__weapon-altar-and-checkpoints',
      quality_tier: 'board-derived prop reference',
    }),
    asset('71000000-0000-4000-8000-000000000013', 'ui', 'ui', 'Menu and HUD shell', 'concept', {
      pack_root: '03_assets/ui/ui__menu-hud-shell',
      quality_tier: 'keyart UI direction',
    }),
    asset('71000000-0000-4000-8000-000000000014', 'music', 'audio', 'Origin Tree sound pack', 'concept', {
      pack_root: '03_assets/audio/audio__origin-tree-sound-pack',
      quality_tier: 'audio system pack',
    }),
    asset('71000000-0000-4000-8000-000000000015', 'fx', 'fx', 'Spore combat FX pack', 'source_ready', {
      pack_root: '03_assets/fx/fx__spore-combat-pack',
      quality_tier: 'board-derived FX direction',
    }),
  ];

  const assetSources = [
    previewSource('71000000-0000-4000-8000-000000000001', '03_assets/characters/hero__the-echo-main-hero/03_cleanup/cutout_clean.png', {
      source: 'hero cutout',
    }),
    previewSource('71000000-0000-4000-8000-000000000002', mylaPreviewPath, { source: 'main cast board crop' }),
    previewSource('71000000-0000-4000-8000-000000000003', sporelingPreview, { source: sporelingPreview.includes('hd_master') ? 'transparent hd sheet preview' : 'enemy board crop' }),
    previewSource('71000000-0000-4000-8000-000000000004', '03_assets/characters/enemy__sporeling-family/02_cutouts/rampore_keyart.png', { source: 'enemy board crop' }),
    previewSource('71000000-0000-4000-8000-000000000005', '03_assets/characters/enemy__sporeling-family/02_cutouts/porteur_sporeal_keyart.png', { source: 'enemy board crop' }),
    previewSource('71000000-0000-4000-8000-000000000006', '03_assets/characters/enemy__sporeling-family/02_cutouts/chevalier_fongique_keyart.png', { source: 'enemy board crop' }),
    previewSource('71000000-0000-4000-8000-000000000007', '03_assets/characters/enemy__sporeling-family/02_cutouts/moussu_furieux_keyart.png', { source: 'enemy board crop' }),
    previewSource('71000000-0000-4000-8000-000000000008', rootGuardianPreview, { source: rootGuardianPreview.includes('hd_master') ? 'transparent hd sheet preview' : 'boss board crop' }),
    previewSource('71000000-0000-4000-8000-000000000009', '03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png', { source: 'environment playfield crop' }),
    previewSource('71000000-0000-4000-8000-000000000010', '03_assets/environments/level_01/decor_modules/modular_tiles_reference.png', { source: 'modular level board crop' }),
    previewSource('71000000-0000-4000-8000-000000000011', altarPreviewPath, { source: 'weapon trial board crop' }),
    previewSource('71000000-0000-4000-8000-000000000012', gatePreviewPath, { source: 'interactive decor board crop' }),
    previewSource('71000000-0000-4000-8000-000000000013', uiPreviewPath, { source: 'menu keyart crop' }),
    previewSource('71000000-0000-4000-8000-000000000015', fxPreviewPath, { source: 'boss board fx crop' }),
  ];

  const catalog = {
    project_id: PROJECT_ID,
    generated_at: new Date().toISOString(),
    intent: 'Use board-derived previews in Studio instead of low-fidelity procedural placeholders.',
    assets,
    asset_sources: assetSources,
  };

  await writeJson(join(REGISTRY_ROOT, 'studio-asset-catalog.json'), catalog);
  return catalog;
}
