/**
 * BUILD — la chaîne complète : prompt → GDD → GDL → assets GÉNÉRÉS (identité
 * verrouillée + QA) → rigs + clips → runtime générique → auto-play headless.
 *
 * Sortie : workspaces/<id>/05_runtime/ auto-porteur (index.html + JS + assets
 * + game.gdl.json) + forge-build.json (traçabilité : backends, seeds, QA,
 * résultat de l'auto-play). Un niveau non complétable par le bot fait ÉCHOUER
 * le build.
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { designGdd, compileGdl } from './design.mjs';
import { validateGdl, withDefaults } from './gdl.mjs';
import { buildIdentityCard, generateReferenceSheet } from './identity.mjs';
import { buildHumanoidRig, buildMonopartRig } from './rig.mjs';
import { clipsFor } from './clips.mjs';
import { generateArena } from './decor.mjs';
import { pickBackend } from './backends/registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

async function forgeCharacter(plan, outDir, log) {
  const card = buildIdentityCard({ id: plan.id, name: plan.name, dna: plan.dna, style: plan.style });
  const view = plan.rigType === 'monopart' ? 'creature' : 'apose';
  log(`  ↳ ${plan.name} (${plan.rigType}) : référence ${view} + détourage…`);
  const enriched = await generateReferenceSheet(card, outDir, { views: [view] });
  const refPng = join(outDir, enriched.refs[view].file);
  const buf = await readFile(refPng);
  const rig = plan.rigType === 'monopart'
    ? await buildMonopartRig(buf, outDir, { id: plan.id, sourceFile: enriched.refs[view].file })
    : await buildHumanoidRig(buf, outDir, { id: plan.id, sourceFile: enriched.refs[view].file });
  await writeFile(join(outDir, `${plan.id}.clips.json`), JSON.stringify(clipsFor(plan.rigType), null, 2), 'utf8');
  const qa = enriched.refs[view].qa;
  log(`     QA ${qa.score}/100 ${qa.pass ? '✓' : '✗ (meilleur effort)'} · ${rig.parts.length} pièces · seed ${enriched.refs[view].seed}`);
  return { id: plan.id, name: plan.name, rigType: plan.rigType, qa: { score: qa.score, pass: qa.pass }, backend: enriched.refs[view].backend, seed: enriched.refs[view].seed };
}

/** Auto-play headless : le bot doit finir le niveau. */
export async function autoplay(gdl, { maxSimSeconds = 240 } = {}) {
  const { createGame, step, botInput } = await import(pathToFileURL(join(HERE, 'runtime', 'logic.js')).href);
  const state = createGame(gdl, 0);
  const dt = 1 / 60;
  let simT = 0, kills = 0, pickups = 0;
  while (state.phase === 'playing' && simT < maxSimSeconds) {
    const events = step(state, botInput(state), dt);
    for (const e of events) { if (e.type === 'kill') kills++; if (e.type === 'pickup') pickups++; }
    simT += dt;
  }
  return { won: state.phase === 'won', simSeconds: Math.round(simT), kills, pickups, deaths: state.deaths, score: state.score, progress: gdl.genre === 'sidescroller' ? Math.round((state.hero.x / (state.level.exit?.x ?? state.level.length)) * 100) : null };
}

export async function buildGame(prompt, { log = console.log } = {}) {
  const backend = await pickBackend();
  if (!backend) throw new Error('Aucun backend génératif joignable. (Pollinations hors-ligne et pas de ComfyUI — réessaie connecté, ou lance ComfyUI.)');
  log(`Forge — backend génératif : ${backend.name}`);

  // 1. design
  const gdd = await designGdd(prompt);
  log(`Design [${gdd.designBackend}] : « ${gdd.title} » (${gdd.genre}) — ${gdd.pitch}`);
  const { gdl: rawGdl, assetPlan } = compileGdl(gdd);
  const gdl = withDefaults(rawGdl);
  validateGdl(gdl);

  // 2. workspace
  const ws = join(ROOT, 'workspaces', gdd.id);
  const runtimeDir = join(ws, '05_runtime');
  const assetsDir = join(runtimeDir, 'assets');
  await mkdir(assetsDir, { recursive: true });

  const report = { id: gdd.id, title: gdd.title, prompt, designBackend: gdd.designBackend, backend: backend.name, characters: [], arenas: [], generatedAt: new Date().toISOString() };

  // 3. assets générés (identité verrouillée + QA)
  log('Personnages :');
  report.characters.push(await forgeCharacter({ ...assetPlan.hero, rigType: 'humanoid' }, join(assetsDir, 'hero'), log));
  for (const e of assetPlan.enemies) report.characters.push(await forgeCharacter(e, join(assetsDir, 'enemies'), log));

  log('Arènes (4 couches parallax générées chacune) :');
  for (const a of assetPlan.arenas) {
    const m = await generateArena(a, join(assetsDir, 'arenas'));
    const scores = m.layers.map((l) => l.qa.score);
    log(`  ↳ ${a.id} : QA couches [${scores.join(', ')}]`);
    report.arenas.push({ id: a.id, layers: m.layers.map((l) => ({ id: l.id, qa: l.qa, seed: l.seed })) });
  }

  // le rig hero.rig.json référence hero/<id>.rig.json — aligner les chemins GDL
  gdl.entities.hero.rig = 'assets/hero/hero.rig.json';
  gdl.entities.hero.clips = 'assets/hero/hero.clips.json';

  // 4. runtime générique copié tel quel + GDL
  for (const f of ['index.html', 'main.js', 'logic.js', 'render.js', 'skeleton.js']) {
    await cp(join(HERE, 'runtime', f), join(runtimeDir, f));
  }
  await writeFile(join(runtimeDir, 'game.gdl.json'), JSON.stringify(gdl, null, 2), 'utf8');

  // 5. validation : auto-play headless (porte de sortie du build)
  log('Auto-play headless (le bot doit finir le niveau)…');
  const play = await autoplay(gdl);
  report.autoplay = play;
  if (!play.won) {
    await writeFile(join(ws, 'forge-build.json'), JSON.stringify(report, null, 2), 'utf8');
    throw new Error(`Niveau NON complétable par le bot (progression ${play.progress}%, ${play.deaths} morts) — build refusé. Rapport : workspaces/${gdd.id}/forge-build.json`);
  }
  log(`  ↳ victoire du bot en ${play.simSeconds}s sim · ${play.kills} kills · ${play.deaths} morts · score ${play.score}`);

  await writeFile(join(ws, 'forge-build.json'), JSON.stringify(report, null, 2), 'utf8');
  return { gdl, report, workspace: ws, runtimeDir };
}
