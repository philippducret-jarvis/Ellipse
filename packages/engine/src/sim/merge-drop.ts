import type { GameDefinition } from '@ellipse/shared';

export type MergeDropRarity = 'R' | 'SR' | 'SSR';
export type MergeDropMissionMode = 'nexus' | 'score' | 'survival' | 'boss';

/** Contrat d'une manche : la campagne et les défis pilotent le même moteur physique. */
export interface MergeDropRunRules {
  id: string;
  name: string;
  mode: MergeDropMissionMode;
  objective_label?: string;
  target_tier?: number;
  target_score?: number;
  time_limit_ms?: number;
  boss_id?: string;
  boss_name?: string;
  boss_max_hp?: number;
  reward_currency?: number;
  reward_essence?: number;
  gravity_multiplier?: number;
  overflow_grace_multiplier?: number;
  drop_cooldown_multiplier?: number;
  hazard_interval_ms?: number;
}
export type MergeDropAbility =
  | 'gravity_well'
  | 'forge_next'
  | 'time_bloom'
  | 'supernova'
  | 'starfall'
  | 'ascension'
  | 'aegis'
  | 'constellation'
  | 'echo_merge'
  | 'shatter_top'
  | 'void_swap'
  | 'aurora';

const ABILITY_IDS: readonly MergeDropAbility[] = [
  'gravity_well',
  'forge_next',
  'time_bloom',
  'supernova',
  'starfall',
  'ascension',
  'aegis',
  'constellation',
  'echo_merge',
  'shatter_top',
  'void_swap',
  'aurora',
];

/** Effets passifs des compétences de Gardien et des reliques (voir regles-du-jeu.md §5.3/§6.3). */
export type MergeDropPassiveEffect =
  | 'eclat_bonus_pct'
  | 'score_bonus_pct'
  | 'charge_per_drop'
  | 'charge_merge_bonus'
  | 'cascade_window_ms'
  | 'overflow_grace_ms'
  | 'cooldown_reduction_ms'
  | 'start_charge'
  | 'slow_on_cascade_ms';

export interface MergeDropSkill {
  id: string;
  name: string;
  description: string;
  /** Étoiles d'évolution requises (1 = compétence A, 3 = compétence B). */
  stars: number;
  effect: MergeDropPassiveEffect;
  value: number;
}

export interface MergeDropRelic {
  id: string;
  name: string;
  rarity: MergeDropRarity;
  description: string;
  effect: MergeDropPassiveEffect;
  value: number;
  color: string;
}

export type MergeDropCompanionTrigger = 'every_n_merges' | 'overflow_rescue';
export type MergeDropCompanionAction =
  | 'grant_eclats'
  | 'grant_charge'
  | 'grant_score'
  | 'reduce_overflow'
  | 'promote_smallest'
  | 'freeze_time';

export interface MergeDropCompanion {
  id: string;
  name: string;
  rarity: MergeDropRarity;
  description: string;
  trigger: MergeDropCompanionTrigger;
  /** Fusions entre deux procs (trigger every_n_merges). */
  interval?: number;
  action: MergeDropCompanionAction;
  value: number;
  color: string;
}

export interface MergeDropTier {
  id: string;
  label: string;
  /** Nom du personnage astral incarné par ce rang (les "billes" sont des personnages). */
  persona: string;
  radius: number;
  color: string;
  score: number;
}

export interface MergeDropHero {
  id: string;
  name: string;
  title: string;
  rarity: MergeDropRarity;
  ability: MergeDropAbility;
  ability_label: string;
  color: string;
  portrait?: string;
  portrait_frame?: number;
  portrait_columns?: number;
  portrait_rows?: number;
  faction?: string;
  role?: string;
  element?: string;
  quote?: string;
  biography?: string;
  /** Compétences passives débloquées par étoiles d'évolution (doublons). */
  skills: MergeDropSkill[];
}

export interface MergeDropConfig {
  board: { x: number; y: number; width: number; height: number; loss_line_y: number };
  gravity: number;
  drop_cooldown_ms: number;
  overflow_grace_ms: number;
  initial_currency: number;
  summon_cost: number;
  summon10_cost: number;
  relic_summon_cost: number;
  relic_summon10_cost: number;
  pity_after: number;
  summon_rates: Record<MergeDropRarity, number>;
  duplicate_essence: Record<MergeDropRarity, number>;
  awaken_base_cost: number;
  awaken_cost_step: number;
  awaken_max_level: number;
  evolution_max_stars: number;
  item_max_level: number;
  initial_unlocked_heroes: string[];
  tiers: MergeDropTier[];
  heroes: MergeDropHero[];
  relics: MergeDropRelic[];
  companions: MergeDropCompanion[];
}

export interface MergeDropBall {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born_at_ms: number;
}

export type MergeDropEvent =
  | { type: 'drop'; x: number; y: number; tier: number }
  | { type: 'merge'; x: number; y: number; tier: number; points: number; combo: number }
  | { type: 'dissolve'; x: number; y: number; tier: number }
  | { type: 'ability'; hero_id: string; ability: MergeDropAbility; overdrive: boolean; potency: number }
  | { type: 'summon'; hero_id: string; rarity: MergeDropRarity; duplicate: boolean; essence_gained: number }
  | { type: 'evolution'; hero_id: string; stars: number }
  | { type: 'relic_summon'; item_id: string; kind: 'relic' | 'companion'; rarity: MergeDropRarity; duplicate: boolean; level: number; essence_gained: number }
  | { type: 'companion_proc'; companion_id: string; label: string }
  | { type: 'awaken'; hero_id: string; level: number }
  | { type: 'boss_hit'; boss_id: string; damage: number; hp: number; max_hp: number; phase: number }
  | { type: 'boss_attack'; boss_id: string; attack: 'gravity_surge' | 'void_seed' | 'star_break' }
  | { type: 'mission_complete'; mission_id: string; reward_currency: number; reward_essence: number }
  | { type: 'game_over' }
  | { type: 'target_reached'; tier: number };

export interface MergeDropSummonOutcome {
  hero_id: string;
  rarity: MergeDropRarity;
  duplicate: boolean;
  essence_gained: number;
  /** Étoiles d'évolution du Gardien après ce tirage. */
  stars: number;
  /** Vrai lorsqu'un SSR vedette a répondu à la bannière limitée. */
  featured?: boolean;
}

export interface MergeDropSummonOptions {
  featured_hero_id?: string;
}

export interface MergeDropRelicOutcome {
  item_id: string;
  kind: 'relic' | 'companion';
  rarity: MergeDropRarity;
  duplicate: boolean;
  /** Niveau de l'objet après ce tirage. */
  level: number;
  essence_gained: number;
}

/** Modificateurs passifs actifs (Gardien sélectionné + relique équipée + transcendance). */
export interface MergeDropModifiers {
  eclat_bonus_pct: number;
  score_bonus_pct: number;
  charge_per_drop: number;
  charge_merge_bonus: number;
  cascade_window_ms: number;
  overflow_grace_ms: number;
  cooldown_reduction_ms: number;
  start_charge: number;
  slow_on_cascade_ms: number;
}

export interface MergeDropWorld {
  config: MergeDropConfig;
  balls: MergeDropBall[];
  aim_x: number;
  current_tier: number;
  next_tier: number;
  score: number;
  best_tier: number;
  currency: number;
  essence: number;
  ability_charge: number;
  selected_hero_id: string;
  unlocked_hero_ids: string[];
  pity: number;
  combo: number;
  combo_window_ms: number;
  elapsed_ms: number;
  physics_accumulator_ms: number;
  drop_cooldown_ms: number;
  slow_motion_ms: number;
  forge_next: boolean;
  forge_boost: number;
  overflow_ms: number;
  game_over: boolean;
  target_reached: boolean;
  nexus_completions: number;
  run_rules: MergeDropRunRules;
  mission_time_remaining_ms: number;
  boss_hp: number;
  boss_max_hp: number;
  boss_phase: number;
  boss_attack_ms: number;
  mission_reward_claimed: boolean;
  hero_levels: Record<string, number>;
  /** Étoiles d'évolution par Gardien (doublons d'invocation). */
  hero_stars: Record<string, number>;
  /** Objets possédés → niveau (1..item_max_level). */
  relic_levels: Record<string, number>;
  companion_levels: Record<string, number>;
  equipped_relic?: string;
  equipped_companion?: string;
  relic_pity: number;
  /** Après un SSR hors vedette, le prochain SSR limité est garanti. */
  featured_guaranteed: boolean;
  merges_since_companion: number;
  companion_rescue_used: boolean;
  /** Multiplicateur appliqué à la prochaine fusion (ult Écho jumeau). */
  next_merge_multiplier: number;
  /** Aurore boréale : fusions ×2 et cascade entretenue tant que > 0. */
  aurora_ms: number;
  summon_result?: MergeDropSummonOutcome & { remaining_ms: number };
  summon_batch?: { results: MergeDropSummonOutcome[]; remaining_ms: number };
  events: MergeDropEvent[];
  rng_state: number;
  next_ball_id: number;
}

