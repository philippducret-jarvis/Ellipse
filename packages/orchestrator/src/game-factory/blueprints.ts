import { randomUUID } from 'node:crypto';
import type { FactoryAgentId, GameProjectAsset, GameProjectDocument, GameProjectTask, UserIntent } from '@ellipse/shared';
import { buildStoryHook, pickAssetKind, pickCameraMode, pickRuntime } from './intent-helpers.js';

export function buildAssetBlueprints(intent: UserIntent, prompt: string): Array<{
  title: string;
  role: GameProjectAsset['role'];
  kind: GameProjectAsset['kind'];
  status: GameProjectAsset['status'];
  spec: Record<string, unknown>;
}> {
  const promptLc = prompt.toLowerCase();
  const assets: Array<{
    title: string;
    role: GameProjectAsset['role'];
    kind: GameProjectAsset['kind'];
    status: GameProjectAsset['status'];
    spec: Record<string, unknown>;
  }> = [
    {
      title: 'Main hero',
      role: 'hero',
      kind: pickAssetKind('hero', intent.dimension),
      status: intent.source_images.length > 0 ? 'source_ready' : 'concept',
      spec: {
        source_images: intent.source_images,
        keep_structure: intent.source_images.length > 0,
        hd_target: true,
        prototype_targets: ['hd_sprite_sheet', 'model_25d_turn', 'model_3d_motion'],
      },
    },
    {
      title: 'Primary enemy',
      role: promptLc.includes('monster') ? 'monster' : 'enemy',
      kind: 'character',
      status: 'concept',
      spec: {
        encounter_role: 'core challenge',
        prototype_targets: ['hd_sprite_sheet', 'idle_motion_pack'],
      },
    },
    {
      title: 'Environment kit',
      role: 'environment',
      kind: 'environment',
      status: 'concept',
      spec: {
        coverage: 'scene landmarks, collision shapes, readable background kit',
      },
    },
    {
      title: 'UI shell',
      role: 'ui',
      kind: 'ui',
      status: 'concept',
      spec: {
        surfaces: ['hud', 'pause', 'quest or objective strip'],
      },
    },
  ];

  if (/(boss|dragon|demon|final|king|queen|mecha|titan)/u.test(promptLc)) {
    assets.push({
      title: 'Boss encounter',
      role: 'boss',
      kind: pickAssetKind('boss', intent.dimension),
      status: 'concept',
      spec: {
        encounter_role: 'boss',
        prototype_targets: ['boss_encounter_proto', 'model_25d_turn', 'combat_pose_pack'],
      },
    });
  }

  if (/(dog|wolf|cat|friend|ally|companion|partner)/u.test(promptLc)) {
    assets.push({
      title: 'Companion support',
      role: 'companion',
      kind: 'character',
      status: 'concept',
      spec: {
        gameplay_role: 'supporting ally',
        prototype_targets: ['hd_sprite_sheet', 'idle_motion_pack'],
      },
    });
  }

  return assets;
}

