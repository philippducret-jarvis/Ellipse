import { describe, it, expect } from 'vitest';
import { derivePreset } from '../catalog/game-types.js';
import { generateGameCodeProject, generateSystemScaffold, SYSTEM_KNOWLEDGE } from './codegen.js';

describe('code-gen autonome par type de jeu', () => {
  it('génère un projet complet (GDL + scaffolds + brief + manifest) pour un souls-like', () => {
    const preset = derivePreset({ game_type: 'souls_like_2d', mechanic_modules: ['parry_dodge'] });
    const proj = generateGameCodeProject(preset);
    const paths = proj.files.map((f) => f.path);
    expect(paths).toContain('game.gdl.json');
    expect(paths).toContain('DEV_BRIEF.md');
    expect(paths).toContain('project.manifest.json');
    // un scaffold par système planifié (non implémenté)
    expect(proj.planned_systems).toContain('stamina_combat');
    expect(paths).toContain('systems/stamina_combat.ts');
  });

  it('le scaffold a la bonne signature runtime + savoir-faire', () => {
    const src = generateSystemScaffold('gacha_summon');
    expect(src).toContain("from '@ellipse/engine'");
    expect(src).toContain('export function update_gacha_summon(world: SimWorld, dtMs: number');
    expect(src).toContain('Optimisation:');
    expect(SYSTEM_KNOWLEDGE.gacha_summon).toBeTruthy();
  });

  it('le GDL généré est du JSON valide et jouable', () => {
    const proj = generateGameCodeProject(derivePreset({ game_type: 'survivors_like' }));
    const gdlFile = proj.files.find((f) => f.path === 'game.gdl.json')!;
    const gdl = JSON.parse(gdlFile.content);
    expect(gdl.entities.find((e: { id: string }) => e.id === 'player')).toBeTruthy();
    expect(gdl.scenes[0].layout.goal).toBeTruthy();
  });

  it('le brief explique créer/modifier/optimiser', () => {
    const proj = generateGameCodeProject(derivePreset({ game_type: 'gacha_rpg' }));
    const brief = proj.files.find((f) => f.path === 'DEV_BRIEF.md')!.content;
    expect(brief).toContain('Créer');
    expect(brief).toContain('Optimiser');
    expect(brief).toContain('@ellipse/engine');
  });
});
