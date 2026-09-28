import { describe, expect, it } from 'vitest';
import { derivePreset } from '../catalog/game-types.js';
import { buildStarterGdl } from '../catalog/starter-game.js';
import { compileVisualBoardToPlayableSlice } from './visual-board-compiler.js';

describe('visual board compiler', () => {
  it('turns a dark fantasy 2.5D board intent into playable volume requirements', () => {
    const preset = derivePreset({
      game_type: 'souls_like_2d',
      dimension: '2.5d',
      art_style: 'dark_fantasy',
      mechanic_modules: ['parry_dodge'],
    });

    const slice = compileVisualBoardToPlayableSlice({
      preset,
      prompt: 'Elden ring inspired ashen forest board with boss gate',
      sourceImages: ['board.png'],
    });

    expect(slice.spatial_model.depth_mode).toBe('lane_perspective');
    expect(slice.volume_layers.map((layer) => layer.role)).toContain('playfield');
    expect(slice.critical_path.length).toBeGreaterThanOrEqual(3);
    expect(slice.asset_extraction_manifest.some((asset) => asset.id === 'playfield_collision_map')).toBe(true);
    expect(slice.commercial_gates.join(' ')).toContain('scene volume');
  });

  it('embeds the playable slice contract in starter GDLs', () => {
    const preset = derivePreset({
      game_type: 'souls_like_2d',
      dimension: '2.5d',
      art_style: 'dark_fantasy',
    });

    const gdl = buildStarterGdl(preset, {
      title: 'Ashen Gate',
      prompt: 'Elden ring inspired board with a cursed gate',
      boardImages: ['ashen-board.png'],
    });

    expect((gdl.meta as Record<string, unknown>).board_to_playable).toBeTruthy();
    expect((gdl.meta as Record<string, unknown>).first_playable_slice).toBeTruthy();
    expect(gdl.scenes[0]?.depth?.mode).toBe('lane_perspective');
    expect((gdl.scenes[0] as Record<string, unknown>).playable_volume).toBeTruthy();
    expect((gdl.scenes[0] as Record<string, unknown>).story_beats).toBeTruthy();
    expect((gdl.narrative as { quests?: unknown[] }).quests?.length).toBeGreaterThanOrEqual(2);
  });

  it('uses merge-specific story and commercial gates without platformer requirements', () => {
    const preset = derivePreset({
      game_type: 'merge_drop_gacha',
      art_style: 'anime',
      mechanic_modules: ['merge_drop'],
    });

    const slice = compileVisualBoardToPlayableSlice({
      preset,
      prompt: 'Empiler et fusionner des billes astrales avec des heros collectionnables',
      sourceImages: ['astral-board.png', 'keepers.png'],
    });

    expect(slice.story_beats.map((beat) => beat.trigger)).toEqual([
      'run_start',
      'first_merge_registered',
      'hero_ability_cast',
      'target_reached:nexus',
    ]);
    expect(slice.commercial_gates.join(' ')).toContain('physics gate');
    expect(slice.commercial_gates.join(' ')).not.toContain('exit direction');
    expect(slice.commercial_gates.join(' ')).not.toContain('one enemy');
  });
});
