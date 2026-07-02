import type {
  AssetFactoryKnowledgeBase,
  AssetStageTemplate,
  AssetToolSpec,
} from './types.js';

const TOOL_REGISTRY: AssetToolSpec[] = [
  {
    id: 'sam2',
    name: 'Segment Anything 2',
    category: 'segmentation',
    compute: 'gpu_local',
    strengths: [
      'high-quality promptable segmentation',
      'strong base for subject isolation before manual cleanup',
      'useful for image and video segmentation flows',
    ],
    tradeoffs: [
      'best experience still expects GPU acceleration',
      'needs mask QA and edge cleanup for production assets',
    ],
    recommendedFor: ['hero cutouts', 'boss silhouettes', 'complex prop isolation', 'board decomposition'],
    sourceUrl: 'https://github.com/facebookresearch/sam2',
    licenseNotes: 'Check the upstream repository for the current license and model terms before commercial rollout.',
  },
  {
    id: 'rembg',
    name: 'rembg',
    category: 'cutout',
    compute: 'cpu_local',
    strengths: [
      'simple local background removal',
      'easy low-GPU fallback for batch pre-cutting',
      'good first pass before QA or stronger segmentation',
    ],
    tradeoffs: [
      'fine edges and painterly details usually need another pass',
      'less reliable than promptable segmentation on dense boards',
    ],
    recommendedFor: ['quick local cutouts', 'batch alpha extraction', 'agent fallback mode'],
    sourceUrl: 'https://github.com/danielgatis/rembg',
    licenseNotes: 'Review the upstream repository and bundled model licenses before shipping generated outputs.',
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    category: 'workflow',
    compute: 'gpu_local',
    strengths: [
      'graph-based orchestration for image generation and post-processing',
      'good place to centralize repeatable asset workflows',
      'pairs well with upscale, inpaint, and ControlNet-like stages',
    ],
    tradeoffs: [
      'workflow quality depends on installed nodes and model governance',
      'node sprawl can become hard to maintain without strict templates',
    ],
    recommendedFor: ['repeatable asset graphs', 'remote GPU jobs', 'approval-ready image pipelines'],
    sourceUrl: 'https://github.com/comfyanonymous/ComfyUI',
    licenseNotes: 'Core UI is open source; each model and custom node still requires its own license review.',
  },
  {
    id: 'liveportrait',
    name: 'LivePortrait',
    category: 'animation_2d',
    compute: 'gpu_local',
    strengths: [
      'turns a portrait-like source into controllable facial or upper-body motion',
      'useful for dialogue portraits, keyart motion, and animatic previews',
      'good embedded agent option for presentation-grade character motion',
    ],
    tradeoffs: [
      'not a replacement for full gameplay sprite animation',
      'best suited to portrait framing rather than side-view combat cycles',
    ],
    recommendedFor: ['menu keyart motion', 'NPC portrait animation', 'cutscene prototypes'],
    sourceUrl: 'https://github.com/KlingAIResearch/LivePortrait',
    licenseNotes: 'Validate upstream weights, code license, and deployment restrictions before product use.',
  },
  {
    id: 'godot-2d-skeleton',
    name: 'Godot 2D Skeleton Stack',
    category: 'rigging_2d',
    compute: 'cpu_local',
    strengths: [
      '2D rigging and runtime animation without heavy local GPU requirements',
      'clean fit for mobile-first 2D gameplay once parts are cut correctly',
      'lets the project keep gameplay animation editable instead of flattening everything to video',
    ],
    tradeoffs: [
      'requires disciplined pivots, part naming, and deformation limits',
      'complex painterly cloth still needs manual polish or sprite-swap help',
    ],
    recommendedFor: ['hero runtime rig', 'enemy loop animation', 'interactive cutout characters'],
    sourceUrl: 'https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html',
  },
  {
    id: 'aseprite-export',
    name: 'Aseprite Sprite Export',
    category: 'export',
    compute: 'cpu_local',
    strengths: [
      'clean atlas export for sprites, tags, and frame metadata',
      'well-suited for deterministic 2D runtime packaging',
      'easy place to enforce naming and frame conventions',
    ],
    tradeoffs: [
      'requires frame discipline and asset prep upstream',
      'not an automation engine by itself',
    ],
    recommendedFor: ['hero sprite sheets', 'enemy atlases', 'mobile atlas packaging'],
    sourceUrl: 'https://www.aseprite.org/docs/sprite-sheet/',
  },
  {
    id: 'trellis',
    name: 'TRELLIS',
    category: 'image_to_3d',
    compute: 'remote_gpu',
    strengths: [
      'research-grade image-to-3D generation path',
      'useful for statues, props, or premium promo renders derived from 2D art',
      'good candidate for remote jobs instead of local heavy inference',
    ],
    tradeoffs: [
      'not a low-latency local mobile pipeline',
      'requires strong QA before using outputs as production runtime meshes',
    ],
    recommendedFor: ['hero figurine concepts', 'weapon statues', 'promo 3D proxies'],
    sourceUrl: 'https://github.com/microsoft/TRELLIS',
    licenseNotes: 'Research repositories and checkpoints can have extra usage constraints; verify before commercial use.',
  },
];

