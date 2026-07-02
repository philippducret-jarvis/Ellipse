/**
 * Veloria — TEMPLATES DE PROMPTS (idée → spécification générative).
 *
 * Transforme la description LORE de chaque entité (héroïnes, ennemis, arènes) en
 * specs de génération : prompt positif/négatif (style-locké par la bible), poses
 * ControlNet, et CLIPS D'ANIMATION (idle/marche/attaque/touché/mort/ultime) avec
 * nb de frames — comme un studio découpe une fiche perso en livrables animés.
 *
 * Aucune donnée n'est lue dans les pixels des planches : on en extrait l'INTENTION.
 */
import STYLE from './style-bible.mjs';

// clips d'animation standard d'un survivors-like (frames = images à générer)
export const HERO_CLIPS = [
  { name: 'idle', frames: 6, fps: 8, motion: 'gentle breathing idle stance, weapon ready' },
  { name: 'walk', frames: 8, fps: 12, motion: 'side walk cycle, cape flowing' },
  { name: 'attack', frames: 6, fps: 16, motion: 'forward weapon strike, dynamic lunge' },
  { name: 'hit', frames: 3, fps: 14, motion: 'flinch recoil, hurt' },
  { name: 'ultimate', frames: 8, fps: 14, motion: 'channel then unleash signature ultimate, radiant energy' },
  { name: 'death', frames: 5, fps: 10, motion: 'collapse, fade to defeat' },
];
export const ENEMY_CLIPS = [
  { name: 'idle', frames: 4, fps: 6, motion: 'menacing idle' },
  { name: 'walk', frames: 8, fps: 12, motion: 'advancing walk toward camera' },
  { name: 'attack', frames: 5, fps: 14, motion: 'lunge attack' },
  { name: 'hit', frames: 2, fps: 12, motion: 'stagger' },
  { name: 'death', frames: 5, fps: 10, motion: 'shatter / dissolve to defeat' },
];

// identité visuelle des héroïnes (extraite du lore / planche, en INTENTION)
export const HEROES = {
  aureline: { name: 'Auréline', subject: 'sacred lancer heroine, long flowing blonde hair, white and gold filigree gown, holding a radiant celestial spear, divine holy aura, ivory and sacred gold', palette: ['or_sacre', 'ivoire'], angle: 'slight low angle' },
  morgane: { name: 'Morgane', subject: 'raven duelist assassin, silver hair, black silk and dark feathers, twin curved blades, nocturnal predator, occult violet accents', palette: ['noir', 'violet_occulte'], angle: 'eye level' },
  selka: { name: 'Selka', subject: 'occult siren chanter, dark violet robes, lunar staff with glowing orb, mystic charm aura, floating dark hair', palette: ['violet_occulte', 'pourpre_mystere'], angle: 'eye level' },
  isolde: { name: 'Isolde', subject: 'crimson widow warrior, dark crimson armor, halberd and shield, bleeding blood motifs, cursed knightess', palette: ['carmin', 'noir'], angle: 'slight low angle' },
  roxane: { name: 'Roxane', subject: 'elite bastion crossbow markswoman, bronze armor and red cape, ornate repeating crossbow, sharp focused eyes', palette: ['bronze_bastion', 'carmin'], angle: 'eye level' },
  liora: { name: 'Liora', subject: 'midnight astral oracle, deep violet cosmic robes, floating lunar orb, prophetess of curses, starlight and indigo', palette: ['indigo_malediction', 'violet_occulte'], angle: 'slight low angle' },
};

// ennemis (concept-bible)
export const ENEMIES = {
  fallen_knight: { name: 'Chevalier déchu', subject: 'fallen cursed knight, blackened gothic plate armor, tattered cape, glowing red eyes, heavy sword, looming bruiser', palette: ['noir', 'carmin'], boss: false },
  tomb_hound: { name: 'Chien des tombes', subject: 'skeletal grave hound, decayed wolf, glowing red eyes, fast charging predator, bone and shadow', palette: ['noir', 'indigo_malediction'], boss: false },
  gargoyle: { name: 'Gargouille', subject: 'stone gargoyle, cracked weathered stone, bat wings, fanged maw, perched aerial menace', palette: ['bronze_bastion', 'noir'], boss: false },
  fanatic_sister: { name: 'Soeur fanatique', subject: 'fanatic hooded nun, dark ritual robes, channeling occult curse, gaunt zealot', palette: ['pourpre_mystere', 'noir'], boss: false },
  shadow_acolyte: { name: 'Acolyte des ombres', subject: 'shadow occultist acolyte, dark hooded robes, glowing violet sigils, casting darkness', palette: ['violet_occulte', 'noir'], boss: false },
  bourreau: { name: 'Le Bourreau', subject: 'twilight executioner boss, towering hooded headsman, massive blackened great axe, chains, judgement aura, imposing', palette: ['carmin', 'noir'], boss: true },
};

