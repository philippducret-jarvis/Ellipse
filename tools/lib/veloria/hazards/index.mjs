/** Scripts hazard Veloria — télégraphe → activation → résolution (Sprint D). */

export const HAZARD_SCRIPTS = {
  collapsing_floor: {
    id: 'collapsing_floor',
    label: 'Effondrement',
    telegraph_duration_ms: 1400,
    active_duration_ms: 3200,
    cooldown_ms: 6000,
    pick_lane: 'most_populated',
    damage_on_active: 1,
    visual: { color: 'rgba(158, 79, 92, 0.75)', pulse_hz: 4 },
  },
  pyre_sweep: {
    id: 'pyre_sweep',
    label: 'Flammes balayantes',
    telegraph_duration_ms: 1200,
    active_duration_ms: 2400,
    cooldown_ms: 5500,
    pick_lane: 'sequential',
    damage_on_active: 1,
    visual: { color: 'rgba(201, 162, 39, 0.8)', pulse_hz: 6 },
  },
  spike_pop: {
    id: 'spike_pop',
    label: 'Piques sortantes',
    telegraph_duration_ms: 1000,
    active_duration_ms: 1800,
    cooldown_ms: 5000,
    pick_lane: 'random',
    damage_on_active: 1,
    visual: { color: 'rgba(144, 160, 144, 0.85)', pulse_hz: 5 },
  },
  tide_wave: {
    id: 'tide_wave',
    label: 'Marée montante',
    telegraph_duration_ms: 1600,
    active_duration_ms: 2800,
    cooldown_ms: 6500,
    pick_lane: 'all',
    damage_on_active: 1,
    visual: { color: 'rgba(94, 120, 180, 0.7)', pulse_hz: 3 },
  },
  occult_circle: {
    id: 'occult_circle',
    label: 'Cercle occulte',
    telegraph_duration_ms: 1300,
    active_duration_ms: 2200,
    cooldown_ms: 5800,
    pick_lane: 'center_first',
    damage_on_active: 1,
    visual: { color: 'rgba(90, 58, 114, 0.85)', pulse_hz: 4.5 },
  },
  oscillating_blades: {
    id: 'oscillating_blades',
    label: 'Lames oscillantes',
    telegraph_duration_ms: 900,
    active_duration_ms: 2600,
    cooldown_ms: 5200,
    pick_lane: 'alternating',
    damage_on_active: 2,
    visual: { color: 'rgba(112, 32, 48, 0.9)', pulse_hz: 7 },
  },
};

export function hazardScriptForLevel(levelKey) {
  const map = {
    level_01: 'collapsing_floor',
    level_02: 'pyre_sweep',
    level_03: 'spike_pop',
    level_04: 'tide_wave',
    level_05: 'occult_circle',
    level_06: 'oscillating_blades',
  };
  const id = map[levelKey] ?? 'collapsing_floor';
  return HAZARD_SCRIPTS[id];
}
