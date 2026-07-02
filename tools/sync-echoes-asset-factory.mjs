import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildAssetFactoryPlan } from '../packages/pipeline/dist/index.js';

const checkedAt = new Date().toISOString();
const workspaceRoot = resolve(process.cwd(), 'workspaces', 'echoes-of-the-mushroom-realm');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function assetDirForRecord(asset) {
  const slug = `${asset.role}__${slugify(asset.title)}`;
  if (asset.kind === 'environment') {
    return resolve(workspaceRoot, '03_assets', 'environments', slug);
  }
  return resolve(workspaceRoot, '03_assets', 'characters', slug);
}

function buildAssetFolderContract(recipe) {
  return {
    asset_id: recipe.assetId,
    asset_title: recipe.assetTitle,
    required_folders: [
      '01_source',
      '02_cutouts',
      '03_cleanup',
      '04_rig',
      '05_animation',
      '06_exports',
      '07_qa',
      '08_remote_jobs',
    ],
    target_outputs: recipe.targetOutputs,
    stages: recipe.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      outputs: stage.outputs,
      quality_gates: stage.qualityGates,
    })),
  };
}

function buildAssetReadme(asset, recipe) {
  return `# ${asset.title}

- Role: ${asset.role}
- Kind: ${asset.kind}
- Status: ${asset.status}
- Planned outputs: ${recipe.targetOutputs.join(', ')}

## References
${recipe.references.map((reference) => `- ${reference.role}: \`${reference.workspace_file}\``).join('\n')}

## Production folders
- \`01_source\`: locked references, prompt lineage, source snapshots
- \`02_cutouts\`: first-pass alpha masks and isolated renders
- \`03_cleanup\`: cleaned parts, repaired paint, final transparent assets
- \`04_rig\`: pivots, bones, cutout rig notes, deformation constraints
- \`05_animation\`: clips, timing notes, pose sheets, motion manifests
- \`06_exports\`: runtime atlases, metadata, preview-ready outputs
- \`07_qa\`: alpha QA, mobile readability notes, release blockers
- \`08_remote_jobs\`: remote GPU requests and result manifests

## Stage plan
${recipe.stages.map((stage) => `### ${stage.title}
- Objective: ${stage.objective}
- Agents: ${stage.agents.join(', ')}
- Tools: ${stage.preferredTools.join(', ')}
- Outputs: ${stage.outputs.join(', ')}
`).join('\n')}
`;
}

function buildBlueprintMarkdown(plan, references) {
  return `# Echoes asset factory blueprint

Checked on: ${checkedAt}

## Goal
Turn the supplied boards into clean production folders that an embedded AI can operate without guessing:
- isolate subjects cleanly
- split assets for runtime animation
- generate mobile-safe atlases and metadata
- keep optional heavy jobs remote when local hardware is weak

## Operating model
1. Lock references and prompts in the workspace.
2. Produce a first-pass cutout with a low-cost or high-quality segmentation path.
3. Clean and split parts until the asset is riggable or atlas-ready.
4. Generate runtime animation through a cutout rig or sprite-swap hybrid.
5. Export atlases and metadata.
6. Run alpha QA and mobile readability QA before promotion.

## Low-GPU execution policy
- Default local fallback: CPU cleanup helpers and lightweight packaging.
- Local GPU when available: segmentation, inpaint, upscale, motion assist.
- Remote GPU only for heavy image generation or image-to-3D proxy jobs.

## Official tooling baseline
${plan.knowledgeBase.tools.map((tool) => `- ${tool.name} [${tool.compute}] -> ${tool.sourceUrl}`).join('\n')}

## Canonical references for this workspace
${references.map((reference) => `- ${reference.role}: \`${reference.workspace_file}\``).join('\n')}

## Asset recipe summary
${plan.recipes.map((recipe) => `### ${recipe.assetTitle}
- Role: ${recipe.role}
- Kind: ${recipe.kind}
- References: ${recipe.references.map((reference) => reference.role).join(', ')}
- Outputs: ${recipe.targetOutputs.join(', ')}
- Stages: ${recipe.stages.map((stage) => stage.id).join(' -> ')}
`).join('\n')}

