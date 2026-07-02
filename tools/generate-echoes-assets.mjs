/**
 * Set complet d'assets "Echoes of the Mushroom Realm" — généré par Ellipse, sans GPU.
 *
 * - Héros : détourage de la concept-art fournie (hero_echo_front).
 * - Créatures / props / collectibles / UI / FX / tileset : VECTORIEL THÉMATISÉ (palette fongique,
 *   silhouettes champignon reconnaissables), rastérisé HD CPU.
 * - Fond niveau = board fourni · audio procédural. Câble le GDL + registre.
 */
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractSubject, writeAssetSpecPng } from '../packages/pipeline/dist/index.js';
import { generateSfxWav, generateMusicLoopWav } from '../packages/shared/dist/index.js';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces', 'echoes-of-the-mushroom-realm');
const REF = join(WS, '01_inputs', 'references');
const ASSETS = join(WS, '03_assets');
const wsUrl = (abs) => '/' + abs.replace(ROOT, '').replace(/\\/g, '/').replace(/^\/+/, '');

// Palette fongique de l'univers.
const P = ['#16131f', '#241a30', '#5a3a72', '#9e4f5c', '#5ec7ef', '#f0d9a6', '#c98bdb', '#3a7d5c'];
const registry = [];
const add = (e) => { registry.push({ ...e, url: wsUrl(e.path) }); console.log(`  ✓ ${e.id.padEnd(18)} ${e.source}`); };
const ensure = async (d) => { await mkdir(d, { recursive: true }); return d; };
async function readJson(p) { try { return JSON.parse(await readFile(p, 'utf-8')); } catch { return null; } }

/* ── DSL de formes ── */
const rect = (x, y, w, h, fill, o = {}) => ({ shape: 'rect', x, y, w, h, fill, ...o });
const circ = (cx, cy, r, fill, o = {}) => ({ shape: 'circle', cx, cy, r, fill, ...o });
const elli = (cx, cy, rx, ry, fill, o = {}) => ({ shape: 'ellipse', cx, cy, rx, ry, fill, ...o });
const poly = (points, fill, o = {}) => ({ shape: 'polygon', points, fill, ...o });
const spec = (id, kind, w, h, shapes, bg) => ({ id, kind, width: w, height: h, palette: P, background: bg, layers: [{ id: 'main', shapes }] });

/* ── Builders thématiques ── */

// Champignon générique (cap + stem + pois + lueur sous-cap)
function mushroom(id, capColor, w = 64, h = 64) {
  const cx = w / 2, capY = h * 0.4, capRx = w * 0.36, capRy = h * 0.24, stemW = w * 0.22;
  return spec(id, 'prop', w, h, [
    elli(cx, capY + capRy * 0.7, capRx * 0.85, capRy * 0.25, P[0], { opacity: 0.5 }),
    rect(cx - stemW / 2, capY, stemW, h * 0.45, P[5], { rx: stemW * 0.35 }),
    elli(cx, capY, capRx, capRy, capColor),
    circ(cx - capRx * 0.4, capY - capRy * 0.15, capRx * 0.13, P[5]),
    circ(cx + capRx * 0.35, capY + capRy * 0.1, capRx * 0.1, P[5]),
    circ(cx, capY - capRy * 0.4, capRx * 0.09, P[5]),
  ]);
}

// Créature-champignon (sporeling) : champignon + yeux + petits pieds
function sporeling(id, capColor, w = 64, h = 64) {
  const cx = w / 2, capY = h * 0.34, capRx = w * 0.34, capRy = h * 0.2;
  return spec(id, 'enemy', w, h, [
    elli(cx, h * 0.62, w * 0.26, h * 0.26, P[5]),               // corps
    circ(cx - w * 0.14, h * 0.6, w * 0.07, P[0]),               // oeil g
    circ(cx + w * 0.14, h * 0.6, w * 0.07, P[0]),               // oeil d
    circ(cx - w * 0.14, h * 0.58, w * 0.025, P[4]),             // glint
    circ(cx + w * 0.14, h * 0.58, w * 0.025, P[4]),
    elli(cx - w * 0.12, h * 0.86, w * 0.07, h * 0.05, P[5]),    // pied g
    elli(cx + w * 0.12, h * 0.86, w * 0.07, h * 0.05, P[5]),    // pied d
    elli(cx, capY + capRy * 0.7, capRx * 0.8, capRy * 0.25, P[0], { opacity: 0.5 }),
    elli(cx, capY, capRx, capRy, capColor),                     // chapeau
    circ(cx - capRx * 0.4, capY, capRx * 0.13, P[5]),
    circ(cx + capRx * 0.35, capY + 2, capRx * 0.1, P[5]),
  ]);
}

