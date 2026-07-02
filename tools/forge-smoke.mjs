/**
 * SMOKE FORGE — valide la chaîne PURE sans réseau ni image :
 * design heuristique → GDL (schéma + défauts) → auto-play headless des DEUX
 * genres. Tourne en CI : un GDL non complétable par le bot casse le build.
 */
import { heuristicGdd, compileGdl } from './lib/forge/design.mjs';
import { validateGdl, withDefaults } from './lib/forge/gdl.mjs';
import { autoplay } from './lib/forge/build.mjs';
import { clipsFor } from './lib/forge/clips.mjs';
import { sampleClip } from './lib/forge/runtime/skeleton.js';

const CASES = [
  'une chevalière d’argent dans une citadelle gothique maudite aux vitraux brisés',
  'un ninja néon dans une mégalopole cyberpunk sous la pluie',
  'arène verticale de vagues : mage des tempêtes défend le sanctuaire des lames',
  'exploration d’une forêt de champignons bioluminescents géants',
];

let failed = 0;
for (const prompt of CASES) {
  const gdd = heuristicGdd(prompt);
  const { gdl: raw } = compileGdl(gdd);
  const gdl = withDefaults(raw);
  try {
    validateGdl(gdl);
    const play = await autoplay(gdl);
    const ok = play.won;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} [${gdl.genre}] « ${gdl.title} » — ${ok ? `bot vainqueur en ${play.simSeconds}s (kills ${play.kills}, morts ${play.deaths})` : `ÉCHEC : progression ${play.progress}%`}`);
  } catch (e) {
    failed++;
    console.log(`✗ « ${gdd.title} » — ${e.message}`);
  }
}

// clips : chaque rigType échantillonnable sans NaN
for (const type of ['humanoid', 'monopart']) {
  const clips = clipsFor(type);
  for (const name of Object.keys(clips.clips)) {
    const pose = sampleClip(clips, name, 0.2);
    const bad = Object.values(pose).some((b) => Object.values(b).some((v) => Number.isNaN(v)));
    if (bad) { failed++; console.log(`✗ clip ${type}/${name} : NaN dans la pose`); }
  }
}
console.log(failed === 0 ? '\nSmoke Forge : tout passe.' : `\nSmoke Forge : ${failed} échec(s).`);
process.exit(failed === 0 ? 0 : 1);
