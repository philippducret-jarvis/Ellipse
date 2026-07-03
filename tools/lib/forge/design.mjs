/**
 * DESIGN — prompt libre → GDD structuré → GDL + plan d'assets.
 *
 * Deux cerveaux, même contrat (traçé dans meta.designBackend) :
 *   - 'claude'    : si ANTHROPIC_API_KEY est défini — GDD riche par LLM.
 *   - 'heuristic' : sinon — bibliothèque d'archétypes paramétrée par le prompt,
 *     déterministe. C'est le fallback honnête, pas une IA déguisée.
 *
 * Les niveaux sont générés procéduralement (PRNG seedé) puis VALIDÉS par
 * l'auto-play headless (smoke) : un niveau non complétable ne sort pas.
 */
import { masterSeed } from './identity.mjs';

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const THEMES = [
  {
    key: 'biolum', match: /champignon|mushroom|biolumin|spore|forêt enchant|glow forest/i,
    palette: ['#123a3a', '#1e6f5c', '#54e6c1', '#a3f7bf', '#e8f6ef', '#7b2d8b', '#2b1b4d'],
    mood: 'bioluminescent glow, ethereal night atmosphere, volumetric light',
    render: 'painterly high-detail 2D game art, rich color grading, HD',
    setting: 'a bioluminescent mushroom forest with giant glowing fungi',
    enemies: [
      { id: 'spore-beast', name: 'Bête sporale', rigType: 'monopart', dna: { archetype: 'small round spore creature monster', silhouette: 'compact round body with short limbs', face: 'single glowing eye', outfit: 'mushroom cap hide', colors: { body: '#7b2d8b', glow: '#54e6c1' }, materials: 'fungal flesh, glowing pores' } },
      { id: 'myco-warden', name: 'Gardien mycélien', rigType: 'humanoid', dna: { archetype: 'tall fungal humanoid guardian', silhouette: 'lanky, long arms', face: 'hollow wooden mask', hair: 'mushroom cap crown', outfit: 'bark and moss armor', colors: { armor: '#1e6f5c', glow: '#a3f7bf' }, materials: 'living wood, moss, glowing sap' } },
    ],
  },
  {
    key: 'gothic', match: /gothi|malédiction|cursed|crépuscule|cathédral|veille|lame|knight order|inquisit/i,
    palette: ['#1a1230', '#3c2a5d', '#8a5fbf', '#e8c05a', '#f4ead8', '#7a1f2b', '#0d0a1a'],
    mood: 'candlelit gothic twilight, sacred gold accents, dramatic shadows',
    render: 'painterly dark fantasy game art, high detail, HD',
    setting: 'a cursed gothic citadel with candlelit cloisters and broken stained glass',
    enemies: [
      { id: 'gargoyle', name: 'Gargouille', rigType: 'monopart', dna: { archetype: 'stone gargoyle creature', silhouette: 'hunched winged stone beast', face: 'snarling stone maw', outfit: 'cracked stone hide', colors: { stone: '#3c2a5d', eyes: '#e8c05a' }, materials: 'weathered stone, gold inlay' } },
      { id: 'fallen-knight', name: 'Chevalier déchu', rigType: 'humanoid', dna: { archetype: 'corrupted knight in ruined armor', silhouette: 'heavy armored broad silhouette', face: 'closed dark helm', hair: 'none, full helm', outfit: 'ruined plate armor with torn crimson cape', colors: { armor: '#1a1230', cape: '#7a1f2b', trim: '#e8c05a' }, materials: 'blackened steel, torn cloth' } },
    ],
  },
  {
    key: 'cyber', match: /cyber|néon|neon|hacker|synth|futur|robot|mecha/i,
    palette: ['#0b0f2a', '#14213d', '#f72585', '#4cc9f0', '#f8f9fa', '#7209b7', '#3a0ca3'],
    mood: 'neon-drenched night city, rain reflections, holographic haze',
    render: 'sleek high-detail 2D game art, cinematic neon lighting, HD',
    setting: 'a rain-slick cyberpunk megacity street with neon signs and holograms',
    enemies: [
      { id: 'sec-drone', name: 'Drone de sécurité', rigType: 'monopart', dna: { archetype: 'hovering security drone robot', silhouette: 'compact angular chassis with rotors', face: 'single red sensor lens', outfit: 'matte black plating', colors: { chassis: '#14213d', sensor: '#f72585' }, materials: 'brushed metal, neon strips' } },
      { id: 'enforcer', name: 'Exécuteur corpo', rigType: 'humanoid', dna: { archetype: 'corporate cyborg enforcer', silhouette: 'broad shoulders, asymmetric cybernetic arm', face: 'half-masked, glowing visor', hair: 'shaved sides mohawk', outfit: 'armored trench coat', colors: { coat: '#0b0f2a', visor: '#4cc9f0', accents: '#f72585' }, materials: 'ballistic fabric, chrome' } },
    ],
  },
  {
    key: 'fantasy', match: /.*/,
    palette: ['#2d3a2e', '#4a6741', '#8fb573', '#e8d5a3', '#c97b3d', '#5b8fb9', '#31263e'],
    mood: 'golden-hour adventure atmosphere, lush vegetation',
    render: 'painterly high-detail 2D game art, vibrant color, HD',
    setting: 'a lush fantasy wilderness with ancient ruins',
    enemies: [
      { id: 'slime', name: 'Limon', rigType: 'monopart', dna: { archetype: 'gelatinous slime creature', silhouette: 'wobbly dome blob', face: 'two beady eyes', outfit: 'none', colors: { body: '#8fb573', core: '#5b8fb9' }, materials: 'translucent gel' } },
      { id: 'bandit', name: 'Maraudeur', rigType: 'humanoid', dna: { archetype: 'wilderness bandit raider', silhouette: 'lean and quick', face: 'scarred, bandana over mouth', hair: 'rough short hair', outfit: 'leather armor with hood', colors: { leather: '#31263e', hood: '#c97b3d' }, materials: 'worn leather, iron buckles' } },
    ],
  },
];

