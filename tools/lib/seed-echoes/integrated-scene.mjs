/**
 * Echoes — scène intégrée depuis planches (board_master, pas de cutout sprite).
 *
 * Sorties → workspaces/.../03_assets/integrated/
 *   playfield.png          panorama 2304×720 (modules level_test_01)
 *   parallax_far/mid.png   dérivés du playfield
 *   foreground_glow.png    spores/lampes du playfield
 *   actors/*.png           régions de planche (contexte conservé)
 *   integrated-manifest.json
 */
import { join } from 'node:path';
import { enemyCutSpecs } from '../level-01/board-specs.mjs';
import {
  stitchBoardPanorama,
  deriveParallaxFromPlayfield,
  extractForegroundGlow,
  extractBoardActor,
  extractBoardRegion,
  writeIntegratedManifest,
} from '../hd-faithful/integrated-scene.mjs';
import { mkdir } from 'node:fs/promises';

const ROOT = process.cwd();
const REF = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm', '01_inputs', 'references');
const OUT = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'integrated');
const ASSET_BASE = '/workspaces/echoes-of-the-mushroom-realm/03_assets/integrated';

const BOARDS = {
  level: join(REF, 'level_test_01_board.png'),
  hero: join(REF, 'hero_echo_front.png'),
  enemy: join(REF, 'enemy_family_board.png'),
  sporeling: join(REF, 'sporeling_detail_board.png'),
  boss: join(REF, 'boss_guardian_board.png'),
};

const LEVEL_W = 2304;
const VIEW_H = 720;

const ZONE_MODULES = [
  { id: 'awakening', crop: { x: 0, y: 0.07, w: 0.235, h: 0.34 }, widthFrac: 352 / LEVEL_W, zone: 'awakening' },
  { id: 'descent', crop: { x: 0.235, y: 0.07, w: 0.22, h: 0.34 }, widthFrac: 392 / LEVEL_W, zone: 'descent' },
  { id: 'battlefield', crop: { x: 0.455, y: 0.07, w: 0.24, h: 0.34 }, widthFrac: 392 / LEVEL_W, zone: 'battlefield' },
  { id: 'weapon_trial', crop: { x: 0.455, y: 0.07, w: 0.24, h: 0.34 }, widthFrac: 320 / LEVEL_W, zone: 'weapon_trial' },
  { id: 'boss_arena', crop: { x: 0.695, y: 0.07, w: 0.295, h: 0.34 }, widthFrac: 432 / LEVEL_W, zone: 'boss_arena' },
  { id: 'refuge_exit', crop: { x: 0.695, y: 0.07, w: 0.295, h: 0.34 }, widthFrac: 416 / LEVEL_W, zone: 'refuge_exit' },
];

const BOARD_KEY = { sporelingBoard: 'sporeling', enemyBoard: 'enemy', bossBoard: 'boss' };

function enemyBoard(source) {
  return BOARDS[BOARD_KEY[source] ?? 'enemy'];
}

