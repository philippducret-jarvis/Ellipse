import type { GameDefinition } from '../index.js';
import { gdlPreviewPrefixFromSlug } from '../gdl/gdl-paths.js';
import { getGameplayTemplate } from './gameplay-templates.js';
import { applyMechanics, mergeGameplayTemplate } from '../gdl/mechanics.js';
import { createEmptyGDL } from './platformer.js';

export interface BootstrapGdlInput {
  title: string;
  slug: string;
  genre?: string | null;
  dimension?: '2d' | '2.5d' | '3d';
  mechanics?: string[];
  heroSpriteUrl?: string | null;
  sourceImages?: string[];
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
  if (input.dimension === '3d') {
    const base = createEmptyGDL(input.title, '2d');
    base.meta = { ...base.meta, title: input.title, dimension: '2d' };
    return base;
  }

  if (isSurvivorsProfile(input.genre, input.mechanics ?? [])) {
    return createSurvivorsBootstrapGdl(input);
  }

  const genreKey = (input.genre ?? 'platformer').toLowerCase();
  const template = getGameplayTemplate(genreKey);
  const empty = createEmptyGDL(input.title, '2d');
  empty.meta = { ...empty.meta, title: input.title };

  let gdl = mergeGameplayTemplate(empty, template, input.mechanics ?? []);
  gdl = applyMechanics(gdl, input.mechanics ?? []);

  const heroUrl = input.heroSpriteUrl ?? input.sourceImages?.[0];
  if (heroUrl) {
    const player = gdl.entities.find((e) => e.id === 'player');
    if (player) {
      player.assets = { ...((player.assets as object) ?? {}), sprite: heroUrl };
    }
  }

  if (gdl.style == null) {
    gdl.style = { mood: 'arcade', palette: ['#1a1a2e', '#e94560', '#16213e'] };
  }

  return gdl;
}