const HERO_HINTS = [
  { match: /chevali[eè]re|knightess|paladine/i, dna: { archetype: 'armored heroine knight', silhouette: 'athletic, elegant plate silhouette', face: 'determined feminine face', hair: 'long braided hair', outfit: 'ornate plate armor with flowing half-cape and longsword', props: 'longsword' } },
  { match: /chevalier|knight|paladin/i, dna: { archetype: 'armored hero knight', silhouette: 'strong plate silhouette', face: 'determined face', hair: 'short hair', outfit: 'plate armor with cape and longsword', props: 'longsword' } },
  { match: /mage|sorci|wizard|witch/i, dna: { archetype: 'battle mage', silhouette: 'slender robed silhouette', face: 'focused arcane gaze', hair: 'long loose hair', outfit: 'layered robes with glowing runes and staff', props: 'arcane staff' } },
  { match: /ninja|assassin|rogue|voleu/i, dna: { archetype: 'agile shadow warrior', silhouette: 'lean acrobatic silhouette', face: 'masked lower face', hair: 'tied back hair', outfit: 'fitted dark garb with twin daggers', props: 'twin daggers' } },
  { match: /robot|androïde|android|mecha/i, dna: { archetype: 'sleek combat android', silhouette: 'streamlined mechanical frame', face: 'expressive synthetic face', hair: 'none, sculpted helm', outfit: 'plated synthetic body with energy blade', props: 'energy blade' } },
  { match: /.*/, dna: { archetype: 'adventurer hero', silhouette: 'athletic silhouette', face: 'determined face', hair: 'windswept hair', outfit: 'practical adventuring gear with sword', props: 'sword' } },
];

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'game'; }

function titleFrom(prompt, theme) {
  const words = prompt.split(/[,.;—-]/)[0].trim().split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
  if (words.length >= 2) return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return { biolum: 'Lueurs du Mycélium', gothic: 'La Veille Écarlate', cyber: 'Néon Protocole', fantasy: 'Les Ruines Dorées' }[theme.key];
}

/**
 * GDD heuristique — déterministe, honnête (meta.designBackend='heuristic').
 * `styleOverride` (bible du workspace / extraction boards) VERROUILLE la
 * direction artistique : palette canonique, rendu, ambiance des planches.
 */
