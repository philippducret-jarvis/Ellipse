#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { autoplay } from './lib/forge/autoplay.mjs';

const ROOT = process.cwd();
const RUNTIME_FILES = ['index.html', 'main.js', 'logic.js', 'render.js', 'skeleton.js', 'campaign.js', 'audio.js'];

export const PROTECTED_RUNTIMES = Object.freeze({
  'orbes-d-astra': Object.freeze({
    title: "Orbes d'Astra",
    runtime: 'MergeDropEngine',
    command: 'pnpm orbes:build',
    reason: 'runtime merge-drop specialise partage entre Studio et export web',
  }),
  'veloria-veille-des-lames': Object.freeze({
    title: 'Veloria: La Veille des Lames',
    runtime: 'VeloriaEngine / export HD specialise',
    command: 'pnpm veloria:hd',
    reason: 'runtime Veloria specialise et pipeline de fidelite dedie',
  }),
  'echoes-of-the-mushroom-realm': Object.freeze({
    title: 'Echoes of the Mushroom Realm',
    runtime: 'EchoesEngine / export HD specialise',
    command: 'pnpm echoes:hd',
    reason: 'runtime platformer Pixi specialise et pipeline board-to-playable dedie',
  }),
});

export const PORTFOLIO_PLAN = Object.freeze([
  Object.freeze({
    priority: 0,
    slug: 'orbes-d-astra',
    title: "Orbes d'Astra",
    mode: 'protected',
    target: 'vertical slice HD specialise',
    command: 'pnpm orbes:build',
    gate: 'utiliser uniquement MergeDropEngine; interdiction du runtime Forge generique',
  }),
  Object.freeze({
    priority: 0,
    slug: 'veloria-veille-des-lames',
    title: 'Veloria: La Veille des Lames',
    mode: 'protected',
    target: 'six arenes HD et pipeline de fidelite specialise',
    command: 'pnpm veloria:hd',
    gate: 'corriger et valider le runtime Veloria; interdiction du runtime Forge generique',
  }),
  Object.freeze({
    priority: 0,
    slug: 'echoes-of-the-mushroom-realm',
    title: 'Echoes of the Mushroom Realm',
    mode: 'protected',
    target: 'platformer HD specialise sur les planches canoniques',
    command: 'pnpm echoes:hd',
    gate: 'utiliser uniquement EchoesEngine; interdiction du runtime Forge generique',
  }),
  Object.freeze({
    priority: 2,
    slug: 'une-chevaliere-d-argent-dans-une-citadel',
    title: 'Seraphine: La Citadelle des Cendres',
    mode: 'generic',
    target: 'vertical slice apres approbation d une planche canonique',
    gate: 'aucune promesse de fidelite tant que la planche cible manque',
  }),
  Object.freeze({
    priority: 3,
    slug: 'demo-pont-usine',
    title: 'Neon Kage: Protocole Zero',
    mode: 'generic',
    target: 'prototype apres approbation d une planche canonique',
    gate: 'aucune promesse de fidelite tant que la planche cible manque',
  }),
]);