// Drone de spores flottant : chapeau + œil unique + lueur + spores
function sporeDrone(id, w = 64, h = 64) {
  const cx = w / 2, cy = h * 0.42;
  const spores = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spores.push(circ(cx + Math.cos(a) * w * 0.36, cy + Math.sin(a) * h * 0.36, w * 0.035, P[4], { opacity: 0.85 }));
  }
  return spec(id, 'enemy', w, h, [
    circ(cx, cy, w * 0.42, P[4], { opacity: 0.12 }),
    ...spores,
    elli(cx, cy, w * 0.3, h * 0.2, P[2]),
    elli(cx, cy + h * 0.05, w * 0.26, h * 0.06, P[0], { opacity: 0.5 }),
    circ(cx, cy, w * 0.1, P[4]),
    circ(cx, cy, w * 0.045, P[0]),
  ]);
}

// Boss gardien fongique : grand, plusieurs yeux, couronne de spores
function guardian(id, w = 96, h = 96) {
  const cx = w / 2, capY = h * 0.34, capRx = w * 0.42, capRy = h * 0.26;
  const crown = [];
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * w * 0.16;
    crown.push(elli(x, capY - capRy * 0.7, w * 0.06, h * 0.05, P[6]));
  }
  return spec(id, 'boss', w, h, [
    rect(cx - w * 0.16, capY, w * 0.32, h * 0.5, P[5], { rx: w * 0.06 }),       // tronc
    elli(cx, h * 0.84, w * 0.22, h * 0.05, P[0], { opacity: 0.5 }),
    elli(cx, capY, capRx, capRy, P[3]),                                         // chapeau
    ...crown,
    circ(cx - w * 0.16, capY + capRy * 0.2, w * 0.06, P[4]),                    // 3 yeux
    circ(cx + w * 0.16, capY + capRy * 0.2, w * 0.06, P[4]),
    circ(cx, capY + capRy * 0.45, w * 0.07, P[5]),
    circ(cx - w * 0.16, capY + capRy * 0.2, w * 0.025, P[0]),
    circ(cx + w * 0.16, capY + capRy * 0.2, w * 0.025, P[0]),
    circ(cx - capRx * 0.5, capY, capRx * 0.12, P[5]),
    circ(cx + capRx * 0.45, capY + 4, capRx * 0.1, P[5]),
  ]);
}

// PNJ champignon-folk (silhouette à capuche + cap lumineux)
function npc(id, robe, w = 64, h = 64) {
  const cx = w / 2;
  return spec(id, 'npc', w, h, [
    poly([[cx - w * 0.22, h * 0.95], [cx + w * 0.22, h * 0.95], [cx + w * 0.14, h * 0.45], [cx - w * 0.14, h * 0.45]], robe),
    elli(cx, h * 0.42, w * 0.2, h * 0.12, P[6]),                // capuchon-cap
    circ(cx, h * 0.46, w * 0.08, P[0]),                         // visage ombre
    circ(cx - w * 0.04, h * 0.46, w * 0.02, P[4]),
    circ(cx + w * 0.04, h * 0.46, w * 0.02, P[4]),
    elli(cx, h * 0.42, w * 0.2, h * 0.04, P[5], { opacity: 0.5 }),
  ]);
}

// Collectibles
function spore(id, w = 40, h = 40) {
  const c = w / 2;
  return spec(id, 'prop', w, h, [
    circ(c, c, w * 0.42, P[4], { opacity: 0.2 }),
    circ(c, c, w * 0.22, P[4]),
    circ(c - w * 0.06, c - h * 0.06, w * 0.07, P[5]),
  ]);
}
function memoryShard(id, w = 40, h = 40) {
  const c = w / 2;
  return spec(id, 'prop', w, h, [
    poly([[c, h * 0.08], [w * 0.82, c], [c, h * 0.92], [w * 0.18, c]], P[2], { opacity: 0.25 }),
    poly([[c, h * 0.18], [w * 0.72, c], [c, h * 0.82], [w * 0.28, c]], P[6]),
    poly([[c, h * 0.18], [w * 0.72, c], [c, c]], P[4]),
  ]);
}
function weaponEcho(id, w = 40, h = 40) {
  const c = w / 2;
  return spec(id, 'prop', w, h, [
    poly([[c, h * 0.05], [c + w * 0.1, h * 0.6], [c, h * 0.7], [c - w * 0.1, h * 0.6]], P[4], { opacity: 0.3 }),
    poly([[c, h * 0.1], [c + w * 0.06, h * 0.58], [c, h * 0.66], [c - w * 0.06, h * 0.58]], P[5]),
    rect(c - w * 0.12, h * 0.66, w * 0.24, h * 0.06, P[3]),
    rect(c - w * 0.03, h * 0.7, w * 0.06, h * 0.22, P[5]),
  ]);
}