export function heuristicGdd(prompt, styleOverride = null) {
  const theme0 = THEMES.find((t) => t.match.test(prompt));
  const theme = styleOverride
    ? {
        ...theme0,
        palette: styleOverride.palette?.length >= 4 ? styleOverride.palette : theme0.palette,
        render: styleOverride.render ?? theme0.render,
        mood: styleOverride.mood ?? theme0.mood,
      }
    : theme0;
  const heroHint = HERO_HINTS.find((h) => h.match.test(prompt));
  const genre = /gacha|ar[eè]ne|vague|wave|tower|verticale?/i.test(prompt) ? 'vertical-arena' : 'sidescroller';
  const id = slug(prompt);
  const setting = prompt.length > 24 ? prompt.replace(/^(un|une|le|la|les|a|an)\s+/i, '') : theme.setting;
  const heroName = { biolum: 'Lior', gothic: 'Sœur Adalène', cyber: 'Kaï Vector', fantasy: 'Arin' }[theme.key];
  const bossName = { biolum: 'Cœur du Mycélium', gothic: 'L’Évêque Déchu', cyber: 'Directeur-Machine', fantasy: 'Roi des Ruines' }[theme.key];
  return {
    designBackend: 'heuristic',
    id, title: titleFrom(prompt, theme), genre,
    pitch: `Un ${genre === 'sidescroller' ? 'action-platformer' : 'combat d’arène vertical'} 2,5D HD : ${setting}.`,
    setting, palette: theme.palette, mood: theme.mood, render: theme.render,
    hero: {
      id: 'hero', name: heroName, role: 'hero', rigType: 'humanoid',
      dna: { ...heroHint.dna, colors: { primary: theme.palette[2], secondary: theme.palette[3], accent: theme.palette[4] }, materials: heroHint.dna.materials ?? 'detailed game-ready materials' },
      stats: {},
    },
    enemies: theme.enemies.map((e) => {
      // palette verrouillée → les ennemis aussi portent les couleurs des planches
      const colors = styleOverride?.palette
        ? Object.fromEntries(Object.keys(e.dna.colors ?? {}).map((k, i) => [k, theme.palette[(i * 2 + 1) % theme.palette.length]]))
        : e.dna.colors;
      return { ...e, dna: { ...e.dna, colors }, role: 'enemy', stats: e.rigType === 'humanoid' ? { hp: 3, speed: 140, damage: 1 } : { hp: 2, speed: 110, damage: 1, touchDamage: true } };
    }),
    boss: { name: bossName, fromEnemy: theme.enemies.find((e) => e.rigType === 'humanoid')?.id ?? theme.enemies[0].id },
    arenas: [
      { id: 'arena-01', theme: setting },
      { id: 'arena-02', theme: `the deepest and most dangerous heart of ${setting}, more dramatic, more intense` },
    ],
    mechanics: genre === 'sidescroller' ? ['run', 'jump', 'attack', 'checkpoints', 'pickups', 'hazards', 'boss'] : ['lanes', 'waves', 'attack', 'boss'],
  };
}

/** GDD par Claude (si ANTHROPIC_API_KEY) — même contrat de sortie. */
export async function claudeGdd(prompt, styleOverride = null) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = heuristicGdd(prompt, styleOverride); // gabarit de forme (style déjà verrouillé)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.FORGE_DESIGN_MODEL || 'claude-sonnet-5',
      max_tokens: 3000,
      system: 'Tu es game designer senior. Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format exact de l’exemple fourni (mêmes clés). Prompts DNA en anglais (pour la génération d’images), textes joueur en français. Palette en hex cohérente avec l’ambiance.',
      messages: [{ role: 'user', content: `Prompt du joueur : "${prompt}"\n\nFormat attendu (exemple à adapter, pas à recopier) :\n${JSON.stringify(base, null, 1)}` }],
    }),
  });
  if (!res.ok) { console.warn(`design: API Claude HTTP ${res.status} → fallback heuristique`); return null; }
  const data = await res.json();
  try {
    const gdd = JSON.parse(data.content[0].text.replace(/^```json?\s*|\s*```$/g, ''));
    gdd.designBackend = 'claude'; gdd.id = gdd.id || base.id;
    return gdd;
  } catch { console.warn('design: JSON GDD illisible → fallback heuristique'); return null; }
}

export async function designGdd(prompt, styleOverride = null) {
  return (await claudeGdd(prompt, styleOverride)) ?? heuristicGdd(prompt, styleOverride);
}

