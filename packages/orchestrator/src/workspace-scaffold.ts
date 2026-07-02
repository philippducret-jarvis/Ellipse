import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type {
  GameProject,
  GameProjectAsset,
  GameProjectAssetOutput,
  GameProjectAssetSource,
  GameProjectDocument,
  GameProjectTask,
} from '@ellipse/shared';
import { ASSET_STAGE_IDS, deriveIntentContract, INTENT_CONTRACT_PATH, buildTrainingRoadmapManifest } from '@ellipse/shared';
import { getGameWorkspacesDir } from './project-paths.js';

export interface GameWorkspaceInfo {
  rootDir: string;
  relativeRoot: string;
  readmePath: string;
  contextPath: string;
}

const ROOT_DIRS = [
  '00_brief/documents',
  '01_inputs/prompts',
  '01_inputs/references',
  '01_inputs/uploads',
  '02_design/backlog',
  '02_design/specs',
  '03_assets/audio',
  '03_assets/characters',
  '03_assets/environments',
  '03_assets/fx',
  '03_assets/props',
  '03_assets/registry',
  '03_assets/ui',
  '04_scenes/level_01',
  '05_runtime/adapters',
  '05_runtime/gdl',
  '06_qa/checklists',
  '06_qa/reports',
  '07_exports/desktop',
  '07_exports/mobile',
  '07_exports/web',
  '08_ops/audit',
  '08_ops/manifests',
  '08_ops/telemetry',
  '08_ops/workflow-runs',
] as const;

const DOCUMENT_FILENAMES: Partial<Record<GameProjectDocument['kind'], string>> = {
  pitch: '00_pitch.md',
  game_design_document: '01_game_design.md',
  narrative_bible: '02_narrative.md',
  art_direction: '03_art_direction.md',
  technical_design: '04_technical_design.md',
  production_plan: '05_production_plan.md',
  iteration_brief: '90_iteration_brief.md',
};

function slugifySegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');
  return normalized || 'item';
}

function getWorkspaceRoot(project: GameProject): string {
  return join(getGameWorkspacesDir(), project.slug);
}

function getWorkspaceRelativeRoot(project: GameProject): string {
  return join('workspaces', project.slug);
}

function bucketForAsset(asset: GameProjectAsset): string {
  switch (asset.kind) {
    case 'environment':
      return 'environments';
    case 'ui':
      return 'ui';
    case 'audio':
      return 'audio';
    case 'fx':
      return 'fx';
    case 'prop':
      return 'props';
    default:
      return 'characters';
  }
}

function assetDirectoryName(asset: GameProjectAsset): string {
  return `${asset.role}__${slugifySegment(asset.title)}`;
}

function assetRoot(project: GameProject, asset: GameProjectAsset): string {
  return join(getWorkspaceRoot(project), '03_assets', bucketForAsset(asset), assetDirectoryName(asset));
}

export function getAssetWorkspaceRoot(project: GameProject, asset: GameProjectAsset): string {
  return assetRoot(project, asset);
}

function renderWorkspaceReadme(project: GameProject, primaryPrompt: string): string {
  return `# ${project.title}

Ce dossier est le workspace local de production pour ce jeu.

## Raison d'etre
- Isoler tous les prompts, briefs, assets, scenes, QA et exports de ce jeu.
- Permettre aux agents IA de travailler sans melanger deux projets.
- Garder une structure stable pour les iterations, le debug et les reprises.

## Prompt source
${primaryPrompt}

## Structure
- \`00_brief/\`: documents de cadrage valides.
- \`01_inputs/\`: prompts, references et uploads relies au jeu.
- \`02_design/\`: backlog, specs de gameplay et decisions.
- \`03_assets/\`: un dossier par asset, plus le registre du cast.
- \`04_scenes/\`: definitions de scenes et layout par niveau.
- \`05_runtime/\`: GDL, adaptateurs runtime et manifests techniques.
- \`06_qa/\`: checklists et rapports de validation.
- \`07_exports/\`: sorties web, mobile et desktop.
- \`08_ops/\`: manifests, audit et contexte d'orchestration.

## Regles
- Chaque nouvel asset obtient son propre dossier reserve.
- Les iterations enrichissent le meme workspace au lieu de recreer un projet.
- Les binaires volumineux restent hors Git; ce dossier documente et relie les artefacts.
`;
}

function renderPromptFile(prompt: string, label: string, sourceImages: string[]): string {
  const references = sourceImages.length > 0 ? sourceImages.map((image) => `- ${image}`).join('\n') : '- aucune';
  return `# ${label}

## Prompt
${prompt}

## References
${references}
`;
}