function boxToCrop(box) {
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

async function buildPlayfield(report) {
  await mkdir(join(OUT, 'scene'), { recursive: true });
  const playfieldPath = join(OUT, 'scene', 'playfield.png');
  const pano = await stitchBoardPanorama(BOARDS.level, ZONE_MODULES, playfieldPath, {
    targetWidth: LEVEL_W,
    targetHeight: VIEW_H,
  });
  report.scene.playfield = {
    asset: `${ASSET_BASE}/scene/playfield.png`,
    width: pano.width,
    height: pano.height,
    method: 'board_panorama_stitch',
    zones: ZONE_MODULES.map((z) => ({ id: z.id, zone: z.zone, widthFrac: z.widthFrac })),
  };
}

async function buildDerivedLayers(report) {
  const playfield = join(OUT, 'scene', 'playfield.png');
  const far = await deriveParallaxFromPlayfield(playfield, join(OUT, 'scene', 'parallax_far.png'), { brightness: 0.44, blur: 8 });
  const mid = await deriveParallaxFromPlayfield(playfield, join(OUT, 'scene', 'parallax_mid.png'), { brightness: 0.78, blur: 2.5 });
  const glow = await extractForegroundGlow(playfield, join(OUT, 'scene', 'foreground_glow.png'));
  report.scene.layers = {
    far: { asset: `${ASSET_BASE}/scene/parallax_far.png`, parallax: 0.18, ...far },
    mid: { asset: `${ASSET_BASE}/scene/parallax_mid.png`, parallax: 0.42, ...mid },
    playfield: { asset: `${ASSET_BASE}/scene/playfield.png`, parallax: 1.0, width: LEVEL_W, height: VIEW_H },
    foreground: { asset: `${ASSET_BASE}/scene/foreground_glow.png`, parallax: 1.12, ...glow },
  };
}

async function buildActors(report) {
  await mkdir(join(OUT, 'actors'), { recursive: true });
  const actors = [];

  const hero = await extractBoardActor(BOARDS.hero, { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
    join(OUT, 'actors', 'hero.png'), { maxH: 200 });
  actors.push({ id: 'hero', role: 'player', asset: `${ASSET_BASE}/actors/hero.png`, ...hero, w: hero.w, h: hero.h });

  for (const spec of enemyCutSpecs.filter((s) => s.category === 'keyart' && s.enemy !== 'family')) {
    const r = await extractBoardActor(enemyBoard(spec.source), boxToCrop(spec.box),
      join(OUT, 'actors', `${spec.enemy}.png`), { maxH: spec.enemy === 'root_guardian_boss' ? 320 : 180 });
    actors.push({
      id: spec.enemy, role: 'enemy', kind: spec.enemy,
      asset: `${ASSET_BASE}/actors/${spec.enemy}.png`, w: r.w, h: r.h,
    });
  }

  const boss = await extractBoardActor(BOARDS.boss, { x: 0.135, y: 0.03, w: 0.31, h: 0.31 },
    join(OUT, 'actors', 'root_guardian_boss.png'), { maxH: 300 });
  actors.push({
    id: 'root_guardian_boss', role: 'boss', kind: 'root_guardian_boss',
    asset: `${ASSET_BASE}/actors/root_guardian_boss.png`, w: boss.w, h: boss.h,
  });

  report.actors = actors;
  const byKind = {};
  for (const a of actors) if (a.kind) byKind[a.kind] = a.asset;
  report.actorMap = byKind;
}

/** Bande HUD / menu depuis planche menu si besoin futur. */
async function buildSkyBackdrop(report) {
  const skyPath = join(OUT, 'scene', 'sky_backdrop.png');
  await extractBoardRegion(BOARDS.level, { x: 0, y: 0, w: 1, h: 0.065 }, skyPath, {
    width: LEVEL_W, height: 80, fit: 'cover', position: 'top',
  });
  report.scene.sky = { asset: `${ASSET_BASE}/scene/sky_backdrop.png`, parallax: 0.08, height: 80 };
}

export async function generateEchoesIntegratedScene() {
  await mkdir(OUT, { recursive: true });
  const report = {
    method: 'board_integrated_scene_cpu',
    game: 'echoes-of-the-mushroom-realm',
    generatedAt: new Date().toISOString(),
    principle: 'Planches = scène intégrée ; collision = layout JSON ; pas de matte sprite.',
    scene: {},
    actors: [],
    actorMap: {},
    level: { width: LEVEL_W, viewHeight: VIEW_H },
  };

  await buildPlayfield(report);
  await buildDerivedLayers(report);
  await buildSkyBackdrop(report);
  await buildActors(report);

  const manifest = {
    ...report,
    hero: report.actors.find((a) => a.id === 'hero'),
    enemies: report.actorMap,
    render: {
      mode: 'integrated_panorama',
      collision: 'data_only',
      drawPlatforms: false,
      actorBlend: 'source-over',
    },
  };

  await writeIntegratedManifest(join(OUT, 'integrated-manifest.json'), manifest);
  return manifest;
}