/** Un niveau sidescroller procédural, densité croissante avec `difficulty`. */
function buildSideLevel(rnd, gdd, { id, name, arena, length, difficulty, boss = false }) {
  const level = { id, name, boss, arena, length, spawns: [], hazards: [], pickups: [], checkpoints: [Math.round(length * 0.5)], exit: { x: length - 220 } };
  const kinds = gdd.enemies.map((e) => e.id);
  let x = 750;
  const gap = boss ? 640 : 520 - difficulty * 60;
  while (x < length - (boss ? 1100 : 700)) {
    level.spawns.push({ entity: kinds[(rnd() * kinds.length) | 0], x: Math.round(x) });
    if (rnd() < 0.35 + difficulty * 0.1) level.hazards.push({ x: Math.round(x + 260 + rnd() * 120), w: 120, type: 'spikes', damage: 1 });
    if (rnd() < 0.35 - difficulty * 0.05) level.pickups.push({ x: Math.round(x + 140), type: rnd() < 0.6 ? 'gem' : 'heart' });
    x += gap + rnd() * 420;
  }
  if (boss) level.spawns.push({ entity: 'boss', x: length - 500 });
  return level;
}

/** GDD → GDL 1.1 (campagne : niveaux enchaînés, boss, histoire, reliques, carte). */
export function compileGdl(gdd, { levelLength = 4200 } = {}) {
  const seed = masterSeed(gdd.id);
  const rnd = mulberry32(seed);
  const entities = {
    hero: { role: 'hero', name: gdd.hero.name, rig: `assets/hero/hero.rig.json`, clips: `assets/hero/hero.clips.json`, scale: 0.26, stats: gdd.hero.stats ?? {} },
  };
  for (const e of gdd.enemies) {
    entities[e.id] = { role: 'enemy', name: e.name, rig: `assets/enemies/${e.id}.rig.json`, clips: `assets/enemies/${e.id}.clips.json`, scale: e.rigType === 'humanoid' ? 0.24 : 0.15, stats: e.stats, ai: e.rigType === 'humanoid' ? { type: 'chase', aggroRange: 460, chaseSpeed: 170, range: 240 } : { type: 'patrol', range: 220, aggroRange: 0 } };
  }
  // boss : réutilise le rig de l'ennemi le plus costaud — plus grand, plus dur
  const bossSrc = gdd.enemies.find((e) => e.id === gdd.boss?.fromEnemy) ?? gdd.enemies[0];
  entities.boss = {
    role: 'boss', name: gdd.boss?.name ?? 'Boss',
    rig: `assets/enemies/${bossSrc.id}.rig.json`, clips: `assets/enemies/${bossSrc.id}.clips.json`,
    scale: (bossSrc.rigType === 'humanoid' ? 0.24 : 0.15) * 1.7,
    stats: { hp: 14, speed: 150, damage: 1 },
    ai: { type: 'chase', aggroRange: 900, chaseSpeed: 185, range: 400 },
  };

  const arena = (i) => `assets/arenas/${gdd.arenas[Math.min(i, gdd.arenas.length - 1)].id}.parallax.json`;
  const levels = [];
  if (gdd.genre === 'sidescroller') {
    levels.push(buildSideLevel(rnd, gdd, { id: 'level-01', name: 'La Lisière', arena: arena(0), length: levelLength, difficulty: 0 }));
    levels.push(buildSideLevel(rnd, gdd, { id: 'level-02', name: 'Les Profondeurs', arena: arena(1), length: Math.round(levelLength * 1.2), difficulty: 1 }));
    levels.push(buildSideLevel(rnd, gdd, { id: 'level-03', name: `L'Antre — ${entities.boss.name}`, arena: arena(1), length: Math.round(levelLength * 0.7), difficulty: 2, boss: true }));
  } else {
    const mkWaves = (count, speedT) => {
      const waves = [];
      for (let w = 0; w < count; w++) for (let n = 0; n < 2 + (w / 3 | 0); n++) {
        waves.push({ t: 3 + w * (7 - speedT) + rnd() * 3, lane: (rnd() * 3) | 0, entity: gdd.enemies[(rnd() * gdd.enemies.length) | 0].id });
      }
      return waves;
    };
    levels.push({ id: 'level-01', name: 'Première Veille', arena: arena(0), waves: mkWaves(6, 0) });
    levels.push({ id: 'level-02', name: 'La Grande Vague', arena: arena(1), waves: mkWaves(9, 1.5) });
    const bossWaves = mkWaves(5, 2);
    bossWaves.push({ t: 30, lane: 1, entity: 'boss' });
    levels.push({ id: 'level-03', name: `Jugement — ${entities.boss.name}`, arena: arena(1), waves: bossWaves, boss: true });
  }

  // histoire (récit court, portrait du héros sur ses répliques)
  const heroN = gdd.hero.name, bossN = entities.boss.name;
  const story = {
    intro: [
      { speaker: 'Narrateur', text: gdd.pitch },
      { speaker: heroN, portrait: 'hero', text: `Ce lieu m'appelle depuis toujours. Quelque chose s'est éveillé — et je suis ${/e$/.test(heroN) ? 'la seule' : 'le seul'} à pouvoir l'affronter.` },
      { speaker: 'Narrateur', text: `Au bout du chemin veille ${bossN}. Trois épreuves séparent ${heroN} de sa destinée.` },
    ],
    levels: {
      'level-01': { victory: [{ speaker: heroN, portrait: 'hero', text: 'Première épreuve franchie. L\'air devient plus lourd — je me rapproche.' }] },
      'level-02': { victory: [{ speaker: heroN, portrait: 'hero', text: `Je sens sa présence désormais. ${bossN} sait que j'arrive.` }] },
      'level-03': { victory: [{ speaker: heroN, portrait: 'hero', text: 'C\'est terminé. La lumière peut revenir.' }] },
    },
    outro: [
      { speaker: 'Narrateur', text: `${bossN} n'est plus. ${gdd.setting} respire à nouveau.` },
      { speaker: heroN, portrait: 'hero', text: 'Mon histoire ne fait que commencer.' },
    ],
  };

  const relics = [
    { id: 'boots', name: 'Bottes de célérité', desc: 'Vitesse de déplacement +25 %', effect: { speedMul: 1.25 } },
    { id: 'talisman', name: 'Talisman de vie', desc: '+2 cœurs au maximum', effect: { hpAdd: 2 } },
    { id: 'edge', name: 'Fil aiguisé', desc: 'Dégâts +1', effect: { damageAdd: 1 } },
    { id: 'wings', name: 'Plumes d\'ascension', desc: 'Saut +15 %', effect: { jumpMul: 1.15 } },
  ];

  const map = {
    title: gdd.setting.length < 60 ? gdd.setting[0].toUpperCase() + gdd.setting.slice(1) : 'Carte du monde',
    nodes: levels.map((l, i) => ({ level: l.id, x: 0.22 + i * 0.28, y: i % 2 ? 0.42 : 0.56, name: l.name })),
  };

  const gdl = {
    gdl: '1.1', id: gdd.id, title: gdd.title, subtitle: gdd.pitch, genre: gdd.genre, seed,
    palette: gdd.palette,
    world: gdd.genre === 'sidescroller' ? { viewport: { w: 1280, h: 720 }, gravity: 2600, floorY: 0.82 } : { viewport: { w: 720, h: 1280 }, lanes: 3 },
    entities, levels, story, relics, map,
    ui: { hud: gdd.genre === 'sidescroller' ? ['hearts', 'score', 'progress'] : ['hearts', 'score', 'wave'], accent: gdd.palette[3] ?? '#e8c05a' },
    meta: { pitch: gdd.pitch, designBackend: gdd.designBackend, generatedAt: new Date().toISOString() },
  };

  const style = { render: gdd.render, mood: gdd.mood };
  const assetPlan = {
    hero: { id: 'hero', name: gdd.hero.name, dna: gdd.hero.dna, style, rigType: 'humanoid' },
    enemies: gdd.enemies.map((e) => ({ id: e.id, name: e.name, dna: { ...e.dna, colors: e.dna.colors ?? {} }, style, rigType: e.rigType })),
    arenas: gdd.arenas.map((a) => ({ id: a.id, theme: a.theme, style, palette: gdd.palette })),
  };
  return { gdl, assetPlan };
}
