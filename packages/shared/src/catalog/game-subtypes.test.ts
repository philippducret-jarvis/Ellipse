import { describe, expect, it } from 'vitest';
import { derivePreset, GAME_TYPES } from './game-types.js';
import {
  buildCatalogCreationProcedures,
  buildGameCreationProcedure,
  inferGameSubtype,
  listGameSubtypes,
} from './game-subtypes.js';

describe('game subtypes and procedures', () => {
  it('liste des sous-types pour les familles clefs', () => {
    expect(listGameSubtypes('gacha_rpg').length).toBeGreaterThanOrEqual(2);
    expect(listGameSubtypes('souls_like_2d').map((s) => s.id)).toContain('souls_boss_gate');
    expect(listGameSubtypes('action_rpg').map((s) => s.id)).toContain('action_rpg_mana_adventure');
  });

  it('infere le sous-type depuis le prompt', () => {
    const gacha = inferGameSubtype({
      game_type: 'gacha_rpg',
      prompt: 'gatcha portrait dark fantasy avec banner pity et lane combat',
    });
    expect(gacha.id).toBe('gacha_lane_action');

    const mana = inferGameSubtype({
      game_type: 'action_rpg',
      prompt: 'inspire Secret of Mana avec reliques et exploration',
    });
    expect(mana.id).toBe('action_rpg_mana_adventure');
  });

  it('produit une procedure avec bibliotheques et work orders', () => {
    const preset = derivePreset({
      game_type: 'gacha_rpg',
      dimension: '2.5d',
      mechanic_modules: ['gacha_summon', 'skill_tree'],
    });
    const procedure = buildGameCreationProcedure({ preset, prompt: 'gacha lane banner' });
    expect(procedure.type_chain).toEqual(['rpg', 'gacha_rpg', 'gacha_lane_action']);
    expect(procedure.libraries.asset_families).toContain('heroes_roster');
    expect(procedure.libraries.object_blueprints).toContain('obj_banner');
    expect(procedure.libraries.room_templates).toContain('rm_node_map');
    expect(procedure.libraries.event_hooks).toContain('on_pull_resolved');
    expect(procedure.libraries.animation_clips).toContain('cast_or_summon');
    expect(procedure.libraries.ui_surfaces).toContain('summon_banner');
    expect(procedure.libraries.audio_cues).toContain('ssr_reveal');
    expect(procedure.steps.map((s) => s.id)).toContain('05_animation_and_models');
    expect(procedure.backlog_templates.some((w) => w.id === 'system:gacha_summon')).toBe(true);
    expect(procedure.backlog_templates.some((w) => w.id === 'object:obj_banner')).toBe(true);
    expect(procedure.backlog_templates.some((w) => w.id === 'event:on_pull_resolved')).toBe(true);
  });

  it('couvre tous les types de jeux avec des bibliotheques procedurales completes', () => {
    const procedures = buildCatalogCreationProcedures();
    expect(procedures).toHaveLength(GAME_TYPES.length);
    expect(new Set(procedures.map((p) => p.game_type)).size).toBe(GAME_TYPES.length);

    for (const procedure of procedures) {
      expect(procedure.libraries.asset_families.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.object_blueprints.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.room_templates.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.event_hooks.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.animation_clips.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.environment_kits.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.ui_surfaces.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.audio_cues.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.content_units.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.libraries.qa_gates.length, procedure.game_type).toBeGreaterThan(0);
      expect(procedure.steps).toHaveLength(8);
      expect(procedure.backlog_templates.some((w) => w.domain === 'object_blueprint'), procedure.game_type).toBe(true);
      expect(procedure.backlog_templates.some((w) => w.domain === 'room'), procedure.game_type).toBe(true);
      expect(procedure.backlog_templates.some((w) => w.domain === 'event_graph'), procedure.game_type).toBe(true);
      expect(procedure.backlog_templates.some((w) => w.domain === 'ui'), procedure.game_type).toBe(true);
      expect(procedure.backlog_templates.some((w) => w.domain === 'audio'), procedure.game_type).toBe(true);
    }
  });
});