export const GENERIC_PROJECTS = Object.freeze({
  'demo-pont-usine': {
    title: 'Neon Kage: Protocole Zero',
    subtitle: 'Kage-7 infiltre Neo-Lutetia pour arracher sa memoire au reseau Helix.',
    hub: { name: 'Toit 47', tagline: 'Choisissez une infiltration, calibrez la lame et decodez le complot Helix.' },
    abilityName: 'Surcharge Neon',
    mapTitle: 'Secteurs de Neo-Lutetia',
    levelNames: ['Les Toits sous la Pluie', 'La Tour Helix', 'Le Coeur-Machine'],
    heroName: 'Kage-7',
    bossName: 'Directeur-Machine',
    story: {
      intro: [
        { speaker: 'Reseau fantome', text: 'Helix efface cette nuit la memoire de toute la ville.' },
        { speaker: 'Kage-7', portrait: 'hero', text: 'Trois relais alimentent le protocole. Je les coupe avant le lever du jour.' },
        { speaker: 'Iris', text: 'Les toits, la tour, puis le coeur-machine. Aucun retour possible apres la seconde porte.' },
      ],
      victories: [
        'Le premier relais tombe. Les citoyens recommencent a rever.',
        'La tour est ouverte. Le Directeur-Machine connait maintenant ton nom.',
        'Le protocole est brise. Neo-Lutetia garde sa memoire.',
      ],
      outro: 'La ville rallume ses enseignes. Dans les reflets de pluie, un nouveau signal appelle Kage-7.',
    },
    relics: [
      { id: 'phase-boots', name: 'Bottes de phase', desc: 'Vitesse +25 %', effect: { speedMul: 1.25 } },
      { id: 'arc-edge', name: 'Fil voltaque', desc: 'Degats +1', effect: { damageAdd: 1 } },
      { id: 'ghost-core', name: 'Noyau fantome', desc: '+2 points de vie', effect: { hpAdd: 2 } },
      { id: 'sky-hook', name: 'Grappin vectoriel', desc: 'Saut +18 %', effect: { jumpMul: 1.18 } },
    ],
  },
  'une-chevaliere-d-argent-dans-une-citadel': {
    title: 'Seraphine: La Citadelle des Cendres',
    subtitle: 'Seraphine affronte les trois enceintes maudites et le serment qui les a condamnees.',
    hub: { name: 'Sanctuaire du Dernier Cierge', tagline: 'Ecoutez les survivants, renforcez la lame et choisissez votre serment.' },
    abilityName: 'Jugement Solaire',
    mapTitle: 'Les Trois Enceintes Maudites',
    levelNames: ['Le Cloitre des Cendres', 'La Nef aux Vitraux Brises', "Le Trone de l'Eveque Dechu"],
    heroName: 'Seraphine',
    bossName: "L'Eveque Dechu",
    story: {
      intro: [
        { speaker: 'Soeur Eliane', text: 'La citadelle a devore son propre ordre. Il ne reste qu un cierge et ton serment.' },
        { speaker: 'Seraphine', portrait: 'hero', text: 'Je ne viens pas sauver les murs. Je viens liberer les noms enfermes dessous.' },
        { speaker: 'Le Cierge', text: 'Trois sceaux, trois fautes. La derniere porte ne cedera qu a une lame sans mensonge.' },
      ],
      victories: [
        'Le cloitre libere les voix des novices condamnees.',
        'Les vitraux revelent que Seraphine fut autrefois la gardienne du dernier sceau.',
        'L Eveque tombe et la citadelle rend enfin ses morts a la lumiere.',
      ],
      outro: 'Seraphine eteint le dernier cierge. A l horizon, une autre forteresse repond par une flamme noire.',
    },
    relics: [
      { id: 'silver-vow', name: "Voeu d'argent", desc: 'Degats +1', effect: { damageAdd: 1 } },
      { id: 'saint-heart', name: 'Coeur de sainte', desc: '+2 points de vie', effect: { hpAdd: 2 } },
      { id: 'ash-greaves', name: 'Greves de cendre', desc: 'Vitesse +20 %', effect: { speedMul: 1.2 } },
      { id: 'glass-feather', name: 'Plume de vitrail', desc: 'Saut +15 %', effect: { jumpMul: 1.15 } },
    ],
  },
});

export function assertGenericRuntimeTarget(slug, projects = GENERIC_PROJECTS) {
  const protectedRuntime = PROTECTED_RUNTIMES[slug];
  if (protectedRuntime) {
    throw new Error(
      `[RUNTIME_PROTEGE] ${protectedRuntime.title} utilise ${protectedRuntime.runtime}. `
      + `Lancez \`${protectedRuntime.command}\`; le runtime Forge generique ne doit jamais ecrire dans ce workspace.`,
    );
  }
  if (!Object.hasOwn(projects, slug)) throw new Error(`Projet generique inconnu: ${slug}`);
  return projects[slug];
}

export function validatePortfolioConfiguration(projects = GENERIC_PROJECTS, plan = PORTFOLIO_PLAN) {
  const projectSlugs = Object.keys(projects);
  const overlap = projectSlugs.filter((slug) => Object.hasOwn(PROTECTED_RUNTIMES, slug));
  if (overlap.length) {
    throw new Error(`[CONFIG_INVALIDE] Runtime protege declare comme generique: ${overlap.join(', ')}`);
  }

  const planSlugs = plan.map(({ slug }) => slug);
  const duplicate = planSlugs.find((slug, index) => planSlugs.indexOf(slug) !== index);
  if (duplicate) throw new Error(`[CONFIG_INVALIDE] Projet duplique dans le plan: ${duplicate}`);

  const plannedGenericSlugs = plan.filter(({ mode }) => mode === 'generic').map(({ slug }) => slug);
  const missingFromPlan = projectSlugs.filter((slug) => !plannedGenericSlugs.includes(slug));
  const missingFromConfig = plannedGenericSlugs.filter((slug) => !Object.hasOwn(projects, slug));
  if (missingFromPlan.length || missingFromConfig.length) {
    throw new Error(
      `[CONFIG_INVALIDE] Plan et configuration generique divergent. `
      + `Hors plan: ${missingFromPlan.join(', ') || 'aucun'}; sans configuration: ${missingFromConfig.join(', ') || 'aucun'}`,
    );
  }

  const plannedProtectedSlugs = plan.filter(({ mode }) => mode === 'protected').map(({ slug }) => slug);
  const unplannedProtected = Object.keys(PROTECTED_RUNTIMES).filter((slug) => !plannedProtectedSlugs.includes(slug));
  if (unplannedProtected.length) {
    throw new Error(`[CONFIG_INVALIDE] Runtime protege absent du plan: ${unplannedProtected.join(', ')}`);
  }
  return true;
}

