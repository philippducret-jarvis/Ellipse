/**
 * Veloria — build du MÉTA-JEU (gacha premium) : découpe FIDÈLE des icônes depuis
 * les planches concept (reliques/objets/équipement/runes/sets) + écrit le catalogue
 * complet (raretés, effets, types, monnaies, taux gacha) consommé par le runtime web.
 *
 * Principe identique au reste d'Ellipse : la planche EST l'art HD. Ici on extrait des
 * vignettes rectangulaires (le fond sombre de planche fait un superbe cadre d'objet) —
 * 100% CPU (sharp), no-GPU, non vectoriel. Reproductible : `pnpm veloria:meta`.
 *
 * Sorties → workspaces/veloria-veille-des-lames/03_assets/meta/*.png + meta-manifest.json
 *           (copié aussi dans 07_exports/web/ pour le runtime).
 */
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { sharp } from './lib/hd-faithful/matte.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces', 'veloria-veille-des-lames');
const REF = join(WS, '01_inputs', 'references');
const OUT = join(WS, '03_assets', 'meta');
const WEB = join(WS, '07_exports', 'web');
const ASSET_BASE = '/workspaces/veloria-veille-des-lames/03_assets/meta';

const RELICS_BOARD = join(REF, 'reliques_objets_invocables.png');
const EQUIP_BOARD = join(REF, 'equipements_sets.png');
const RUNES_BOARD = join(REF, 'runes_sigilles.png');

// rareté → couleur canonique (planches Veloria)
export const RARITY = {
  common: { label: 'Commune', color: '#c8cdd6' },
  uncommon: { label: 'Peu commune', color: '#7cc66a' },
  rare: { label: 'Rare', color: '#4f9bff' },
  epic: { label: 'Épique', color: '#b463ff' },
  legendary: { label: 'Légendaire', color: '#e8c24a' },
  mythic: { label: 'Mythique', color: '#ef5a5a' },
};

// ── Crops normalisés (x,y,w,h) relevés sur les planches ────────────────────────
const relicCrop = (i) => ({ x: 0.034 + i * 0.1198, y: 0.176, w: 0.092, h: 0.20 });
const objectCrop = (i) => ({ x: 0.035 + i * 0.1055, y: 0.587, w: 0.086, h: 0.137 });
const equipCrop = (col, row) => ({ x: 0.018 + col * 0.1285, y: row === 0 ? 0.118 : 0.385, w: 0.108, h: row === 0 ? 0.128 : 0.103 });
const setCrop = (i) => ({ x: 0.018 + i * 0.207, y: 0.625, w: 0.19, h: 0.185 });
const runeCrop = (col, row) => ({ x: 0.013 + col * 0.1725, y: [0.173, 0.363, 0.548, 0.72][row], w: 0.073, h: 0.106 });

