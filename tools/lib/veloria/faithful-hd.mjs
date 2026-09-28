/**
 * Veloria — Usine d'assets HD FIDÈLES (sans GPU, sans vectoriel).
 *
 * Principe : les planches concept SONT l'art HD. On en extrait chaque entité
 * (crop précis) puis on détoure le fond par un matte « feather » qui préserve
 * intégralement le personnage (y compris les costumes sombres) et fond les bords
 * dans le noir de l'arène. Déterministe, rejouable, 100% CPU via sharp.
 *
 * Sortie par pack :
 *   06_exports/combat_sprite.png  → sprite fidèle détouré (héros/ennemis/boss/soutiens)
 *   06_exports/portrait.png       → portrait carré (hub / cartes)
 *   06_exports/arena_bg.png       → fond d'arène 2,5D (environnements)
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { WORKSPACE_ROOT, REFERENCES_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { HEROES, SUPPORTS, ENEMIES, BOSSES, ENVIRONMENTS } from './data.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

// ── Crops calibrés (normalisés sur la planche 1448×1086) ──────────────────────
// Héroïnes : pose principale isolée (la legacy capturait 2 poses + texte).
const HERO_CROPS = {
  // Auréline vient de la planche gameplay : même silhouette vue de dos que la cible.
  aureline: { board: 'gameplay_mobile_aureline.png', crop: { x: 0.405, y: 0.405, w: 0.178, h: 0.250 } },
  morgane:  { board: 'gameplay_phase_elite_morgane.png', crop: { x: 0.445, y: 0.405, w: 0.235, h: 0.255 } },
  selka:    { board: 'personnages_principaux_v2.png', crop: { x: 0.356, y: 0.135, w: 0.140, h: 0.305 } },
  isolde:   { board: 'personnages_principaux_v2.png', crop: { x: 0.506, y: 0.135, w: 0.148, h: 0.305 } },
  roxane:   { board: 'personnages_principaux_v2.png', crop: { x: 0.664, y: 0.135, w: 0.150, h: 0.305 } },
  liora:    { board: 'personnages_principaux_v2.png', crop: { x: 0.828, y: 0.135, w: 0.150, h: 0.305 } },
};

// Ennemis : sources nettes — 3 dans la scène de combat (gameplay), 2 dans les vignettes
// « Ennemi Principal » de l'environments board. (Les crops legacy capturaient le HUD/texte.)
const ENEMY_CROPS = {
  tomb_hound:     { board: 'gameplay_mobile_aureline.png', crop: { x: 0.347, y: 0.245, w: 0.092, h: 0.140 } },
  fallen_knight:  { board: 'gameplay_mobile_aureline.png', crop: { x: 0.448, y: 0.130, w: 0.105, h: 0.270 } },
  gargoyle:       { board: 'gameplay_mobile_aureline.png', crop: { x: 0.552, y: 0.135, w: 0.110, h: 0.245 } },
  fanatic_sister: { board: 'planches_environnements.png', crop: { x: 0.430, y: 0.376, w: 0.070, h: 0.082 }, m: { top: 0.05, side: 0.05, bottom: 0.12 } },
  shadow_acolyte: { board: 'planches_environnements.png', crop: { x: 0.430, y: 0.792, w: 0.070, h: 0.078 }, m: { top: 0.05, side: 0.05, bottom: 0.14 } },
};

const BOSS_CROPS = {
  bourreau: {
    board: 'gameplay_phase_elite_morgane.png',
    crop: { x: 0.465, y: 0.122, w: 0.150, h: 0.205 },
    m: { top: 0.08, side: 0.09, bottom: 0.08, tlText: false },
  },
};

// Environnements : vignettes « PLAN 3 LANES » des planches. Elles sont les seules
// sources sans titres, personnages ou HUD et fixent exactement la caméra de jeu.
const ENV_BOARD = 'planches_environnements.png';
const HUB_CROP = { x: 0.276, y: 0.094, w: 0.350, h: 0.310 };
const ENV_CROPS = {
  ruined_cloister:   { x: 0.211, y: 0.152, w: 0.092, h: 0.195 },
  pyre_road:         { x: 0.491, y: 0.152, w: 0.088, h: 0.195 },
  statue_garden:     { x: 0.752, y: 0.152, w: 0.087, h: 0.195 },
  drowned_port:      { x: 0.209, y: 0.557, w: 0.094, h: 0.190 },
  candle_crypt:      { x: 0.489, y: 0.557, w: 0.091, h: 0.190 },
  crepuscule_throne: { x: 0.752, y: 0.557, w: 0.087, h: 0.190 },
};

function boardPath(file) {
  const p = join(REFERENCES_ROOT, file);
  if (existsSync(p)) return p;
  // fallback source brute
  return p;
}

function wsUrl(rel) {
  return `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;
}

function smooth(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Matte « feather » sur buffer RGBA brut.
 * - Garde le personnage intégralement (centre = opaque plein).
 * - Fond les bords (haut/gauche/droite/bas) dans la transparence.
 * - Suppression douce des pixels quasi-noirs en périphérie (fond planche).
 */
