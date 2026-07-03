import type { GameDefinition } from '../index.js';
import { gdlPreviewPrefixFromSlug } from '../gdl/gdl-paths.js';
import { derivePreset, getGameType, type ArtStyle, type DifficultyBand, type GameDimension } from '../catalog/game-types.js';
import { buildStarterGdl } from '../catalog/starter-game.js';

export interface BootstrapGdlInput {
  title: string;
  slug: string;
  genre?: string | null;
  dimension?: '2d' | '2.5d' | '3d';
  mechanics?: string[];
  heroSpriteUrl?: string | null;
  sourceImages?: string[];
  prompt?: string;
}

const SURVIVORS_GENRES = new Set([
  'survivors_like',
  'survivors',
  'roguelite',
  'bullet_heaven',
  'auto_battler',
]);

function isSurvivorsProfile(genre?: string | null, mechanics: string[] = []): boolean {
  const g = (genre ?? '').toLowerCase();
  if (SURVIVORS_GENRES.has(g)) return true;
  const m = mechanics.map((x) => x.toLowerCase());
  return m.some((x) => x.includes('lane') || x.includes('wave') || x.includes('survivor') || x.includes('blessing'));
}

const GENRE_ALIASES: Record<string, string> = {
  rpg: 'action_rpg',
  action: 'platformer',
  adventure: 'topdown_adventure',
  aventure: 'topdown_adventure',
  topdown: 'topdown_adventure',
  top_down: 'topdown_adventure',
  souls: 'souls_like_2d',
  soulslike: 'souls_like_2d',
  'souls-like': 'souls_like_2d',
  gacha: 'gacha_rpg',
  gatcha: 'gacha_rpg',
  survivors: 'survivors_like',
  survivor: 'survivors_like',
  roguelite: 'survivors_like',
  bullet_heaven: 'survivors_like',
};

function normalizeGameType(genre?: string | null, mechanics: string[] = []): string {
  const g = (genre ?? '').toLowerCase().trim();
  if (g && getGameType(g)) return g;
  if (g && GENRE_ALIASES[g]) return GENRE_ALIASES[g]!;
  if (isSurvivorsProfile(g, mechanics)) return 'survivors_like';
  if (mechanics.some((m) => m.toLowerCase().includes('gacha'))) return 'gacha_rpg';
  if (mechanics.some((m) => m.toLowerCase().includes('parry'))) return 'souls_like_2d';
  return 'platformer';
}

function mechanicModules(mechanics: string[]): string[] {
  const out = new Set<string>();
  for (const raw of mechanics) {
    const m = raw.toLowerCase();
    if (m.includes('gacha')) out.add('gacha_summon');
    if (m.includes('summon') || m.includes('escouade') || m.includes('squad')) out.add('summon_squad');
    if (m.includes('parry') || m.includes('dodge') || m.includes('esquive')) out.add('parry_dodge');
    if (m.includes('loot') || m.includes('rarity') || m.includes('rarete')) out.add('loot_rarity');
    if (m.includes('skill') || m.includes('ascension') || m.includes('progression')) out.add('skill_tree');
    if (m.includes('wave') || m.includes('vague') || m.includes('survival')) out.add('wave_survival');
  }
  return [...out];
}

function artStyleFor(input: BootstrapGdlInput, gameType: string): ArtStyle | undefined {
  const haystack = `${input.prompt ?? ''} ${(input.mechanics ?? []).join(' ')} ${input.genre ?? ''}`.toLowerCase();
  if (haystack.includes('dark') || haystack.includes('souls') || haystack.includes('elden')) return 'dark_fantasy';
  if (haystack.includes('anime') || gameType === 'gacha_rpg') return 'anime';
  if (haystack.includes('pixel') || haystack.includes('secret of mana')) return 'pixel';
  if (haystack.includes('paint') || haystack.includes('painterly')) return 'painterly';
  return undefined;
}

function difficultyFor(input: BootstrapGdlInput, gameType: string): DifficultyBand | undefined {
  const haystack = `${input.prompt ?? ''} ${(input.mechanics ?? []).join(' ')} ${input.genre ?? ''}`.toLowerCase();
  if (gameType === 'souls_like_2d' || haystack.includes('souls') || haystack.includes('elden')) return 'souls';
  if (haystack.includes('hardcore') || haystack.includes('difficile')) return 'hardcore';
  if (haystack.includes('casual') || haystack.includes('facile')) return 'casual';
  return undefined;
}

