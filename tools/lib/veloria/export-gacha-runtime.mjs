/**
 * Export assets runtime GACHA — combat_sprite, arena_bg plein écran, manifest UI.
 * Corrige le gap preview vs concept art (sprites carte → sprites combat, arènes HD).
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ALL_ASSETS } from './data.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT, PROJECT_SLUG } from './constants.mjs';
import { writeJson } from './io.mjs';
import { writeAssetSpecPng } from '../../../packages/pipeline/dist/index.js';
import { buildUiSpec, VELORIA_PALETTE } from './procedural-builders.mjs';

const require = createRequire(import.meta.url);
const sharp = require('../../../packages/pipeline/node_modules/sharp');

const W = 720;
const H = 1280;

function wsUrl(rel) {
  return `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;
}

async function firstExisting(paths) {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Héros/ennemis/boss : un sprite combat large (pas grille carte gacha). */
async function exportCombatSprite(asset) {
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const exportsDir = join(packRoot, '06_exports');
  await mkdir(exportsDir, { recursive: true });
  const out = join(exportsDir, 'combat_sprite.png');

  const src = await firstExisting([
    join(packRoot, '03_cleanup', 'silhouette_hd_master.png'),
    join(packRoot, '03_cleanup', 'silhouette-clean.png'),
    join(packRoot, '03_cleanup', 'board_frame.png'),
    join(packRoot, '03_cleanup', 'board_hd_normalized.png'),
    join(WORKSPACE_ROOT, asset.preview_file ?? ''),
  ]);
  if (!src) return null;

  const targetH = asset.role === 'boss' ? 320 : asset.role === 'hero' ? 280 : asset.role === 'enemy' ? 160 : 140;
  const targetW = asset.role === 'boss' ? 240 : asset.role === 'hero' ? 200 : 120;

  await sharp(src)
    .rotate()
    .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .sharpen({ sigma: 0.6 })
    .png()
    .toFile(out);

  return { path: out, url: wsUrl(`${asset.pack_root}/06_exports/combat_sprite.png`), w: targetW, h: targetH };
}

/** Arènes : fond plein écran 720×1280 cover (comme mockup mobile). */
async function exportArenaBg(asset) {
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const exportsDir = join(packRoot, '06_exports');
  await mkdir(exportsDir, { recursive: true });
  const out = join(exportsDir, 'arena_bg.png');

  const src = await firstExisting([
    join(packRoot, '03_cleanup', 'silhouette_hd_master.png'),
    join(packRoot, '03_cleanup', 'board_frame.png'),
    join(packRoot, '05_animation', 'static_0.png'),
    join(WORKSPACE_ROOT, asset.preview_file ?? ''),
  ]);
  if (!src) return null;

  await sharp(src)
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.85, saturation: 1.1 })
    .png()
    .toFile(out);

  await copyFile(out, join(exportsDir, 'runtime_atlas.png')).catch(() => {});

  return { path: out, url: wsUrl(`${asset.pack_root}/06_exports/arena_bg.png`) };
}

/** HUD combat : découpe fidèle de la planche gameplay (fallback procédural). */
async function exportCombatHud() {
  const packRoot = join(WORKSPACE_ROOT, '03_assets/ui/ui__combat-hud-shell');
  const exportsDir = join(packRoot, '06_exports');
  await mkdir(exportsDir, { recursive: true });
  const out = join(exportsDir, 'hud_overlay.png');

  const hudAsset = ALL_ASSETS.find((a) => a.key === 'combat_hud');
  const boardSrc = join(WORKSPACE_ROOT, '01_inputs/references/gameplay_mobile_aureline.png');
  if (hudAsset?.crop && existsSync(boardSrc)) {
    const meta = await sharp(boardSrc).metadata();
    const c = hudAsset.crop;
    const ext = {
      left: Math.round(c.x * meta.width),
      top: Math.round(c.y * meta.height),
      width: Math.round(c.width * meta.width),
      height: Math.round(c.height * meta.height),
    };
    await sharp(boardSrc)
      .extract(ext)
      .resize(W, H, { fit: 'fill' })
      .ensureAlpha()
      .png()
      .toFile(out);
    return { url: wsUrl('03_assets/ui/ui__combat-hud-shell/06_exports/hud_overlay.png'), source: 'board:gameplay_mobile_aureline' };
  }

  const spec = buildUiSpec('combat_hud');
  spec.palette = VELORIA_PALETTE;
  spec.layout = { width: W, height: H, transparent: true };
  await writeAssetSpecPng(spec, out, { profile: 'high' });
  return { url: wsUrl('03_assets/ui/ui__combat-hud-shell/06_exports/hud_overlay.png'), source: 'procedural:fallback' };
}

/** Cartes bénédiction procédurales (3 variantes). */
async function exportBlessingCards() {
  const dir = join(WORKSPACE_ROOT, '03_assets/ui/ui__blessing-cards');
  await mkdir(dir, { recursive: true });
  const cards = [];
  for (const id of ['sacred', 'divine', 'iron']) {
    const spec = buildUiSpec('blessing_card');
    spec.palette = VELORIA_PALETTE;
    const rel = `03_assets/ui/ui__blessing-cards/${id}.png`;
    const path = join(WORKSPACE_ROOT, rel);
    await writeAssetSpecPng(spec, path, { profile: 'high' });
    cards.push({ id, url: wsUrl(rel) });
  }
  return cards;
}

export async function exportGachaRuntimeAssets() {
  const manifest = {
    generated_at: new Date().toISOString(),
    project: PROJECT_SLUG,
    combat_sprites: {},
    arena_backgrounds: {},
    ui: {},
  };

  for (const asset of ALL_ASSETS) {
    if (['hero', 'enemy', 'boss', 'companion'].includes(asset.role)) {
      try {
        const r = await exportCombatSprite(asset);
        if (r) manifest.combat_sprites[asset.key] = r;
      } catch (err) {
        console.warn(`  combat_sprite ${asset.key}:`, err.message);
      }
    }
    if (asset.role === 'environment') {
      try {
        const r = await exportArenaBg(asset);
        if (r) manifest.arena_backgrounds[asset.key] = r;
      } catch (err) {
        console.warn(`  arena_bg ${asset.key}:`, err.message);
      }
    }
  }

  try {
    manifest.ui.hud = await exportCombatHud();
    manifest.ui.blessing_cards = await exportBlessingCards();
  } catch (err) {
    console.warn('  ui gacha:', err.message);
  }

  const outPath = join(WORKSPACE_ROOT, '08_ops', 'manifests', 'gacha-runtime-manifest.json');
  await mkdir(join(WORKSPACE_ROOT, '08_ops', 'manifests'), { recursive: true });
  await writeJson(outPath, manifest);

  return manifest;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('export-gacha-runtime.mjs');
if (isMain) {
  console.log('═══ Export runtime GACHA (combat + arènes HD) ═══\n');
  const m = await exportGachaRuntimeAssets();
  console.log(`✓ ${Object.keys(m.combat_sprites).length} combat sprites`);
  console.log(`✓ ${Object.keys(m.arena_backgrounds).length} arènes HD`);
  console.log('✓ gacha-runtime-manifest.json');
}
