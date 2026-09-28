/**
 * Echoes of the Mushroom Realm — générateur HD FIDÈLE (side-scroller 2,5D).
 *
 * Chaque entité provient de SA planche dédiée (pas de teinte/recyclage).
 * Parallax depuis level_test_01 ; tiles de plateformes depuis sporale_cliffs.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { cutoutSprite, sharp } from '../hd-faithful/matte.mjs';

const ROOT = process.cwd();
const REF = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm', '01_inputs', 'references');
const OUT = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm', '03_assets', 'faithful');
const ASSET_BASE = '/workspaces/echoes-of-the-mushroom-realm/03_assets/faithful';

const BOARDS = {
  hero: join(REF, 'hero_echo_front.png'),
  cast: join(REF, 'main_cast_board.png'),
  enemy: join(REF, 'enemy_family_board.png'),
  sporeling: join(REF, 'sporeling_detail_board.png'),
  boss: join(REF, 'boss_guardian_board.png'),
  level: join(REF, 'level_test_01_board.png'),
  modular: join(REF, 'sporale_cliffs_board.png'),
  tutorial: join(REF, 'tutorial_overview_board.png'),
  menu: join(REF, 'menu_keyart.jpeg'),
  world: join(REF, 'world_map_board.png'),
};

const ENEMY_FEATHER = {
  top: 0.08, side: 0.06, bottom: 0.05, vignette: true,
  darkKeep: 0.1, centerKeepW: 0.42, alphaClean: [0.18, 0.45],
};

const BOSS_TEXT = [{ x0: 0.6, y0: 0.86, x1: 1.01, y1: 1.01, feather: 0.03 }];

/** Table de sprites : une planche par entité, crops calibrés sur les boards fournis. */
const SPRITES = [
  // héros — planche dédiée front (flood sur fond clair)
  {
    id: 'hero', board: BOARDS.hero, crop: { x: 0.04, y: 0.02, w: 0.92, h: 0.96 },
    mode: 'flood', matte: { tol: 72, edgeFeather: 0.04 }, maxW: 240, flip: false,
  },
  // ennemis — planches enemy_family + sporeling_detail (keyarts du level-01 pack)
  {
    id: 'enemy_sporeling', kind: 'sporeling', board: BOARDS.sporeling,
    crop: { x: 0.145, y: 0.035, w: 0.145, h: 0.31 }, mode: 'feather', matte: ENEMY_FEATHER, maxW: 230,
  },
  {
    id: 'enemy_rampore', kind: 'rampore', board: BOARDS.enemy,
    crop: { x: 0.165, y: 0.045, w: 0.105, h: 0.17 }, mode: 'feather', matte: ENEMY_FEATHER, maxW: 230,
  },
  {
    id: 'enemy_porteur_sporeal', kind: 'porteur_sporeal', board: BOARDS.enemy,
    crop: { x: 0.165, y: 0.285, w: 0.105, h: 0.165 }, mode: 'feather', matte: ENEMY_FEATHER, maxW: 230,
  },
  {
    id: 'enemy_chevalier_fongique', kind: 'chevalier_fongique', board: BOARDS.enemy,
    crop: { x: 0.12, y: 0.49, w: 0.095, h: 0.14 }, mode: 'feather', matte: ENEMY_FEATHER, maxW: 240,
  },
  {
    id: 'enemy_moussu_furieux', kind: 'moussu_furieux', board: BOARDS.enemy,
    crop: { x: 0.115, y: 0.69, w: 0.105, h: 0.128 }, mode: 'feather', matte: ENEMY_FEATHER, maxW: 250,
  },
  // boss — planche gardien des racines
  {
    id: 'boss_root_guardian', kind: 'root_guardian_boss', board: BOARDS.boss,
    crop: { x: 0.17, y: 0.035, w: 0.275, h: 0.305 },
    mode: 'feather',
    matte: { top: 0.06, side: 0.06, bottom: 0.06, textErase: BOSS_TEXT, vignette: true,
      darkKeep: 0.12, centerKeepW: 0.45, alphaClean: [0.2, 0.46] },
    maxW: 360, modulate: { brightness: 1.22, saturation: 1.1 },
  },
];

// Panorama niveau 01 — bande horizontale des 4 modules (planche level_test_01)
const PANORAMA = { x: 0.008, y: 0.405, w: 0.984, h: 0.205 };
// Strip de tiles modulaires (planche sporale_cliffs, bas de planche)
const MODULAR_TILES = { x: 0, y: 0.505, w: 0.325, h: 0.24 };
const LEVEL_W = 4096;
const VIEW_H = 720;

async function genSprites(report) {
  for (const s of SPRITES) {
    const outPath = join(OUT, `${s.id}.png`);
    const r = await cutoutSprite(s.board, s.crop, outPath, {
      mode: s.mode, matte: s.matte, maxW: s.maxW, flip: !!s.flip,
    });
    if (s.modulate) {
      const buf = await sharp(outPath).modulate(s.modulate).toBuffer();
      await sharp(buf).png().toFile(outPath);
    }
    report.sprites.push({
      id: s.id, kind: s.kind ?? null,
      asset: `${ASSET_BASE}/${s.id}.png`, w: r.w, h: r.h,
    });
  }
}

