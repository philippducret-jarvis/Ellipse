import { readFile } from 'node:fs/promises';

import { join } from 'node:path';

import {

  BOSSES,

  ENEMIES,

  ENVIRONMENTS,

  HEROES,

  LEVEL_01_BLESSINGS,

} from './data.mjs';

import { ALL_LEVELS } from './levels.mjs';

import { HAZARD_SCRIPTS } from './hazards/index.mjs';
import { PROJECT_SLUG, PUBLIC_WORKSPACE_ROOT, WORKSPACE_ROOT } from './constants.mjs';
import { patchVeloriaSceneDepth } from '../hd-faithful/depth-gdl.mjs';



const S = 2 / 3;

const W = 720;

const H = 1280;



function scale(n) {

  return Math.round(n * S);

}



export function gdlAsset(rel) {

  return `${PUBLIC_WORKSPACE_ROOT}/${rel.replace(/\\/g, '/')}`;

}



function laneCenter(lanes, laneId) {

  const lane = lanes.find((l) => l.id === laneId);

  if (!lane) return W / 2;

  return scale(lane.x + lane.width / 2);

}



function atlasUrlForAsset(asset) {

  const rel = `${asset.pack_root}/06_exports/combat_sprite.png`.replace(/\\/g, '/');

  return gdlAsset(rel);

}



function arenaBgUrl(asset) {

  const rel = `${asset.pack_root}/06_exports/arena_bg.png`.replace(/\\/g, '/');

  return gdlAsset(rel);

}



export function buildAssetAtlas() {

  const atlas = {};

  for (const h of HEROES) atlas[h.key] = atlasUrlForAsset(h);

  for (const e of ENEMIES) atlas[e.key] = atlasUrlForAsset(e);

  for (const b of BOSSES) atlas[b.key] = atlasUrlForAsset(b);

  for (const env of ENVIRONMENTS) atlas[env.key] = arenaBgUrl(env);

  return atlas;

}



function buildLayoutFromLevel(levelDef) {

  const L = levelDef.layout;

  const groundY = scale(L.safe_zone.top);

  const spawn = {

    x: scale(L.anchor_points.heroine_spawn.x) - 32,

    y: scale(L.anchor_points.heroine_spawn.y) - 64,

  };



  const platforms = [

    { x: 0, y: groundY, w: W, h: H - groundY, type: 'ground' },

    ...L.lanes.map((lane) => ({

      x: scale(lane.x),

      y: scale(L.enemy_spawn_band.top),

      w: scale(lane.width),

      h: scale(L.enemy_spawn_band.height),

      type: 'platform',

    })),

  ];



  const zones = L.lanes.map((lane) => ({

    id: lane.id,

    label: lane.label,

    x: scale(lane.x),

    y: scale(L.enemy_spawn_band.top),

    w: scale(lane.width),

    h: groundY - scale(L.enemy_spawn_band.top),

    theme: 'lane',

  }));



  return {

    width: W,

    height: H,

    ground_y: groundY,

    spawn,

    platforms,

    zones,

    hazards: [],

    enemies: [],

    lane_meta: {

      count: L.lane_count,

      lanes: L.lanes.map((l) => ({ id: l.id, center_x: laneCenter(L.lanes, l.id), label: l.label })),

      movement: 'horizontal_only',

    },

    hazard_ref: L.hazard,

    encounters_ref: `04_scenes/${levelDef.key}/encounters.json`,

    level_key: levelDef.key,

  };

}