// arènes / décors (niveaux) — multi-couches parallax
export const ARENAS = {
  ruined_cloister: { name: 'Cloître en Ruine', subject: 'ruined gothic cloister, broken stone arches, moonlight shafts, drifting fog, ivy, cracked floor', mood: 'cold blue moonlit' },
  pyre_road: { name: 'Route des Bûchers', subject: 'road of funeral pyres at night, burning bonfires, drifting embers, charred stakes', mood: 'warm ember orange on dark' },
  statue_garden: { name: 'Jardin des Statues', subject: 'garden of stone statues, weathered guardian effigies, low mist, dead trees', mood: 'pale grey moonlit' },
  drowned_port: { name: 'Port des Noyés', subject: 'drowned harbor, dark water, wrecked ships, fog, rotting docks, lanterns', mood: 'teal fog night' },
  candle_crypt: { name: 'Crypte des Chandelles', subject: 'candlelit crypt, occult summoning circle on floor, countless candles, bones', mood: 'warm candle gold on black' },
  crepuscule_throne: { name: 'Trône du Crépuscule', subject: 'grand twilight throne hall, towering dark throne, banners, ominous purple dusk light', mood: 'violet dusk ominous' },
};
export const PARALLAX_LAYERS = ['sky_far', 'structures_mid', 'foreground_near', 'floor_plane'];

function compose(subject, palette, extra = '') {
  const pal = (palette ?? []).map((k) => (STYLE.palette[k] ? k.replace(/_/g, ' ') : k)).join(', ');
  return [STYLE.positiveGlobal, subject, `color palette: ${pal}`, ...STYLE.readability, extra].filter(Boolean).join(', ');
}

export function heroPromptSpec(key) {
  const h = HEROES[key]; if (!h) return null;
  return {
    id: `hero_${key}`, kind: 'hero', name: h.name,
    positive: compose(h.subject, h.palette, `${STYLE.render.camera}, ${h.angle}`),
    negative: STYLE.negativeGlobal,
    palette: h.palette, size: [STYLE.render.sprite_resolution, Math.round(STYLE.render.sprite_resolution * 1.4)],
    clips: HERO_CLIPS, controlnet: { type: 'openpose', poseSet: `hero/${key}` },
  };
}
export function enemyPromptSpec(key) {
  const e = ENEMIES[key]; if (!e) return null;
  return {
    id: `enemy_${key}`, kind: e.boss ? 'boss' : 'enemy', name: e.name,
    positive: compose(e.subject, e.palette, `${STYLE.render.camera}, facing camera, full body`),
    negative: STYLE.negativeGlobal,
    palette: e.palette, size: [STYLE.render.sprite_resolution, Math.round(STYLE.render.sprite_resolution * (e.boss ? 1.5 : 1.3))],
    clips: ENEMY_CLIPS, controlnet: { type: 'openpose', poseSet: `enemy/${key}` },
  };
}
export function arenaPromptSpecs(key) {
  const a = ARENAS[key]; if (!a) return null;
  return PARALLAX_LAYERS.map((layer) => ({
    id: `arena_${key}_${layer}`, kind: 'decor', name: `${a.name} · ${layer}`, layer,
    positive: compose(`${a.subject}, ${a.mood} atmosphere, ${layer.replace(/_/g, ' ')} layer, environment concept, no characters`, [], 'wide establishing, atmospheric depth'),
    negative: `${STYLE.negativeGlobal}, characters, people, creatures`,
    size: [1536, layer === 'floor_plane' ? 768 : 1024], tileable: layer === 'floor_plane',
  }));
}

export const HERO_KEYS = Object.keys(HEROES);
export const ENEMY_KEYS = Object.keys(ENEMIES);
export const ARENA_KEYS = Object.keys(ARENAS);
