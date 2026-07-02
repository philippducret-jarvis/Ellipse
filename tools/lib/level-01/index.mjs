import { buildBossPack } from './boss-pack.mjs';
import { buildEnemyFamilyPack } from './enemy-family-pack.mjs';
import { buildEnvironmentLevelPack } from './environment-level-pack.mjs';
import { buildProductionSheets } from './production-sheets.mjs';
import { buildScenePack } from './scene-pack.mjs';
import { buildStudioCatalog } from './studio-catalog.mjs';

export async function buildLevel01Pack() {
  const productionSheets = await buildProductionSheets();
  const [enemyPack, bossPack, environmentPack, scenePack] = await Promise.all([
    buildEnemyFamilyPack(),
    buildBossPack(),
    buildEnvironmentLevelPack(),
    buildScenePack(),
  ]);
  const studioCatalog = await buildStudioCatalog();

  return {
    enemyPack,
    bossPack,
    environmentPack,
    scenePack,
    productionSheets,
    studioCatalog,
  };
}
