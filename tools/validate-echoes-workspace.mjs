import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = resolve(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm');

const requiredFiles = [
  'README.md',
  '01_inputs/references/reference-index.json',
  '02_design/specs/style-guide.json',
  '02_design/specs/asset-factory-blueprint.md',
  '02_design/specs/asset-factory-tooling.json',
  '02_design/specs/game-construction-stack.md',
  '02_design/specs/interactive-systems-blueprint.md',
  '02_design/specs/game-operating-model.md',
  '02_design/specs/next-gen-master-plan.md',
  '02_design/specs/design-strata.json',
  '02_design/specs/wireframe-blueprint.json',
  '02_design/specs/camera-language.json',
  '02_design/specs/menu-architecture.json',
  '02_design/specs/story-architecture.json',
  '02_design/specs/game-feel-stack.json',
  '02_design/specs/audio-architecture.json',
  '02_design/specs/vfx-hd-stack.json',
  '02_design/specs/dimension-strategy.json',
  '02_design/prompts/asset-prompts.json',
  '02_design/prompts/agent-playbooks.json',
  '03_assets/registry/cast.json',
  '03_assets/registry/animation-specs.json',
  '03_assets/registry/asset-production-plan.json',
  '03_assets/registry/asset-cutting-qa.json',
  '03_assets/registry/asset-taxonomy.json',
  '03_assets/registry/model-routing.json',
  '03_assets/registry/studio-asset-catalog.json',
  '03_assets/characters/hero__the-echo-main-hero/01_source/source.snapshot.json',
  '03_assets/characters/hero__the-echo-main-hero/02_cutouts/alpha_mask.png',
  '03_assets/characters/hero__the-echo-main-hero/03_cleanup/cutout_clean.png',
  '03_assets/characters/hero__the-echo-main-hero/04_rig/hero_rig_spec.json',
  '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_atlas.png',
  '03_assets/characters/hero__the-echo-main-hero/06_exports/runtime_animation_manifest.json',
  '03_assets/characters/hero__the-echo-main-hero/07_qa/cutout_qa.json',
  '03_assets/characters/hero__the-echo-main-hero/08_remote_jobs/production.workorder.json',
  '03_assets/characters/npc__myla-guide/08_remote_jobs/production.workorder.json',
  '03_assets/characters/boss__root-guardian-boss/08_remote_jobs/production.workorder.json',
  '03_assets/environments/environment__origin-tree-level-kit/01_source/source.snapshot.json',
  '03_assets/environments/environment__origin-tree-level-kit/02_cutouts/playfield_crop.png',
  '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_far.png',
  '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/parallax_mid.png',
  '03_assets/environments/environment__origin-tree-level-kit/03_cleanup/foreground_glow.png',
  '03_assets/environments/environment__origin-tree-level-kit/06_exports/tileset_reference_strip.png',
  '03_assets/environments/environment__origin-tree-level-kit/06_exports/dynamic_elements_strip.png',
  '03_assets/environments/environment__origin-tree-level-kit/06_exports/collision_guide.png',
  '03_assets/environments/environment__origin-tree-level-kit/06_exports/environment_runtime_manifest.json',
  '03_assets/environments/environment__origin-tree-level-kit/07_qa/environment_qa.json',
  '03_assets/environments/environment__origin-tree-level-kit/08_remote_jobs/production.workorder.json',
  '03_assets/characters/enemy__sporeling-family/README.md',
  '03_assets/characters/enemy__sporeling-family/pipeline.contract.json',
  '03_assets/characters/enemy__sporeling-family/01_source/source.snapshot.json',
  '03_assets/characters/enemy__sporeling-family/04_rig/enemy_family_motion_matrix.json',
  '03_assets/characters/enemy__sporeling-family/05_animation/enemy_family_attack_patterns.json',
  '03_assets/characters/enemy__sporeling-family/06_exports/enemy_runtime_manifest.json',
  '03_assets/characters/enemy__sporeling-family/07_qa/enemy_family_qa.json',
  '03_assets/characters/enemy__sporeling-family/08_remote_jobs/production.workorder.json',
  '03_assets/characters/boss__root-guardian-boss/01_source/source.snapshot.json',
  '03_assets/characters/boss__root-guardian-boss/04_rig/boss_rig_spec.json',
  '03_assets/characters/boss__root-guardian-boss/05_animation/boss_phase_motion_pack.json',
  '03_assets/characters/boss__root-guardian-boss/06_exports/boss_runtime_manifest.json',
  '03_assets/characters/boss__root-guardian-boss/07_qa/boss_pack_qa.json',
  '03_assets/props/prop__weapon-altar-and-checkpoints/README.md',
  '03_assets/props/prop__weapon-altar-and-checkpoints/pipeline.contract.json',
  '03_assets/props/prop__weapon-altar-and-checkpoints/08_remote_jobs/production.workorder.json',
  '03_assets/ui/ui__menu-hud-shell/README.md',
  '03_assets/ui/ui__menu-hud-shell/pipeline.contract.json',
  '03_assets/ui/ui__menu-hud-shell/08_remote_jobs/production.workorder.json',
  '03_assets/audio/audio__origin-tree-sound-pack/README.md',
  '03_assets/audio/audio__origin-tree-sound-pack/pipeline.contract.json',
  '03_assets/audio/audio__origin-tree-sound-pack/08_remote_jobs/production.workorder.json',
  '03_assets/fx/fx__spore-combat-pack/README.md',
  '03_assets/fx/fx__spore-combat-pack/pipeline.contract.json',
  '03_assets/fx/fx__spore-combat-pack/08_remote_jobs/production.workorder.json',
  '04_scenes/level_01/layout.json',
  '04_scenes/level_01/encounters.json',
  '04_scenes/level_01/scene-assembly.json',
  '04_scenes/level_01/wireframe-map.json',
  '04_scenes/level_01/asset-bindings.json',
  '05_runtime/gdl/echoes.preview.gdl.json',
  '05_runtime/config/runtime-systems.json',
  '05_runtime/config/mobile-presets.json',
  '05_runtime/config/menu-config.json',
  '05_runtime/config/story-graph.json',
  '05_runtime/config/audio-banks.json',
  '05_runtime/config/fx-presets.json',
  '05_runtime/config/canonical-data-contracts.json',
  '05_runtime/config/durable-workflows.json',
  '05_runtime/config/addable-elements-catalog.json',
  '05_runtime/config/trigger-library.json',
  '05_runtime/config/asset-call-graph.json',
  '05_runtime/config/world-composition.json',
  '05_runtime/config/progression-economy.json',
  '05_runtime/config/save-profile.schema.json',
  '05_runtime/config/accessibility-presets.json',
  '05_runtime/config/localization-plan.json',
  '05_runtime/config/quest-graph.json',
  '05_runtime/config/world-state-machine.json',
  '05_runtime/config/build-targets.json',
  '05_runtime/config/telemetry-plan.json',
  '05_runtime/config/level-01-runtime-bundle.json',
  '04_scenes/level_01/interaction-schema.json',
  '03_assets/registry/level-01-assembly-pack.json',
  '03_assets/environments/level_01/first_level_environment_manifest.json',
  '06_qa/checklists/production-gates.json',
  '07_exports/web/preview-manifest.json',
  '07_exports/web/preview.html',
  '07_exports/web/preview.css',
  '07_exports/web/preview.js',
  '07_exports/web/construction-map.manifest.json',
  '07_exports/web/construction-map.html',
  '07_exports/web/construction-map.css',
  '07_exports/web/construction-map.js',
  '07_exports/web/systems-board.manifest.json',
  '07_exports/web/systems-board.html',
  '07_exports/web/systems-board.css',
  '07_exports/web/systems-board.js',
  '07_exports/web/operating-model.manifest.json',
  '07_exports/web/operating-model.html',
  '07_exports/web/operating-model.css',
  '07_exports/web/operating-model.js',
  '07_exports/web/production-hq.manifest.json',
  '07_exports/web/production-hq.html',
  '07_exports/web/production-hq.css',
  '07_exports/web/production-hq.js',
  '08_ops/manifests/echoes-workspace.json',
  '08_ops/manifests/agent-capabilities.json',
  '08_ops/manifests/agent-handoffs.json',
  '08_ops/manifests/construction-stack.json',
  '08_ops/manifests/construction-graph.json',
  '08_ops/manifests/systems-board.json',
  '08_ops/manifests/game-operating-model.json',
  '08_ops/manifests/agent-work-orders.json',
  '08_ops/manifests/production-hq.json',
  '08_ops/manifests/master-execution-plan.json',
  '08_ops/manifests/modularity-audit.json',
];

async function assertFile(relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  await access(absolutePath);
  return absolutePath;
}

const report = {
  workspaceRoot,
  checkedFiles: [],
  references: {
    copiedCount: 0,
    missingWorkspaceTargets: [],
  },
  gdl: {
    title: null,
    sceneId: null,
    backgroundImage: null,
    playerSprite: null,
  },
};

for (const file of requiredFiles) {
  const absolutePath = await assertFile(file);
  report.checkedFiles.push(absolutePath);
}

const referenceIndex = JSON.parse(
  await readFile(resolve(workspaceRoot, '01_inputs/references/reference-index.json'), 'utf8'),
);

report.references.copiedCount = referenceIndex.copied_references.length;

for (const reference of referenceIndex.copied_references) {
  const relativeWorkspaceFile = reference.workspace_file;
  try {
    await assertFile(relativeWorkspaceFile);
  } catch {
    report.references.missingWorkspaceTargets.push(relativeWorkspaceFile);
  }
}

const previewGdl = JSON.parse(
  await readFile(resolve(workspaceRoot, '05_runtime/gdl/echoes.preview.gdl.json'), 'utf8'),
);

report.gdl.title = previewGdl.meta?.title ?? null;
report.gdl.sceneId = previewGdl.scenes?.[0]?.id ?? null;
report.gdl.backgroundImage = previewGdl.scenes?.[0]?.background?.image ?? null;
report.gdl.playerSprite = previewGdl.entities?.find((entity) => entity.id === 'player')?.assets?.sprite ?? null;

console.log(JSON.stringify(report, null, 2));
