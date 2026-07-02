import { describe, expect, it } from 'vitest';
import {
  ASSET_FAMILIES,
  getFamilyForRole,
  resolveAssetFolder,
  validateRoleKindPair,
} from './taxonomy.js';
import { ASSET_PIPELINE_STAGES, STAGES_BY_GROUP } from './pipeline-stages.js';

describe('asset taxonomy', () => {
  it('définit 11 familles disjointes', () => {
    expect(ASSET_FAMILIES).toHaveLength(11);
    const ids = ASSET_FAMILIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(11);
  });

  it('sépare hero, enemy et boss', () => {
    expect(getFamilyForRole('hero')?.id).toBe('heroes');
    expect(getFamilyForRole('enemy')?.id).toBe('enemies');
    expect(getFamilyForRole('boss')?.id).toBe('bosses');
    expect(getFamilyForRole('npc')?.id).toBe('companions_and_allies');
  });

  it('résout le chemin dossier par rôle', () => {
    expect(resolveAssetFolder('hero', 'the-echo')).toBe('03_assets/characters/hero__the-echo');
    expect(resolveAssetFolder('boss', 'root-guardian')).toBe('03_assets/characters/boss__root-guardian');
    expect(resolveAssetFolder('tileset', 'forest-floor')).toContain('environments/');
  });

  it('valide paires role/kind', () => {
    expect(validateRoleKindPair('hero', 'character')).toBe(true);
    expect(validateRoleKindPair('hero', 'tileset')).toBe(false);
    expect(validateRoleKindPair('music', 'music')).toBe(true);
  });
});

describe('asset pipeline stages', () => {
  it('définit 8 stages en chaîne', () => {
    expect(ASSET_PIPELINE_STAGES).toHaveLength(8);
    expect(ASSET_PIPELINE_STAGES[0]!.dependsOn).toBeNull();
    expect(ASSET_PIPELINE_STAGES[1]!.dependsOn).toBe('01_source');
  });

  it('characters exigent rig et animation', () => {
    const stages = STAGES_BY_GROUP.characters;
    expect(stages).toContain('04_rig');
    expect(stages).toContain('05_animation');
  });
});
