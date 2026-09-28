#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const workspace = join(root, 'workspaces', 'orbes-d-astra');
const preproduction = join(workspace, '01_preproduction');
const manifests = join(preproduction, 'manifests');
const guardiansRoot = join(workspace, '03_assets', '3d', 'guardians');
const gdl = JSON.parse(await readFile(join(root, 'examples', 'orbes-astra', 'game.gdl.json'), 'utf8'));
const sourceHeroes = gdl.meta.merge_drop.heroes;

const profiles = {
  mira: [27, 'femme', 'athlétique, taille marquée', 'oracle des marées, voiles ouverts, astrolabe'],
  brann: [34, 'homme', 'très musclé', 'forgeron cuirassé, bras runiques'],
  kael: [29, 'homme', 'longiligne athlétique', 'chasseur boréal, cape fendue, arc organique'],
  orin: [31, 'homme', 'nageur', 'duelliste aquatique, soies bleues et bijoux'],
  talia: [24, 'femme', 'petite, sportive', 'messagère aérienne, ailes textiles'],
  joren: [38, 'homme', 'large et puissant', 'chevalier lunaire ajusté'],
  phae: [26, 'femme', 'pulpeuse', 'herboriste solaire, lianes et bijoux'],
  ciro: [30, 'homme', 'fin et élégant', 'archiviste couture et corseterie'],
  lys: [28, 'femme', 'élancée', 'gardienne du temps, robe fendue et sabliers'],
  noor: [25, 'femme', 'athlétique', 'porteuse d’aurore, drapés et métal rose'],
  vesper: [33, 'homme', 'sculptural', 'sentinelle du soir, harnais d’armure'],
  saphira: [27, 'femme', 'grande et anguleuse', 'lame de cristal, transparences minérales'],
  nyx: [29, 'femme', 'grande, statuesque', 'sorcière du vide et voile cosmique'],
  ilyra: [26, 'femme', 'souple, courbes marquées', 'cantatrice et anneaux orbitaux'],
  caelum: [32, 'homme', 'athlétique', 'lancier impérial, plastron ouvert'],
  rhea: [35, 'femme', 'mature, pulpeuse', 'oracle maritime et drapé fluide'],
  talos: [42, 'homme', 'colosse', 'armure magnétique segmentée'],
  maelys: [28, 'femme', 'voluptueuse', 'corset céleste et fourrure'],
  aster: [24, 'femme', 'royale, fine', 'robe-armure asymétrique'],
  elya: [27, 'femme', 'danseuse', 'robe musicale lumineuse'],
  solveig: [30, 'femme', 'athlétique, grande', 'valkyrie d’aurore, plumes de lumière'],
  seraphiel: [36, 'homme', 'très grand, sculptural', 'juge solaire et armure blanche'],
  vaelora: [34, 'femme', 'grande, courbes fortes', 'impératrice du vide et robe fendue'],
  orion: [48, 'homme', 'mature, imposant', 'architecte et géométrie sacrée'],
};

const sharedAnimations = [
  'idle_neutral', 'idle_personality', 'idle_glamour', 'walk', 'run', 'pivot_left', 'pivot_right',
  'enter_battle', 'exit_battle', 'fusion_attack_low', 'fusion_attack_high', 'fusion_perfect',
  'skill_cast', 'ultimate_intro', 'ultimate_cast', 'overdrive_intro', 'overdrive_cast',
  'parry', 'hit_light', 'hit_heavy', 'guard_break', 'victory', 'defeat',
  'hub_greeting', 'hub_idle_a', 'hub_idle_b', 'bond_reaction_a', 'bond_reaction_b',
];

const uniqueByAbility = {
  gravity_well: ['gravity_orbit', 'gravity_crush'],
  forge_next: ['rune_hammer_charge', 'rune_hammer_impact'],
  starfall: ['bow_draw_constellation', 'meteor_volley'],
  echo_merge: ['water_mirror_split', 'twin_wave'],
  time_bloom: ['clock_freeze', 'time_release'],
  ascension: ['aurora_lift', 'solar_bloom'],
  aegis: ['aegis_raise', 'aegis_break'],
  shatter_top: ['crystal_draw', 'crystal_shatter'],
  void_swap: ['void_step', 'absolute_reversal'],
  supernova: ['nexus_crown', 'supernova_release'],
  constellation: ['choir_pose', 'constellation_song'],
  aurora: ['aurora_wings', 'aurora_dance'],
};