const DEFAULT_TIERS: MergeDropTier[] = [
  { id: 'spark', label: 'Étincelle', persona: 'Pio', radius: 24, color: '#5eead4', score: 12 },
  { id: 'dew', label: 'Rosée', persona: 'Lumi', radius: 31, color: '#38bdf8', score: 30 },
  { id: 'moon', label: 'Lune', persona: 'Séla', radius: 40, color: '#818cf8', score: 72 },
  { id: 'comet', label: 'Comète', persona: 'Kori', radius: 50, color: '#c084fc', score: 160 },
  { id: 'sun', label: 'Soleil', persona: 'Hélio', radius: 62, color: '#fb7185', score: 360 },
  { id: 'crown', label: 'Couronne', persona: 'Auriel', radius: 76, color: '#f59e0b', score: 800 },
  { id: 'world', label: 'Monde', persona: 'Gaïa', radius: 92, color: '#84cc16', score: 1800 },
  { id: 'nexus', label: 'Nexus', persona: 'Astra', radius: 112, color: '#f8fafc', score: 4200 },
];

function skill(
  id: string,
  name: string,
  description: string,
  stars: number,
  effect: MergeDropPassiveEffect,
  value: number,
): MergeDropSkill {
  return { id, name, description, stars, effect, value };
}

const DEFAULT_HEROES: MergeDropHero[] = [
  {
    id: 'mira', name: 'Mira', title: 'Tisseuse de gravite', rarity: 'R',
    ability: 'gravity_well', ability_label: 'Puits astral', color: '#2dd4bf',
    skills: [
      skill('mira_a', "Fil d'argent", 'Éclats de fusion +10 %', 1, 'eclat_bonus_pct', 10),
      skill('mira_b', 'Cœur du puits', '+2 charge par fusion', 3, 'charge_merge_bonus', 2),
    ],
  },
  {
    id: 'brann', name: 'Brann', title: 'Forgeron des astres', rarity: 'R',
    ability: 'forge_next', ability_label: 'Frappe runique', color: '#f97316',
    skills: [
      skill('brann_a', 'Braises', 'Score +8 %', 1, 'score_bonus_pct', 8),
      skill('brann_b', 'Souffle de forge', '+2 charge par drop', 3, 'charge_per_drop', 2),
    ],
  },
  {
    id: 'kael', name: 'Kael', title: "Chasseur d'étoiles", rarity: 'R',
    ability: 'starfall', ability_label: "Pluie d'étoiles", color: '#a3e635',
    skills: [
      skill('kael_a', 'Instinct de chasse', 'Éclats de fusion +12 %', 1, 'eclat_bonus_pct', 12),
      skill('kael_b', 'Ciel dégagé', 'Grâce de débordement +250 ms', 3, 'overflow_grace_ms', 250),
    ],
  },
  {
    id: 'orin', name: 'Orin', title: 'Chasseur des marées', rarity: 'R',
    ability: 'echo_merge', ability_label: 'Écho jumeau', color: '#22d3ee',
    skills: [
      skill('orin_a', 'Ressac', 'Fenêtre de cascade +200 ms', 1, 'cascade_window_ms', 200),
      skill('orin_b', 'Marée montante', 'Score +10 %', 3, 'score_bonus_pct', 10),
    ],
  },
  {
    id: 'lys', name: 'Lys', title: 'Gardienne des secondes', rarity: 'SR',
    ability: 'time_bloom', ability_label: 'Temps suspendu', color: '#60a5fa',
    skills: [
      skill('lys_a', 'Rosée persistante', 'Ralenti 1,5 s sur cascade ×3', 1, 'slow_on_cascade_ms', 1500),
      skill('lys_b', 'Sablier fêlé', 'Fenêtre de cascade +300 ms', 3, 'cascade_window_ms', 300),
    ],
  },
  {
    id: 'noor', name: 'Noor', title: "Porteuse d'aurore", rarity: 'SR',
    ability: 'ascension', ability_label: 'Ascension', color: '#f472b6',
    skills: [
      skill('noor_a', 'Aube claire', 'Commence la manche à 20 % de charge', 1, 'start_charge', 20),
      skill('noor_b', 'Élan céleste', '+3 charge par fusion', 3, 'charge_merge_bonus', 3),
    ],
  },
  {
    id: 'vesper', name: 'Vesper', title: 'Sentinelle du soir', rarity: 'SR',
    ability: 'aegis', ability_label: 'Voile stellaire', color: '#94a3b8',
    skills: [
      skill('vesper_a', 'Garde du soir', 'Grâce de débordement +400 ms', 1, 'overflow_grace_ms', 400),
      skill('vesper_b', 'Pas feutré', 'Cooldown de drop −60 ms', 3, 'cooldown_reduction_ms', 60),
    ],
  },
  {
    id: 'saphira', name: 'Saphira', title: 'Lame de cristal', rarity: 'SR',
    ability: 'shatter_top', ability_label: 'Éclat pur', color: '#7dd3fc',
    skills: [
      skill('saphira_a', 'Tranchant', 'Score +12 %', 1, 'score_bonus_pct', 12),
      skill('saphira_b', 'Facettes', 'Éclats de fusion +8 %', 3, 'eclat_bonus_pct', 8),
    ],
  },
  {
    id: 'nyx', name: 'Nyx', title: 'Murmure du vide', rarity: 'SR',
    ability: 'void_swap', ability_label: 'Bascule du vide', color: '#6366f1',
    skills: [
      skill('nyx_a', 'Ombre utile', 'Cooldown de drop −50 ms', 1, 'cooldown_reduction_ms', 50),
      skill('nyx_b', 'Regard du vide', '+3 charge par drop', 3, 'charge_per_drop', 3),
    ],
  },
  {
    id: 'aster', name: 'Aster', title: 'Heritiere du Nexus', rarity: 'SSR',
    ability: 'supernova', ability_label: 'Supernova', color: '#facc15',
    skills: [
      skill('aster_a', 'Héritage', '+4 charge par fusion', 1, 'charge_merge_bonus', 4),
      skill('aster_b', 'Noblesse', 'Score +15 %', 3, 'score_bonus_pct', 15),
    ],
  },
  {
    id: 'elya', name: 'Élya', title: 'Voix des constellations', rarity: 'SSR',
    ability: 'constellation', ability_label: 'Constellation', color: '#e879f9',
    skills: [
      skill('elya_a', 'Chœur mineur', 'Éclats de fusion +15 %', 1, 'eclat_bonus_pct', 15),
      skill('elya_b', 'Harmonie', 'Fenêtre de cascade +350 ms', 3, 'cascade_window_ms', 350),
    ],
  },
  {
    id: 'solveig', name: 'Solveig', title: 'Aube éternelle', rarity: 'SSR',
    ability: 'aurora', ability_label: 'Aurore boréale', color: '#fb923c',
    skills: [
      skill('solveig_a', 'Premier rayon', 'Commence la manche à 30 % de charge', 1, 'start_charge', 30),
      skill('solveig_b', 'Chaleur douce', 'Ralenti 2 s sur cascade ×3', 3, 'slow_on_cascade_ms', 2000),
    ],
  },
];

const DEFAULT_RELICS: MergeDropRelic[] = [
  { id: 'prisme_rosee', name: 'Prisme de rosée', rarity: 'R', description: 'Éclats de fusion +8 %', effect: 'eclat_bonus_pct', value: 8, color: '#38bdf8' },
  { id: 'marteau_stellaire', name: 'Marteau stellaire', rarity: 'R', description: '+1 charge par drop', effect: 'charge_per_drop', value: 1, color: '#f97316' },
  { id: 'larme_comete', name: 'Larme de comète', rarity: 'SR', description: 'Fenêtre de cascade +250 ms', effect: 'cascade_window_ms', value: 250, color: '#c084fc' },
  { id: 'couronne_naine', name: 'Couronne naine', rarity: 'SR', description: 'Score +10 %', effect: 'score_bonus_pct', value: 10, color: '#f59e0b' },
  { id: 'coeur_nexus', name: 'Cœur de Nexus', rarity: 'SSR', description: 'Commence la manche à 40 % de charge', effect: 'start_charge', value: 40, color: '#f8fafc' },
  { id: 'astrolabe_brise', name: 'Astrolabe brisé', rarity: 'SSR', description: 'Grâce de débordement +500 ms', effect: 'overflow_grace_ms', value: 500, color: '#67e8f9' },
];