// UI
function heart(id, w = 32, h = 32) {
  const c = w / 2;
  return spec(id, 'ui', w, h, [
    circ(w * 0.32, h * 0.34, w * 0.18, P[3]),
    circ(w * 0.68, h * 0.34, w * 0.18, P[3]),
    poly([[w * 0.12, h * 0.42], [w * 0.88, h * 0.42], [c, h * 0.92]], P[3]),
    circ(w * 0.32, h * 0.3, w * 0.05, P[5], { opacity: 0.6 }),
  ]);
}
function coin(id, w = 32, h = 32) {
  const c = w / 2;
  return spec(id, 'ui', w, h, [
    circ(c, c, w * 0.4, P[3]),
    circ(c, c, w * 0.32, P[5]),
    circ(c, c, w * 0.18, P[3], { opacity: 0.5 }),
  ]);
}

// FX
function spark(id, w = 48, h = 48) {
  const c = w / 2; const pts = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? w * 0.12 : w * 0.42; pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]); }
  return spec(id, 'fx', w, h, [circ(c, c, w * 0.3, P[4], { opacity: 0.18 }), poly(pts, P[4]), circ(c, c, w * 0.08, P[5])]);
}
function sporeBurst(id, w = 48, h = 48) {
  const c = w / 2; const dots = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; dots.push(circ(c + Math.cos(a) * w * 0.38, c + Math.sin(a) * w * 0.38, w * 0.05, P[6], { opacity: 0.85 })); }
  return spec(id, 'fx', w, h, [circ(c, c, w * 0.34, P[6], { opacity: 0.15 }), ...dots, circ(c, c, w * 0.1, P[4])]);
}

// Tileset (4 tuiles 64px : sol mousse, plateforme racine, pics, touffe)
function tileset(id) {
  const T = 64; const s = [];
  // sol mousse
  s.push(rect(0, 0, T, T, P[1]), rect(0, 0, T, 10, P[7]), circ(14, 6, 3, P[4]), circ(40, 5, 2, P[4]), circ(54, 8, 2, P[5]));
  // plateforme racine
  s.push(rect(T, 0, T, T, P[2]), rect(T, 0, T, 8, P[6]), rect(T + 8, 20, 48, 6, P[1], { rx: 3, opacity: 0.5 }));
  // pics (hazard)
  s.push(rect(T * 2, 0, T, T, P[1]));
  for (let i = 0; i < 4; i++) s.push(poly([[T * 2 + i * 16, T], [T * 2 + i * 16 + 8, T - 22], [T * 2 + i * 16 + 16, T]], P[3]));
  // touffe déco
  s.push(rect(T * 3, 0, T, T, P[1]));
  s.push(elli(T * 3 + 22, 40, 12, 8, P[3]), rect(T * 3 + 18, 40, 8, 18, P[5], { rx: 3 }), elli(T * 3 + 44, 46, 9, 6, P[6]), rect(T * 3 + 41, 46, 6, 14, P[5], { rx: 2 }));
  return { id, kind: 'environment', width: T * 4, height: T, palette: P, layers: [{ id: 'tiles', shapes: s }] };
}