const STAGE_LIBRARY: AssetStageTemplate[] = [
  {
    id: 'intake_and_reference_lock',
    title: 'Intake and reference lock',
    objective: 'Freeze the exact input boards, prompts, and quality targets used for an asset.',
    agents: ['producer', 'art_direction', 'asset_direction'],
    inputs: ['reference-index.json', 'asset-prompts.json', 'style-guide.json', 'asset record'],
    outputs: ['locked reference set', 'acceptance notes', 'prompt lineage'],
    preferredTools: ['comfyui'],
    qualityGates: [
      'Each asset points to named workspace references',
      'Silhouette and readability target are written down',
      'The team knows whether the asset is gameplay, cinematic, or promo',
    ],
  },
  {
    id: 'segmentation_and_cutout',
    title: 'Segmentation and cutout',
    objective: 'Produce an initial alpha-isolated asset from a board or concept image.',
    agents: ['asset_direction', 'animation'],
    inputs: ['source image', 'subject notes', 'desired crop and padding'],
    outputs: ['base rgba png', 'alpha mask', 'cutout notes'],
    preferredTools: ['sam2', 'rembg'],
    qualityGates: [
      'No clipped silhouette extremities',
      'Alpha edges keep cloth, hair, spores, and glow details',
      'Background bleed is explicitly flagged when present',
    ],
  },
  {
    id: 'cleanup_and_part_split',
    title: 'Cleanup and part split',
    objective: 'Convert a raw cutout into riggable pieces or clean sprite-ready layers.',
    agents: ['asset_direction', 'animation'],
    inputs: ['base rgba png', 'alpha mask', 'style guide'],
    outputs: ['clean cutout set', 'part list', 'naming map', 'pivot hints'],
    preferredTools: ['comfyui'],
    qualityGates: [
      'Each part can be reused without visible matte contamination',
      'Transparent regions are truly transparent',
      'Occluded limbs are either painted in or marked for sprite-swap fallback',
    ],
  },
  {
    id: 'runtime_rig',
    title: 'Runtime rig',
    objective: 'Build a lightweight 2D gameplay rig when the asset must move interactively.',
    agents: ['animation', 'gameplay_programming'],
    inputs: ['part list', 'pivot hints', 'motion coverage'],
    outputs: ['rig spec', 'bone map', 'deformation constraints'],
    preferredTools: ['godot-2d-skeleton'],
    qualityGates: [
      'Joint placement preserves the silhouette at gameplay scale',
      'Cloth and glow pieces have a fallback plan',
      'Runtime bones stay limited enough for mobile budgets',
    ],
  },
  {
    id: 'motion_generation',
    title: 'Motion generation',
    objective: 'Create the actual movement coverage for gameplay, UI, or cutscene use.',
    agents: ['animation', 'qa'],
    inputs: ['rig spec', 'motion list', 'combat or dialog notes'],
    outputs: ['clip list', 'timing notes', 'pose approvals'],
    preferredTools: ['liveportrait', 'godot-2d-skeleton'],
    qualityGates: [
      'Required states are covered',
      'Readability survives mobile downscale',
      'Contact, anticipation, and recovery frames are present where needed',
    ],
  },
  {
    id: 'atlas_and_export',
    title: 'Atlas and export',
    objective: 'Package the asset for runtime use with deterministic naming and metadata.',
    agents: ['build_release', 'gameplay_programming'],
    inputs: ['approved clips', 'parts or frames', 'export target'],
    outputs: ['atlas png', 'frame metadata', 'runtime manifest'],
    preferredTools: ['aseprite-export'],
    qualityGates: [
      'Frame tags are stable',
      'Pivot and hitbox metadata are stored outside the pixels',
      'Output naming is consistent with workspace registries',
    ],
  },
  {
    id: 'parallax_tiles_collision',
    title: 'Parallax, tiles, and collision extraction',
    objective: 'Turn a level board into reusable environment layers instead of a single painted image.',
    agents: ['level_design', 'asset_direction', 'qa'],
    inputs: ['environment board', 'style guide', 'render targets'],
    outputs: ['parallax layer plan', 'tile groups', 'collision map notes'],
    preferredTools: ['sam2', 'rembg'],
    qualityGates: [
      'Foreground, playfield, and far background are separated',
      'Tile seams are called out before export',
      'Collision remains authored in data rather than in painted shadows',
    ],
  },
  {
    id: 'remote_3d_proxy',
    title: 'Remote 3D proxy generation',
    objective: 'Generate optional 3D proxies or promo meshes when local hardware is not enough.',
    agents: ['asset_direction', 'build_release'],
    inputs: ['approved 2d concept', 'turnaround references', '3d usage note'],
    outputs: ['remote job spec', '3d qa checklist', 'mesh handoff notes'],
    preferredTools: ['trellis'],
    qualityGates: [
      '3D output is marked as optional or promo unless validated for runtime',
      'Topology and texture QA are explicit',
      'The project records which outputs were generated remotely',
    ],
  },
];