const DEFAULT_COMPANIONS: MergeDropCompanion[] = [
  { id: 'lumen', name: 'Lumen', rarity: 'R', description: 'Toutes les 12 fusions : +18 éclats', trigger: 'every_n_merges', interval: 12, action: 'grant_eclats', value: 18, color: '#fde68a' },
  { id: 'bulle', name: 'Bulle', rarity: 'R', description: 'Toutes les 15 fusions : jauge de danger −50 %', trigger: 'every_n_merges', interval: 15, action: 'reduce_overflow', value: 50, color: '#a5f3fc' },
  { id: 'nebulin', name: 'Nébulin', rarity: 'SR', description: 'Toutes les 10 fusions : +8 charge d’ult', trigger: 'every_n_merges', interval: 10, action: 'grant_charge', value: 8, color: '#c4b5fd' },
  { id: 'stellina', name: 'Stellina', rarity: 'SR', description: 'Toutes les 12 fusions : +60 score', trigger: 'every_n_merges', interval: 12, action: 'grant_score', value: 60, color: '#fbcfe8' },
  { id: 'croc_de_lune', name: 'Croc-de-Lune', rarity: 'SSR', description: '1×/manche à 85 % de danger : purge + ralenti 4 s', trigger: 'overflow_rescue', action: 'freeze_time', value: 4000, color: '#e0e7ff' },
  { id: 'aion', name: 'Aïon', rarity: 'SSR', description: 'Toutes les 20 fusions : élève le plus petit Astre', trigger: 'every_n_merges', interval: 20, action: 'promote_smallest', value: 1, color: '#fdba74' },
];

export const DEFAULT_MERGE_DROP_CONFIG: MergeDropConfig = {
  board: { x: 72, y: 184, width: 576, height: 824, loss_line_y: 326 },
  gravity: 1180,
  drop_cooldown_ms: 280,
  overflow_grace_ms: 1600,
  initial_currency: 300,
  summon_cost: 100,
  summon10_cost: 900,
  relic_summon_cost: 80,
  relic_summon10_cost: 720,
  pity_after: 10,
  summon_rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
  duplicate_essence: { R: 15, SR: 35, SSR: 80 },
  awaken_base_cost: 40,
  awaken_cost_step: 30,
  awaken_max_level: 5,
  evolution_max_stars: 5,
  item_max_level: 5,
  initial_unlocked_heroes: ['mira'],
  tiers: DEFAULT_TIERS,
  heroes: DEFAULT_HEROES,
  relics: DEFAULT_RELICS,
  companions: DEFAULT_COMPANIONS,
};