async function main() {
  console.log('— Set complet Echoes (vectoriel thématisé + héros détouré) —\n');

  console.log('Héros (détourage concept-art) :');
  const charDir = await ensure(join(ASSETS, 'characters'));
  const hero = await extractSubject(join(REF, 'hero_echo_front.png'), join(charDir, 'hero.png'), { tolerance: 88, targetHeight: 256 });
  add({ id: 'hero', family: 'character', path: hero.path, width: hero.width, height: hero.height, source: `detourage:hero_echo_front (${(hero.removedRatio * 100).toFixed(0)}% fond)` });

  console.log('Créatures :');
  const enemyDir = await ensure(join(charDir, 'enemies'));
  const creatures = [
    [sporeling('sporeling', P[3]), 'enemy'],
    [sporeling('spore_walker', P[6]), 'enemy'],
    [sporeDrone('spore_drone'), 'enemy'],
    [guardian('boss_guardian'), 'boss'],
  ];
  for (const [sp, fam] of creatures) {
    const out = join(enemyDir, `${sp.id}.png`);
    await writeAssetSpecPng(sp, out, { profile: 'high' });
    add({ id: sp.id, family: fam, path: out, source: 'vectoriel:créature fongique' });
  }

  console.log('PNJ :');
  const npcDir = await ensure(join(charDir, 'npc'));
  for (const [id, robe] of [['seer', P[2]], ['warden', P[7]], ['wanderer', P[3]]]) {
    const out = join(npcDir, `${id}.png`);
    await writeAssetSpecPng(npc(id, robe), out, { profile: 'high' });
    add({ id: `npc_${id}`, family: 'npc', path: out, source: 'vectoriel:champignon-folk' });
  }

  console.log('Props & collectibles :');
  const propsDir = await ensure(join(ASSETS, 'props'));
  const collDir = await ensure(join(propsDir, 'collectibles'));
  for (const [b, fam, dir] of [
    [mushroom('mushroom_small', P[3]), 'prop', propsDir],
    [mushroom('mushroom_large', P[2], 80, 80), 'prop', propsDir],
    [spore('spore'), 'collectible', collDir],
    [memoryShard('memory_shard'), 'collectible', collDir],
    [weaponEcho('weapon_echo'), 'collectible', collDir],
  ]) {
    const out = join(dir, `${b.id}.png`);
    await writeAssetSpecPng(b, out, { profile: 'high' });
    add({ id: b.id, family: fam, path: out, source: 'vectoriel:thématisé' });
  }

  console.log('Environnement :');
  const envDir = await ensure(join(ASSETS, 'environments', 'level_01'));
  const tsOut = join(envDir, 'tileset.png');
  await writeAssetSpecPng(tileset('level_01_tileset'), tsOut, { profile: 'high' });
  add({ id: 'level_01_tileset', family: 'environment', path: tsOut, source: 'vectoriel:tileset fongique' });
  const bgPath = join(envDir, 'background.png');
  await copyFile(join(REF, 'level_test_01_board.png'), bgPath);
  add({ id: 'level_01_background', family: 'environment', path: bgPath, source: 'copy:level_test_01_board' });

  console.log('UI & FX :');
  const uiDir = await ensure(join(ASSETS, 'ui'));
  for (const b of [heart('heart'), coin('coin')]) {
    const out = join(uiDir, `${b.id}.png`);
    await writeAssetSpecPng(b, out, { profile: 'high' });
    add({ id: `ui_${b.id}`, family: 'ui', path: out, source: 'vectoriel:ui' });
  }
  const fxDir = await ensure(join(ASSETS, 'fx'));
  for (const b of [spark('spark'), sporeBurst('spore_burst')]) {
    const out = join(fxDir, `${b.id}.png`);
    await writeAssetSpecPng(b, out, { profile: 'high' });
    add({ id: `fx_${b.id}`, family: 'fx', path: out, source: 'vectoriel:fx' });
  }

  console.log('Audio :');
  const audioDir = await ensure(join(ASSETS, 'audio'));
  await writeFile(join(audioDir, 'bgm_loop.wav'), generateMusicLoopWav(4000));
  add({ id: 'bgm_loop', family: 'audio', path: join(audioDir, 'bgm_loop.wav'), source: 'procedural:music' });
  for (const ev of ['jump', 'collect', 'hit', 'footstep']) {
    await writeFile(join(audioDir, `sfx_${ev}.wav`), generateSfxWav(ev));
    add({ id: `sfx_${ev}`, family: 'audio', path: join(audioDir, `sfx_${ev}.wav`), source: `procedural:sfx ${ev}` });
  }

  console.log('Câblage GDL :');
  const gdlPath = join(WS, '05_runtime', 'gdl', 'echoes.preview.gdl.json');
  const gdl = await readJson(gdlPath);
  const player = gdl.entities.find((e) => e.id === 'player');
  if (player) player.assets = { ...(player.assets ?? {}), sprite: wsUrl(hero.path), frame_count: 1 };
  const required = ['input', 'platformer_physics', 'tile_collision', 'animation', 'camera_follow', 'ui', 'collectibles', 'enemy_ai', 'hazards', 'goal'];
  gdl.systems = [...new Set([...(gdl.systems ?? []), ...required])];
  if (gdl.scenes?.[0]?.background) gdl.scenes[0].background.image = wsUrl(bgPath);
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2));
  add({ id: 'gdl_wired', family: 'runtime', path: gdlPath, source: 'GDL câblé' });

  const regDir = await ensure(join(ASSETS, 'registry'));
  const regPath = join(regDir, 'generated-assets.json');
  await writeFile(regPath, JSON.stringify({
    project: 'echoes-of-the-mushroom-realm',
    generated_at: new Date().toISOString(),
    method: 'héros détouré (concept-art) + set vectoriel thématisé, sans GPU',
    palette: P,
    count: registry.length,
    assets: registry,
  }, null, 2));
  console.log(`\n✓ ${registry.length} assets. Registre : ${wsUrl(regPath)}`);
}

main().catch((e) => { console.error('ECHEC:', e); process.exit(1); });
