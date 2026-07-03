/**
 * SMOKE FORGE — valide la chaîne PURE sans réseau ni image :
 *   1. design heuristique → GDL 1.1 (campagne) → auto-play de TOUS les niveaux ;
 *   2. clips échantillonnables sans NaN ;
 *   3. campagne (écrans, reliques, sauvegarde) ;
 *   4. itération par prompt (patch + re-validation, refus des patchs cassants).
 * Tourne en CI : toute campagne non complétable par le bot casse le build.
 */
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { heuristicGdd, compileGdl } from './lib/forge/design.mjs';
import { validateGdl, withDefaults } from './lib/forge/gdl.mjs';
import { autoplay } from './lib/forge/autoplay.mjs';
import { iterateGame, parseInstruction } from './lib/forge/iterate.mjs';
import { clipsFor } from './lib/forge/clips.mjs';
import { sampleClip, blendPoses } from './lib/forge/runtime/skeleton.js';
import { createCampaign, startGame, advanceStory, selectLevel, onLevelWon, chooseRelic, relicModifiers } from './lib/forge/runtime/campaign.js';

const CASES = [
  'une chevalière d’argent dans une citadelle gothique maudite aux vitraux brisés',
  'un ninja néon dans une mégalopole cyberpunk sous la pluie',
  'arène verticale de vagues : mage des tempêtes défend le sanctuaire des lames',
];

let failed = 0;
const check = (ok, label) => { if (!ok) failed++; console.log(`${ok ? '✓' : '✗'} ${label}`); };

// ── 1. campagnes complètes ──
let sampleGdl = null;
for (const prompt of CASES) {
  const gdd = heuristicGdd(prompt);
  const { gdl: raw } = compileGdl(gdd);
  const gdl = withDefaults(raw);
  try {
    validateGdl(gdl);
    const play = await autoplay(gdl);
    check(play.won, `[${gdl.genre}] « ${gdl.title} » — ${gdl.levels.length} niveaux : ${play.won ? `bot vainqueur partout (${play.kills} kills, boss inclus)` : `ÉCHEC ${play.levels.find((l) => !l.won)?.level}`}`);
    if (!sampleGdl && gdl.genre === 'sidescroller') sampleGdl = gdl;
  } catch (e) {
    failed++;
    console.log(`✗ « ${gdd.title} » — ${e.message}`);
  }
}

// ── 2. clips sans NaN + blend ──
for (const type of ['humanoid', 'monopart']) {
  const clips = clipsFor(type);
  for (const name of Object.keys(clips.clips)) {
    const a = sampleClip(clips, name, 0.1), b = sampleClip(clips, name, 0.3);
    const blended = blendPoses(a, b, 0.5);
    const bad = [a, b, blended].some((p) => Object.values(p).some((bone) => Object.values(bone).some((v) => Number.isNaN(v))));
    if (bad) { failed++; console.log(`✗ clip ${type}/${name} : NaN`); }
  }
}
console.log('✓ clips humanoid+monopart : échantillonnage et blend sans NaN');

// ── 3. campagne : reliques, déverrouillage, sauvegarde ──
{
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const c = createCampaign(sampleGdl, storage);
  startGame(c);
  while (c.storyQueue.length && c.storyIndex < c.storyQueue.length) advanceStory(c);
  check(c.screen === 'map', 'campagne : intro → carte');
  check(selectLevel(c, 0) && !selectLevel({ ...c, unlocked: 1 }, 2), 'campagne : verrouillage des niveaux');
  onLevelWon(c, 500);
  while (c.storyQueue.length && c.storyIndex < c.storyQueue.length) advanceStory(c);
  if (c.pendingRelicChoice) chooseRelic(c, c.pendingRelicChoice[0].id);
  const mods = relicModifiers(c);
  check(c.unlocked >= 2 && c.relics.length === 1 && (mods.speedMul > 1 || mods.hpAdd > 0 || mods.damageAdd > 0 || mods.jumpMul > 1), 'campagne : victoire → relique + niveau 2 déverrouillé');
  const c2 = createCampaign(sampleGdl, storage);
  check(c2.unlocked === c.unlocked && c2.relics.length === 1, 'campagne : sauvegarde rechargée');
}

// ── 4. itération par prompt ──
{
  const dir = await mkdtemp(join(tmpdir(), 'forge-iter-'));
  await mkdir(join(dir, '05_runtime'), { recursive: true });
  await writeFile(join(dir, '05_runtime', 'game.gdl.json'), JSON.stringify(sampleGdl));

  const speedBefore = Object.values(sampleGdl.entities).find((e) => e.role === 'hero').stats.speed;
  const r1 = await iterateGame(dir, 'rends le héros plus rapide et le saut plus haut');
  const after = JSON.parse(await (await import('node:fs/promises')).readFile(join(dir, '05_runtime', 'game.gdl.json'), 'utf8'));
  const heroAfter = Object.values(after.entities).find((e) => e.role === 'hero').stats;
  check(r1.ok && heroAfter.speed > speedBefore && after.meta.iterations.length === 1, `iterate : « plus rapide + saut plus haut » → ${r1.summary}`);

  const r2 = await iterateGame(dir, 'ajoute un niveau');
  const after2 = JSON.parse(await (await import('node:fs/promises')).readFile(join(dir, '05_runtime', 'game.gdl.json'), 'utf8'));
  check(r2.ok && after2.levels.length === sampleGdl.levels.length + 1 && after2.levels[after2.levels.length - 1].boss, 'iterate : « ajoute un niveau » → inséré avant le boss, campagne re-validée');

  const r3 = await iterateGame(dir, 'transforme le jeu en MMO spatial');
  check(!r3.ok, 'iterate : demande hors-cadre correctement refusée');

  check(parseInstruction('renomme le jeu en La Lame Éternelle')?.ops.some((o) => o.kind === 'rename' && /Lame Éternelle/.test(o.value)), 'iterate : renommage compris');
  await rm(dir, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nSmoke Forge : tout passe.' : `\nSmoke Forge : ${failed} échec(s).`);
process.exit(failed === 0 ? 0 : 1);
