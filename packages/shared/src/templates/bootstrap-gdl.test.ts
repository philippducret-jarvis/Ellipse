import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '../index.js';
import { createBootstrapGdl, createSurvivorsBootstrapGdl } from './bootstrap-gdl.js';
import { gdlPreviewFileName, gdlPreviewPrefixFromSlug } from '../gdl/gdl-paths.js';

describe('gdl-paths', () => {
  it('derive le prefixe depuis le slug', () => {
    expect(gdlPreviewPrefixFromSlug('veloria-veille-des-lames')).toBe('veloria');
    expect(gdlPreviewFileName('my-cool-game')).toBe('my.preview.gdl.json');
  });
});

describe('createBootstrapGdl', () => {
  it('cree un platformer jouable', () => {
    const gdl = createBootstrapGdl({
      title: 'Test Platformer',
      slug: 'test-platformer',
      genre: 'platformer',
      dimension: '2d',
    });
    const parsed = GameDefinitionSchema.parse(gdl);
    expect(parsed.entities.some((e) => e.id === 'player')).toBe(true);
    expect(parsed.systems).toContain('physics_platformer');
  });

  it('cree un survivors portrait avec veloria block', () => {
    const gdl = createSurvivorsBootstrapGdl({
      title: 'Survivors Test',
      slug: 'survivors-test',
      genre: 'survivors_like',
    });
    const parsed = GameDefinitionSchema.parse(gdl);
    expect(parsed.systems).toContain('lane_runner');
    const scene = parsed.scenes[0] as { veloria?: { encounters?: unknown } };
    expect(scene.veloria?.encounters).toBeTruthy();
    expect(parsed.meta.resolution).toEqual([720, 1280]);
  });

  it('route les prompts gacha vers un prototype lane + meta banner', () => {
    const gdl = createBootstrapGdl({
      title: 'Gacha Test',
      slug: 'gacha-test',
      genre: 'gacha_rpg',
      dimension: '2.5d',
      mechanics: ['gacha_summon', 'summon_squad', 'skill_tree'],
      prompt: 'dark fantasy gatcha 2,5D avec invocation',
    });
    expect(gdl.systems).toContain('lane_runner');
    expect(gdl.meta.dimension).toBe('2.5d');
    expect((gdl.meta as Record<string, unknown>).summon_banner).toBeTruthy();
  });

  it('route dark fantasy / Elden Ring vers un board souls-like 2D', () => {
    const gdl = createBootstrapGdl({
      title: 'Ash Test',
      slug: 'ash-test',
      genre: 'souls_like_2d',
      dimension: '2.5d',
      mechanics: ['parry_dodge', 'loot_rarity'],
      prompt: 'dark fantasy inspire Elden Ring',
    });
    expect(gdl.systems).toContain('physics_platformer');
    expect(gdl.meta.genre).toBe('souls_like_2d');
    expect(gdl.scenes[0]!.layout!.enemies?.some((e) => (e as { isBoss?: boolean }).isBoss)).toBe(true);
  });

  it('force 2d si dimension 3d demandee sans GPU mais garde un GDL jouable', () => {
    const gdl = createBootstrapGdl({
      title: 'No GPU',
      slug: 'no-gpu',
      genre: 'platformer',
      dimension: '3d',
    });
    expect(gdl.meta.dimension).toBe('2d');
    expect(gdl.entities.some((e) => e.id === 'player')).toBe(true);
    expect(gdl.scenes[0]!.layout?.goal).toBeTruthy();
  });
});
