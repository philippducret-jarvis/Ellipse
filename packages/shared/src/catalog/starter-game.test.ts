import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '../index.js';
import { derivePreset } from './game-types.js';
import { buildStarterGdl } from './starter-game.js';

describe('buildStarterGdl - preset to playable GDL', () => {
  it.each([
    'platformer',
    'topdown_adventure',
    'souls_like_2d',
    'gacha_rpg',
    'survivors_like',
    'falling_block',
    'visual_novel',
    'merge_drop_gacha',
  ])('produit un GDL valide pour %s', (gameType) => {
    const gdl = buildStarterGdl(derivePreset({ game_type: gameType }));
    expect(() => GameDefinitionSchema.parse(gdl)).not.toThrow();
    expect(gdl.entities.find((e) => e.id === 'player')).toBeTruthy();
    expect(gdl.scenes[0]!.layout).toBeTruthy();
    expect(gdl.scenes[0]!.layout!.goal).toBeTruthy();
  });

  it('top-down utilise la physique top-down sans sol bloquant plein ecran', () => {
    const gdl = buildStarterGdl(derivePreset({ game_type: 'topdown_adventure' }));
    expect(gdl.systems).toContain('physics_topdown');
    const physics = gdl.entities[0]!.components.find((c) => c.physics)?.physics;
    expect(physics?.gravity).toBe(0);
    const fullGround = gdl.scenes[0]!.layout!.platforms.some(
      (p) => p.x === 0 && p.y === 0 && p.w === 1280 && p.h === 720,
    );
    expect(fullGround).toBe(false);
  });

  it('genre lateral active la physique platformer', () => {
    const gdl = buildStarterGdl(derivePreset({ game_type: 'platformer' }));
    expect(gdl.systems).toContain('physics_platformer');
  });

  it('la difficulte souls reduit la sante et conserve intention en meta', () => {
    const preset = derivePreset({ game_type: 'souls_like_2d', mechanic_modules: ['parry_dodge'] });
    const gdl = buildStarterGdl(preset);
    const hp = gdl.entities[0]!.components.find((c) => c.health)?.health;
    expect(hp?.max).toBe(1);
    const meta = gdl.meta as Record<string, unknown>;
    expect((meta.declared_systems as string[])).toContain('stamina_combat');
    expect((meta.mechanic_modules as string[])).toContain('parry_dodge');
    expect(gdl.scenes[0]!.layout!.enemies?.some((e) => (e as { isBoss?: boolean }).isBoss)).toBe(true);
  });

  it('gacha RPG produit un runtime lane jouable avec board et banner', () => {
    const preset = derivePreset({
      game_type: 'gacha_rpg',
      dimension: '2.5d',
      art_style: 'dark_fantasy',
      mechanic_modules: ['gacha_summon', 'summon_squad', 'skill_tree'],
    });
    const gdl = buildStarterGdl(preset, { title: 'Nocturne Banner', prompt: 'dark fantasy gacha' });
    expect(gdl.systems).toContain('lane_runner');
    expect(gdl.systems).toContain('blessing_draft');
    expect(gdl.meta.dimension).toBe('2.5d');
    expect((gdl.meta as Record<string, unknown>).summon_banner).toBeTruthy();
    expect((gdl.meta as Record<string, unknown>).prototype_board).toBeTruthy();
    const contract = (gdl.meta as Record<string, unknown>).production_contract as {
      subtype?: { id: string };
      type_chain?: string[];
      asset_roadmap?: { required_families?: { family: string }[] };
      gameplay_plan?: { systems_to_build?: string[] };
      animation_plan?: { model_targets?: string[] };
      object_blueprint_plan?: { required_blueprints?: string[] };
      room_plan?: { templates?: string[] };
      event_graph_plan?: { hooks?: string[] };
      ui_audio_plan?: { ui_surfaces?: string[]; audio_cues?: string[] };
      missing_elements?: { id: string }[];
      qa_gates?: string[];
      procedural_chain?: { id: string }[];
      work_order_templates?: { id: string }[];
    };
    expect(contract.subtype?.id).toBe('gacha_lane_action');
    expect(contract.type_chain).toEqual(['rpg', 'gacha_rpg', 'gacha_lane_action']);
    expect(contract.asset_roadmap?.required_families?.some((a) => a.family === 'heroes_roster')).toBe(true);
    expect(contract.gameplay_plan?.systems_to_build).toContain('gacha_summon');
    expect(contract.animation_plan?.model_targets).toContain('billboard_depth_variant');
    expect(contract.object_blueprint_plan?.required_blueprints).toContain('obj_banner');
    expect(contract.room_plan?.templates).toContain('rm_node_map');
    expect(contract.event_graph_plan?.hooks).toContain('on_pull_resolved');
    expect(contract.ui_audio_plan?.ui_surfaces).toContain('summon_banner');
    expect(contract.ui_audio_plan?.audio_cues).toContain('ssr_reveal');
    expect(contract.missing_elements?.some((m) => m.id === 'system:gacha_summon')).toBe(true);
    expect(contract.qa_gates?.length).toBeGreaterThan(0);
    expect(contract.procedural_chain?.some((step) => step.id === '03_board_to_world')).toBe(true);
    expect(contract.work_order_templates?.some((order) => order.id === 'animation:cast_or_summon')).toBe(true);
  });

  it('fusion de billes produit une boucle physique, roster et economie auditable', () => {
    const gdl = buildStarterGdl(derivePreset({ game_type: 'merge_drop_gacha', mechanic_modules: ['merge_drop'] }), {
      title: "Orbes d'Astra",
      prompt: 'billes a empiler qui fusionnent avec personnages gacha',
    });
    expect(gdl.systems).toContain('merge_drop_physics');
    expect(gdl.systems).toContain('hero_abilities');
    expect(gdl.meta.resolution).toEqual([720, 1280]);
    const meta = gdl.meta as Record<string, unknown>;
    const config = meta.merge_drop as {
      tiers?: Array<{ persona?: string }>;
      heroes?: Array<{ ability?: string }>;
      summon_rates?: Record<string, number>;
      summon10_cost?: number;
      relic_summon_cost?: number;
      evolution_max_stars?: number;
    };
    expect(config.tiers).toHaveLength(8);
    expect(config.tiers?.every((tier) => typeof tier.persona === 'string' && tier.persona.length > 0)).toBe(true);
    expect(config.heroes).toHaveLength(12);
    expect(new Set(config.heroes?.map((hero) => hero.ability)).size).toBe(12);
    expect(config.summon_rates?.SSR).toBe(0.05);
    expect(config.summon10_cost).toBe(900);
    expect(config.relic_summon_cost).toBe(80);
    expect(config.evolution_max_stars).toBe(5);
    expect(meta.economy_disclosure).toBeTruthy();
    expect((gdl.scenes[0] as Record<string, unknown>).playable_volume).toBeTruthy();
  });
});