const characterManifest = {
  schemaVersion: 1,
  status: 'specification_ready_assets_missing',
  generatedAt: new Date().toISOString(),
  adultOnly: true,
  modelConvention: {
    format: 'glTF 2.0 GLB',
    units: 'meters',
    lodTriangles: { pc_lod0: 120000, mobile_lod0: 65000, lod1: 35000, lod2: 12000 },
    maxMaterials: { pc: 8, mobile: 5 },
    maxDeformBones: { pc: 160, mobile: 110 },
    faceBlendshapes: { minimum: 36, target: 52 },
  },
  guardians: sourceHeroes.map((hero) => {
    const [age, presentation, silhouette, outfitFantasy] = profiles[hero.id] ?? [25, 'adulte', 'à définir', 'à définir'];
    return {
      id: hero.id,
      name: hero.name,
      age,
      adultConfirmed: age >= 18,
      presentation,
      silhouette,
      outfitFantasy,
      rarity: hero.rarity,
      faction: hero.faction,
      role: hero.role,
      element: hero.element,
      ability: hero.ability,
      abilityLabel: hero.ability_label,
      outfits: ['combat', 'awakened', 'celestial_evening', 'seasonal'],
      requiredFiles: [
        'concept/turnaround.png',
        'concept/face-sheet.png',
        'concept/materials.png',
        'concept/outfit-exploded.png',
        'source/body_base.blend',
        `exports/${hero.id}_lod0.glb`,
        `exports/${hero.id}_lod1.glb`,
        `exports/${hero.id}_lod2.glb`,
        'qa/report.json',
      ],
      animations: [...sharedAnimations, ...(uniqueByAbility[hero.ability] ?? [`${hero.id}_signature_a`, `${hero.id}_signature_b`])],
      production: {
        concept: 'missing',
        sculpt: 'missing',
        retopology: 'missing',
        textures: 'missing',
        rig: 'missing',
        animation: 'missing',
        lods: 'missing',
        engineQa: 'missing',
      },
    };
  }),
};

const locations = {
  schemaVersion: 1,
  status: 'specification_ready_assets_missing',
  locations: [
    { id: 'astra_observatory', purpose: 'hub central', zones: ['orrery', 'balcony', 'war_room'], kit: 'brass_gothic', targetModules: 48 },
    { id: 'summoning_sanctuary', purpose: 'gacha et révélations', zones: ['altar', 'mirror_pool', 'archive'], kit: 'crystal_ritual', targetModules: 32 },
    { id: 'reliquary', purpose: 'équipement et atelier', zones: ['vault', 'forge', 'wardrobe'], kit: 'velvet_metal', targetModules: 36 },
    { id: 'drowned_harbor', purpose: 'région 1 et boss Léviathan', zones: ['quays', 'lighthouse', 'boss_arena'], kit: 'astral_maritime', targetModules: 64 },
    { id: 'dead_sun_forge', purpose: 'région 2', zones: ['furnace', 'citadel', 'golem_arena'], kit: 'solar_industrial', targetModules: 64 },
    { id: 'night_beyond', purpose: 'région 3', zones: ['inverted_garden', 'void_bridge', 'abyssion_arena'], kit: 'void_baroque', targetModules: 72 },
  ],
};

const uiScreens = {
  schemaVersion: 1,
  statuses: ['missing', 'draft', 'approved', 'implemented', 'verified'],
  screens: [
    'title', 'onboarding', 'hub_pc', 'hub_mobile', 'world_map', 'mission_brief',
    'combat_pc', 'combat_mobile', 'boss_phase_3', 'guardian_switch', 'ultimate',
    'overdrive', 'victory', 'defeat', 'roster', 'guardian_detail', 'equipment',
    'wardrobe', 'bond', 'summon_single', 'summon_ten', 'shop', 'rates_history',
    'rift', 'rhythm_game', 'astral_hunt', 'outfit_workshop', 'settings',
    'accessibility', 'download_content', 'network_error',
  ].map((id) => ({ id, pc: 'missing', mobile: 'missing', accessibleVariant: 'missing' })),
};

const productionState = {
  schemaVersion: 1,
  claim: 'preproduction_only',
  prototypeV1: 'preserved_not_target_quality',
  blockingTools: [
    { id: 'blender', status: 'missing', requiredFor: ['modeling', 'retopology', 'rigging', 'animation', 'gltf export'] },
    { id: 'godot', status: 'missing', requiredFor: ['3d runtime benchmark', 'native mobile builds'] },
    { id: 'ffmpeg', status: 'missing', requiredFor: ['capture', 'video compression', 'qa evidence'] },
  ],
  commercialGatesGreen: [],
  commercialGatesRed: ['gameplay', 'content', '3d_art', 'performance', 'backend', 'purchases', 'compliance', 'accessibility', 'security', 'certification'],
};

