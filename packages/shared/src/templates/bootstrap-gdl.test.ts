import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '../index.js';
import { createBootstrapGdl, createSurvivorsBootstrapGdl } from './bootstrap-gdl.js';
import { gdlPreviewFileName, gdlPreviewPrefixFromSlug } from '../gdl/gdl-paths.js';

describe('gdl-paths', () => {
  it('dérive le préfixe depuis le slug', () => {
    expect(gdlPreviewPrefixFromSlug('veloria-veille-des-lames')).toBe('veloria');
    expect(gdlPreviewFileName('my-cool-game')).toBe('my.preview.gdl.json');
  });
});

describe('createBootstrapGdl', () => {
  it('crée un platformer jouable', () => {
    const gdl = createBootstrapGdl({
      title: 'Test Platformer',
      slug: 'test-platformer',
      genre: 'platformer',
      dimension: '2d',
    });
    const parsed = GameDefinitionSchema.parse(gdl);
    expect(parsed.entities.some((e) => e.id === 'player')).toBe(true);
    expect(parsed.systems).toContain('platformer_physics');
  });

  it('crée un survivors portrait avec veloria block', () => {
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

  it('force 2d si dimension 3d demandée sans GPU', () => {
    const gdl = createBootstrapGdl({
      title: 'No GPU',
      slug: 'no-gpu',
      genre: 'platformer',
      dimension: '3d',
    });
    expect(gdl.meta.dimension).toBe('2d');
  });
});
