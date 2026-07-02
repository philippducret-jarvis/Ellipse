import { join } from 'node:path';
import { gdlPathForWorkspace } from './preview.mjs';

export function buildSeedFilePlan({
  project,
  workspace,
  copiedRefs,
  assetPrompts,
  animationSpecs,
  layout,
  encounterPlan,
  previewGdl,
  mobilePerfProfile,
  styleGuide,
  technicalPipelineMd,
  levelNotesMd,
  previewChecklistMd,
  previewFiles,
}) {
  return [
    {
      path: join(workspace.rootDir, 'README.md'),
      content: `# ${project.title}

Workspace de production pour le jeu.

## Structure
- \`01_inputs\`: references, prompts source, boards visuels
- \`02_design\`: direction, specs, prompts d'assets, pipeline
- \`03_assets\`: registres de cast, cibles de rendu, animations
- \`04_scenes\`: layouts, encounters, notes de niveau
- \`05_runtime\`: preview GDL et donnees de runtime
- \`06_qa\`: checklists de validation
- \`07_exports\`: manifests de preview/export
- \`08_ops\`: orchestration, memoire projet, manifests ops

## Fichiers cles
- Preview GDL: \`05_runtime/gdl/echoes.preview.gdl.json\`
- Layout niveau: \`04_scenes/level_01/layout.json\`
- References: \`01_inputs/references/reference-index.json\`
- Prompts assets: \`02_design/prompts/asset-prompts.json\`

## Cible
Reproduire un rendu dark fantasy 2D HD proche des boards fournis, avec pipeline modulaire et lisible sur mobile.
`,
    },
    {
      path: join(workspace.rootDir, '01_inputs', 'references', 'reference-index.json'),
      content: JSON.stringify({ project: project.title, copied_references: copiedRefs }, null, 2),
    },
    {
      path: join(workspace.rootDir, '02_design', 'specs', 'style-guide.json'),
      content: JSON.stringify(styleGuide, null, 2),
    },
    {
      path: join(workspace.rootDir, '02_design', 'specs', 'technical-pipeline.md'),
      content: technicalPipelineMd,
    },
    {
      path: join(workspace.rootDir, '02_design', 'prompts', 'asset-prompts.json'),
      content: JSON.stringify(assetPrompts, null, 2),
    },
    {
      path: join(workspace.rootDir, '03_assets', 'registry', 'cast.json'),
      content: JSON.stringify({
        hero: 'The Echo',
        allies: ['Myla'],
        bosses: ['Root Guardian', 'The Cardinal'],
        enemies: ['Sporeling', 'Rampore', 'Porteur Sporeal', 'Chevalier Fongique', 'Moussu Furieux'],
      }, null, 2),
    },
    {
      path: join(workspace.rootDir, '03_assets', 'registry', 'render-targets.json'),
      content: JSON.stringify({
        hero: ['hd_sprite_sheet', 'idle_motion_pack'],
        enemies: ['hd_sprite_sheet', 'combat_pose_pack'],
        environment: ['background_board', 'tileset_modular', 'prop_pack'],
      }, null, 2),
    },
    {
      path: join(workspace.rootDir, '03_assets', 'registry', 'animation-specs.json'),
      content: JSON.stringify(animationSpecs, null, 2),
    },
    {
      path: join(workspace.rootDir, '04_scenes', 'level_01', 'layout.json'),
      content: JSON.stringify(layout, null, 2),
    },
    {
      path: join(workspace.rootDir, '04_scenes', 'level_01', 'notes.md'),
      content: levelNotesMd,
    },
    {
      path: join(workspace.rootDir, '04_scenes', 'level_01', 'encounters.json'),
      content: JSON.stringify(encounterPlan, null, 2),
    },
    {
      path: join(workspace.rootDir, '05_runtime', 'gdl', 'echoes.preview.gdl.json'),
      content: JSON.stringify(previewGdl, null, 2),
    },
    {
      path: join(workspace.rootDir, '06_qa', 'checklists', 'echoes-preview.md'),
      content: previewChecklistMd,
    },
    {
      path: join(workspace.rootDir, '06_qa', 'checklists', 'mobile-performance.json'),
      content: JSON.stringify(mobilePerfProfile, null, 2),
    },
    {
      path: join(workspace.rootDir, '07_exports', 'web', 'preview-manifest.json'),
      content: JSON.stringify({
        title: project.title,
        gdl: gdlPathForWorkspace(project.slug, '05_runtime/gdl/echoes.preview.gdl.json'),
        keyart: gdlPathForWorkspace(project.slug, '01_inputs/references/menu_keyart.jpeg'),
        hero: gdlPathForWorkspace(project.slug, '01_inputs/references/hero_echo_front.png'),
      }, null, 2),
    },
    {
      path: join(workspace.rootDir, '07_exports', 'web', 'preview.html'),
      content: previewFiles.html,
    },
    {
      path: join(workspace.rootDir, '07_exports', 'web', 'preview.css'),
      content: previewFiles.css,
    },
    {
      path: join(workspace.rootDir, '07_exports', 'web', 'preview.js'),
      content: previewFiles.js,
    },
    {
      path: join(workspace.rootDir, '08_ops', 'manifests', 'echoes-workspace.json'),
      content: JSON.stringify({
        project,
        workspace,
        preview_gdl: gdlPathForWorkspace(project.slug, '05_runtime/gdl/echoes.preview.gdl.json'),
        copied_reference_count: copiedRefs.length,
      }, null, 2),
    },
  ];
}
