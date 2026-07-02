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

/** GDD heuristique — déterministe, honnête (meta.designBackend='heuristic'). */
export function heuristicGdd(prompt) {
  const theme = THEMES.find((t) => t.match.test(prompt));
  const heroHint = HERO_HINTS.find((h) => h.match.test(prompt));
  const genre = /gacha|ar[eè]ne|vague|wave|tower|verticale?/i.test(prompt) ? 'vertical-arena' : 'sidescroller';
  const id = slug(prompt);
  const setting = prompt.length > 24 ? prompt.replace(/^(un|une|le|la|les|a|an)\s+/i, '') : theme.setting;
  return {
    designBackend: 'heuristic',
    id, title: titleFrom(prompt, theme), genre,
    pitch: `Un ${genre === 'sidescroller' ? 'action-platformer' : 'combat d’arène vertical'} 2,5D HD : ${setting}.`,
    setting, palette: theme.palette, mood: theme.mood, render: theme.render,
    hero: {
      id: 'hero', name: 'Héros', role: 'hero', rigType: 'humanoid',
      dna: { ...heroHint.dna, colors: { primary: theme.palette[2], secondary: theme.palette[3], accent: theme.palette[4] }, materials: heroHint.dna.materials ?? 'detailed game-ready materials' },
      stats: {},
    },
    enemies: theme.enemies.map((e) => ({ ...e, role: 'enemy', stats: e.rigType === 'humanoid' ? { hp: 3, speed: 140, damage: 1 } : { hp: 2, speed: 110, damage: 1, touchDamage: true } })),
    arenas: [{ id: 'arena-01', theme: setting }],
    mechanics: genre === 'sidescroller' ? ['run', 'jump', 'attack', 'checkpoints', 'pickups', 'hazards'] : ['lanes', 'waves', 'attack'],
  };
}

/** GDD par Claude (si ANTHROPIC_API_KEY) — même contrat de sortie. */
export async function claudeGdd(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = heuristicGdd(prompt); // sert de gabarit de forme au LLM
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

export async function designGdd(prompt) {
  return (await claudeGdd(prompt)) ?? heuristicGdd(prompt);
}

/** GDD → GDL (niveaux procéduraux seedés) + plan d'assets à forger. */
export function compileGdl(gdd, { levelLength = 4200 } = {}) {
  const seed = masterSeed(gdd.id);
  const rnd = mulberry32(seed);
  const entities = {
    hero: { role: 'hero', rig: `assets/hero/hero.rig.json`, clips: `assets/hero/hero.clips.json`, scale: 0.26, stats: gdd.hero.stats ?? {} },
  };
  for (const e of gdd.enemies) {
    entities[e.id] = { role: 'enemy', rig: `assets/enemies/${e.id}.rig.json`, clips: `assets/enemies/${e.id}.clips.json`, scale: e.rigType === 'humanoid' ? 0.24 : 0.15, stats: e.stats, ai: e.rigType === 'humanoid' ? { type: 'chase', aggroRange: 460, chaseSpeed: 170, range: 240 } : { type: 'patrol', range: 220, aggroRange: 0 } };
  }

  const level = { id: 'level-01', arena: `assets/arenas/${gdd.arenas[0].id}.parallax.json`, length: levelLength, spawns: [], hazards: [], pickups: [], checkpoints: [Math.round(levelLength * 0.5)], exit: { x: levelLength - 220 } };
  if (gdd.genre === 'sidescroller') {
    let x = 750;
    const kinds = gdd.enemies.map((e) => e.id);
    while (x < levelLength - 700) {
      level.spawns.push({ entity: kinds[(rnd() * kinds.length) | 0], x: Math.round(x) });
      if (rnd() < 0.4) level.hazards.push({ x: Math.round(x + 260 + rnd() * 120), w: 120, type: 'spikes', damage: 1 });
      if (rnd() < 0.35) level.pickups.push({ x: Math.round(x + 140), type: rnd() < 0.6 ? 'gem' : 'heart' });
      x += 520 + rnd() * 420;
    }
  } else {
    level.waves = [];
    const kinds = gdd.enemies.map((e) => e.id);
    for (let w = 0; w < 8; w++) for (let n = 0; n < 2 + (w / 3 | 0); n++) {
      level.waves.push({ t: 3 + w * 7 + rnd() * 3, lane: (rnd() * 3) | 0, entity: kinds[(rnd() * kinds.length) | 0] });
    }
  }

  const gdl = {
    gdl: '1.0', id: gdd.id, title: gdd.title, subtitle: gdd.pitch, genre: gdd.genre, seed,
    palette: gdd.palette,
    world: gdd.genre === 'sidescroller' ? { viewport: { w: 1280, h: 720 }, gravity: 2600, floorY: 0.82 } : { viewport: { w: 720, h: 1280 }, lanes: 3 },
    entities, levels: [level],
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
