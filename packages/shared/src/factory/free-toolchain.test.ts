import { describe, expect, it } from 'vitest';
import {
  buildFactoryToolchainPlan,
  getFreeFactoryTool,
  inferToolIdsForPreset,
  listFreeFactoryTools,
} from './free-toolchain.js';
import { derivePreset } from '../catalog/game-types.js';

describe('free factory toolchain', () => {
  it('exposes the critical free tools needed by the factory', () => {
    const ids = listFreeFactoryTools().map((tool) => tool.id);
    expect(ids).toContain('sam2');
    expect(ids).toContain('birefnet');
    expect(ids).toContain('comfyui');
    expect(ids).toContain('tiled');
    expect(ids).toContain('ldtk');
    expect(ids).toContain('playfab');
    expect(ids).toContain('store_compliance');
  });

  it('plans gacha/liveops connectors and compliance', () => {
    const plan = buildFactoryToolchainPlan({
      game_type: 'gacha_rpg',
      dimension: '2.5d',
      mechanic_modules: ['gacha_summon', 'skill_tree'],
      platforms: ['web', 'mobile'],
    });

    expect(plan.required_tools.map((tool) => tool.id)).toContain('playfab');
    expect(plan.required_tools.map((tool) => tool.id)).toContain('store_compliance');
    expect(plan.required_tools.map((tool) => tool.id)).toContain('comfyui');
    expect(plan.winget_install_ids).toContain('Tiled.Tiled');
    expect(plan.winget_install_ids).toContain('deepnight.LDtk');
    expect(plan.env_to_configure).toContain('PLAYFAB_TITLE_ID');
    expect(plan.agent_bindings.economy).toContain('playfab');
    expect(plan.qa_gates).toContain('randomized item odds disclosure generated before export');
  });

  it('plans Echoes-like action adventure tools for boards, maps and 2.5D', () => {
    const preset = derivePreset({ game_type: 'souls_like_2d', dimension: '2.5d' });
    const ids = inferToolIdsForPreset(preset);

    expect(ids).toContain('sam2');
    expect(ids).toContain('birefnet');
    expect(ids).toContain('tiled');
    expect(ids).toContain('ldtk');
    expect(ids).toContain('blender');
    expect(ids).toContain('godot');
  });

  it('keeps Spine out of the free-required stack', () => {
    expect(getFreeFactoryTool('spine')).toBeUndefined();
  });
});