const AGENT_PLAYBOOKS: Record<string, string[]> = {
  producer: [
    'Lock which references are canonical for each asset.',
    'Choose local CPU, local GPU, or remote GPU execution early.',
    'Block any workflow that cannot be traced back to a workspace prompt or source image.',
  ],
  art_direction: [
    'Preserve the red-cloak hero silhouette and spore-glow readability.',
    'Prefer modular asset decomposition over flattening whole concept boards into single runtime images.',
    'Approve only outputs that stay legible on mobile-sized screens.',
  ],
  asset_direction: [
    'Separate every asset into source, cutout, cleanup, rig, export, and QA states.',
    'Keep naming stable across files, folders, manifests, and runtime IDs.',
    'Use remote generation only when local workflows cannot meet the quality bar.',
    'Route IoU failures: hybrid (0.42+) then inpaint CPU (0.55+) then ComfyUI workorder.',
  ],
  animation: [
    'Default to cutout rig plus sprite-swap hybrid for gameplay-critical characters.',
    'Use portrait motion tools only for portraits, cutscenes, or menu animation.',
    'Document missing occluded body parts before trying to animate them.',
  ],
  level_design: [
    'Extract parallax and collision logic from boards without painting gameplay into the background.',
    'Keep traversal metrics data-driven.',
    'Treat hidden paths, hazards, and climbables as authored gameplay data.',
  ],
  gameplay_programming: [
    'Consume exported atlases and metadata, not raw concept boards.',
    'Keep collision, hitboxes, and triggers in JSON or runtime manifests.',
    'Preserve a low-GPU preview path even when premium assets are remote-generated.',
  ],
  qa: [
    'Check alpha halos, clipped fingers, broken cloth edges, and glow contamination.',
    'Reject assets that only look good at full resolution.',
    'Track which assets are safe for runtime and which are still concept-only.',
  ],
  build_release: [
    'Write down every upstream tool, source URL, and execution profile used by the workspace.',
    'Package atlases and manifests deterministically.',
    'Keep remote outputs clearly labeled for governance and reproducibility.',
  ],
};

export function buildAssetFactoryKnowledgeBase(checkedAt = new Date().toISOString()): AssetFactoryKnowledgeBase {
  return {
    checkedAt,
    tools: TOOL_REGISTRY,
    stageLibrary: STAGE_LIBRARY,
    agentPlaybooks: AGENT_PLAYBOOKS,
  };
}

export function getAssetFactoryStage(stageId: string): AssetStageTemplate | undefined {
  return STAGE_LIBRARY.find((stage) => stage.id === stageId);
}

export function listAssetFactoryTools(): AssetToolSpec[] {
  return [...TOOL_REGISTRY];
}
