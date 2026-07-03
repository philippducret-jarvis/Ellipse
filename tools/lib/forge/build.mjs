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
import { registerForgedGame } from './workspace.mjs';
import { extractWorkspaceStyle } from './style-from-boards.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

async function forgeCharacter(plan, outDir, log, { withPortrait = false } = {}) {
  const card = buildIdentityCard({ id: plan.id, name: plan.name, dna: plan.dna, style: plan.style });
  const view = plan.rigType === 'monopart' ? 'creature' : 'apose';
  const views = withPortrait ? [view, 'portrait'] : [view];
  log(`  ↳ ${plan.name} (${plan.rigType}) : référence ${views.join('+')} + détourage…`);
  const enriched = await generateReferenceSheet(card, outDir, { views });
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

export { autoplay, autoplayLevel } from './autoplay.mjs';
import { autoplay } from './autoplay.mjs';

export async function buildGame(prompt, { id = null, log = console.log } = {}) {
  const backend = await pickBackend();
  if (!backend) throw new Error('Aucun backend génératif joignable. (Pollinations hors-ligne et pas de ComfyUI — réessaie connecté, ou lance ComfyUI.)');
  log(`Forge — backend génératif : ${backend.name}`);

  // 1. design — style VERROUILLÉ sur les planches du workspace cible s'il existe
  const targetId = id ? id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') : null;
  let style = null;
  if (targetId) {
    style = await extractWorkspaceStyle(join(ROOT, 'workspaces', targetId));
    if (style) log(`Style verrouillé sur les planches [${style.source}] : ${style.palette?.length ?? 0} couleurs canoniques`);
  }
  const gdd = await designGdd(prompt, style);
  // id imposé (ex. slug d'un projet de l'orchestrateur) → le jeu se forge
  // dans le workspace de CE projet, aux côtés de sa structure 00_..08_.
  if (targetId) gdd.id = targetId;
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

  // 3. assets générés (identité verrouillée + QA) — portrait héros pour les dialogues
  log('Personnages :');
  report.characters.push(await forgeCharacter({ ...assetPlan.hero, rigType: 'humanoid' }, join(assetsDir, 'hero'), log, { withPortrait: true }));
  for (const e of assetPlan.enemies) report.characters.push(await forgeCharacter(e, join(assetsDir, 'enemies'), log));

  log('Arènes (5 couches parallax générées chacune) :');
  for (const a of assetPlan.arenas) {
    // composition verrouillée sur une planche (bible.composition) si le backend sait faire de l'img2img
    const boardRel = style?.composition?.[a.id];
    if (boardRel) a.compositionBoard = join(ws, boardRel);
    const m = await generateArena(a, join(assetsDir, 'arenas'));
    const scores = m.layers.map((l) => l.qa.score);
    log(`  ↳ ${a.id} : QA couches [${scores.join(', ')}]`);
    report.arenas.push({ id: a.id, layers: m.layers.map((l) => ({ id: l.id, qa: l.qa, seed: l.seed })) });
  }

  // le rig hero.rig.json référence hero/<id>.rig.json — aligner les chemins GDL
  gdl.entities.hero.rig = 'assets/hero/hero.rig.json';
  gdl.entities.hero.clips = 'assets/hero/hero.clips.json';

  // 4. runtime générique copié tel quel + GDL
  for (const f of ['index.html', 'main.js', 'logic.js', 'render.js', 'skeleton.js', 'campaign.js', 'audio.js']) {
    await cp(join(HERE, 'runtime', f), join(runtimeDir, f));
  }
  await writeFile(join(runtimeDir, 'game.gdl.json'), JSON.stringify(gdl, null, 2), 'utf8');

  // 5. validation : auto-play headless de la CAMPAGNE entière
  log(`Auto-play headless (${gdl.levels.length} niveaux, le bot doit tous les finir)…`);
  const play = await autoplay(gdl);
  report.autoplay = play;
  if (!play.won) {
    await writeFile(join(ws, 'forge-build.json'), JSON.stringify(report, null, 2), 'utf8');
    const failed = play.levels.find((l) => !l.won);
    throw new Error(`Niveau ${failed?.level} NON complétable par le bot — build refusé. Rapport : workspaces/${gdd.id}/forge-build.json`);
  }
  for (const l of play.levels) log(`  ↳ ${l.level} : victoire en ${l.simSeconds}s · ${l.kills} kills · ${l.deaths} morts`);

  await writeFile(join(ws, 'forge-build.json'), JSON.stringify(report, null, 2), 'utf8');

  // 6. enregistrement Studio : le jeu apparaît dans le frontend (fusion douce
  // pour les workspaces existants — on renforce, on ne casse pas).
  const reg = await registerForgedGame(ws, gdd.id, { gdl, prompt, report });
  log(`Studio : workspace ${reg.created ? 'enregistré' : 'renforcé'} → ${reg.previewUrl}`);

  return { gdl, report, workspace: ws, runtimeDir };
}