/** GDL minimal jouable pour survivors portrait (parité playtest synthétique). */
export function createSurvivorsBootstrapGdl(input: BootstrapGdlInput): GameDefinition {
  const sceneId = `${gdlPreviewPrefixFromSlug(input.slug)}_arena_01`;
  const heroUrl = input.heroSpriteUrl ?? input.sourceImages?.[0] ?? null;
  return {
    meta: {
      title: input.title,
      dimension: '2d',
      genre: 'survivors_like',
      resolution: [720, 1280],
      version: '0.1.0',
      orientation: 'portrait',
      hazard_scripts: {
        [sceneId]: {
          telegraph_duration_ms: 800,
          active_duration_ms: 400,
          cooldown_ms: 4000,
          pick_lane: 'random',
          damage_on_active: 1,
        },
      },
    },
    style: {
      mood: 'dark_fantasy',
      palette: ['#07060a', '#c9a227', '#5a3a72'],
    },
    systems: [
      'input',
      'physics_topdown',
      'lane_runner',
      'wave_spawner',
      'auto_attack',
      'blessing_draft',
      'hazard_scheduler',
      'boss_phases',
      'camera_follow',
      'ui',
    ],
    entities: [
      {
        id: 'player',
        type: 'character',
        assets: heroUrl ? { sprite: heroUrl } : undefined,
        components: [
          { transform: { x: 360, y: 900 } },
          { health: { max: 10, current: 10 } },
        ],
      },
    ],
    scenes: [
      {
        id: sceneId,
        entities: ['player'],
        background: { color: '#120f18' },
        layout: {
          width: 720,
          height: 1280,
          ground_y: 1200,
          spawn: { x: 360, y: 900 },
          platforms: [],
          collectibles: [],
          lane_meta: {
            lanes: [
              { id: 'lane_left', center_x: 180 },
              { id: 'lane_center', center_x: 360 },
              { id: 'lane_right', center_x: 540 },
            ],
          },
        },
        veloria: {
          encounters: {
            total_waves: 6,
            blessing_breaks_after_waves: [2, 4],
            waves: [
              { wave: 1, enemies: [{ type: 'shade', lane: 'lane_center', count: 2 }] },
              { wave: 2, enemies: [{ type: 'shade', lane: 'lane_left', count: 2 }] },
              { wave: 3, enemies: [{ type: 'shade', lane: 'lane_right', count: 2 }] },
              { wave: 4, enemies: [{ type: 'elite', lane: 'lane_center', count: 1 }] },
              { wave: 5, enemies: [{ type: 'shade', lane: 'lane_center', count: 3 }] },
              {
                wave: 6,
                boss: { type: 'cathedral_warden', phase_count: 2, spawn_lane: 'lane_center' },
              },
            ],
          },
          blessings: [
            { id: 'sacred_edge', label: 'Tranchant sacré' },
            { id: 'divine_grace', label: 'Grâce divine' },
            { id: 'ember_contract', label: 'Contrat de braise' },
          ],
        },
      },
    ],
    ui: { hud: { show_health: true, show_wave: true, draft_keys: ['1', '2', '3'] } },
  };
}

/** Crée un GDL de départ HD 2D depuis l'intent du projet (sans LLM). */
export function createBootstrapGdl(input: BootstrapGdlInput): GameDefinition {
  const mechanics = input.mechanics ?? [];
  const gameType = normalizeGameType(input.genre, mechanics);
  const dimension: GameDimension = input.dimension === '3d' ? '2d' : input.dimension ?? '2d';
  const preset = derivePreset({
    game_type: gameType,
    dimension,
    art_style: artStyleFor(input, gameType),
    difficulty: difficultyFor(input, gameType),
    mechanic_modules: mechanicModules(mechanics),
    platforms: ['web'],
  });

  return buildStarterGdl(preset, {
    title: input.title,
    heroSprite: input.heroSpriteUrl ?? input.sourceImages?.[0] ?? undefined,
    prompt: input.prompt,
  });
}