export const DEFAULT_MERGE_DROP_RUN_RULES: MergeDropRunRules = {
  id: 'free_ascent',
  name: 'Ascension libre',
  mode: 'nexus',
  objective_label: 'Réunissez les Astres jusqu’au Nexus',
  target_tier: DEFAULT_TIERS.length - 1,
  reward_currency: 0,
  reward_essence: 0,
  gravity_multiplier: 1,
  overflow_grace_multiplier: 1,
  drop_cooldown_multiplier: 1,
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

const PASSIVE_EFFECTS: readonly MergeDropPassiveEffect[] = [
  'eclat_bonus_pct', 'score_bonus_pct', 'charge_per_drop', 'charge_merge_bonus',
  'cascade_window_ms', 'overflow_grace_ms', 'cooldown_reduction_ms', 'start_charge', 'slow_on_cascade_ms',
];

function parseSkills(raw: unknown, fallback: MergeDropSkill[]): MergeDropSkill[] {
  if (!Array.isArray(raw)) return fallback;
  const parsed: MergeDropSkill[] = [];
  for (const value of raw) {
    const item = record(value);
    if (typeof item.id !== 'string' || !PASSIVE_EFFECTS.includes(item.effect as MergeDropPassiveEffect)) continue;
    parsed.push({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : item.id,
      description: typeof item.description === 'string' ? item.description : '',
      stars: Math.max(1, finite(item.stars, 1)),
      effect: item.effect as MergeDropPassiveEffect,
      value: finite(item.value, 0),
    });
  }
  return parsed.length ? parsed : fallback;
}

function parseRelics(raw: unknown): MergeDropRelic[] {
  if (!Array.isArray(raw)) return DEFAULT_RELICS;
  const parsed: MergeDropRelic[] = [];
  for (const value of raw) {
    const item = record(value);
    if (typeof item.id !== 'string' || !PASSIVE_EFFECTS.includes(item.effect as MergeDropPassiveEffect)) continue;
    parsed.push({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : item.id,
      rarity: item.rarity === 'SR' || item.rarity === 'SSR' ? item.rarity : 'R',
      description: typeof item.description === 'string' ? item.description : '',
      effect: item.effect as MergeDropPassiveEffect,
      value: finite(item.value, 0),
      color: typeof item.color === 'string' ? item.color : '#94a3b8',
    });
  }
  return parsed.length ? parsed : DEFAULT_RELICS;
}

function parseCompanions(raw: unknown): MergeDropCompanion[] {
  if (!Array.isArray(raw)) return DEFAULT_COMPANIONS;
  const actions: MergeDropCompanionAction[] = ['grant_eclats', 'grant_charge', 'grant_score', 'reduce_overflow', 'promote_smallest', 'freeze_time'];
  const parsed: MergeDropCompanion[] = [];
  for (const value of raw) {
    const item = record(value);
    if (typeof item.id !== 'string' || !actions.includes(item.action as MergeDropCompanionAction)) continue;
    parsed.push({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : item.id,
      rarity: item.rarity === 'SR' || item.rarity === 'SSR' ? item.rarity : 'R',
      description: typeof item.description === 'string' ? item.description : '',
      trigger: item.trigger === 'overflow_rescue' ? 'overflow_rescue' : 'every_n_merges',
      interval: typeof item.interval === 'number' ? Math.max(4, Math.floor(item.interval)) : undefined,
      action: item.action as MergeDropCompanionAction,
      value: finite(item.value, 0),
      color: typeof item.color === 'string' ? item.color : '#94a3b8',
    });
  }
  return parsed.length ? parsed : DEFAULT_COMPANIONS;
}

function mergeConfig(raw: unknown): MergeDropConfig {
  const source = record(raw);
  const board = record(source.board);
  const rates = record(source.summon_rates);
  const duplicateEssence = record(source.duplicate_essence);
  const tiers = Array.isArray(source.tiers)
    ? source.tiers.map((value, index) => {
        const item = record(value);
        const fallback = DEFAULT_TIERS[Math.min(index, DEFAULT_TIERS.length - 1)]!;
        return {
          id: typeof item.id === 'string' ? item.id : fallback.id,
          label: typeof item.label === 'string' ? item.label : fallback.label,
          persona: typeof item.persona === 'string' ? item.persona : fallback.persona,
          radius: finite(item.radius, fallback.radius),
          color: typeof item.color === 'string' ? item.color : fallback.color,
          score: finite(item.score, fallback.score),
        };
      })
    : DEFAULT_MERGE_DROP_CONFIG.tiers;
  const heroes = Array.isArray(source.heroes)
    ? source.heroes.map((value, index) => {
        const item = record(value);
        const fallback = DEFAULT_HEROES[Math.min(index, DEFAULT_HEROES.length - 1)]!;
        const rarity: MergeDropRarity = item.rarity === 'SR' || item.rarity === 'SSR' ? item.rarity : 'R';
        const ability = ABILITY_IDS.includes(item.ability as MergeDropAbility)
          ? (item.ability as MergeDropAbility)
          : fallback.ability;
        return {
          id: typeof item.id === 'string' ? item.id : fallback.id,
          name: typeof item.name === 'string' ? item.name : fallback.name,
          title: typeof item.title === 'string' ? item.title : fallback.title,
          rarity,
          ability,
          ability_label: typeof item.ability_label === 'string' ? item.ability_label : fallback.ability_label,
          color: typeof item.color === 'string' ? item.color : fallback.color,
          portrait: typeof item.portrait === 'string' ? item.portrait : undefined,
          portrait_frame: typeof item.portrait_frame === 'number' ? item.portrait_frame : undefined,
          portrait_columns: typeof item.portrait_columns === 'number' ? item.portrait_columns : undefined,
          portrait_rows: typeof item.portrait_rows === 'number' ? item.portrait_rows : undefined,
          faction: typeof item.faction === 'string' ? item.faction : fallback.faction,
          role: typeof item.role === 'string' ? item.role : fallback.role,
          element: typeof item.element === 'string' ? item.element : fallback.element,
          quote: typeof item.quote === 'string' ? item.quote : fallback.quote,
          biography: typeof item.biography === 'string' ? item.biography : fallback.biography,
          skills: parseSkills(item.skills, fallback.skills),
        };
      })
    : DEFAULT_MERGE_DROP_CONFIG.heroes;

  return {
    board: {
      x: finite(board.x, DEFAULT_MERGE_DROP_CONFIG.board.x),
      y: finite(board.y, DEFAULT_MERGE_DROP_CONFIG.board.y),
      width: finite(board.width, DEFAULT_MERGE_DROP_CONFIG.board.width),
      height: finite(board.height, DEFAULT_MERGE_DROP_CONFIG.board.height),
      loss_line_y: finite(board.loss_line_y, DEFAULT_MERGE_DROP_CONFIG.board.loss_line_y),
    },
    gravity: finite(source.gravity, DEFAULT_MERGE_DROP_CONFIG.gravity),
    drop_cooldown_ms: finite(source.drop_cooldown_ms, DEFAULT_MERGE_DROP_CONFIG.drop_cooldown_ms),
    overflow_grace_ms: Math.max(250, finite(source.overflow_grace_ms, DEFAULT_MERGE_DROP_CONFIG.overflow_grace_ms)),
    initial_currency: finite(source.initial_currency, DEFAULT_MERGE_DROP_CONFIG.initial_currency),
    summon_cost: finite(source.summon_cost, DEFAULT_MERGE_DROP_CONFIG.summon_cost),
    summon10_cost: finite(source.summon10_cost, DEFAULT_MERGE_DROP_CONFIG.summon10_cost),
    relic_summon_cost: finite(source.relic_summon_cost, DEFAULT_MERGE_DROP_CONFIG.relic_summon_cost),
    relic_summon10_cost: finite(source.relic_summon10_cost, DEFAULT_MERGE_DROP_CONFIG.relic_summon10_cost),
    pity_after: finite(source.pity_after, DEFAULT_MERGE_DROP_CONFIG.pity_after),
    summon_rates: {
      R: finite(rates.R, DEFAULT_MERGE_DROP_CONFIG.summon_rates.R),
      SR: finite(rates.SR, DEFAULT_MERGE_DROP_CONFIG.summon_rates.SR),
      SSR: finite(rates.SSR, DEFAULT_MERGE_DROP_CONFIG.summon_rates.SSR),
    },
    duplicate_essence: {
      R: Math.max(0, finite(duplicateEssence.R, DEFAULT_MERGE_DROP_CONFIG.duplicate_essence.R)),
      SR: Math.max(0, finite(duplicateEssence.SR, DEFAULT_MERGE_DROP_CONFIG.duplicate_essence.SR)),
      SSR: Math.max(0, finite(duplicateEssence.SSR, DEFAULT_MERGE_DROP_CONFIG.duplicate_essence.SSR)),
    },
    awaken_base_cost: Math.max(1, finite(source.awaken_base_cost, DEFAULT_MERGE_DROP_CONFIG.awaken_base_cost)),
    awaken_cost_step: Math.max(0, finite(source.awaken_cost_step, DEFAULT_MERGE_DROP_CONFIG.awaken_cost_step)),
    awaken_max_level: Math.max(1, finite(source.awaken_max_level, DEFAULT_MERGE_DROP_CONFIG.awaken_max_level)),
    evolution_max_stars: Math.max(1, finite(source.evolution_max_stars, DEFAULT_MERGE_DROP_CONFIG.evolution_max_stars)),
    item_max_level: Math.max(1, finite(source.item_max_level, DEFAULT_MERGE_DROP_CONFIG.item_max_level)),
    initial_unlocked_heroes: Array.isArray(source.initial_unlocked_heroes)
      ? source.initial_unlocked_heroes.filter((id): id is string => typeof id === 'string')
      : DEFAULT_MERGE_DROP_CONFIG.initial_unlocked_heroes,
    tiers: tiers.length >= 2 ? tiers : DEFAULT_MERGE_DROP_CONFIG.tiers,
    heroes: heroes.length ? heroes : DEFAULT_MERGE_DROP_CONFIG.heroes,
    relics: parseRelics(source.relics),
    companions: parseCompanions(source.companions),
  };
}

export function mergeDropConfigFromGdl(gdl: GameDefinition): MergeDropConfig {
  return mergeConfig((gdl.meta as Record<string, unknown>).merge_drop);
}

function random(world: MergeDropWorld): number {
  let x = world.rng_state | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rng_state = x >>> 0;
  return world.rng_state / 0x1_0000_0000;
}

function randomDropTier(world: MergeDropWorld): number {
  const roll = random(world);
  return roll < 0.66 ? 0 : roll < 0.92 ? 1 : Math.min(2, world.config.tiers.length - 1);
}

function clampMultiplier(value: unknown, fallback = 1): number {
  return Math.max(0.35, Math.min(3, finite(value, fallback)));
}

export function normalizeMergeDropRunRules(
  config: MergeDropConfig,
  raw?: Partial<MergeDropRunRules>,
): MergeDropRunRules {
  const mode: MergeDropMissionMode = raw?.mode === 'score' || raw?.mode === 'survival' || raw?.mode === 'boss'
    ? raw.mode
    : 'nexus';
  const maxTier = Math.max(1, config.tiers.length - 1);
  const targetTier = Math.max(1, Math.min(maxTier, Math.floor(finite(raw?.target_tier, maxTier))));
  const bossMaxHp = mode === 'boss' ? Math.max(100, Math.floor(finite(raw?.boss_max_hp, 1800))) : 0;
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : DEFAULT_MERGE_DROP_RUN_RULES.id,
    name: typeof raw?.name === 'string' && raw.name ? raw.name : DEFAULT_MERGE_DROP_RUN_RULES.name,
    mode,
    objective_label: typeof raw?.objective_label === 'string' ? raw.objective_label : undefined,
    target_tier: targetTier,
    target_score: Math.max(100, Math.floor(finite(raw?.target_score, 1200))),
    time_limit_ms: Math.max(0, Math.floor(finite(raw?.time_limit_ms, 0))),
    boss_id: typeof raw?.boss_id === 'string' ? raw.boss_id : 'void_leviathan',
    boss_name: typeof raw?.boss_name === 'string' ? raw.boss_name : 'Léviathan du Vide',
    boss_max_hp: bossMaxHp,
    reward_currency: Math.max(0, Math.floor(finite(raw?.reward_currency, 0))),
    reward_essence: Math.max(0, Math.floor(finite(raw?.reward_essence, 0))),
    gravity_multiplier: clampMultiplier(raw?.gravity_multiplier),
    overflow_grace_multiplier: clampMultiplier(raw?.overflow_grace_multiplier),
    drop_cooldown_multiplier: clampMultiplier(raw?.drop_cooldown_multiplier),
    hazard_interval_ms: Math.max(2500, Math.floor(finite(raw?.hazard_interval_ms, 9000))),
  };
}

export function createMergeDropWorld(
  config: MergeDropConfig = DEFAULT_MERGE_DROP_CONFIG,
  seed = 0x51a7f00d,
  rules?: Partial<MergeDropRunRules>,
): MergeDropWorld {
  const firstHero = config.initial_unlocked_heroes.find((id) => config.heroes.some((hero) => hero.id === id))
    ?? config.heroes[0]?.id
    ?? 'mira';
  const runRules = normalizeMergeDropRunRules(config, rules);
  const world: MergeDropWorld = {
    config,
    balls: [],
    aim_x: config.board.x + config.board.width / 2,
    current_tier: 0,
    next_tier: 0,
    score: 0,
    best_tier: 0,
    currency: config.initial_currency,
    essence: 0,
    ability_charge: 0,
    selected_hero_id: firstHero,
    unlocked_hero_ids: [...new Set([firstHero, ...config.initial_unlocked_heroes])],
    pity: 0,
    combo: 0,
    combo_window_ms: 0,
    elapsed_ms: 0,
    physics_accumulator_ms: 0,
    drop_cooldown_ms: 0,
    slow_motion_ms: 0,
    forge_next: false,
    forge_boost: 1,
    overflow_ms: 0,
    game_over: false,
    target_reached: false,
    nexus_completions: 0,
    run_rules: runRules,
    mission_time_remaining_ms: runRules.time_limit_ms ?? 0,
    boss_hp: runRules.boss_max_hp ?? 0,
    boss_max_hp: runRules.boss_max_hp ?? 0,
    boss_phase: runRules.mode === 'boss' ? 1 : 0,
    boss_attack_ms: runRules.hazard_interval_ms ?? 9000,
    mission_reward_claimed: false,
    hero_levels: {},
    hero_stars: {},
    relic_levels: {},
    companion_levels: {},
    equipped_relic: undefined,
    equipped_companion: undefined,
    relic_pity: 0,
    featured_guaranteed: false,
    merges_since_companion: 0,
    companion_rescue_used: false,
    next_merge_multiplier: 1,
    aurora_ms: 0,
    events: [],
    rng_state: seed >>> 0,
    next_ball_id: 1,
  };
  world.current_tier = randomDropTier(world);
  world.next_tier = randomDropTier(world);
  return world;
}