function renderBacklog(tasks: GameProjectTask[]): string {
  return [
    '# Backlog initial',
    '',
    ...tasks.map((task) =>
      [
        `## ${task.title}`,
        `- Agent: ${task.agent_id}`,
        `- Type: ${task.kind}`,
        `- Priorite: ${task.priority}`,
        `- Statut: ${task.status}`,
        `- Description: ${task.description}`,
        '- Criteres d\'acceptation:',
        ...(task.acceptance_criteria.length > 0
          ? task.acceptance_criteria.map((criterion) => `  - ${criterion}`)
          : ['  - aucun defini']),
        task.depends_on.length > 0 ? `- Dependances: ${task.depends_on.join(', ')}` : '- Dependances: aucune',
        '',
      ].join('\n'),
    ),
  ].join('\n');
}

function renderSceneStub(project: GameProject): string {
  return JSON.stringify(
    {
      scene_key: 'level_01',
      title: 'First playable slice',
      runtime: project.target_runtime,
      camera_mode: project.camera_mode,
      objective: 'Reach the level goal',
      notes: [
        'This file is a workspace anchor for level-specific production notes.',
        'Runtime-ready JSON and GDL outputs should be registered under 05_runtime/gdl.',
      ],
    },
    null,
    2,
  );
}

function renderQaChecklist(project: GameProject): string {
  return `# Checklist MVP

- GDL valide pour ${project.target_runtime}
- Hero lisible a l'ecran mobile 1080x1920 et 1920x1080
- Boucle de jeu comprise en moins de 30 secondes
- References assets resolues sans fichier manque
- Budget mobile respecte: textures, draw calls, effets et audio
- Build preview jouable avant export
`;
}

function renderRuntimeReadme(project: GameProject): string {
  return `# Runtime notes

- Runtime cible: ${project.target_runtime}
- Camera: ${project.camera_mode}
- Dimension: ${project.dimension}

Ce dossier regroupe les manifestes moteurs, GDL et adaptateurs d'execution.
Le code produit doit rester modulaire, declaratif et patchable.
`;
}

function renderAssetBrief(asset: GameProjectAsset): string {
  return `# ${asset.title}

- Role: ${asset.role}
- Kind: ${asset.kind}
- Statut: ${asset.status}

## Spec
\`\`\`json
${JSON.stringify(asset.spec, null, 2)}
\`\`\`
`;
}

