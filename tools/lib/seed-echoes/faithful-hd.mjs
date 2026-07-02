/**
 * Echoes of the Mushroom Realm — générateur HD FIDÈLE (side-scroller 2,5D).
 *
 * Chaque entité provient de SA planche dédiée (pas de teinte/recyclage).
 * Parallax depuis level_test_01 ; tiles de plateformes depuis sporale_cliffs.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { cutoutSprite, sharp } from '../hd-faithful/matte.mjs';
import { enemyCutSpecs } from '../level-01/board-specs.mjs';

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
};

const BOARD_KEY = {
  sporelingBoard: 'sporeling',
  enemyBoard: 'enemy',
  bossBoard: 'boss',
};

const ENEMY_FEATHER = {
  top: 0.08, side: 0.06, bottom: 0.05, vignette: true,
  darkKeep: 0.1, centerKeepW: 0.42, alphaClean: [0.18, 0.45],
};

const BOSS_TEXT = [{ x0: 0.6, y0: 0.86, x1: 1.01, y1: 1.01, feather: 0.03 }];

function boxToCrop(box) {
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

function enemyBoardPath(source) {
  const key = BOARD_KEY[source] ?? 'enemy';
  return BOARDS[key];
}

/** Table de sprites : une planche par entité, crops calibrés sur les boards fournis. */
const SPRITES = [
  // héros — planche dédiée front (flood sur fond clair)
  {
    id: 'hero', board: BOARDS.hero, crop: { x: 0.04, y: 0.02, w: 0.92, h: 0.96 },
    mode: 'flood', matte: { tol: 72, edgeFeather: 0.04 }, maxW: 240, flip: false,
  },
  // ennemis — planches enemy_family + sporeling_detail (keyarts du level-01 pack)
  ...enemyCutSpecs
    .filter((s) => s.category === 'keyart' && s.enemy !== 'family')
    .map((s) => ({
      id: `enemy_${s.enemy}`,
      kind: s.enemy,
      board: enemyBoardPath(s.source),
      crop: boxToCrop(s.box),
      mode: 'feather',
      matte: { ...ENEMY_FEATHER, textErase: [{ x0: 0, y0: 0, x1: 0.55, y1: 0.18, feather: 0.04 }] },
      maxW: s.enemy === 'chevalier_fongique' ? 240 : s.enemy === 'moussu_furieux' ? 250 : 230,
    })),
  // boss — planche gardien des racines
  {
    id: 'boss_root_guardian', kind: 'root_guardian_boss', board: BOARDS.boss,
    crop: { x: 0.135, y: 0.03, w: 0.31, h: 0.31 },
    mode: 'feather',
    matte: { top: 0.06, side: 0.06, bottom: 0.06, textErase: BOSS_TEXT, vignette: true,
      darkKeep: 0.12, centerKeepW: 0.45, alphaClean: [0.2, 0.46] },
    maxW: 360, modulate: { brightness: 1.22, saturation: 1.1 },
  },
];

// Panorama niveau 01 — bande horizontale des 4 modules (planche level_test_01)
const PANORAMA = { x: 0.012, y: 0.068, w: 0.976, h: 0.355 };
// Strip de tiles modulaires (planche sporale_cliffs, bas de planche)
const MODULAR_TILES = { x: 0, y: 0.505, w: 0.325, h: 0.24 };
const LEVEL_W = 2304;
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

async function parallaxLayer(crop, outPath, { width, height, brightness, blur, alphaRampTop = false }) {
  const meta = await sharp(BOARDS.level).metadata();
  const ext = {
    left: Math.round(crop.x * meta.width), top: Math.round(crop.y * meta.height),
    width: Math.round(crop.w * meta.width), height: Math.round(crop.h * meta.height),
  };
  let pipe = sharp(BOARDS.level).extract(ext)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .modulate({ brightness });
  if (blur > 0) pipe = pipe.blur(blur);
  const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (alphaRampTop) {
    for (let y = 0; y < info.height; y++) {
      const fy = y / info.height;
      const a = fy < 0.55 ? 1 : Math.max(0, 1 - (fy - 0.55) / 0.45);
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4 + 3;
        data[i] = Math.round(data[i] * a);
      }
    }
  }
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(outPath);
  return { width: info.width, height: info.height };
}

async function genParallax(report) {
  const far = await parallaxLayer(PANORAMA, join(OUT, 'parallax_far.png'),
    { width: LEVEL_W, height: VIEW_H, brightness: 0.46, blur: 10 });
  const mid = await parallaxLayer(PANORAMA, join(OUT, 'parallax_mid.png'),
    { width: LEVEL_W, height: VIEW_H, brightness: 0.82, blur: 4 });
  const near = await parallaxLayer(
    { x: PANORAMA.x, y: PANORAMA.y + PANORAMA.h * 0.48, w: PANORAMA.w, h: PANORAMA.h * 0.44 },
    join(OUT, 'parallax_near.png'),
    { width: LEVEL_W, height: 260, brightness: 0.58, blur: 3, alphaRampTop: true },
  );
  report.parallax = {
    far: { asset: `${ASSET_BASE}/parallax_far.png`, factor: 0.22, ...far },
    mid: { asset: `${ASSET_BASE}/parallax_mid.png`, factor: 0.5, ...mid },
    near: { asset: `${ASSET_BASE}/parallax_near.png`, factor: 0.78, yTop: 300, ...near },
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
      parallax: 'level_test_01_board.png',
      platforms: 'sporale_cliffs_board.png (modular tiles strip)',
    },
    sprites: [],
    parallax: null,
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
    platforms: report.platforms,
    level: { width: LEVEL_W, viewHeight: VIEW_H },
  };
  await writeFile(join(OUT, 'faithful-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