function featherMatte(data, w, h, o = {}) {
  const { top = 0.12, bottom = 0.05, side = 0.07, darkFloor = 26, darkSoft = 70, tlText = true } = o;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const fx = x / w, fy = y / h;
      const aL = smooth(0, side * 1.25, fx);
      const aR = smooth(0, side, 1 - fx);
      const aT = smooth(0, top, fy);
      const aB = smooth(0, bottom, 1 - fy);
      let a = Math.min(aL, aR, aT, aB);
      if (tlText) {
        // atténue le bloc RÔLE/ARCHÉTYPE/étoiles (haut-gauche) sans toucher la tête (centrée)
        const tl = smooth(0.52, 0.2, fx) * smooth(0.34, 0.12, fy);
        a *= 1 - 0.98 * tl;
      }
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let darkA = smooth(darkFloor, darkSoft, lum);
      const centerKeep = smooth(0.42, 0.5, Math.min(fx, 1 - fx));
      darkA = Math.max(darkA, centerKeep);
      a *= 0.35 + 0.65 * darkA;
      data[i + 3] = Math.round(255 * a);
    }
  }
  return data;
}

function cropWH(crop) {
  return { cw: crop.w ?? crop.width, ch: crop.h ?? crop.height };
}

async function extractRegion(board, crop) {
  const meta = await sharp(board).metadata();
  const W = meta.width, H = meta.height;
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.max(0, Math.round(crop.x * W)),
    top: Math.max(0, Math.round(crop.y * H)),
    width: Math.min(W, Math.round(cw * W)),
    height: Math.min(H, Math.round(ch * H)),
  };
  return sharp(board).extract(ext).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Sprite combat fidèle détouré. */
async function buildCombatSprite(asset, crop, board, matteOpts, maxW) {
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const exportsDir = join(packRoot, '06_exports');
  await mkdir(exportsDir, { recursive: true });
  const { data, info } = await extractRegion(board, crop);
  featherMatte(data, info.width, info.height, matteOpts);
  const out = join(exportsDir, 'combat_sprite.png');
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: maxW, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.65, m1: 0.8, m2: 1.6 })
    .png()
    .toFile(out);

  // portrait carré (recadré sur le buste) pour hub/cartes
  const portrait = join(exportsDir, 'portrait.png');
  const side = Math.min(info.width, Math.round(info.height * 0.62));
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: Math.round((info.width - side) / 2), top: Math.round(info.height * 0.06), width: side, height: side })
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(portrait);

  return {
    key: asset.key,
    combat_sprite: wsUrl(`${asset.pack_root}/06_exports/combat_sprite.png`),
    portrait: wsUrl(`${asset.pack_root}/06_exports/portrait.png`),
    w: maxW,
    h: Math.round((maxW / info.width) * info.height),
  };
}

