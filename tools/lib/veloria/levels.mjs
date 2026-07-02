import { LEVEL_01_BLESSINGS, LEVEL_01_ENCOUNTERS, LEVEL_01_LAYOUT, LEVEL_LADDER } from './data.mjs';
import { hazardScriptForLevel } from './hazards/index.mjs';

const ARENA_ENV = {
  level_01: 'ruined_cloister',
  level_02: 'pyre_road',
  level_03: 'statue_garden',
  level_04: 'drowned_port',
  level_05: 'candle_crypt',
  level_06: 'crepuscule_throne',
};

const FEATURED_ENEMY = {
  level_01: 'fallen_knight',
  level_02: 'tomb_hound',
  level_03: 'gargoyle',
  level_04: 'fanatic_sister',
  level_05: 'shadow_acolyte',
  level_06: 'bourreau',
};

const SCENE_SLUG = {
  level_01: 'level_01_cloitre_en_ruine',
  level_02: 'level_02_pyre_road',
  level_03: 'level_03_statue_garden',
  level_04: 'level_04_drowned_port',
  level_05: 'level_05_candle_crypt',
  level_06: 'level_06_crepuscule_throne',
};

function buildLayout(levelKey, ladderEntry) {
  const hazard = hazardScriptForLevel(levelKey);
  const envKey = ARENA_ENV[levelKey];
  return {
    ...LEVEL_01_LAYOUT,
    slug: SCENE_SLUG[levelKey] ?? levelKey,
    title: ladderEntry.title,
    hazard: {
      id: hazard.id,
      label: hazard.label,
      telegraph_duration_ms: hazard.telegraph_duration_ms,
      collapse_duration_ms: hazard.active_duration_ms,
      affected_lanes: ['lane_left', 'lane_center', 'lane_right'],
      rule: `Hazard unique ${ladderEntry.hazard} — script ${hazard.id}`,
    },
    art_modules: {
      background: envKey,
      foreground_props: [`${levelKey}-props`],
      combat_hud: 'ui__combat-hud-shell',
    },
    environment_key: envKey,
  };
}

function buildEncounters(levelKey, featuredType) {
  if (levelKey === 'level_01') return LEVEL_01_ENCOUNTERS;
  const isBossLevel = levelKey === 'level_06';
  const waves = [];
  for (let w = 1; w <= 9; w++) {
    const lane = ['lane_left', 'lane_center', 'lane_right'][w % 3];
    waves.push({
      wave: w,
      enemies: [
        { type: featuredType === 'bourreau' ? 'shadow_acolyte' : featuredType, lane, count: 1 + (w % 2) },
        ...(w > 4 ? [{ type: 'fallen_knight', lane: 'lane_center', count: 1 }] : []),
      ],
      ...(w >= 8 ? { hazard: hazardScriptForLevel(levelKey).id } : {}),
    });
  }
  waves.push({ wave: 10, enemies: [{ type: featuredType === 'bourreau' ? 'gargoyle' : featuredType, lane: 'lane_center', count: 2 }], hazard: hazardScriptForLevel(levelKey).id });
  waves.push({ wave: 11, enemies: [{ type: 'tomb_hound', lane: 'lane_left', count: 1 }, { type: 'tomb_hound', lane: 'lane_right', count: 1 }], hazard: hazardScriptForLevel(levelKey).id });
  if (isBossLevel) {
    waves.push({
      wave: 12,
      boss: { type: 'bourreau', phase_count: 3, spawn_lane: 'lane_center' },
      adds: [{ type: 'shadow_acolyte', lane: 'lane_left', count: 1 }, { type: 'shadow_acolyte', lane: 'lane_right', count: 1 }],
    });
  } else {
    waves.push({
      wave: 12,
      enemies: [{ type: featuredType, lane: 'lane_center', count: 2, variant: 'elite' }],
      hazard: hazardScriptForLevel(levelKey).id,
    });
  }
  return {
    stage: levelKey,
    heroine_default: 'aureline',
    total_waves: 12,
    blessing_breaks_after_waves: [3, 6, 9],
    waves,
  };
}

export const ALL_LEVELS = LEVEL_LADDER.map((entry) => {
  const levelKey = entry.key;
  return {
    key: levelKey,
    title: entry.title,
    hazard_label: entry.hazard,
    environment_key: ARENA_ENV[levelKey],
    featured_enemy: FEATURED_ENEMY[levelKey],
    layout: buildLayout(levelKey, entry),
    encounters: buildEncounters(levelKey, FEATURED_ENEMY[levelKey]),
    blessings: LEVEL_01_BLESSINGS,
  };
});

export function levelByKey(key) {
  return ALL_LEVELS.find((l) => l.key === key) ?? ALL_LEVELS[0];
}