## Hard truth
This blueprint makes the project operational and agent-readable, but it does not pretend that the current local codebase alone can produce perfect final animation from dense concept boards without integrating the external model/tool chain named above. The workspace now records exactly how to do it cleanly and where each step belongs.
`;
}

function buildAgentCapabilities(plan) {
  return {
    checked_at: checkedAt,
    workspace: 'echoes-of-the-mushroom-realm',
    policy: {
      no_monolith: true,
      trace_every_output_to_source: true,
      keep_collision_in_data: true,
      require_alpha_qa_before_export: true,
    },
    agents: Object.entries(plan.knowledgeBase.agentPlaybooks).map(([agentId, playbook]) => ({
      id: agentId,
      playbook,
      owns_folders: [
        '01_inputs',
        '02_design',
        '03_assets',
        '04_scenes',
        '05_runtime',
        '06_qa',
        '07_exports',
        '08_ops',
      ],
      can_trigger_stages: plan.knowledgeBase.stageLibrary
        .filter((stage) => stage.agents.includes(agentId))
        .map((stage) => stage.id),
    })),
  };
}

const assets = JSON.parse(await readFile(resolve(workspaceRoot, '03_assets', 'registry', 'assets.json'), 'utf8'));
const referenceIndex = JSON.parse(await readFile(resolve(workspaceRoot, '01_inputs', 'references', 'reference-index.json'), 'utf8'));
const references = referenceIndex.copied_references;

const plan = buildAssetFactoryPlan(assets, references, checkedAt);

const files = [
  {
    path: resolve(workspaceRoot, '02_design', 'specs', 'asset-factory-blueprint.md'),
    content: buildBlueprintMarkdown(plan, references),
  },
  {
    path: resolve(workspaceRoot, '02_design', 'specs', 'asset-factory-tooling.json'),
    content: JSON.stringify(
      {
        checked_at: checkedAt,
        tools: plan.knowledgeBase.tools,
        stage_library: plan.knowledgeBase.stageLibrary,
      },
      null,
      2,
    ),
  },
  {
    path: resolve(workspaceRoot, '02_design', 'prompts', 'agent-playbooks.json'),
    content: JSON.stringify(
      {
        checked_at: checkedAt,
        agent_playbooks: plan.knowledgeBase.agentPlaybooks,
      },
      null,
      2,
    ),
  },
  {
    path: resolve(workspaceRoot, '03_assets', 'registry', 'asset-production-plan.json'),
    content: JSON.stringify(
      {
        checked_at: checkedAt,
        recipes: plan.recipes,
      },
      null,
      2,
    ),
  },
  {
    path: resolve(workspaceRoot, '03_assets', 'registry', 'asset-cutting-qa.json'),
    content: JSON.stringify(
      {
        checked_at: checkedAt,
        checks: plan.cuttingQa,
      },
      null,
      2,
    ),
  },
  {
    path: resolve(workspaceRoot, '08_ops', 'manifests', 'agent-capabilities.json'),
    content: JSON.stringify(buildAgentCapabilities(plan), null, 2),
  },
];

for (const file of files) {
  await mkdir(dirname(file.path), { recursive: true });
  await writeFile(file.path, file.content, 'utf8');
}

for (const asset of assets) {
  const recipe = plan.recipes.find((entry) => entry.assetId === asset.id);
  if (!recipe) continue;

  const assetRoot = assetDirForRecord(asset);
  const folderContract = buildAssetFolderContract(recipe);
  for (const folderName of folderContract.required_folders) {
    await mkdir(resolve(assetRoot, folderName), { recursive: true });
  }

  await writeFile(resolve(assetRoot, 'pipeline.contract.json'), JSON.stringify(folderContract, null, 2), 'utf8');
  await writeFile(resolve(assetRoot, 'README.md'), buildAssetReadme(asset, recipe), 'utf8');
}

console.log(
  JSON.stringify(
    {
      checked_at: checkedAt,
      workspace_root: workspaceRoot,
      assets: assets.length,
      references: references.length,
      output_files: files.map((file) => file.path),
    },
    null,
    2,
  ),
);
