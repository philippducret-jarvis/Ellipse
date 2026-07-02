export const ASSET_STAGE_FOLDERS = [
  '01_source',
  '02_cutouts',
  '03_cleanup',
  '04_rig',
  '05_animation',
  '06_exports',
  '07_qa',
  '08_remote_jobs',
];

export const ASSET_FOLDER_TEMPLATE = `# Asset Workspace

This folder is reserved for one isolated asset pack.

States:
- 01_source
- 02_cutouts
- 03_cleanup
- 04_rig
- 05_animation
- 06_exports
- 07_qa
- 08_remote_jobs
`;

export const CANONICAL_FAMILIES = [
  {
    id: 'heroes',
    label: 'Heroes',
    group: 'characters',
    roles: ['hero'],
    kinds: ['character', 'sprite', 'portrait', 'model', 'animation'],
    runtimeUse: ['playable avatar', 'combat state machine', 'inventory and codex portrait'],
    folderPattern: '03_assets/characters/hero__<slug>',
  },
  {
    id: 'companions_and_allies',
    label: 'Companions, allies, guides, merchants',
    group: 'characters',
    roles: ['companion', 'ally', 'guide', 'merchant', 'npc'],
    kinds: ['character', 'portrait', 'animation', 'voice'],
    runtimeUse: ['dialogue', 'quest handoff', 'ambient world life', 'shop and support'],
    folderPattern: '03_assets/characters/<role>__<slug>',
  },
  {
    id: 'enemies',
    label: 'Enemies and monsters',
    group: 'characters',
    roles: ['enemy', 'monster', 'summon', 'mount'],
    kinds: ['character', 'sprite', 'animation'],
    runtimeUse: ['combat', 'patrol', 'encounter composition'],
    folderPattern: '03_assets/characters/<role>__<slug>',
  },
  {
    id: 'bosses',
    label: 'Bosses',
    group: 'characters',
    roles: ['boss'],
    kinds: ['character', 'sprite', 'model', 'animation', 'fx'],
    runtimeUse: ['phase combat', 'arena scripting', 'cinematic staging'],
    folderPattern: '03_assets/characters/boss__<slug>',
  },
  {
    id: 'weapons_and_relics',
    label: 'Weapons, armor, relics',
    group: 'props',
    roles: ['weapon', 'armor', 'relic'],
    kinds: ['prop', 'sprite', 'model', 'fx'],
    runtimeUse: ['equipables', 'choice altars', 'upgrade trees'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'interaction_props',
    label: 'Checkpoints, doors, portals, altars, props',
    group: 'props',
    roles: ['prop', 'checkpoint', 'door', 'portal', 'altar'],
    kinds: ['prop', 'sprite', 'fx', 'audio'],
    runtimeUse: ['progression anchors', 'save points', 'travel', 'interactions'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'hazards_and_pickups',
    label: 'Hazards, traps, pickups, collectibles',
    group: 'props',
    roles: ['hazard', 'trap', 'pickup', 'collectible'],
    kinds: ['prop', 'sprite', 'fx', 'audio'],
    runtimeUse: ['challenge cadence', 'reward loop', 'feedback'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'biomes_and_maps',
    label: 'Biomes, maps, tilesets, backgrounds',
    group: 'environments',
    roles: ['environment', 'biome', 'background', 'tileset'],
    kinds: ['environment', 'tileset', 'sprite', 'material'],
    runtimeUse: ['level kit', 'parallax', 'collision shell', 'world navigation'],
    folderPattern: '03_assets/environments/<role>__<slug>',
  },
  {
    id: 'ui_shells',
    label: 'UI, HUD, menus, codex',
    group: 'ui',
    roles: ['ui'],
    kinds: ['ui', 'sprite', 'portrait', 'animation'],
    runtimeUse: ['menus', 'hud', 'codex', 'dialogue panels'],
    folderPattern: '03_assets/ui/ui__<slug>',
  },
  {
    id: 'sound_and_voice',
    label: 'Music, SFX, voice',
    group: 'audio',
    roles: ['music', 'sfx', 'voice'],
    kinds: ['audio', 'music', 'voice'],
    runtimeUse: ['bgm states', 'stingers', 'foley', 'dialogue'],
    folderPattern: '03_assets/audio/<role>__<slug>',
  },
  {
    id: 'fx_feedback',
    label: 'Combat and ambient FX',
    group: 'fx',
    roles: ['fx'],
    kinds: ['fx', 'sprite', 'animation'],
    runtimeUse: ['combat juice', 'ambient spores', 'UI feedback', 'world corruption'],
    folderPattern: '03_assets/fx/fx__<slug>',
  },
];

export const SYNTHETIC_SLOTS = [
  { title: 'Sporeling enemy family', role: 'enemy', kind: 'character', slug: 'enemy__sporeling-family', root: '03_assets/characters/enemy__sporeling-family' },
  { title: 'Weapon altar and checkpoint prop pack', role: 'altar', kind: 'prop', slug: 'prop__weapon-altar-and-checkpoints', root: '03_assets/props/prop__weapon-altar-and-checkpoints' },
  { title: 'Menu HUD shell', role: 'ui', kind: 'ui', slug: 'ui__menu-hud-shell', root: '03_assets/ui/ui__menu-hud-shell' },
  { title: 'Origin Tree sound pack', role: 'music', kind: 'audio', slug: 'audio__origin-tree-sound-pack', root: '03_assets/audio/audio__origin-tree-sound-pack' },
  { title: 'Spore combat FX pack', role: 'fx', kind: 'fx', slug: 'fx__spore-combat-pack', root: '03_assets/fx/fx__spore-combat-pack' },
];

export const ASSET_ROOT_MAP = new Map([
  ['20000000-0000-0000-0000-000000000001', '03_assets/characters/hero__the-echo-main-hero'],
  ['20000000-0000-0000-0000-000000000002', '03_assets/characters/npc__myla-guide'],
  ['20000000-0000-0000-0000-000000000003', '03_assets/characters/boss__root-guardian-boss'],
  ['20000000-0000-0000-0000-000000000004', '03_assets/environments/environment__origin-tree-level-kit'],
]);