export function createMergeDropWorldFromGdl(
  gdl: GameDefinition,
  seed?: number,
  rules?: Partial<MergeDropRunRules>,
): MergeDropWorld {
  return createMergeDropWorld(mergeDropConfigFromGdl(gdl), seed, rules);
}

export function mergeDropHeroStars(world: MergeDropWorld, heroId: string): number {
  const stars = world.hero_stars[heroId];
  return typeof stars === 'number' && Number.isFinite(stars)
    ? Math.max(0, Math.min(world.config.evolution_max_stars, Math.floor(stars)))
    : 0;
}

function itemLevelScale(level: number): number {
  return 1 + 0.25 * (Math.max(1, level) - 1);
}

/** Agrège les passifs actifs : compétences débloquées du Gardien sélectionné + relique équipée. */
export function mergeDropModifiers(world: MergeDropWorld): MergeDropModifiers {
  const mods: MergeDropModifiers = {
    eclat_bonus_pct: 0,
    score_bonus_pct: 0,
    charge_per_drop: 0,
    charge_merge_bonus: 0,
    cascade_window_ms: 0,
    overflow_grace_ms: 0,
    cooldown_reduction_ms: 0,
    start_charge: 0,
    slow_on_cascade_ms: 0,
  };
  const hero = world.config.heroes.find((entry) => entry.id === world.selected_hero_id);
  if (hero) {
    const stars = mergeDropHeroStars(world, hero.id);
    for (const heroSkill of hero.skills) {
      if (stars >= heroSkill.stars) mods[heroSkill.effect] += heroSkill.value;
    }
  }
  if (world.equipped_relic) {
    const relic = world.config.relics.find((entry) => entry.id === world.equipped_relic);
    const level = world.relic_levels[world.equipped_relic];
    if (relic && level) {
      mods[relic.effect] += relic.value * itemLevelScale(level);
    }
  }
  return mods;
}

/** À appeler au début d'une manche (après restauration du progrès) : bonus de départ. */
export function primeMergeDropRun(world: MergeDropWorld): void {
  const mods = mergeDropModifiers(world);
  world.ability_charge = Math.min(200, Math.max(world.ability_charge, mods.start_charge));
  world.merges_since_companion = 0;
  world.companion_rescue_used = false;
  world.next_merge_multiplier = 1;
  world.aurora_ms = 0;
}

export function setMergeDropAim(world: MergeDropWorld, x: number): void {
  setMergeDropAimForTier(world, x, world.current_tier);
}

function setMergeDropAimForTier(world: MergeDropWorld, x: number, tierIndex: number): void {
  const tier = world.config.tiers[tierIndex] ?? world.config.tiers[0]!;
  const left = world.config.board.x + tier.radius + 4;
  const right = world.config.board.x + world.config.board.width - tier.radius - 4;
  world.aim_x = Math.max(left, Math.min(right, x));
}

export function dropMergeBall(world: MergeDropWorld): boolean {
  if (world.game_over || world.target_reached || world.drop_cooldown_ms > 0) return false;
  const forgedTier = world.forge_next
    ? Math.min(world.current_tier + Math.max(1, world.forge_boost), world.config.tiers.length - 1)
    : world.current_tier;
  const tier = world.config.tiers[forgedTier] ?? world.config.tiers[0]!;
  setMergeDropAimForTier(world, world.aim_x, forgedTier);
  const ball: MergeDropBall = {
    id: world.next_ball_id++,
    tier: forgedTier,
    x: world.aim_x,
    y: world.config.board.y + tier.radius + 8,
    vx: 0,
    vy: 24,
    born_at_ms: world.elapsed_ms,
  };
  world.balls.push(ball);
  world.events.push({ type: 'drop', x: ball.x, y: ball.y, tier: ball.tier });
  world.forge_next = false;
  world.current_tier = world.next_tier;
  world.next_tier = randomDropTier(world);
  const mods = mergeDropModifiers(world);
  world.drop_cooldown_ms = Math.max(
    90,
    (world.config.drop_cooldown_ms - mods.cooldown_reduction_ms) * (world.run_rules.drop_cooldown_multiplier ?? 1),
  );
  world.ability_charge = Math.min(200, world.ability_charge + mods.charge_per_drop);
  return true;
}

function resolveBounds(world: MergeDropWorld, ball: MergeDropBall): void {
  const tier = world.config.tiers[ball.tier]!;
  const left = world.config.board.x + tier.radius;
  const right = world.config.board.x + world.config.board.width - tier.radius;
  const floor = world.config.board.y + world.config.board.height - tier.radius;
  const ceiling = world.config.board.y + tier.radius;
  if (ball.x < left) {
    ball.x = left;
    ball.vx = Math.abs(ball.vx) * 0.28;
  } else if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx) * 0.28;
  }
  if (ball.y > floor) {
    ball.y = floor;
    ball.vy = -Math.abs(ball.vy) * 0.12;
    if (Math.abs(ball.vy) < 18) ball.vy = 0;
    ball.vx *= 0.9;
  }
  if (ball.y < ceiling) {
    ball.y = ceiling;
    ball.vy = Math.max(0, ball.vy);
  }
}

function resolveBallCollisions(world: MergeDropWorld): void {
  for (let iteration = 0; iteration < 4; iteration++) {
    for (let i = 0; i < world.balls.length; i++) {
      const a = world.balls[i]!;
      const ra = world.config.tiers[a.tier]!.radius;
      for (let j = i + 1; j < world.balls.length; j++) {
        const b = world.balls[j]!;
        const rb = world.config.tiers[b.tier]!.radius;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = ra + rb;
        if (distance >= minDistance) continue;
        if (distance < 0.001) {
          dx = 0.01;
          dy = 0;
          distance = 0.01;
        }
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const massA = ra * ra;
        const massB = rb * rb;
        const totalMass = massA + massB;
        a.x -= nx * overlap * (massB / totalMass);
        a.y -= ny * overlap * (massB / totalMass);
        b.x += nx * overlap * (massA / totalMass);
        b.y += ny * overlap * (massA / totalMass);

        const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relativeVelocity < 0) {
          const impulse = (-(1 + 0.16) * relativeVelocity) / (1 / massA + 1 / massB);
          a.vx -= (impulse * nx) / massA;
          a.vy -= (impulse * ny) / massA;
          b.vx += (impulse * nx) / massB;
          b.vy += (impulse * ny) / massB;
        }
        resolveBounds(world, a);
        resolveBounds(world, b);
      }
    }
  }
}

function completeMergeDropMission(world: MergeDropWorld, tier = world.best_tier): void {
  if (world.target_reached || world.game_over) return;
  world.target_reached = true;
  const rewardCurrency = world.mission_reward_claimed ? 0 : (world.run_rules.reward_currency ?? 0);
  const rewardEssence = world.mission_reward_claimed ? 0 : (world.run_rules.reward_essence ?? 0);
  world.currency += rewardCurrency;
  world.essence += rewardEssence;
  world.mission_reward_claimed = true;
  world.events.push({
    type: 'mission_complete',
    mission_id: world.run_rules.id,
    reward_currency: rewardCurrency,
    reward_essence: rewardEssence,
  });
  world.events.push({ type: 'target_reached', tier });
}

function resolveMissionAfterMerge(world: MergeDropWorld, tier: number, points: number): void {
  if (world.run_rules.mode === 'boss' && world.boss_hp > 0) {
    const damage = Math.max(1, Math.round(points * 0.72 + tier * 11 + world.combo * 4));
    world.boss_hp = Math.max(0, world.boss_hp - damage);
    const ratio = world.boss_max_hp > 0 ? world.boss_hp / world.boss_max_hp : 0;
    world.boss_phase = ratio <= 0.3 ? 3 : ratio <= 0.66 ? 2 : 1;
    world.events.push({
      type: 'boss_hit',
      boss_id: world.run_rules.boss_id ?? 'void_leviathan',
      damage,
      hp: world.boss_hp,
      max_hp: world.boss_max_hp,
      phase: world.boss_phase,
    });
    if (world.boss_hp <= 0) completeMergeDropMission(world, tier);
    return;
  }
  if (world.run_rules.mode === 'score' && world.score >= (world.run_rules.target_score ?? 1200)) {
    completeMergeDropMission(world, tier);
    return;
  }
  if (world.run_rules.mode === 'nexus' && tier >= (world.run_rules.target_tier ?? world.config.tiers.length - 1)) {
    if (tier === world.config.tiers.length - 1) {
      world.nexus_completions += 1;
      world.currency += 200;
    }
    completeMergeDropMission(world, tier);
  }
}

