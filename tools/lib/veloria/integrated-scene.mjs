/**
 * Golden reference Veloria extraite de la planche gameplay.
 *
 * Cette image sert uniquement à la comparaison QA. Elle contient volontairement
 * HUD, acteurs et cartes de bénédiction et ne doit donc jamais être chargée par
 * le runtime ni utilisée comme atlas.
 */
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { WORKSPACE_ROOT, REFERENCES_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { extractBoardRegion, writeIntegratedManifest } from '../hd-faithful/integrated-scene.mjs';

const OUT = join(WORKSPACE_ROOT, '03_assets', 'integrated');
const ASSET_BASE = `${PUBLIC_WORKSPACE_ROOT}/03_assets/integrated`;
const GAMEPLAY_BOARD = join(REFERENCES_ROOT, 'gameplay_mobile_aureline.png');
const REFERENCE_CROP = { x: 0.30, y: 0.025, w: 0.41, h: 0.92 };

export async function generateVeloriaIntegratedScene() {
  await mkdir(join(OUT, 'reference'), { recursive: true });
  const output = join(OUT, 'reference', 'aureline_gameplay_gold.png');
  await extractBoardRegion(GAMEPLAY_BOARD, REFERENCE_CROP, output, {
    width: 720,
    height: 1280,
    fit: 'cover',
  });

  const manifest = {
    method: 'board_golden_reference_cpu',
    game: 'veloria-veille-des-lames',
    generatedAt: new Date().toISOString(),
    shipping: false,
    runtimeEligible: false,
    principle: 'Référence visuelle uniquement — aucun élément de cette capture ne peut être chargé en jeu.',
    reference: {
      aureline_gameplay: {
        asset: `${ASSET_BASE}/reference/aureline_gameplay_gold.png`,
        width: 720,
        height: 1280,
        source: 'gameplay_mobile_aureline.png',
      },
    },
  };

  await writeIntegratedManifest(join(OUT, 'integrated-manifest.json'), manifest);
  return manifest;
}