export async function buildVeloriaGdl() {

  const hero = HEROES[0];

  const assetAtlas = buildAssetAtlas();



  let registryAtlas = assetAtlas;

  try {

    const regRaw = await readFile(join(WORKSPACE_ROOT, '03_assets', 'registry', 'generated-assets-hd.json'), 'utf8');

    const reg = JSON.parse(regRaw);

    for (const a of reg.assets ?? []) {

      if (a.id && a.atlas) registryAtlas[a.id] = a.atlas.startsWith('/') ? a.atlas : gdlAsset(a.atlas);

    }

  } catch {

    /* registry optionnel */

  }



  const runtimeRaw = await readFile(join(WORKSPACE_ROOT, '05_runtime', 'config', 'veloria-runtime-bundle.json'), 'utf8');

  const runtime = JSON.parse(runtimeRaw);



  const existingRaw = await readFile(join(WORKSPACE_ROOT, '05_runtime', 'gdl', 'veloria.preview.gdl.json'), 'utf8');

  const base = JSON.parse(existingRaw);



  const hazardScriptsByScene = {};

  const scenes = ALL_LEVELS.map((levelDef) => {

    const env = ENVIRONMENTS.find((e) => e.key === levelDef.environment_key) ?? ENVIRONMENTS[1];

    const layout = buildLayoutFromLevel(levelDef);

    const hazardId = levelDef.layout.hazard.id;

    hazardScriptsByScene[levelDef.layout.slug] = HAZARD_SCRIPTS[hazardId] ?? HAZARD_SCRIPTS.collapsing_floor;

    return {

      id: levelDef.layout.slug,

      title: levelDef.title,

      entities: ['player'],

      camera: { mode: 'top_down', follow: 'player', bounds: true, smoothing: 0.14 },

      background: {

        color: '#120f18',

        image: registryAtlas[env.key] ?? arenaBgUrl(env),

        alpha: 1,

      },

      layout,

      spawn: layout.spawn,

      veloria: {

        mode: 'vertical_lane_survival',

        level_key: levelDef.key,

        encounters: levelDef.encounters,

        blessings: levelDef.blessings,

        hazard_script: hazardId,

      },

    };

  });

  let integratedManifest = null;
  try {
    const raw = await readFile(join(WORKSPACE_ROOT, '03_assets', 'integrated', 'integrated-manifest.json'), 'utf8');
    integratedManifest = JSON.parse(raw);
  } catch {
    /* scène intégrée optionnelle */
  }

  const scenesWithDepth = scenes.map((scene, index) =>
    patchVeloriaSceneDepth(scene, index === 0 ? integratedManifest : null),
  );

  hazardScriptsByScene.default = HAZARD_SCRIPTS.collapsing_floor;



  const gdl = {

    ...base,

    meta: {

      ...base.meta,

      title: 'Veloria — Veille des Lames',

      resolution: [W, H],

      version: '0.4.0',

      orientation: 'portrait',

      veloria_runtime: runtime,

      asset_atlas: registryAtlas,

      hazard_scripts: hazardScriptsByScene,

      sprints: { b: true, c: true, d: true, e: true },

      design: {

        ...(base.meta?.design ?? {}),

        first_playable: '6 arènes — lane_runner + wave_spawner + blessing_draft',

        heroine_active: hero.display_title,

        blessing_pool: LEVEL_01_BLESSINGS.map((b) => b.id),

        arena_count: ALL_LEVELS.length,

      },

    },

    style: {

      palette: ['#16131f', '#5a3a72', '#c9a227', '#9e4f5c', '#5ec7ef', '#f0d9a6'],

      mood: 'dark_fantasy_premium',

      dimension: '2.5d',

    },

    systems: [

      'input',

      'physics_topdown',

      'lane_runner',

      'auto_attack',

      'wave_spawner',

      'blessing_draft',

      'hazard_scheduler',

      'boss_phases',

      'collectibles',

      'enemy_ai',

      'goal',

      'camera_follow',

    ],

    entities: [

      {

        id: 'player',

        type: 'character',

        assets: {

          sprite: registryAtlas[hero.key] ?? gdlAsset(hero.preview_file),

          frame_count: 11,

        },

        components: [

          { transform: { x: scenes[0].layout.spawn.x, y: scenes[0].layout.spawn.y } },

          { physics: { body: 'dynamic', gravity: 0 } },

          { topdown_controller: { move_speed: 280, diagonal: false } },

          { health: { max: 3, current: 3 } },

        ],

      },

    ],

    scenes: scenesWithDepth,

  };



  return gdl;

}