/** Fond d'arène 2,5D : scène fidèle plein écran + plancher de profondeur + vignette. */
async function buildArenaBg(asset, crop, board) {
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const exportsDir = join(packRoot, '06_exports');
  await mkdir(exportsDir, { recursive: true });
  const W = 720, H = 1280;
  const meta = await sharp(board).metadata();
  const { cw, ch } = cropWH(crop);
  const ext = {
    left: Math.round(crop.x * meta.width),
    top: Math.round(crop.y * meta.height),
    width: Math.round(cw * meta.width),
    height: Math.round(ch * meta.height),
  };

  // Plan de jeu canonique → upscale HD. Aucun texte ni acteur n'est cuit dedans.
  const scene = await sharp(board)
    .extract(ext)
    .resize(W, H, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 0.92, saturation: 1.08 })
    .sharpen({ sigma: 0.7, m1: 0.7, m2: 1.4 })
    .toBuffer();

  // overlays : voile sombre + halo violet bas + plancher de profondeur
  const horizon = 110, ground = 973;
  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#07060a" stop-opacity="0.42"/>
          <stop offset="0.35" stop-color="#07060a" stop-opacity="0.05"/>
          <stop offset="0.72" stop-color="#07060a" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#05040a" stop-opacity="0.58"/>
        </linearGradient>
        <radialGradient id="vign" cx="0.5" cy="0.46" r="0.75">
          <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
        </radialGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1224" stop-opacity="0.0"/>
          <stop offset="1" stop-color="#241a30" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <rect width="${W}" height="${H}" fill="url(#vign)"/>
      <!-- plancher de perspective : trapèze qui converge vers l'horizon -->
      <polygon points="${W * 0.5 - 60},${horizon} ${W * 0.5 + 60},${horizon} ${W + 120},${ground} ${-120},${ground}" fill="url(#floor)" opacity="0.48"/>
      <rect x="0" y="${ground}" width="${W}" height="${H - ground}" fill="#0c0912" fill-opacity="0.42"/>
    </svg>`,
  );

  const out = join(exportsDir, 'arena_bg.png');
  await sharp(scene)
    .composite([{ input: overlay, blend: 'over' }])
    .png()
    .toFile(out);

  return { key: asset.key, arena_bg: wsUrl(`${asset.pack_root}/06_exports/arena_bg.png`) };
}

export async function generateFaithfulHdAssets(onProgress = () => {}) {
  const manifest = {
    generated_at: new Date().toISOString(),
    method: 'faithful_board_cutout_cpu',
    note: 'Découpe fidèle des planches concept + matte feather. Zéro vectoriel, zéro GPU.',
    combat_sprites: {},
    portraits: {},
    arenas: {},
  };

  // Héroïnes — crops calibrés sur la planche roster
  for (const hero of HEROES) {
    onProgress(`héroïne ${hero.key}`);
    const source = HERO_CROPS[hero.key];
    const r = await buildCombatSprite(
      hero,
      source.crop,
      boardPath(source.board),
      { top: 0.12, side: 0.07, tlText: source.board === 'personnages_principaux_v2.png' },
      380,
    );
    manifest.combat_sprites[hero.key] = r.combat_sprite;
    manifest.portraits[hero.key] = r.portrait;
  }

  // Soutiens / Ennemis / Boss — crops dédiés + matte
  const others = [
    ...SUPPORTS.map((a) => ({ a, maxW: 300, m: { top: 0.1, side: 0.08, tlText: false } })),
    ...ENEMIES.map((a) => ({ a, maxW: 300, m: { top: 0.08, side: 0.06, tlText: false } })),
    ...BOSSES.map((a) => ({ a, maxW: 460, m: { top: 0.08, side: 0.06, tlText: false } })),
  ];
  for (const { a, maxW, m } of others) {
    onProgress(`${a.role ?? 'asset'} ${a.key}`);
    const override = ENEMY_CROPS[a.key] ?? BOSS_CROPS[a.key];
    const crop = override?.crop ?? a.crop;
    const board = boardPath(override?.board ?? a.board);
    const matteOpts = { ...m, ...(override?.m ?? {}) };
    try {
      const r = await buildCombatSprite(a, crop, board, matteOpts, maxW);
      manifest.combat_sprites[a.key] = r.combat_sprite;
      manifest.portraits[a.key] = r.portrait;
    } catch (err) {
      onProgress(`  ⚠ ${a.key}: ${err.message}`);
    }
  }

  // Environnements — fonds d'arène 2,5D
  for (const env of ENVIRONMENTS) {
    onProgress(`arène ${env.key}`);
    const isHub = env.key === 'pavillon_veilles';
    const crop = isHub ? HUB_CROP : (ENV_CROPS[env.key] ?? env.crop);
    const board = boardPath(isHub ? env.board : (ENV_CROPS[env.key] ? ENV_BOARD : env.board));
    try {
      const r = await buildArenaBg(env, crop, board);
      manifest.arenas[env.key] = r.arena_bg;
    } catch (err) {
      onProgress(`  ⚠ ${env.key}: ${err.message}`);
    }
  }

  return manifest;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('faithful-hd.mjs');
if (isMain) {
  console.log('═══ Veloria — assets HD FIDÈLES (découpe planches, no-GPU) ═══\n');
  const m = await generateFaithfulHdAssets((s) => console.log('  ·', s));
  console.log(`\n✓ ${Object.keys(m.combat_sprites).length} sprites combat fidèles`);
  console.log(`✓ ${Object.keys(m.arenas).length} arènes 2,5D`);
}