export function buildDocuments(projectTitle: string, prompt: string, intent: UserIntent): Array<{
  kind: GameProjectDocument['kind'];
  title: string;
  content: string;
  payload?: Record<string, unknown>;
}> {
  const mechanics = intent.mechanics.length > 0 ? intent.mechanics : ['movement', 'progression', 'encounters'];
  const sourceGuidance =
    intent.source_images.length > 0
      ? '- Preserve the silhouette and major landmarks of the reference photo.\n- Favor HD texture cleanup over stylized drift.\n- Keep animation readable while respecting the original body structure.'
      : '- Build a coherent stylized identity from the prompt and genre.';

  const docs: Array<{
    kind: GameProjectDocument['kind'];
    title: string;
    content: string;
    payload?: Record<string, unknown>;
  }> = [
    {
      kind: 'pitch',
      title: 'Project Pitch',
      content: `# ${projectTitle}

## Prompt
${prompt}

## High concept
Create a focused ${intent.dimension.toUpperCase()} ${intent.genre ?? 'action'} experience that can ship as a playable web preview.

## Player fantasy
- Immediate control over a hero with a strong identity
- A short but polished gameplay loop
- Clear visual readability from the first minute

## MVP promise
- One playable character
- One polished scene
- One complete win condition
- One build ready for browser review`,
      payload: { genre: intent.genre, dimension: intent.dimension },
    },
    {
      kind: 'game_design_document',
      title: 'Game Design Document',
      content: `# Core loop
- Start in a readable spawn area
- Learn movement and the first interaction quickly
- Complete a short challenge arc
- Reach a clean success state

## Mechanics
${mechanics.map((mechanic) => `- ${mechanic}`).join('\n')}

## Rules
- Scope the first release to one scene and one hero
- Prefer robust interactions over feature count
- Keep UI minimal and readable

## Success metrics
- The player can understand the goal within 30 seconds
- The scene can be completed without dead ends
- Generated assets remain consistent across the run`,
      payload: { mechanics },
    },
    {
      kind: 'art_direction',
      title: 'Art Direction',
      content: `# Visual north star
- Genre tone: ${intent.genre ?? 'hybrid action'}
- Dimension target: ${intent.dimension.toUpperCase()}
- Camera: ${pickCameraMode(intent)}

## Reference policy
${sourceGuidance}

## Rendering priorities
- Readable silhouette first
- Cohesive palette second
- Motion clarity third

## Deliverables
- Hero visual spec
- Environment visual spec
- UI mood strip
- Animation notes`,
      payload: { source_images: intent.source_images, has_photo: intent.source_images.length > 0 },
    },
    {
      kind: 'technical_design',
      title: 'Technical Design',
      content: `# Runtime
- Runtime target: ${pickRuntime(intent)}
- Engine surface: Ellipse web runtime
- Scene format: JSON scene graph

## Systems
- Input and player controller
- Scene loading and win condition
- Asset binding for generated outputs
- Smoke-testable build manifest

## Photo-to-model requirements
- Source images: ${intent.source_images.length}
- Preserve structure on each iteration
- Track generation settings and best score for future attempts`,
      payload: { runtime: pickRuntime(intent), source_images: intent.source_images.length },
    },
    {
      kind: 'production_plan',
      title: 'Production Plan',
      content: `# Milestones
1. Lock scope and documentation
2. Generate asset and scene specs
3. Produce gameplay-ready scene and hero motion
4. Validate and package a playable browser build

## Operating rule
- Every attempt should leave a better project state than the previous one.
- QA findings convert back into tracked tasks.
- Build status stays visible at the project level.`,
    },
  ];

  docs.push({
    kind: 'narrative_bible',
    title: 'Narrative Bible',
    content: `# Story hook
${buildStoryHook(projectTitle, intent)}

## Narrative pillars
- A clear player motive
- Named cast roles for hero, enemy and boss-tier threats
- Story beats that support the first playable without over-scoping production

## First prototype question
- Why does the hero enter the scene now?
- What blocks them?
- What changes when the prototype is completed?`,
    payload: { branching: intent.genre === 'rpg', always_present: true },
  });

  return docs;
}