// ── Catalogues (fidèles aux planches) ──────────────────────────────────────────
const RELICS = [
  ['mirror_watchers', 'Miroir des Veilles', 'mythic', '+25% DGT critiques après 6 vagues ; la nuit, -10% DGT subis.'],
  ['martyrs_bell', 'Cloche des Martyrs', 'mythic', 'À chaque vague, les ennemis proches subissent 15% PV max en DGT sacrés sur 5 s.'],
  ['thorn_crown', "Couronne d'Épines", 'legendary', '+20% Vol de vie. Les ennemis qui vous touchent subissent Hémorragie 3 s.'],
  ['dawn_incense', "Encensoir d'Aube", 'legendary', 'Compétences +12% accélération. +1 charge d’Ultime au départ.'],
  ['ravens_ciborium', 'Ciboire des Corbeaux', 'epic', 'Vos attaques ont 20% d’invoquer 3 corbeaux infligeant des DGT obscurs.'],
  ['drowned_lantern', 'Lanterne des Noyés', 'epic', 'Ressuscite une fois par run avec 30% PV. Recharge 180 s.'],
  ['moons_book', 'Livre des Lunes', 'rare', '+1 niveau de compétence (sauf Ultime). +8% chances d’effet.'],
  ['bastion_chain', 'Chaîne du Bastion', 'rare', '+12% RÉS et Garde. Les alliés proches gagnent 6% Garde.'],
];
const OBJECTS = [
  ['grace_totem', 'Totem de Grâce', 'mythic', 'Soigne les alliés autour de 3% PV max/s pendant 8 s. Recharge 90 s.'],
  ['spectral_blade', 'Lame Spectrale', 'mythic', 'Dégâts massifs en ligne droite. Ignore 30% de la défense.'],
  ['cinder_banner', 'Bannière de Cendre', 'legendary', '+20% DGT alliés et +15% vitesse d’attaque pendant 12 s.'],
  ['incense_circle', "Cercle d'Encens", 'epic', 'Ralentit les ennemis dans la zone de 40% pendant 6 s.'],
  ['obsidian_raven', "Corbeau d'Obsidienne", 'epic', 'Marque un ennemi. Après 4 s : DGT obscurs + étourdissement 1,5 s.'],
  ['watch_altar', 'Autel de Veille', 'rare', '+15% DGT critiques des alliés à chaque vague. Durée 3 vagues.'],
];
const EQUIP_TYPES = ['arme', 'armure', 'insigne', 'talisman', 'bottes', 'ornement'];
const EQUIP_TYPE_LABEL = { arme: 'Arme', armure: 'Armure', insigne: 'Insigne', talisman: 'Talisman', bottes: 'Bottes', ornement: 'Ornement sacré' };
const EQUIPMENT = [
  // row 0 — set "Veille de l'Aube" (legendary)
  ['eq_lance_aurore', 'Lance de l’Aurore', 'arme', 'legendary', 'veille_aube', '+30% DGT, +15% portée. Attaques lumineuses perçantes. +10% Champ critique.'],
  ['eq_cuirasse_aube', 'Cuirasse de l’Aube', 'armure', 'legendary', 'veille_aube', '+20% Garde, +15% PV max. Restaure 2% PV/s hors combat.'],
  ['eq_insigne_ordre', 'Insigne de l’Ordre', 'insigne', 'legendary', 'veille_aube', '+15% DGT, +10% Garde. Les critiques génèrent +10% d’Énergie.'],
  ['eq_relique_lumiere', 'Relique de Lumière', 'talisman', 'legendary', 'veille_aube', '-12% CD compétence, +8% Soin. Les soins critiques laissent un halo protecteur.'],
  ['eq_marche_auriges', 'Marche des Auriges', 'bottes', 'legendary', 'veille_aube', '+12% Déplacement, +10% Garde. Esquiver donne +10% vitesse 2 s.'],
  ['eq_couronne_solaire', 'Couronne Solaire', 'ornement', 'legendary', 'veille_aube', '+15% DGT sacrés, +10% Soin. Chaque vague terminée régénère 10% PV.'],
  // row 1 — set "Messe des Corbeaux" (mythic)
  ['eq_faucille_crepuscule', 'Faucille du Crépuscule', 'arme', 'mythic', 'messe_corbeaux', '+25% DGT, +15% vitesse d’attaque. Chaque 3e coup lance une lame d’ombre traversante.'],
  ['eq_manteau_corbeaux', 'Manteau des Corbeaux', 'armure', 'mythic', 'messe_corbeaux', '+18% Évasion, +10% Crit. Après une esquive, +20% DGT pendant 4 s.'],
  ['eq_sigille_lamentin', 'Sigille du Lamentin', 'insigne', 'mythic', 'messe_corbeaux', '+20% DGT, +10% Vol de vie. Les ennemis marqués subissent +10% DGT des alliés.'],
  ['eq_coeur_echo', 'Cœur d’Écho', 'talisman', 'mythic', 'messe_corbeaux', '-15% CD ultime, +12% DGT. Chaque ultime réduit le CD d’une compétence.'],
  ['eq_pas_predateur', 'Pas du Prédateur', 'bottes', 'mythic', 'messe_corbeaux', '+15% vitesse d’attaque, +10% Crit. Après un dash, prochain coup critique garanti.'],
  ['eq_diademe_ombres', 'Diadème des Ombres', 'ornement', 'mythic', 'messe_corbeaux', '+20% DGT d’ombre, +10% Crit. Les ennemis tués réduisent les CD de 1 s.'],
];
const SETS = [
  ['veille_aube', 'Veille de l’Aube', 'sacred', 'legendary',
    ['2 pièces : +15% DGT sacrés, +10% Soin.', '4 pièces : bénédiction active → +25% Crit et régénère 5% PV / 2 s.']],
  ['messe_corbeaux', 'Messe des Corbeaux', 'shadow', 'mythic',
    ['2 pièces : +15% DGT d’ombre, +10% Vol de vie.', '4 pièces : les compétences marquent ; +20% DGT contre les marqués.']],
  ['bastion_crepuscule', 'Bastion du Crépuscule', 'iron-crimson', 'epic',
    ['2 pièces : +20% Garde, +10% PV max.', '4 pièces : sous 30% PV → bouclier 20% PV max et +25% DGT pendant 6 s.']],
];
const RUNE_FAMILY_LABEL = { offensive: 'Offensive', defensive: 'Défensive', support: 'Soutien', corrupted: 'Corrompue' };
const RUNES = [
  // offensives (row 0)
  ['blade_rune', 'Rune de Lame', 'offensive', 'legendary', 'weapon', '+18% dégâts physiques. Chance d’infliger Saignement.'],
  ['predator_sigil', 'Sigille du Prédateur', 'offensive', 'mythic', 'weapon', '+25% dégâts critiques. Les critiques rendent 1% PV (max 10%).'],
  ['cinder_rune', 'Rune de Cendre', 'offensive', 'epic', 'weapon', '+15% dégâts de feu. Vos compétences peuvent infliger Brûlure.'],
  ['raven_rune', 'Rune du Corbeau', 'offensive', 'epic', 'weapon', '+20% dégâts d’ombre. Vos attaques peuvent voler 2% PV.'],
  // défensives (row 1)
  ['guard_rune', 'Rune de Garde', 'defensive', 'rare', 'armor', '+25% Garde. Réduit les dégâts subis quand la garde est active.'],
  ['bastion_sigil', 'Sigille du Bastion', 'defensive', 'epic', 'armor', '+10% PV max. Après 6 s sans dégâts, +15% Garde.'],
  ['moon_rune', 'Rune Lunaire', 'defensive', 'rare', 'relic', '+8% Résistance magique. Réduit les dégâts de compétences ennemies.'],
  ['martyr_sigil', 'Sigille du Martyr', 'defensive', 'legendary', 'relic', 'Lors d’un coup fatal, empêche la mort et gagne 25% PV (120 s).'],
  // soutien (row 2)
  ['grace_rune', 'Rune de Grâce', 'support', 'uncommon', 'jewel', '+12% Soin reçu. Renforce soins et régénération.'],
  ['tides_sigil', 'Sigille des Marées', 'support', 'rare', 'jewel', '-10% Récup. compétences. Réduit le CD des alliés.'],
  ['thorn_rune', 'Rune d’Épine', 'support', 'uncommon', 'jewel', '+10% Fréquence des effets de soutien.'],
  ['faith_rune', 'Rune de Foi', 'support', 'legendary', 'jewel', 'À chaque soin lancé, +10% Vitesse de déplacement 3 s.'],
  // corrompues (row 3)
  ['eclipse_rune', 'Rune d’Éclipse', 'corrupted', 'epic', 'weapon', '+20% dégâts, mais +10% dégâts subis.'],
  ['malediction_rune', 'Rune de Malédiction', 'corrupted', 'epic', 'weapon', '+15% dégâts continus. Malédiction + Saignement sur les ennemis.'],
  ['devourer_sigil', 'Sigille du Dévoreur', 'corrupted', 'mythic', 'relic', 'Chaque élimination restaure 2% PV mais vous inflige 1% de dégâts.'],
  ['void_rune', 'Rune du Néant', 'corrupted', 'epic', 'relic', '+30% Puissance d’ombre. Réduit les soins reçus de 20%.'],
];