function mergeBallPair(world: MergeDropWorld, a: MergeDropBall, b: MergeDropBall, force = false): MergeDropBall | null {
  if (a.tier !== b.tier || a.tier >= world.config.tiers.length - 1) return null;
  const radius = world.config.tiers[a.tier]!.radius;
  if (!force && Math.hypot(b.x - a.x, b.y - a.y) > radius * 2.08) return null;
  const nextTier = a.tier + 1;
  const next = world.config.tiers[nextTier]!;
  const mods = mergeDropModifiers(world);
  const auroraBoost = world.aurora_ms > 0 ? 2 : 1;
  const points = Math.round(
    next.score
    * (1 + Math.min(world.combo, 8) * 0.12)
    * (1 + mods.score_bonus_pct / 100)
    * auroraBoost
    * Math.max(1, world.next_merge_multiplier),
  );
  const eclats = Math.max(
    1,
    Math.floor(Math.max(1, Math.floor(points / 35)) * (1 + mods.eclat_bonus_pct / 100)),
  );
  world.next_merge_multiplier = 1;
  const merged: MergeDropBall = {
    id: world.next_ball_id++,
    tier: nextTier,
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    vx: (a.vx + b.vx) * 0.42,
    vy: Math.min(-72, (a.vy + b.vy) * 0.25),
    born_at_ms: world.elapsed_ms,
  };
  const removed = new Set([a.id, b.id]);
  world.balls = world.balls.filter((ball) => !removed.has(ball.id));
  world.balls.push(merged);
  world.combo = world.combo_window_ms > 0 ? world.combo + 1 : 1;
  world.combo_window_ms = 1050 + mods.cascade_window_ms;
  if (world.aurora_ms > 0) world.combo_window_ms = Math.max(world.combo_window_ms, 1600);
  if (world.combo >= 3 && mods.slow_on_cascade_ms > 0) {
    world.slow_motion_ms = Math.max(world.slow_motion_ms, mods.slow_on_cascade_ms);
  }
  world.score += points;
  world.currency += eclats;
  world.ability_charge = Math.min(200, world.ability_charge + 11 + nextTier * 3 + mods.charge_merge_bonus);
  world.best_tier = Math.max(world.best_tier, nextTier);
  world.events.push({ type: 'merge', x: merged.x, y: merged.y, tier: nextTier, points, combo: world.combo });
  world.merges_since_companion += 1;
  procCompanionOnMerge(world);
  resolveMissionAfterMerge(world, nextTier, points);
  resolveBounds(world, merged);
  return merged;
}

function equippedCompanion(world: MergeDropWorld): { companion: MergeDropCompanion; level: number } | null {
  if (!world.equipped_companion) return null;
  const companion = world.config.companions.find((entry) => entry.id === world.equipped_companion);
  const level = world.companion_levels[world.equipped_companion];
  return companion && level ? { companion, level } : null;
}

function applyCompanionAction(world: MergeDropWorld, companion: MergeDropCompanion, level: number): void {
  const scale = itemLevelScale(level);
  let label = companion.name;
  if (companion.action === 'grant_eclats') {
    const amount = Math.round(companion.value * scale);
    world.currency += amount;
    label = `${companion.name} ✧ +${amount} éclats`;
  } else if (companion.action === 'grant_charge') {
    const amount = Math.round(companion.value * scale);
    world.ability_charge = Math.min(200, world.ability_charge + amount);
    label = `${companion.name} ✦ +${amount} charge`;
  } else if (companion.action === 'grant_score') {
    const amount = Math.round(companion.value * scale);
    world.score += amount;
    label = `${companion.name} ★ +${amount} score`;
  } else if (companion.action === 'reduce_overflow') {
    world.overflow_ms = Math.max(0, world.overflow_ms * (1 - Math.min(0.9, (companion.value * scale) / 100)));
    label = `${companion.name} — danger apaisé`;
  } else if (companion.action === 'promote_smallest') {
    const smallest = [...world.balls]
      .filter((ball) => ball.tier < world.config.tiers.length - 2)
      .sort((a, b) => a.tier - b.tier || b.y - a.y)[0];
    if (smallest) {
      smallest.tier += 1;
      resolveBounds(world, smallest);
      world.events.push({ type: 'dissolve', x: smallest.x, y: smallest.y, tier: smallest.tier });
    }
    label = `${companion.name} — un Astre s'élève`;
  } else if (companion.action === 'freeze_time') {
    world.slow_motion_ms = Math.max(world.slow_motion_ms, companion.value + (level - 1) * 1000);
    world.overflow_ms = 0;
    label = `${companion.name} hurle — le temps se fige`;
  }
  world.events.push({ type: 'companion_proc', companion_id: companion.id, label });
}

function procCompanionOnMerge(world: MergeDropWorld): void {
  const entry = equippedCompanion(world);
  if (!entry || entry.companion.trigger !== 'every_n_merges') return;
  let interval = Math.max(4, entry.companion.interval ?? 12);
  if (entry.companion.action === 'promote_smallest') {
    interval = Math.max(12, interval - (entry.level - 1) * 2);
  }
  if (world.merges_since_companion < interval) return;
  world.merges_since_companion = 0;
  applyCompanionAction(world, entry.companion, entry.level);
}

function mergeOverlaps(world: MergeDropWorld): void {
  for (let cascade = 0; cascade < 10; cascade++) {
    let merged = false;
    for (let i = 0; i < world.balls.length && !merged; i++) {
      const a = world.balls[i]!;
      for (let j = i + 1; j < world.balls.length; j++) {
        const b = world.balls[j]!;
        if (mergeBallPair(world, a, b)) {
          merged = true;
          break;
        }
      }
    }
    if (!merged) break;
    resolveBallCollisions(world);
  }
}

function updateOverflow(world: MergeDropWorld, dtMs: number): void {
  const risky = world.balls.some((ball) => {
    const tier = world.config.tiers[ball.tier]!;
    const oldEnough = world.elapsed_ms - ball.born_at_ms > 900;
    return oldEnough && ball.y - tier.radius < world.config.board.loss_line_y && Math.abs(ball.vy) < 90;
  });
  world.overflow_ms = risky ? world.overflow_ms + dtMs : Math.max(0, world.overflow_ms - dtMs * 1.8);
  const grace = (world.config.overflow_grace_ms + mergeDropModifiers(world).overflow_grace_ms)
    * (world.run_rules.overflow_grace_multiplier ?? 1);
  if (!world.game_over && !world.companion_rescue_used && world.overflow_ms >= grace * 0.85) {
    const entry = equippedCompanion(world);
    if (entry && entry.companion.trigger === 'overflow_rescue') {
      world.companion_rescue_used = true;
      applyCompanionAction(world, entry.companion, entry.level);
    }
  }
  if (!world.game_over && world.overflow_ms >= grace) {
    world.game_over = true;
    world.events.push({ type: 'game_over' });
  }
}

const FIXED_STEP_MS = 8;

function triggerBossAttack(world: MergeDropWorld): void {
  const bossId = world.run_rules.boss_id ?? 'void_leviathan';
  const roll = Math.floor(random(world) * 3);
  const attack = roll === 0 ? 'gravity_surge' : roll === 1 ? 'void_seed' : 'star_break';
  if (attack === 'gravity_surge') {
    for (const ball of world.balls) {
      ball.vx += (random(world) - 0.5) * (260 + world.boss_phase * 80);
      ball.vy -= 90 + world.boss_phase * 35;
    }
  } else if (attack === 'void_seed') {
    const tier = Math.min(world.boss_phase - 1, Math.max(0, world.config.tiers.length - 3));
    const radius = world.config.tiers[tier]!.radius;
    const x = world.config.board.x + radius + random(world) * (world.config.board.width - radius * 2);
    world.balls.push({
      id: world.next_ball_id++,
      tier,
      x,
      y: world.config.board.y + radius + 8,
      vx: (random(world) - 0.5) * 110,
      vy: 80,
      born_at_ms: world.elapsed_ms,
    });
  } else {
    world.current_tier = 0;
    world.next_tier = Math.min(1, world.config.tiers.length - 1);
    world.overflow_ms += 100 + world.boss_phase * 80;
  }
  world.events.push({ type: 'boss_attack', boss_id: bossId, attack });
}

