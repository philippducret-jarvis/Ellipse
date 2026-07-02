import { resolve, join } from 'node:path';

export const ROOT_DIR = process.cwd();
export const WORKSPACE_ROOT = resolve(ROOT_DIR, 'workspaces', 'echoes-of-the-mushroom-realm');
export const REFERENCES_ROOT = join(WORKSPACE_ROOT, '01_inputs', 'references');
export const CHARACTERS_ROOT = join(WORKSPACE_ROOT, '03_assets', 'characters');
export const ENVIRONMENTS_ROOT = join(WORKSPACE_ROOT, '03_assets', 'environments');
export const REGISTRY_ROOT = join(WORKSPACE_ROOT, '03_assets', 'registry');
export const LEVEL_SCENE_ROOT = join(WORKSPACE_ROOT, '04_scenes', 'level_01');
export const RUNTIME_CONFIG_ROOT = join(WORKSPACE_ROOT, '05_runtime', 'config');
export const GDL_PATH = join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'echoes.preview.gdl.json');

export const LEVEL_01_WIDTH = 2304;
export const LEVEL_01_HEIGHT = 720;
export const LEVEL_01_GROUND_Y = 632;

export const REFERENCE_FILES = {
  hero: join(REFERENCES_ROOT, 'hero_echo_front.png'),
  worldMap: join(REFERENCES_ROOT, 'world_map_board.png'),
  bossBoard: join(REFERENCES_ROOT, 'boss_guardian_board.png'),
  enemyBoard: join(REFERENCES_ROOT, 'enemy_family_board.png'),
  sporelingBoard: join(REFERENCES_ROOT, 'sporeling_detail_board.png'),
  tutorialBoard: join(REFERENCES_ROOT, 'tutorial_overview_board.png'),
  levelPrimary: join(REFERENCES_ROOT, 'level_test_01_board.png'),
  levelSecondary: join(REFERENCES_ROOT, 'level_test_01_alt_board.png'),
  modularLevel: join(REFERENCES_ROOT, 'sporale_cliffs_board.png'),
  characterSheet: join(REFERENCES_ROOT, 'main_cast_board.png'),
};

export const ENEMY_PACK_ROOT = join(CHARACTERS_ROOT, 'enemy__sporeling-family');
export const BOSS_PACK_ROOT = join(CHARACTERS_ROOT, 'boss__root-guardian-boss');
export const ENVIRONMENT_LEVEL_ROOT = join(ENVIRONMENTS_ROOT, 'level_01');