// monnaies (fidèles aux planches : Or / Poudre d'Âme / Éclat Lunaire / Âme Légendaire ;
// + monnaies d'invocation premium thématiques)
export const CURRENCIES = {
  or: { title: 'Or', color: '#e8c24a', glyph: 'coin', desc: 'Forge et amélioration de l’équipement.' },
  cristaux: { title: 'Cristaux de Veille', color: '#b58bff', glyph: 'crystal', desc: 'Invocation des Héroïnes.' },
  larmes: { title: 'Larmes de Lune', color: '#7fd4e8', glyph: 'tear', desc: 'Invocation des Reliques & Objets.' },
  poudre: { title: 'Poudre d’Âme', color: '#c9a9ff', glyph: 'dust', desc: 'Gravure des runes (doublons).' },
  ame_leg: { title: 'Âme Légendaire', color: '#ef5a5a', glyph: 'soul', desc: 'Gravure des runes légendaires & mythiques.' },
};

async function cut(board, key, crop, { round = 0.12, fadeBottom = 0.14 } = {}) {
  const meta = await sharp(board).metadata();
  const ext = {
    left: Math.max(0, Math.round(crop.x * meta.width)),
    top: Math.max(0, Math.round(crop.y * meta.height)),
    width: Math.round(crop.w * meta.width),
    height: Math.round(crop.h * meta.height),
  };
  const W = 256, H = Math.round(W * (ext.height / ext.width));
  // masque arrondi + fondu bas (vignette premium qui dissout tout texte résiduel de planche)
  const rx = W * round, ry = H * round;
  const fadeStart = (1 - fadeBottom).toFixed(3);
  const mask = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="${fadeStart}" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${rx}" ry="${ry}" fill="url(#f)"/></svg>`
  );
  const base = await sharp(board).extract(ext).resize(W, H, { fit: 'cover' })
    .modulate({ brightness: 1.04, saturation: 1.05 }).toBuffer();
  const out = join(OUT, `${key}.png`);
  await mkdir(dirname(out), { recursive: true });
  await sharp(base).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(out);
  return `${ASSET_BASE}/${key}.png`;
}

