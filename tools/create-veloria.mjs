/**
 * Crée le projet "Veloria — Veille des Lames" dans la bonne catégorie (action-roguelite à vagues
 * « survivors-like » + gacha, dark fantasy mobile). Scaffolde le workspace, les documents de design
 * (héroïnes, systèmes, runes, reliques, équipements, soutiens, niveaux, hub) et un GDL typé.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { derivePreset, buildStarterGdl, getGameType, resolveLibraryPlan } from '../packages/shared/dist/index.js';

const ROOT = process.cwd();
const SLUG = 'veloria-veille-des-lames';
const WS = join(ROOT, 'workspaces', SLUG);
const PROJECT_ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const TITLE = 'Veloria — Veille des Lames';
const NOW = new Date().toISOString();

// Catégorie : survivors-like (action à vagues) + modules gacha / invocation / loot.
const preset = derivePreset({
  game_type: 'survivors_like',
  dimension: '2d',
  art_style: 'dark_fantasy',
  mood: 'dark',
  difficulty: 'hardcore',
  mechanic_modules: ['wave_survival', 'gacha_summon', 'summon_squad', 'loot_rarity'],
  platforms: ['mobile', 'web'],
});

const HEROINES = [
  ['Auréline', 'Lancière Sacrée', 'Burst / Percée', 'Lance Céleste', 'Aurore Sacrée'],
  ['Morgane', 'Duelliste Corbeau', 'Dash / Assassinat', 'Lames Jumelles', 'Pas du Prédateur'],
  ['Selka', 'Cantatrice Occulte', 'Zone / Charme', 'Bâton Lunaire', "Rite d'Éclipse"],
  ['Isolde', 'Veuve Carmin', 'Tank / Saignement', 'Hallebarde & Bouclier', 'Noces Sanglantes'],
  ['Roxane', 'Arbalétrière du Bastion', 'Distance / Critique', 'Arbalète Répétitive', 'Salve du Bastion'],
  ['Liora', 'Oracle de Minuit', 'Malédiction / Zone', 'Orbe Lunaire', 'Malédiction Éternelle'],
  ['Célestine', "Prêtresse d'Aube", 'Support / Soin', 'Encensoir', 'Aurore Sacrée'],
  ['Vesper', 'Danse-Lame du Loup', 'Dash / Duel', 'Lames Jumelles', 'Pas du Prédateur'],
  ['Nyméa', 'Dryade des Épines', 'Contrôle / Poison', "Fouet d'Épines", "Couronne d'Épines"],
];

const LEVELS = [
  ['Cloître en Ruine', 'Chevalier déchu', 'Effondrement (zones de sol qui cèdent)'],
  ['Route des Bûchers', 'Chien des tombes', 'Bûchers (flammes balayant une voie)'],
  ['Jardin des Statues', 'Gargouille', 'Piques sortantes (voie aléatoire)'],
  ['Port des Noyés', 'Sœur fanatique', 'Marevague (vague d’eau périodique)'],
  ['Crypte des Chandelles', 'Acolyte des Ombres', 'Cercle occulte'],
  ['Trône du Crépuscule', 'Garde du Trône / Bourreau', 'Lames circulaires (boucle)'],
];

const SUPPORTS = [
  ['Célestine', 'Soin / Bouclier', 'Soin de zone + bouclier toutes les 7 attaques'],
  ['Nyméa', 'Contrôle / Poison', 'Racines ralentissantes + Poison quand un ennemi traverse'],
  ['Vesper', 'Assassinat / Dash', 'Exécution instantanée d’un ennemi sous 20% PV'],
  ['Sœur Ilyane', 'Purification / Protection', 'Dissipe les malus + immunité contrôle'],
  ['Maëra des Cendres', 'Brûlure / Bannière', 'Bannière ardente qui brûle et booste les dégâts'],
  ['Elsinor la Corneille', 'Malédiction / Drain', 'Malédiction + vol d’énergie sur élite'],
];

const EXPECTED_BOARDS = [
  'pitch_veloria.png',
  'ambiances_hub_niveaux.png',
  'planches_heroines_ii.png',
  'gameplay_mobile_aureline.png',
  'gameplay_phase_elite_morgane.png',
  'personnages_principaux_v2.png',
  'personnages_principaux_v1.png',
  'runes_sigilles.png',
  'reliques_objets_invocables.png',
  'personnages_soutien.png',
  'equipements_sets.png',
  'planches_environnements.png',
];

async function ensure(d) { await mkdir(d, { recursive: true }); }

async function main() {
  console.log('— Création du projet Veloria —\n');

  // Arborescence de production standard.
  for (const d of [
    '00_brief/documents', '01_inputs/references', '01_inputs/prompts', '01_inputs/uploads',
    '02_design/specs', '03_assets/characters', '03_assets/characters/enemies',
    '03_assets/props', '03_assets/props/collectibles', '03_assets/environments',
    '03_assets/ui', '03_assets/fx', '03_assets/audio', '03_assets/registry',
    '04_scenes/level_01', '05_runtime/gdl', '05_runtime/config', '06_qa', '07_exports', '08_ops/manifests',
  ]) await ensure(join(WS, d));

  // workspace.json (catégorie : survivors-like, top-down vertical, mobile).
  await writeFile(join(WS, 'workspace.json'), JSON.stringify({
    project_id: PROJECT_ID, slug: SLUG, title: TITLE, status: 'planning',
    dimension: '2d', genre: 'survivors_like', runtime: 'ellipse_web_2d', camera_mode: 'top_down',
    created_at: NOW, updated_at: NOW,
  }, null, 2));

  // GDL typé par genre + design enrichi dans meta.
  const gdl = buildStarterGdl(preset, { title: TITLE });
  gdl.meta.design = {
    pillars: ['gameplay simple maîtrise immédiate', 'tension progressive', 'bénédictions puissantes', 'héroïnes premium', 'bosses lisibles', 'runs courtes 3 min'],
    core_loop: 'invoquer → améliorer → run → bénédiction (draft entre vagues) → boss → récompenses',
    run: { lanes: 3, movement: 'gauche/droite', waves: 12, duration_min: 3, auto_attack: true, skills: 3, ultimate: true },
    heroines: HEROINES.map(([name, title, role, weapon, ult]) => ({ name, title, role, weapon, ultimate: ult })),
    supports: SUPPORTS.map(([name, role, effect]) => ({ name, role, effect })),
    levels: LEVELS.map(([name, enemy, hazard]) => ({ name, enemy, hazard })),
    hub: ['Hall des Héroïnes', 'Scène d’Invocation', 'Atelier / Dressing', 'Arsenal & Reliques', 'Jardin des Serments'],
    meta_systems: ['gacha (invocation, raretés, bannières, pity)', 'runes & sigilles', 'reliques permanentes', 'objets invocables', 'équipements & sets', 'soutiens équipables'],
    palette: ['Or sacré', 'Violet occulte', 'Pourpre', 'Carmin', 'Bronze', 'Indigo', 'Noir'],
  };
  await writeFile(join(WS, '05_runtime', 'gdl', 'veloria.preview.gdl.json'), JSON.stringify(gdl, null, 2));

  // Documents de design.
  const docs = {
    '00_pitch.md': `# ${TITLE}\n\n> La nuit avance. La lame veille.\n\nAction-roguelite **mobile** vertical, **dark fantasy premium**. Contrôle une héroïne d'exception,\naffronte des vagues de créatures maudites et survis à la descente des ténèbres.\n\n## Catégorie\n- Type : **survivors-like (action à vagues)** + **gacha**\n- Dimension : 2D · Perspective : top-down vertical · Cibles : mobile, web\n- Difficulté : exigeante · Runs : **3 minutes**\n\n## Piliers\n1. Gameplay simple, maîtrise immédiate (déplacement gauche/droite, auto-attaque)\n2. Tension progressive (vagues, élites, mini-boss, boss)\n3. Bénédictions puissantes (draft entre vagues → synergies)\n4. Héroïnes premium (collection gacha)\n5. Bosses lisibles (patterns télégraphiés)\n6. Runs courtes, impact maximal\n\n## Boucle\ninvoquer → améliorer → lancer un run → choisir une bénédiction → boss → récompenses (butin, cristaux, progression)\n`,
    '01_game_design.md': `# Game Design — ${TITLE}\n\n## Run (cœur)\n- **3 voies** (lanes), déplacement **gauche/droite** uniquement\n- **Auto-attaque** (frappes courtes / cônes / arcs d'épée)\n- **3 compétences actives** + **1 ultime**\n- **12 vagues**, ennemis variés → élites → mini-boss → **boss de fin**\n- **Bénédictions** : 1 choix entre chaque vague (cartes bonus) → façonne le build\n- Ennemis au contact : s'ils atteignent le bas, perte de PV\n\n## Systèmes runtime (déclarés)\n${preset.systems.map((s) => `- ${s}`).join('\n')}\n\n## Production (règles)\n- Arènes compactes · peu d'ennemis simultanés (3–5) · 1 hazard unique par niveau\n- Props réutilisables · VFX lisibles · boss très lisibles · UI légère · 60 FPS mobile\n`,
    '02_heroines.md': `# Héroïnes\n\n${HEROINES.map(([n, t, r, w, u], i) => `## ${i + 1}. ${n} — *${t}*\n- Rôle : ${r}\n- Arme : ${w}\n- Ultime : ${u}`).join('\n\n')}\n`,
    '03_systems_runes_relics.md': `# Méta-systèmes\n\n## Gacha\nInvocation d'héroïnes : raretés (★→★★★★★), bannières, système de pitié.\n\n## Runes & Sigilles\n- Catégories : Offensives · Défensives · Soutien · Corrompues (puissance au prix du risque)\n- Raretés : Commune → Peu commune → Rare → Épique → Légendaire → Mythique\n- Emplacements : Arme · Armure · Relique · Bijou\n- Gravure : consomme des ressources ; synergies de combinaisons\n\n## Reliques permanentes (jusqu'à 4)\nMiroir des Veilles, Cloche des Martyrs, Couronne d'Épines, Encensoir d'Aube, Ciboire des Corbeaux, Lanterne des Noyés, Livre des Lunes, Chaîne du Bastion.\n\n## Objets invocables (en run)\nTotem de Grâce, Lame Spectrale, Bannière de Cendre, Cercle d'Encens, Corbeau d'Obsidienne, Autel de Veille.\n`,
    '04_equipment_supports.md': `# Équipements & Soutiens\n\n## Équipements\nArmes · Armures · Insignes · Talismans · Bottes · Ornements sacrés.\n### Sets\n- **Veille de l'Aube** (sacré) · **Messe des Corbeaux** (ombre) · **Bastion du Crépuscule** (fer & fléau)\n\n## Personnages de soutien (jusqu'à 3 équipés)\n${SUPPORTS.map(([n, r, e]) => `- **${n}** — ${r} : ${e}`).join('\n')}\n\nLes soutiens interviennent automatiquement quand leur déclencheur est rempli, et confèrent un bonus passif permanent.\n`,
    '05_levels_hub.md': `# Niveaux & Hub\n\n## Hub — Le Pavillon des Veilles\nHall des Héroïnes · Scène d'Invocation · Atelier / Dressing · Arsenal & Reliques · Jardin des Serments.\nCirculation circulaire, compacte, modulaire.\n\n## Niveaux\n${LEVELS.map(([n, e, h], i) => `### ${i + 1}. ${n}\n- Ennemi principal : ${e}\n- Hazard unique : ${h}`).join('\n\n')}\n`,
  };
  for (const [name, content] of Object.entries(docs)) {
    await writeFile(join(WS, '00_brief', 'documents', name), content);
  }

  // Prompt source + index des références attendues.
  await writeFile(join(WS, '01_inputs', 'prompts', '0001_bootstrap.prompt.md'),
    `# Prompt source — ${TITLE}\n\nAction-roguelite mobile vertical, dark fantasy premium. Survivors-like à 3 voies + gacha.\nHéroïnes collectionnables, bénédictions entre vagues, bosses lisibles, runs de 3 minutes.\n`);
  await writeFile(join(WS, '01_inputs', 'references', 'reference-index.json'), JSON.stringify({
    note: 'Dépose ici les planches concept-art de Veloria (mêmes noms), puis utilise l’onglet Extraction du studio pour en sortir des sprites détourés.',
    expected_boards: EXPECTED_BOARDS,
  }, null, 2));

  // Registre d'assets vide (prêt) + résumé du plan de production.
  const plan = resolveLibraryPlan(preset);
  await writeFile(join(WS, '03_assets', 'registry', 'generated-assets.json'), JSON.stringify({
    project: SLUG, generated_at: NOW, method: 'à produire (extraction des planches + vectoriel)',
    palette: gdl.meta.design.palette, count: 0, assets: [],
  }, null, 2));
  await writeFile(join(WS, '08_ops', 'manifests', 'production-plan.json'), JSON.stringify({
    game_type: plan.game_type, map_kind: plan.map.map_kind, audio_profile: plan.audio.profile,
    systems: plan.systems, asset_families: plan.assets,
  }, null, 2));

  await writeFile(join(WS, 'README.md'),
    `# ${TITLE}\n\nProjet Ellipse — catégorie **survivors-like + gacha** (dark fantasy mobile).\nDesign complet dans \`00_brief/documents/\`. GDL : \`05_runtime/gdl/veloria.preview.gdl.json\`.\nDépose les planches dans \`01_inputs/references/\` puis détoure via l'onglet **Extraction** du studio.\n`);

  console.log(`✓ Projet créé : ${SLUG}`);
  console.log(`  catégorie : ${getGameType('survivors_like').label} + modules ${preset.mechanic_modules.join(', ')}`);
  console.log(`  systèmes : ${preset.systems.length} · docs : ${Object.keys(docs).length} · boards attendus : ${EXPECTED_BOARDS.length}`);
}

main().catch((e) => { console.error('ECHEC:', e); process.exit(1); });
