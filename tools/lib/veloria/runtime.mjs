import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  EQUIPMENT_SETS,
  HEROES,
  PRODUCTION_RULES,
  RELICS,
  RUNES,
  SUMMONS,
  SUPPORTS,
} from './data.mjs';
import { ALL_LEVELS } from './levels.mjs';
import { PROJECT_SLUG, WORKSPACE_ROOT } from './constants.mjs';
import { RUNTIME_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';

export async function buildRuntimePrep() {
  const scenesRoot = join(WORKSPACE_ROOT, '04_scenes');

  for (const level of ALL_LEVELS) {
    const dir = join(scenesRoot, level.key);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, 'layout.json'), level.layout);
    await writeJson(join(dir, 'encounters.json'), level.encounters);
    await writeJson(join(dir, 'blessings.json'), level.blessings);
    await writeJson(join(dir, 'scene-assembly.json'), {
      scene_id: level.layout.slug,
      workspace: PROJECT_SLUG,
      mode: 'vertical_lane_survival',
      level_key: level.key,
      environment_key: level.environment_key,
      systems: [
        'physics_topdown',
        'lane_runner',
        'auto_attack',
        'wave_spawner',
        'blessing_draft',
        'hazard_scheduler',
        'boss_phases',
        'summon_units',
        'loot_system',
      ],
    });
  }

  const runtimeBundle = {
    project: PROJECT_SLUG,
    generated_at: new Date().toISOString(),
    gameplay_profile: {
      camera: 'top_down',
      orientation: 'portrait',
      run_duration_seconds: 180,
      lane_count: 3,
      enemy_soft_cap: 5,
      hazard_per_arena: 1,
    },
    roster: HEROES.map((hero) => ({
      key: hero.key,
      role: hero.role_text,
      lane_style: hero.lane_style,
      weapon: hero.weapon,
      blessing_bias: hero.blessing_bias,
    })),
    supports: SUPPORTS.map((support) => ({
      key: support.key,
      role: support.role_text,
      trigger: support.trigger,
    })),
    meta_systems: {
      runes: RUNES.map((rune) => ({ key: rune.key, rarity: rune.rarity, slot: rune.slot })),
      relics: RELICS.map((relic) => ({ key: relic.key, rarity: relic.rarity })),
      summons: SUMMONS.map((summon) => ({ key: summon.key, rarity: summon.rarity })),
      sets: EQUIPMENT_SETS.map((set) => ({ key: set.key, pieces: set.pieces.length })),
    },
    level_ladder: ALL_LEVELS.map((l) => ({
      key: l.key,
      title: l.title,
      environment_key: l.environment_key,
      hazard: l.layout.hazard.label,
    })),
    arenas: ALL_LEVELS.length,
    first_slice: {
      layout_file: '04_scenes/level_01/layout.json',
      encounters_file: '04_scenes/level_01/encounters.json',
      blessings_file: '04_scenes/level_01/blessings.json',
    },
    production_rules: PRODUCTION_RULES,
  };

  await writeJson(join(RUNTIME_ROOT, 'hero-roster.json'), HEROES);
  await writeJson(join(RUNTIME_ROOT, 'support-roster.json'), SUPPORTS);
  await writeJson(join(RUNTIME_ROOT, 'runes-catalog.json'), RUNES);
  await writeJson(join(RUNTIME_ROOT, 'relics-catalog.json'), RELICS);
  await writeJson(join(RUNTIME_ROOT, 'summons-catalog.json'), SUMMONS);
  await writeJson(join(RUNTIME_ROOT, 'equipment-sets.json'), EQUIPMENT_SETS);
  await writeJson(join(RUNTIME_ROOT, 'level-ladder.json'), runtimeBundle.level_ladder);
  await writeJson(join(RUNTIME_ROOT, 'veloria-runtime-bundle.json'), runtimeBundle);

  return runtimeBundle;
}