export function parseCliArgs(args = []) {
  let apply = false;
  let dryRun = false;
  let help = false;
  let project;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run' || arg === '--plan') dryRun = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--project') {
      project = args[index + 1];
      index += 1;
      if (!project || project.startsWith('--')) throw new Error('Valeur manquante apres --project');
    } else if (arg.startsWith('--project=')) {
      project = arg.slice('--project='.length);
      if (!project) throw new Error('Valeur manquante apres --project=');
    } else {
      throw new Error(`Option inconnue: ${arg}`);
    }
  }

  if (apply && dryRun) throw new Error('Choisissez soit --apply, soit --dry-run, jamais les deux.');
  return { mode: apply ? 'apply' : 'dry-run', project, help };
}

export function buildExecutionPlan({ root = ROOT, project } = {}) {
  validatePortfolioConfiguration();
  const selectedSlugs = project
    ? [project]
    : PORTFOLIO_PLAN.filter(({ mode }) => mode === 'generic').map(({ slug }) => slug);
  for (const slug of selectedSlugs) assertGenericRuntimeTarget(slug);

  return PORTFOLIO_PLAN.map((entry) => {
    if (entry.mode === 'protected') {
      const protectedRuntime = PROTECTED_RUNTIMES[entry.slug];
      return {
        ...entry,
        selected: false,
        status: 'protected',
        runtime: protectedRuntime.runtime,
        reason: protectedRuntime.reason,
      };
    }

    const selected = selectedSlugs.includes(entry.slug);
    const workspace = join(root, 'workspaces', entry.slug);
    const requiredFiles = [
      join(workspace, 'workspace.json'),
      join(workspace, '05_runtime', 'game.gdl.json'),
    ];
    const missingFiles = requiredFiles.filter((path) => !existsSync(path));
    return {
      ...entry,
      selected,
      status: selected ? (missingFiles.length ? 'blocked' : 'ready') : 'not-selected',
      workspace,
      requiredFiles,
      missingFiles,
    };
  });
}