function advanceMergeDropWorld(world: MergeDropWorld, dtMs: number): void {
  world.elapsed_ms += dtMs;
  world.drop_cooldown_ms = Math.max(0, world.drop_cooldown_ms - dtMs);
  world.combo_window_ms = Math.max(0, world.combo_window_ms - dtMs);
  if (world.combo_window_ms === 0) world.combo = 0;
  world.slow_motion_ms = Math.max(0, world.slow_motion_ms - dtMs);
  world.aurora_ms = Math.max(0, world.aurora_ms - dtMs);
  if (world.summon_result) {
    world.summon_result.remaining_ms -= dtMs;
    if (world.summon_result.remaining_ms <= 0) world.summon_result = undefined;
  }
  if (world.summon_batch) {
    world.summon_batch.remaining_ms -= dtMs;
    if (world.summon_batch.remaining_ms <= 0) world.summon_batch = undefined;
  }
  if (world.game_over || world.target_reached) return;

  if ((world.run_rules.time_limit_ms ?? 0) > 0) {
    world.mission_time_remaining_ms = Math.max(0, world.mission_time_remaining_ms - dtMs);
    if (world.mission_time_remaining_ms === 0) {
      if (world.run_rules.mode === 'survival') completeMergeDropMission(world);
      else {
        world.game_over = true;
        world.events.push({ type: 'game_over' });
      }
      return;
    }
  }

  if (world.run_rules.mode === 'boss') {
    world.boss_attack_ms -= dtMs;
    if (world.boss_attack_ms <= 0) {
      triggerBossAttack(world);
      const phaseAcceleration = 1 - (world.boss_phase - 1) * 0.17;
      world.boss_attack_ms = Math.max(2400, (world.run_rules.hazard_interval_ms ?? 9000) * phaseAcceleration);
    }
  }

  const dt = dtMs / 1000;
  const gravityScale = (world.slow_motion_ms > 0 ? 0.34 : 1) * (world.run_rules.gravity_multiplier ?? 1);
  for (const ball of world.balls) {
    ball.vy += world.config.gravity * gravityScale * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= Math.pow(0.997, dt * 60);
    resolveBounds(world, ball);
  }
  resolveBallCollisions(world);
  mergeOverlaps(world);
  if (!world.target_reached) updateOverflow(world, dtMs);
}

export function stepMergeDropWorld(world: MergeDropWorld, dtMs: number): void {
  const clamped = Math.max(0, Math.min(dtMs, 50));
  world.physics_accumulator_ms += clamped;
  while (world.physics_accumulator_ms >= FIXED_STEP_MS) {
    advanceMergeDropWorld(world, FIXED_STEP_MS);
    world.physics_accumulator_ms -= FIXED_STEP_MS;
  }
}

export function selectMergeDropHero(world: MergeDropWorld, heroId: string): boolean {
  if (!world.unlocked_hero_ids.includes(heroId)) return false;
  if (!world.config.heroes.some((hero) => hero.id === heroId)) return false;
  world.selected_hero_id = heroId;
  return true;
}

export function mergeDropHeroLevel(world: MergeDropWorld, heroId: string): number {
  const level = world.hero_levels[heroId];
  return typeof level === 'number' && Number.isFinite(level)
    ? Math.max(0, Math.min(world.config.awaken_max_level, Math.floor(level)))
    : 0;
}

export function activateMergeDropAbility(world: MergeDropWorld): boolean {
  if (world.game_over || world.target_reached || world.ability_charge < 100) return false;
  const hero = world.config.heroes.find((entry) => entry.id === world.selected_hero_id);
  if (!hero) return false;
  const centerX = world.config.board.x + world.config.board.width / 2;
  const level = mergeDropHeroLevel(world, hero.id);
  const overdrive = world.ability_charge >= 200;
  const powerLevel = level + (overdrive ? 2 : 0);
  const potency = (1 + powerLevel * 0.2) * (overdrive ? 1.35 : 1);

  if (hero.ability === 'gravity_well') {
    for (const ball of world.balls) {
      ball.vx += (centerX - ball.x) * 2.8 * potency;
      ball.vy += 330 * potency;
    }
  } else if (hero.ability === 'forge_next') {
    world.forge_next = true;
    world.forge_boost = powerLevel >= 3 ? 2 : 1;
  } else if (hero.ability === 'time_bloom') {
    world.slow_motion_ms = 6000 + powerLevel * 1500;
    const topmost = [...world.balls].sort((a, b) => a.y - b.y)[0];
    if (topmost) {
      topmost.y = Math.min(topmost.y + 96, world.config.board.y + world.config.board.height - world.config.tiers[topmost.tier]!.radius);
      topmost.vy = 80;
    }
    world.overflow_ms = 0;
  } else if (hero.ability === 'supernova') {
    const pairsPerTier = 1 + Math.floor(powerLevel / 2);
    for (let tier = 0; tier < world.config.tiers.length - 1; tier++) {
      for (let pass = 0; pass < pairsPerTier; pass++) {
        const pair = world.balls.filter((ball) => ball.tier === tier).slice(0, 2);
        if (pair.length < 2 || !mergeBallPair(world, pair[0]!, pair[1]!, true)) break;
      }
    }
  } else if (hero.ability === 'starfall') {
    const lowestTier = world.balls.reduce((min, ball) => Math.min(min, ball.tier), Number.POSITIVE_INFINITY);
    if (Number.isFinite(lowestTier)) {
      const targets = world.balls.filter((ball) => ball.tier === lowestTier).slice(0, 3 + powerLevel);
      const removed = new Set(targets.map((ball) => ball.id));
      world.balls = world.balls.filter((ball) => !removed.has(ball.id));
      for (const ball of targets) {
        const points = Math.max(1, Math.round(world.config.tiers[ball.tier]!.score * 0.5 * potency));
        world.score += points;
        world.currency += Math.max(1, Math.floor(points / 6));
        world.events.push({ type: 'dissolve', x: ball.x, y: ball.y, tier: ball.tier });
      }
      world.overflow_ms = Math.max(0, world.overflow_ms * 0.4);
    }
  } else if (hero.ability === 'ascension') {
    const promotable = [...world.balls]
      .filter((ball) => ball.tier < world.config.tiers.length - 2)
      .sort((a, b) => a.tier - b.tier || b.y - a.y)
      .slice(0, 2 + Math.floor(powerLevel / 2));
    for (const ball of promotable) {
      ball.tier += 1;
      world.score += Math.round(world.config.tiers[ball.tier]!.score * 0.25);
      world.events.push({ type: 'dissolve', x: ball.x, y: ball.y, tier: ball.tier });
      resolveBounds(world, ball);
    }
  } else if (hero.ability === 'aegis') {
    world.overflow_ms = 0;
    world.slow_motion_ms = Math.max(world.slow_motion_ms, 2000 + powerLevel * 600);
    for (const ball of world.balls) {
      ball.vy += 300 * potency;
      ball.vx *= 0.6;
    }
  } else if (hero.ability === 'constellation') {
    for (let wave = 0; wave < 2 + powerLevel; wave++) {
      let mergedAny = false;
      for (let tier = 0; tier < world.config.tiers.length - 1; tier++) {
        for (;;) {
          const pair = world.balls.filter((ball) => ball.tier === tier).slice(0, 2);
          if (pair.length < 2 || !mergeBallPair(world, pair[0]!, pair[1]!, true)) break;
          mergedAny = true;
        }
      }
      if (!mergedAny) break;
    }
  } else if (hero.ability === 'echo_merge') {
    world.next_merge_multiplier = 3 + Math.floor(powerLevel / 2);
  } else if (hero.ability === 'shatter_top') {
    const targets = [...world.balls].sort((a, b) => a.y - b.y).slice(0, powerLevel >= 3 ? 2 : 1);
    const removed = new Set(targets.map((ball) => ball.id));
    world.balls = world.balls.filter((ball) => !removed.has(ball.id));
    for (const ball of targets) {
      const points = Math.max(1, Math.round(world.config.tiers[ball.tier]!.score * 0.8 * potency));
      world.score += points;
      world.currency += Math.max(1, Math.floor(points / 8));
      world.events.push({ type: 'dissolve', x: ball.x, y: ball.y, tier: ball.tier });
    }
    world.overflow_ms = Math.max(0, world.overflow_ms * 0.3);
  } else if (hero.ability === 'void_swap') {
    const cap = world.config.tiers.length - 2;
    world.current_tier = Math.min(cap, world.current_tier + 1);
    world.next_tier = Math.min(cap, world.next_tier + 1);
    if (powerLevel >= 3) world.current_tier = Math.min(cap, world.current_tier + 1);
  } else if (hero.ability === 'aurora') {
    world.aurora_ms = 8000 + powerLevel * 1000;
  }

  world.ability_charge = 0;
  world.events.push({ type: 'ability', hero_id: hero.id, ability: hero.ability, overdrive, potency });
  return true;
}

function rarityRoll(world: MergeDropWorld): MergeDropRarity {
  if (world.pity + 1 >= world.config.pity_after) return 'SSR';
  const roll = random(world);
  const ssr = world.config.summon_rates.SSR;
  const sr = world.config.summon_rates.SR;
  return roll < ssr ? 'SSR' : roll < ssr + sr ? 'SR' : 'R';
}

