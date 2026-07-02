import { describe, it, expect } from 'vitest';
import { buildProductionRecipe } from './production-recipe.js';

describe('recettes de production par type', () => {
  it('platformer : pipeline complet art→niveau→systèmes→qa avec gate traversabilité', () => {
    const r = buildProductionRecipe('platformer');
    const ids = r.stages.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['design', 'art', 'animation', 'level', 'systems', 'audio', 'assembly', 'qa']));
    expect(r.qa_gates).toContain('traversabilité (sauts faisables)');
  });

  it('visual_novel : narration présente, gate cohérence', () => {
    const r = buildProductionRecipe('visual_novel');
    expect(r.stages.find((s) => s.id === 'design')!.agents).toContain('narrative');
    expect(r.qa_gates).toContain('cohérence narrative (canon, embranchements)');
  });

  it('falling_block (tetris) : systèmes incluent falling_blocks, gate solvabilité', () => {
    const r = buildProductionRecipe('falling_block');
    const systems = r.stages.find((s) => s.id === 'systems')!.outputs;
    expect(systems).toContain('falling_blocks');
    expect(r.qa_gates).toContain('solvabilité (au moins une solution)');
  });

  it('souls : gate courbe de difficulté souls', () => {
    const r = buildProductionRecipe('souls_like_2d');
    expect(r.qa_gates.some((g) => g.includes('souls'))).toBe(true);
  });

  it('rejette un type inconnu', () => {
    expect(() => buildProductionRecipe('nope')).toThrow();
  });
});