export function formatPortfolioPlan(plan, mode = 'dry-run') {
  const lines = [
    `PLAN PORTFOLIO (${mode === 'apply' ? 'APPLICATION AUTORISEE' : 'DRY-RUN, AUCUNE ECRITURE'})`,
  ];
  for (const entry of plan) {
    const prefix = `[P${entry.priority}] ${entry.title}`;
    if (entry.mode === 'protected') {
      lines.push(`${prefix} — PROTEGE (${entry.runtime})`);
      lines.push(`  Action specialisee: ${entry.command}`);
      lines.push(`  Gate: ${entry.gate}`);
      continue;
    }
    const detail = entry.status === 'blocked'
      ? `BLOQUE, fichiers manquants: ${entry.missingFiles.join(', ')}`
      : entry.status === 'not-selected' ? 'NON SELECTIONNE' : 'PRET POUR LE RUNTIME GENERIQUE';
    lines.push(`${prefix} — ${detail}`);
    lines.push(`  Cible: ${entry.target}`);
    lines.push(`  Gate: ${entry.gate}`);
  }
  return lines.join('\n');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sideLevel(gdl, base, index, spec) {
  const enemyIds = Object.entries(gdl.entities).filter(([, entity]) => entity.role === 'enemy').map(([id]) => id);
  const bossId = Object.entries(gdl.entities).find(([, entity]) => entity.role === 'boss')?.[0] ?? 'boss';
  const lengths = [3600, 4400, 3200];
  const length = lengths[index];
  const spawns = [];
  const count = index === 2 ? 4 : 5 + index * 2;
  for (let i = 0; i < count; i++) {
    spawns.push({ entity: enemyIds[i % Math.max(1, enemyIds.length)], x: 650 + i * Math.round((length - 1200) / Math.max(1, count - 1)) });
  }
  if (index === 2) spawns.push({ entity: bossId, x: length - 520 });
  const hazards = Array.from({ length: index + 1 }, (_, i) => ({ x: 1120 + i * 880, w: 90 + index * 10, type: 'spikes', damage: 1 }));
  const pickups = Array.from({ length: 5 + index }, (_, i) => ({ x: 520 + i * Math.round((length - 900) / (4 + index)), type: i % 4 === 3 ? 'heart' : 'gem' }));
  const platforms = Array.from({ length: 4 + index }, (_, i) => ({ x: 760 + i * 620, w: 180 + (i % 2) * 50, y: 125 + (i % 2) * 95 }));
  return {
    ...clone(base), id: `level-0${index + 1}`, name: spec.levelNames[index], length,
    boss: index === 2, spawns, hazards, pickups, platforms,
    checkpoints: [Math.round(length * 0.48)], exit: { x: length - 180 },
    objective: index === 2 ? `Vaincre ${spec.bossName}` : index === 1 ? 'Briser les deux sceaux et atteindre la porte interieure' : 'Retrouver la premiere balise et securiser la route',
  };
}

function enrichGdl(gdl, spec) {
  gdl.title = spec.title;
  gdl.subtitle = spec.subtitle;
  const hero = Object.values(gdl.entities ?? {}).find((entity) => entity.role === 'hero');
  if (hero) hero.name = spec.heroName;
  const existingBoss = Object.entries(gdl.entities).find(([, entity]) => entity.role === 'boss');
  if (existingBoss) {
    existingBoss[1].name = spec.bossName;
  } else {
    const source = Object.values(gdl.entities).filter((entity) => entity.role === 'enemy').at(-1);
    if (!source) throw new Error(`${gdl.id}: aucun ennemi disponible pour construire le boss`);
    gdl.entities.boss = {
      ...clone(source),
      role: 'boss',
      name: spec.bossName,
      scale: (source.scale ?? 0.2) * 1.55,
      stats: { ...(source.stats ?? {}), hp: 14, speed: Math.max(120, source.stats?.speed ?? 120), damage: 1 },
      ai: { type: 'chase', aggroRange: 900, chaseSpeed: 185, range: 380 },
    };
  }
  gdl.hub = spec.hub;
  gdl.gameplay = {
    ...(gdl.gameplay ?? {}),
    abilityName: spec.abilityName,
    autoAttack: spec.autoAttack ?? false,
    dodge: true,
    pause: true,
    failAfterDeaths: 3,
  };
  if (gdl.genre === 'sidescroller' && (gdl.levels?.length ?? 0) < 3) {
    const base = gdl.levels[0];
    gdl.levels = [0, 1, 2].map((index) => sideLevel(gdl, base, index, spec));
  }
  gdl.levels.forEach((level, index) => {
    level.name = spec.levelNames[index] ?? level.name;
    level.objective ??= index === gdl.levels.length - 1 ? `Vaincre ${spec.bossName}` : `Accomplir la mission ${index + 1}`;
    for (const wave of level.waves ?? []) delete wave._spawned;
  });
  const levelsStory = {};
  gdl.levels.forEach((level, index) => {
    levelsStory[level.id] = { victory: [{ speaker: spec.heroName, portrait: 'hero', text: spec.story.victories[index] ?? 'La mission est accomplie.' }] };
  });
  gdl.story = {
    intro: spec.story.intro,
    levels: levelsStory,
    outro: [
      { speaker: 'Narrateur', text: spec.story.outro },
      { speaker: spec.heroName, portrait: 'hero', text: 'Ce chapitre se ferme. Le prochain commence maintenant.' },
    ],
  };
  gdl.relics = spec.relics;
  gdl.map = {
    title: spec.mapTitle,
    nodes: gdl.levels.map((level, index) => ({
      level: level.id,
      x: 0.2 + index * (0.6 / Math.max(1, gdl.levels.length - 1)),
      y: index % 2 ? 0.43 : 0.57,
      name: level.name,
    })),
  };
  gdl.meta = {
    ...(gdl.meta ?? {}),
    experienceVersion: '3.0',
    completeLoop: ['title', 'intro', 'hub', 'missions', 'arsenal', 'chronicles', 'level', 'reward', 'defeat', 'credits'],
    rebuiltAt: new Date().toISOString(),
  };
  return gdl;
}

async function updateWorkspaceManifest(workspace, slug, spec, gdl, report) {
  assertGenericRuntimeTarget(slug);
  const path = join(workspace, 'workspace.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({
    ...manifest,
    title: spec.title,
    status: 'ready',
    dimension: '2.5d',
    genre: gdl.genre === 'vertical-arena' ? 'survivors_like' : 'platformer',
    camera_mode: gdl.genre === 'vertical-arena' ? 'top_down' : 'side_view',
    preview_url: `/workspaces/${slug}/05_runtime/index.html`,
    updated_at: new Date().toISOString(),
    experience: {
      version: '3.0',
      screens: gdl.meta.completeLoop,
      ability: spec.abilityName,
      levels: gdl.levels.length,
      autoplay: report,
    },
  }, null, 2));
}