async function genParallax(report) {
  const meta = await sharp(BOARDS.tutorial).metadata();
  const ext = {
    left: Math.round(PANORAMA.x * meta.width),
    top: Math.round(PANORAMA.y * meta.height),
    width: Math.round(PANORAMA.w * meta.width),
    height: Math.round(PANORAMA.h * meta.height),
  };
  const outPath = join(OUT, 'playfield.png');
  const scaledHeight = Math.round(ext.height * (LEVEL_W / ext.width));
  const verticalPad = Math.max(0, VIEW_H - scaledHeight);
  await sharp(BOARDS.tutorial)
    .extract(ext)
    .resize({ width: LEVEL_W, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.35 })
    .extend({
      top: Math.floor(verticalPad / 2),
      bottom: Math.ceil(verticalPad / 2),
      background: { r: 5, g: 7, b: 10, alpha: 1 },
    })
    .resize(LEVEL_W, VIEW_H, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toFile(outPath);
  await copyFile(BOARDS.menu, join(OUT, 'menu_keyart.jpeg'));
  await copyFile(BOARDS.world, join(OUT, 'world_map_board.png'));
  await copyFile(BOARDS.boss, join(OUT, 'boss_guardian_board.png'));
  report.parallax = {
    playfield: { asset: `${ASSET_BASE}/playfield.png`, factor: 1, width: LEVEL_W, height: VIEW_H },
  };
  report.screens = {
    menu: { asset: `${ASSET_BASE}/menu_keyart.jpeg`, source: 'menu_keyart.jpeg' },
    world_map: { asset: `${ASSET_BASE}/world_map_board.png`, source: 'world_map_board.png' },
    boss_reference: { asset: `${ASSET_BASE}/boss_guardian_board.png`, source: 'boss_guardian_board.png', runtimeEligible: false },
  };
}

/** Extrait une tranche horizontale de la planche tiles modulaires → tile répétable. */
async function extractPlatformSlice(sliceIndex, sliceCount, outName, targetH) {
  const meta = await sharp(BOARDS.modular).metadata();
  const ext = {
    left: Math.round(MODULAR_TILES.x * meta.width),
    top: Math.round(MODULAR_TILES.y * meta.height),
    width: Math.round(MODULAR_TILES.w * meta.width),
    height: Math.round(MODULAR_TILES.h * meta.height),
  };
  const { data, info } = await sharp(BOARDS.modular).extract(ext).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sliceW = Math.max(8, Math.floor(info.width / sliceCount));
  const sx = sliceIndex * sliceW;
  const outPath = join(OUT, outName);
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: sx, top: 0, width: Math.min(sliceW, info.width - sx), height: info.height })
    .resize({ height: targetH, withoutEnlargement: false })
    .sharpen({ sigma: 0.4 })
    .png()
    .toFile(outPath);
  const outMeta = await sharp(outPath).metadata();
  return { asset: `${ASSET_BASE}/${outName}`, w: outMeta.width ?? sliceW, h: outMeta.height ?? targetH };
}

async function genPlatformTiles(report) {
  report.platforms = {
    ground: await extractPlatformSlice(0, 3, 'platform_ground.png', 88),
    float: await extractPlatformSlice(1, 3, 'platform_float.png', 22),
    altar: await extractPlatformSlice(2, 3, 'platform_altar.png', 20),
  };
}

export async function generateEchoesFaithfulHd() {
  await mkdir(OUT, { recursive: true });
  const report = {
    method: 'faithful_board_cutout_cpu',
    game: 'echoes-of-the-mushroom-realm',
    generatedAt: new Date().toISOString(),
    board_sources: {
      hero: 'hero_echo_front.png',
      enemies: 'enemy_family_board.png + sporeling_detail_board.png',
      boss: 'boss_guardian_board.png',
      playfield: 'tutorial_overview_board.png (clean level-map strip)',
      menu: 'menu_keyart.jpeg (byte-identical copy)',
      world_map: 'world_map_board.png (byte-identical copy)',
      platforms: 'sporale_cliffs_board.png (modular tiles strip)',
    },
    sprites: [],
    parallax: null,
    screens: null,
    platforms: null,
  };
  await genSprites(report);
  await genParallax(report);
  await genPlatformTiles(report);

  const byKind = {};
  for (const s of report.sprites) if (s.kind) byKind[s.kind] = s.asset;
  const heroEntry = report.sprites.find((s) => s.id === 'hero');
  const manifest = {
    method: report.method,
    game: report.game,
    generatedAt: report.generatedAt,
    board_sources: report.board_sources,
    hero: { asset: heroEntry.asset, w: heroEntry.w, h: heroEntry.h, facing: 'right' },
    enemies: byKind,
    sprites: report.sprites,
    parallax: report.parallax,
    screens: report.screens,
    platforms: report.platforms,
    level: { width: LEVEL_W, viewHeight: VIEW_H },
  };
  await writeFile(join(OUT, 'faithful-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