async function montage(items, cols, cell, name) {
  // assemble une planche de contrôle des découpes
  const rows = Math.ceil(items.length / cols);
  const W = cols * cell, H = rows * cell;
  const comp = [];
  for (let i = 0; i < items.length; i++) {
    const buf = await sharp(items[i]).resize(cell - 10, cell - 10, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    comp.push({ input: buf, left: (i % cols) * cell + 5, top: Math.floor(i / cols) * cell + 5 });
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 18, g: 14, b: 26, alpha: 1 } } })
    .composite(comp).png().toFile(join(OUT, name));
}

export async function buildVeloriaMeta() {
  await mkdir(OUT, { recursive: true });
  const manifest = { game: 'veloria-veille-des-lames', generatedAt: new Date().toISOString(),
    rarity: RARITY, currencies: CURRENCIES, relics: [], objects: [], equipment: [], sets: [], runes: [] };

  const relicAssets = [];
  for (let i = 0; i < RELICS.length; i++) {
    const [key, title, rarity, effect] = RELICS[i];
    const asset = await cut(RELICS_BOARD, `relic_${key}`, relicCrop(i));
    manifest.relics.push({ key, title, rarity, effect, asset, slot: 'relic' });
    relicAssets.push(join(OUT, `relic_${key}.png`));
  }
  const objAssets = [];
  for (let i = 0; i < OBJECTS.length; i++) {
    const [key, title, rarity, effect] = OBJECTS[i];
    const asset = await cut(RELICS_BOARD, `object_${key}`, objectCrop(i));
    manifest.objects.push({ key, title, rarity, effect, asset });
    objAssets.push(join(OUT, `object_${key}.png`));
  }
  const eqAssets = [];
  for (let i = 0; i < EQUIPMENT.length; i++) {
    const [key, title, type, rarity, set, effect] = EQUIPMENT[i];
    const col = EQUIP_TYPES.indexOf(type), row = i < 6 ? 0 : 1;
    const asset = await cut(EQUIP_BOARD, `equip_${key}`, equipCrop(col, row));
    manifest.equipment.push({ key, title, type, typeLabel: EQUIP_TYPE_LABEL[type], rarity, set, effect, asset });
    eqAssets.push(join(OUT, `equip_${key}.png`));
  }
  const setAssets = [];
  for (let i = 0; i < SETS.length; i++) {
    const [key, title, fantasy, rarity, bonuses] = SETS[i];
    const asset = await cut(EQUIP_BOARD, `set_${key}`, setCrop(i), { round: 0.08 });
    manifest.sets.push({ key, title, fantasy, rarity, bonuses, asset });
    setAssets.push(join(OUT, `set_${key}.png`));
  }
  const runeAssets = [];
  for (let i = 0; i < RUNES.length; i++) {
    const [key, title, family, rarity, slot, effect] = RUNES[i];
    const col = i % 4, row = Math.floor(i / 4);
    const asset = await cut(RUNES_BOARD, `rune_${key}`, runeCrop(col, row), { round: 0.16 });
    manifest.runes.push({ key, title, family, familyLabel: RUNE_FAMILY_LABEL[family], rarity, slot, effect, asset });
    runeAssets.push(join(OUT, `rune_${key}.png`));
  }

  // planches de contrôle (pour ajuster les crops à l'œil)
  await montage(relicAssets, 8, 140, '_montage_relics.png');
  await montage(objAssets, 6, 150, '_montage_objects.png');
  await montage(eqAssets, 6, 150, '_montage_equipment.png');
  await montage(setAssets, 3, 240, '_montage_sets.png');
  await montage(runeAssets, 4, 150, '_montage_runes.png');

  await writeFile(join(OUT, 'meta-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await mkdir(WEB, { recursive: true });
  await copyFile(join(OUT, 'meta-manifest.json'), join(WEB, 'meta-manifest.json'));
  return manifest;
}

const _entry = (process.argv[1] || '').replace(/\\/g, '/');
if (_entry && import.meta.url.endsWith(_entry.split('/').pop())) {
  buildVeloriaMeta().then((m) => {
    console.log('Veloria meta:', m.relics.length, 'reliques,', m.objects.length, 'objets,',
      m.equipment.length, 'équip,', m.sets.length, 'sets,', m.runes.length, 'runes');
  }).catch((e) => { console.error(e); process.exit(1); });
}