export async function rebuildProject(slug, spec, { root = ROOT } = {}) {
  assertGenericRuntimeTarget(slug);
  const workspace = join(root, 'workspaces', slug);
  const runtime = join(workspace, '05_runtime');
  const runtimeSource = join(root, 'tools', 'lib', 'forge', 'runtime');
  const gdlPath = join(runtime, 'game.gdl.json');
  if (!existsSync(gdlPath)) throw new Error(`GDL Forge manquant: ${slug}`);
  const gdl = enrichGdl(JSON.parse(await readFile(gdlPath, 'utf8')), spec);
  const report = await autoplay(clone(gdl), { maxSimSeconds: 240 });
  if (!report.won) throw new Error(`${slug}: campagne non completable (${JSON.stringify(report.levels)})`);
  for (const file of RUNTIME_FILES) await cp(join(runtimeSource, file), join(runtime, file));
  await writeFile(gdlPath, JSON.stringify(gdl, null, 2));
  await mkdir(join(workspace, '08_ops'), { recursive: true });
  await writeFile(join(workspace, '08_ops', 'game-experience-report.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    title: spec.title,
    complete_loop: gdl.meta.completeLoop,
    hub: spec.hub,
    gameplay: gdl.gameplay,
    levels: gdl.levels.map((level) => ({ id: level.id, name: level.name, objective: level.objective })),
    autoplay: report,
  }, null, 2));
  await updateWorkspaceManifest(workspace, slug, spec, gdl, report);
  console.log(`${spec.title}: ${gdl.levels.length} missions, autoplay ${report.simSeconds}s, ${report.kills} ennemis vaincus`);
}

export async function runPortfolio(
  { mode = 'dry-run', project, root = ROOT } = {},
  { rebuild = rebuildProject, log = console.log } = {},
) {
  if (mode !== 'dry-run' && mode !== 'apply') throw new Error(`Mode inconnu: ${mode}`);
  const plan = buildExecutionPlan({ root, project });
  log(formatPortfolioPlan(plan, mode));

  const selected = plan.filter((entry) => entry.mode === 'generic' && entry.selected);
  if (mode === 'dry-run') {
    log(`Dry-run termine: ${selected.length} runtime(s) generique(s) inspecte(s), 0 fichier ecrit.`);
    return { mode, plan, rebuilt: [] };
  }

  const blocked = selected.filter(({ missingFiles }) => missingFiles.length);
  if (blocked.length) {
    throw new Error(
      `Application annulee avant toute ecriture; preflight incomplet: `
      + blocked.map(({ slug, missingFiles }) => `${slug} (${missingFiles.join(', ')})`).join('; '),
    );
  }

  const rebuilt = [];
  for (const entry of selected) {
    const spec = assertGenericRuntimeTarget(entry.slug);
    await rebuild(entry.slug, spec, { root });
    rebuilt.push(entry.slug);
  }
  log(`Portfolio generique reconstruit: ${rebuilt.join(', ') || 'aucun projet'}.`);
  return { mode, plan, rebuilt };
}

const HELP = `Usage: node tools/rebuild-game-portfolio.mjs [options]

Sans option, le script reste en dry-run et n'ecrit aucun fichier.

Options:
  --dry-run, --plan       Afficher le plan et le preflight sans ecriture
  --apply                 Autoriser la reconstruction des runtimes generiques
  --project <slug>        Limiter l'operation a un projet generique
  --help, -h              Afficher cette aide

Runtimes proteges:
  orbes-d-astra                 pnpm orbes:build
  veloria-veille-des-lames      pnpm veloria:hd`;

export async function main(args = process.argv.slice(2)) {
  const options = parseCliArgs(args);
  if (options.help) {
    console.log(HELP);
    return;
  }
  await runPortfolio(options);
}

const executedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (executedDirectly) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}