function performSummon(
  world: MergeDropWorld,
  minRarity?: 'SR',
  options: MergeDropSummonOptions = {},
): MergeDropSummonOutcome | null {
  let rarity = rarityRoll(world);
  if (minRarity === 'SR' && rarity === 'R') rarity = 'SR';
  world.pity = rarity === 'SSR' ? 0 : world.pity + 1;
  const candidates = world.config.heroes.filter((hero) => hero.rarity === rarity);
  let pool = candidates.length ? candidates : world.config.heroes;
  const featuredHero = rarity === 'SSR' && options.featured_hero_id
    ? world.config.heroes.find((hero) => hero.id === options.featured_hero_id && hero.rarity === 'SSR')
    : undefined;
  let featured = false;
  let hero: MergeDropHero | undefined;
  if (featuredHero) {
    featured = world.featured_guaranteed || random(world) < 0.5;
    if (featured) {
      hero = featuredHero;
      world.featured_guaranteed = false;
    } else {
      const offBanner = pool.filter((candidate) => candidate.id !== featuredHero.id);
      pool = offBanner.length ? offBanner : pool;
      hero = pool[Math.floor(random(world) * pool.length)];
      world.featured_guaranteed = true;
    }
  } else {
    hero = pool[Math.floor(random(world) * pool.length)] ?? world.config.heroes[0];
  }
  if (!hero) return null;
  const duplicate = world.unlocked_hero_ids.includes(hero.id);
  const essenceGained = duplicate ? world.config.duplicate_essence[rarity] : 0;
  if (duplicate) {
    world.essence += essenceGained;
    // Évolution : chaque doublon accorde une étoile (jusqu'au maximum), qui débloque les compétences.
    const stars = mergeDropHeroStars(world, hero.id);
    if (stars < world.config.evolution_max_stars) {
      world.hero_stars[hero.id] = stars + 1;
      world.events.push({ type: 'evolution', hero_id: hero.id, stars: stars + 1 });
    }
  } else {
    world.unlocked_hero_ids.push(hero.id);
    world.selected_hero_id = hero.id;
  }
  const outcome: MergeDropSummonOutcome = {
    hero_id: hero.id,
    rarity,
    duplicate,
    essence_gained: essenceGained,
    stars: mergeDropHeroStars(world, hero.id),
    featured,
  };
  world.events.push({ type: 'summon', hero_id: hero.id, rarity, duplicate, essence_gained: essenceGained });
  return outcome;
}

// Les invocations se font au Sanctuaire (hub), hors de la run : seule la monnaie les limite.
export function summonMergeDropHero(
  world: MergeDropWorld,
  options: MergeDropSummonOptions = {},
): MergeDropWorld['summon_result'] | null {
  if (world.currency < world.config.summon_cost) return null;
  world.currency -= world.config.summon_cost;
  const outcome = performSummon(world, undefined, options);
  if (!outcome) return null;
  world.summon_batch = undefined;
  world.summon_result = { ...outcome, remaining_ms: 2600 };
  return world.summon_result;
}

export function summonMergeDropHeroTen(
  world: MergeDropWorld,
  options: MergeDropSummonOptions = {},
): MergeDropWorld['summon_batch'] | null {
  if (world.currency < world.config.summon10_cost) return null;
  world.currency -= world.config.summon10_cost;
  const results: MergeDropSummonOutcome[] = [];
  for (let pull = 0; pull < 9; pull++) {
    const outcome = performSummon(world, undefined, options);
    if (outcome) results.push(outcome);
  }
  // Garantie x10 : au moins un tirage SR ou mieux dans la salve.
  const hasSrPlus = results.some((entry) => entry.rarity !== 'R');
  const last = performSummon(world, hasSrPlus ? undefined : 'SR', options);
  if (last) results.push(last);
  world.summon_result = undefined;
  world.summon_batch = { results, remaining_ms: 4200 };
  return world.summon_batch;
}

function relicRarityRoll(world: MergeDropWorld): MergeDropRarity {
  if (world.relic_pity + 1 >= world.config.pity_after) return 'SSR';
  const roll = random(world);
  const ssr = world.config.summon_rates.SSR;
  const sr = world.config.summon_rates.SR;
  return roll < ssr ? 'SSR' : roll < ssr + sr ? 'SR' : 'R';
}

function performRelicSummon(world: MergeDropWorld, minRarity?: 'SR'): MergeDropRelicOutcome | null {
  let rarity = relicRarityRoll(world);
  if (minRarity === 'SR' && rarity === 'R') rarity = 'SR';
  world.relic_pity = rarity === 'SSR' ? 0 : world.relic_pity + 1;
  const pool: Array<{ id: string; kind: 'relic' | 'companion' }> = [
    ...world.config.relics.filter((item) => item.rarity === rarity).map((item) => ({ id: item.id, kind: 'relic' as const })),
    ...world.config.companions.filter((item) => item.rarity === rarity).map((item) => ({ id: item.id, kind: 'companion' as const })),
  ];
  const fallbackPool: Array<{ id: string; kind: 'relic' | 'companion' }> = pool.length
    ? pool
    : [
        ...world.config.relics.map((item) => ({ id: item.id, kind: 'relic' as const })),
        ...world.config.companions.map((item) => ({ id: item.id, kind: 'companion' as const })),
      ];
  const picked = fallbackPool[Math.floor(random(world) * fallbackPool.length)];
  if (!picked) return null;
  const levels = picked.kind === 'relic' ? world.relic_levels : world.companion_levels;
  const current = levels[picked.id] ?? 0;
  const duplicate = current > 0;
  let essenceGained = 0;
  if (current === 0) {
    levels[picked.id] = 1;
    if (picked.kind === 'relic' && !world.equipped_relic) world.equipped_relic = picked.id;
    if (picked.kind === 'companion' && !world.equipped_companion) world.equipped_companion = picked.id;
  } else if (current < world.config.item_max_level) {
    levels[picked.id] = current + 1;
  } else {
    essenceGained = world.config.duplicate_essence[rarity];
    world.essence += essenceGained;
  }
  const outcome: MergeDropRelicOutcome = {
    item_id: picked.id,
    kind: picked.kind,
    rarity,
    duplicate,
    level: levels[picked.id] ?? current,
    essence_gained: essenceGained,
  };
  world.events.push({ type: 'relic_summon', ...outcome });
  return outcome;
}

export function summonMergeDropRelic(world: MergeDropWorld): MergeDropRelicOutcome | null {
  if (world.currency < world.config.relic_summon_cost) return null;
  world.currency -= world.config.relic_summon_cost;
  return performRelicSummon(world);
}

export function summonMergeDropRelicTen(world: MergeDropWorld): MergeDropRelicOutcome[] | null {
  if (world.currency < world.config.relic_summon10_cost) return null;
  world.currency -= world.config.relic_summon10_cost;
  const results: MergeDropRelicOutcome[] = [];
  for (let pull = 0; pull < 9; pull++) {
    const outcome = performRelicSummon(world);
    if (outcome) results.push(outcome);
  }
  const hasSrPlus = results.some((entry) => entry.rarity !== 'R');
  const last = performRelicSummon(world, hasSrPlus ? undefined : 'SR');
  if (last) results.push(last);
  return results;
}

export function equipMergeDropRelic(world: MergeDropWorld, relicId: string): boolean {
  if (!world.relic_levels[relicId] || !world.config.relics.some((item) => item.id === relicId)) return false;
  world.equipped_relic = relicId;
  return true;
}

export function equipMergeDropCompanion(world: MergeDropWorld, companionId: string): boolean {
  if (!world.companion_levels[companionId] || !world.config.companions.some((item) => item.id === companionId)) return false;
  world.equipped_companion = companionId;
  return true;
}

export function mergeDropAwakenCost(world: MergeDropWorld, heroId: string): number | null {
  const level = mergeDropHeroLevel(world, heroId);
  if (level >= world.config.awaken_max_level) return null;
  return world.config.awaken_base_cost + level * world.config.awaken_cost_step;
}

export function awakenMergeDropHero(world: MergeDropWorld, heroId: string): boolean {
  if (!world.unlocked_hero_ids.includes(heroId)) return false;
  if (!world.config.heroes.some((hero) => hero.id === heroId)) return false;
  const cost = mergeDropAwakenCost(world, heroId);
  if (cost === null || world.essence < cost) return false;
  world.essence -= cost;
  const level = mergeDropHeroLevel(world, heroId) + 1;
  world.hero_levels[heroId] = level;
  world.events.push({ type: 'awaken', hero_id: heroId, level });
  return true;
}

export function drainMergeDropEvents(world: MergeDropWorld): MergeDropEvent[] {
  return world.events.splice(0, world.events.length);
}