const assetInventory3d = {
  schemaVersion: 1,
  status: 'inventory_complete_assets_missing',
  categories: {
    guardians: characterManifest.guardians.map((guardian) => ({
      id: guardian.id,
      kind: 'rigged_character',
      variants: guardian.outfits,
      status: 'missing',
    })),
    bosses: [
      { id: 'tide_leviathan', variants: ['phase_1', 'phase_2', 'phase_3', 'broken'], targetTriangles: 220000 },
      { id: 'eclipse_golem', variants: ['phase_1', 'phase_2', 'phase_3', 'broken'], targetTriangles: 180000 },
      { id: 'abyssion', variants: ['humanoid', 'winged_void', 'primordial_night', 'broken'], targetTriangles: 240000 },
    ].map((entry) => ({ ...entry, kind: 'rigged_boss', status: 'missing' })),
    enemies: [
      'drowned_wisp', 'tide_knight', 'coral_stalker', 'siren_orb', 'abyss_crab',
      'solar_drone', 'forge_hound', 'slag_colossus', 'eclipse_mage', 'magnetic_sentinel',
      'void_moth', 'inverted_dryad', 'night_lancer', 'memory_eater', 'fracture_priest',
    ].map((id) => ({ id, kind: 'rigged_enemy', variants: ['base', 'elite'], status: 'missing' })),
    livingOrbs: gdl.meta.merge_drop.tiers.map((tier) => ({
      id: `orb_${tier.id}`,
      displayName: tier.persona,
      kind: 'rigged_creature_orb',
      animations: ['idle', 'fall', 'bounce', 'merge', 'happy', 'danger'],
      status: 'missing',
    })),
    familiars: [
      'luma', 'nebulin', 'forge_sprite', 'oracle_moth', 'crystal_fox', 'void_cat',
      'solar_bird', 'moon_hare', 'tide_otter', 'clock_drake', 'brass_beetle', 'nexus_whale',
    ].map((id) => ({ id, kind: 'rigged_familiar', status: 'missing' })),
    guardianWeapons: characterManifest.guardians.map((guardian) => ({
      id: `weapon_${guardian.id}`,
      owner: guardian.id,
      kind: 'weapon_prop',
      status: 'missing',
    })),
    locations: locations.locations.map((location) => ({
      id: location.id,
      kind: 'modular_environment_kit',
      targetModules: location.targetModules,
      status: 'missing',
    })),
    commonProps: [
      'orrery_large', 'orrery_small', 'summon_altar', 'wardrobe_mirror', 'relic_forge',
      'mission_table', 'telescope', 'constellation_door', 'astral_elevator', 'archive_shelf',
      'ritual_brazier', 'banner_frame', 'boss_gate', 'reward_chest', 'training_dummy',
      'guild_board', 'music_stage', 'target_launcher', 'tailor_table', 'photo_podium',
    ].map((id) => ({ id, kind: 'environment_prop', status: 'missing' })),
  },
};
assetInventory3d.summary = Object.fromEntries(
  Object.entries(assetInventory3d.categories).map(([key, values]) => [key, values.length]),
);
assetInventory3d.summary.totalEntries = Object.values(assetInventory3d.categories)
  .reduce((total, values) => total + values.length, 0);

await mkdir(manifests, { recursive: true });
await Promise.all([
  writeFile(join(manifests, 'characters-3d.json'), JSON.stringify(characterManifest, null, 2)),
  writeFile(join(manifests, 'locations-3d.json'), JSON.stringify(locations, null, 2)),
  writeFile(join(manifests, 'ui-screens.json'), JSON.stringify(uiScreens, null, 2)),
  writeFile(join(manifests, 'production-state.json'), JSON.stringify(productionState, null, 2)),
  writeFile(join(manifests, 'asset-inventory-3d.json'), JSON.stringify(assetInventory3d, null, 2)),
]);

for (const guardian of characterManifest.guardians) {
  const guardianDir = join(guardiansRoot, guardian.id);
  await mkdir(guardianDir, { recursive: true });
  await writeFile(join(guardianDir, 'asset-contract.json'), JSON.stringify(guardian, null, 2));
}

console.log(JSON.stringify({
  ok: true,
  guardiansSpecified: characterManifest.guardians.length,
  locationsSpecified: locations.locations.length,
  assets3dSpecified: assetInventory3d.summary.totalEntries,
  uiScreensSpecified: uiScreens.screens.length,
  output: preproduction,
}, null, 2));