function renderProjectContext(project: GameProject): string {
  return JSON.stringify(
    {
      project_id: project.id,
      slug: project.slug,
      title: project.title,
      status: project.status,
      dimension: project.dimension,
      runtime: project.target_runtime,
      camera_mode: project.camera_mode,
      created_at: project.created_at ?? null,
      updated_at: project.updated_at ?? null,
    },
    null,
    2,
  );
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

export async function scaffoldGameWorkspace(input: {
  project: GameProject;
  primaryPrompt: string;
  sourceImages: string[];
  documents: GameProjectDocument[];
  tasks: GameProjectTask[];
  assets: GameProjectAsset[];
}): Promise<GameWorkspaceInfo> {
  const rootDir = getWorkspaceRoot(input.project);
  const relativeRoot = getWorkspaceRelativeRoot(input.project);

  await Promise.all(ROOT_DIRS.map((dir) => mkdir(join(rootDir, dir), { recursive: true })));
  await Promise.all(input.assets.map((asset) => ensureAssetWorkspace(input.project, asset)));

  await Promise.all([
    writeText(join(rootDir, 'README.md'), renderWorkspaceReadme(input.project, input.primaryPrompt)),
    writeText(join(rootDir, 'workspace.json'), renderProjectContext(input.project)),
    writeText(join(rootDir, '01_inputs', 'prompts', '0001_bootstrap.prompt.md'), renderPromptFile(input.primaryPrompt, 'Bootstrap prompt', input.sourceImages)),
    writeText(join(rootDir, '02_design', 'backlog', 'initial_tasks.md'), renderBacklog(input.tasks)),
    writeText(
      join(rootDir, ...INTENT_CONTRACT_PATH.split('/')),
      JSON.stringify(
        deriveIntentContract({
          title: input.project.title,
          prompt: input.primaryPrompt,
          genre: input.project.genre,
          dimension: input.project.dimension,
          mechanics: (input.project.metadata as { mechanics?: string[] })?.mechanics,
          sourceImages: input.sourceImages,
        }),
        null,
        2,
      ),
    ),
    writeText(join(rootDir, '03_assets', 'registry', 'assets.json'), JSON.stringify(input.assets, null, 2)),
    writeText(join(rootDir, '04_scenes', 'level_01', 'scene.stub.json'), renderSceneStub(input.project)),
    writeText(join(rootDir, '05_runtime', 'README.md'), renderRuntimeReadme(input.project)),
    writeText(join(rootDir, '06_qa', 'checklists', 'mvp.md'), renderQaChecklist(input.project)),
    writeText(join(rootDir, '08_ops', 'manifests', 'project-context.json'), renderProjectContext(input.project)),
    writeText(
      join(rootDir, '08_ops', 'manifests', 'training-roadmap.json'),
      JSON.stringify({ ...buildTrainingRoadmapManifest(), progress: null }, null, 2),
    ),
  ]);

  for (const document of input.documents) {
    const filename = DOCUMENT_FILENAMES[document.kind] ?? `${slugifySegment(document.kind)}.md`;
    await writeText(join(rootDir, '00_brief', 'documents', filename), document.content);
  }

  return {
    rootDir,
    relativeRoot,
    readmePath: join(rootDir, 'README.md'),
    contextPath: join(rootDir, '08_ops', 'manifests', 'project-context.json'),
  };
}

export async function appendIterationWorkspaceRecord(input: {
  project: GameProject;
  prompt: string;
  sourceImages: string[];
  brief: GameProjectDocument;
}): Promise<void> {
  const workspaceRoot = getWorkspaceRoot(input.project);
  const stamp = input.brief.created_at?.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19) ?? new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  await writeText(
    join(workspaceRoot, '01_inputs', 'prompts', `${stamp}_iteration.prompt.md`),
    renderPromptFile(input.prompt, 'Iteration prompt', input.sourceImages),
  );
  await writeText(join(workspaceRoot, '02_design', 'backlog', `${stamp}_iteration_brief.md`), input.brief.content);
}

export async function ensureAssetWorkspace(project: GameProject, asset: GameProjectAsset): Promise<void> {
  const root = assetRoot(project, asset);
  await Promise.all([
    ...ASSET_STAGE_IDS.map((stage) => mkdir(join(root, stage), { recursive: true })),
    mkdir(join(root, 'inputs'), { recursive: true }),
    mkdir(join(root, 'outputs'), { recursive: true }),
    mkdir(join(root, 'notes'), { recursive: true }),
    writeText(join(root, 'README.md'), renderAssetBrief(asset)),
    writeText(
      join(root, 'pipeline.contract.json'),
      JSON.stringify(
        {
          asset_id: asset.id,
          role: asset.role,
          kind: asset.kind,
          title: asset.title,
          stages: ASSET_STAGE_IDS,
        },
        null,
        2,
      ),
    ),
  ]);
}

export async function registerAssetSourceInWorkspace(input: {
  project: GameProject;
  asset: GameProjectAsset;
  source: GameProjectAssetSource;
}): Promise<void> {
  const root = assetRoot(input.project, input.asset);
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}__${slugifySegment(basename(input.source.file_path ?? input.source.url ?? 'source'))}.md`;
  const content = `# Source attached

- Type: ${input.source.source_type}
- URL: ${input.source.url ?? 'n/a'}
- File path: ${input.source.file_path ?? 'n/a'}
- Metadata:
\`\`\`json
${JSON.stringify(input.source.metadata ?? {}, null, 2)}
\`\`\`
`;

  await writeText(join(root, 'inputs', filename), content);

  if (input.source.file_path && /\.(png|jpe?g|webp)$/i.test(input.source.file_path)) {
    const sourceStage = join(root, '01_source');
    await mkdir(sourceStage, { recursive: true });
    await copyFile(input.source.file_path, join(sourceStage, 'reference.png'));
  }
}

export async function registerPrototypeInWorkspace(input: {
  project: GameProject;
  asset: GameProjectAsset;
  variantLabel: string;
  output: GameProjectAssetOutput;
}): Promise<void> {
  const root = assetRoot(input.project, input.asset);
  const filename = `${slugifySegment(input.variantLabel)}.json`;
  const payload = {
    variant: input.variantLabel,
    output_type: input.output.output_type,
    url: input.output.url,
    file_path: input.output.file_path,
    metadata: input.output.metadata ?? {},
  };
  await writeText(join(root, 'outputs', filename), JSON.stringify(payload, null, 2));
}
