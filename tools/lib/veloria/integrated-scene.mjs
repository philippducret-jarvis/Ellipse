/**
 * Veloria — scène de combat intégrée depuis planches (board_master).
 */
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { WORKSPACE_ROOT, REFERENCES_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { extractBoardRegion, extractBoardActor, writeIntegratedManifest } from '../hd-faithful/integrated-scene.mjs';

const OUT = join(WORKSPACE_ROOT, '03_assets', 'integrated');
const ASSET_BASE = `${PUBLIC_WORKSPACE_ROOT}/03_assets/integrated`;

const GAMEPLAY_BOARD = join(REFERENCES_ROOT, 'gameplay_mobile_aureline.png');
const W = 720, H = 1280;

const HERO_BOARD = 'personnages_principaux_v2.png';
const HERO_CROPS = {
  aureline: { x: 0.030, y: 0.135, w: 0.150, h: 0.305 },
  morgane: { x: 0.196, y: 0.135, w: 0.146, h: 0.305 },
  selka: { x: 0.356, y: 0.135, w: 0.140, h: 0.305 },
  isolde: { x: 0.506, y: 0.135, w: 0.148, h: 0.305 },
  roxane: { x: 0.664, y: 0.135, w: 0.150, h: 0.305 },
  liora: { x: 0.828, y: 0.135, w: 0.150, h: 0.305 },
};

const ENEMY_CROPS = {
  tomb_hound: { board: 'gameplay_mobile_aureline.png', crop: { x: 0.347, y: 0.245, w: 0.092, h: 0.140 } },
  fallen_knight: { board: 'gameplay_mobile_aureline.png', crop: { x: 0.448, y: 0.130, w: 0.105, h: 0.270 } },
  gargoyle: { board: 'gameplay_mobile_aureline.png', crop: { x: 0.552, y: 0.135, w: 0.110, h: 0.245 } },
  fanatic_sister: { board: 'planches_environnements.png', crop: { x: 0.430, y: 0.376, w: 0.070, h: 0.082 } },
  shadow_acolyte: { board: 'planches_environnements.png', crop: { x: 0.430, y: 0.792, w: 0.070, h: 0.078 } },
};

/** Arène niveau 1 = scène combat complète de la planche gameplay mobile. */
const ARENA_CROP = { x: 0.04, y: 0.06, w: 0.92, h: 0.88 };

export async function generateVeloriaIntegratedScene() {
  await mkdir(join(OUT, 'scene'), { recursive: true });
  await mkdir(join(OUT, 'actors'), { recursive: true });

  const arena = await extractBoardRegion(GAMEPLAY_BOARD, ARENA_CROP,
    join(OUT, 'scene', 'combat_arena_integrated.png'), { width: W, height: H, fit: 'cover' });

  const actors = [];
  for (const [key, crop] of Object.entries(HERO_CROPS)) {
    const board = join(REFERENCES_ROOT, HERO_BOARD);
    const r = await extractBoardActor(board, crop, join(OUT, 'actors', `hero_${key}.png`), { maxH: 280 });
    actors.push({ id: key, role: 'hero', asset: `${ASSET_BASE}/actors/hero_${key}.png`, w: r.w, h: r.h });
  }

  for (const [kind, spec] of Object.entries(ENEMY_CROPS)) {
    const board = join(REFERENCES_ROOT, spec.board);
    const r = await extractBoardActor(board, spec.crop, join(OUT, 'actors', `${kind}.png`), { maxH: 180 });
    actors.push({ id: kind, role: 'enemy', kind, asset: `${ASSET_BASE}/actors/${kind}.png`, w: r.w, h: r.h });
  }

  const manifest = {
    method: 'board_integrated_scene_cpu',
    game: 'veloria-veille-des-lames',
    generatedAt: new Date().toISOString(),
    principle: 'Planche gameplay = arène intégrée ; acteurs = régions board_master.',
    scene: {
      combat_arena: { asset: `${ASSET_BASE}/scene/combat_arena_integrated.png`, width: W, height: H, source: 'gameplay_mobile_aureline.png' },
    },
    actors,
    render: { mode: 'integrated_arena', collision: 'lane_data', actorBlend: 'source-over' },
  };

  await writeIntegratedManifest(join(OUT, 'integrated-manifest.json'), manifest);
  return manifest;
}