export function buildTaskBlueprints(intent: UserIntent): Array<{
  id: string;
  agentId: FactoryAgentId;
  kind: GameProjectTask['kind'];
  title: string;
  description: string;
  status: GameProjectTask['status'];
  priority: number;
  acceptanceCriteria: string[];
  dependsOn?: string[];
  payload?: Record<string, unknown>;
}> {
  const producer = randomUUID();
  const design = randomUUID();
  const art = randomUUID();
  const assets = randomUUID();
  const level = randomUUID();
  const gameplay = randomUUID();
  const animation = randomUUID();
  const narrative = randomUUID();
  const qa = randomUUID();
  const build = randomUUID();

  const tasks: Array<{
    id: string;
    agentId: FactoryAgentId;
    kind: GameProjectTask['kind'];
    title: string;
    description: string;
    status: GameProjectTask['status'];
    priority: number;
    acceptanceCriteria: string[];
    dependsOn?: string[];
    payload?: Record<string, unknown>;
  }> = [
    {
      id: producer,
      agentId: 'producer',
      kind: 'vision',
      title: 'Lock project scope',
      description: 'Turn the prompt into a one-scene MVP with explicit quality gates and owner tasks.',
      status: 'ready',
      priority: 10,
      acceptanceCriteria: [
        'One scene MVP is defined',
        'Success condition is explicit',
        'Dependencies are ordered for downstream agents',
      ],
      payload: { dimension: intent.dimension, genre: intent.genre },
    },
    {
      id: design,
      agentId: 'game_design',
      kind: 'document',
      title: 'Define the core loop',
      description: 'Formalize player actions, fail states and progression beats for the first playable slice.',
      status: 'backlog',
      priority: 9,
      dependsOn: [producer],
      acceptanceCriteria: [
        'Core loop fits one short scene',
        'Mechanics stay teachable in under 30 seconds',
        'Win state and fail state are testable',
      ],
      payload: { mechanics: intent.mechanics, genre: intent.genre },
    },
    {
      id: art,
      agentId: 'art_direction',
      kind: 'document',
      title: 'Create the visual guide',
      description: 'Describe palette, silhouette rules and fidelity targets for every generated asset.',
      status: 'backlog',
      priority: 9,
      dependsOn: [producer],
      acceptanceCriteria: [
        'Visual guide references the target dimension',
        'Photo structure rules are explicit when references exist',
        'Scene and UI stay visually coherent',
      ],
      payload: { source_images: intent.source_images },
    },
    {
      id: assets,
      agentId: 'asset_direction',
      kind: 'asset',
      title: intent.source_images.length > 0 ? 'Create photo-faithful hero asset' : 'Create hero and environment specs',
      description:
        intent.source_images.length > 0
          ? 'Generate a HD hero asset that preserves the structure of the source photo, supports rotation and readable motion.'
          : 'Define the hero, props and environment outputs needed for the first scene.',
      status: 'backlog',
      priority: 8,
      dependsOn: [art, design],
      acceptanceCriteria: [
        'Hero asset is scoped for runtime use',
        'Environment support assets are identified',
        'Variant goals are recorded for later retries',
      ],
      payload: { reference_count: intent.source_images.length, target_runtime: pickRuntime(intent) },
    },
    {
      id: level,
      agentId: 'level_design',
      kind: 'scene',
      title: 'Block out level_01',
      description: 'Create a first scene with pacing beats, objective flow and clear entry and exit.',
      status: 'backlog',
      priority: 8,
      dependsOn: [design],
      acceptanceCriteria: [
        'Scene has a goal and completion rule',
        'Spawn, path and challenge beat exist',
        'Layout can be serialized to JSON',
      ],
    },
    {
      id: gameplay,
      agentId: 'gameplay_programming',
      kind: 'code',
      title: 'Implement the gameplay slice',
      description: 'Prepare the controller, objective logic and scene hooks for the first playable build.',
      status: 'backlog',
      priority: 8,
      dependsOn: [design, level],
      acceptanceCriteria: [
        'Hero can move and complete the objective',
        'Scene reacts to win and fail states',
        'Code targets the Ellipse runtime',
      ],
    },
    {
      id: animation,
      agentId: 'animation',
      kind: 'asset',
      title: 'Define motion states',
      description: 'Map idle, locomotion and action states to the generated hero asset.',
      status: 'backlog',
      priority: 7,
      dependsOn: [assets, gameplay],
      acceptanceCriteria: [
        'Idle and locomotion states exist',
        'Animation timing supports readable play',
        'Motion assumptions are documented for later retries',
      ],
    },
  ];

  if (intent.features.narrative) {
    tasks.push({
      id: narrative,
      agentId: 'narrative',
      kind: 'document',
      title: 'Add story beats',
      description: 'Write lightweight narrative hooks that reinforce the gameplay objective without bloating the MVP.',
      status: 'backlog',
      priority: 6,
      dependsOn: [design],
      acceptanceCriteria: [
        'Story supports the core loop',
        'Dialog stays optional and concise',
        'Quest or objective text is production ready',
      ],
    });
  }

  tasks.push(
    {
      id: qa,
      agentId: 'qa',
      kind: 'qa',
      title: 'Validate the first playable',
      description: 'Turn docs, assets and scene logic into a QA checklist and regression pass.',
      status: 'backlog',
      priority: 9,
      dependsOn: intent.features.narrative ? [animation, level, gameplay, narrative] : [animation, level, gameplay],
      acceptanceCriteria: [
        'Critical blockers are listed',
        'Asset and scene references are valid',
        'Playability verdict is recorded',
      ],
    },
    {
      id: build,
      agentId: 'build_release',
      kind: 'build',
      title: 'Package browser preview',
      description: 'Prepare the first build target, manifest and release note summary for review.',
      status: 'backlog',
      priority: 7,
      dependsOn: [qa],
      acceptanceCriteria: [
        'Build target is browser playable',
        'Manifest references the first scene',
        'Release note explains current scope and risks',
      ],
      payload: { target: pickRuntime(intent) === 'ellipse_photo_3d' ? 'photo-runtime-preview' : 'web-preview' },
    },
  );

  return tasks;
}
