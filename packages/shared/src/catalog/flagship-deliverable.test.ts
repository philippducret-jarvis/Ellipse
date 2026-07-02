import { describe, it, expect } from 'vitest';
import { FLAGSHIP_GAME, FLAGSHIP_PATHS, isFlagshipProject, flagshipPreviewUrl } from './flagship-deliverable.js';

describe('flagship-deliverable — Veloria', () => {
  it('identifie Veloria comme jeu livrable', () => {
    expect(FLAGSHIP_GAME.slug).toBe('veloria-veille-des-lames');
    expect(FLAGSHIP_GAME.genre).toBe('survivors_like');
  });

  it('isFlagshipProject reconnaît id et slug', () => {
    expect(isFlagshipProject(FLAGSHIP_GAME.id)).toBe(true);
    expect(isFlagshipProject(FLAGSHIP_GAME.slug)).toBe(true);
    expect(isFlagshipProject('other-game')).toBe(false);
  });

  it('expose les URLs preview et manifest', () => {
    expect(FLAGSHIP_PATHS.previewUrl).toContain('veloria-veille-des-lames');
    expect(FLAGSHIP_PATHS.gdlUrl).toContain('veloria.preview.gdl.json');
    expect(flagshipPreviewUrl(4400)).toBe(
      'http://localhost:4400/workspaces/veloria-veille-des-lames/07_exports/web/preview.html',
    );
  });
});
