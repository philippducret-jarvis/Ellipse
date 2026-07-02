/**
 * Registre de parité Godot → Ellipse — ce que l'éditeur Godot fait,
 * l'équivalent Ellipse, l'agent responsable et le statut d'implémentation.
 *
 * Utilisé par MasterAI, playbooks agents et Studio pour prioriser l'automation.
 * Réf. Godot 4 : import dock, scene tree, Skeleton2D, EditorScenePostImport, Autoload.
 */
import type { AgentType } from '../agents/catalog.js';
import type { AssetStageId } from '../assets/pipeline-stages.js';

export type GodotParityStatus = 'implemented' | 'partial' | 'stub' | 'planned';

export interface GodotParityFeature {
  /** Id stable (godot.*) */
  id: string;
  /** Fonction Godot (terminologie officielle) */
  godotFeature: string;
  godotDocPath: string;
  /** Équivalent Ellipse */
  ellipseEquivalent: string;
  ellipsePackages: string[];
  /** Agent(s) qui automatisent cette brique */
  agents: AgentType[];
  /** Stages pipeline asset liés */
  pipelineStages: AssetStageId[];
  status: GodotParityStatus;
  /** Ce que l'agent doit produire (contrat) */
  agentOutputs: string[];
  /** Gap vs Godot */
  gapFr: string;
}

/**
 * Cartographie complète — ordre = pipeline image → jeu (comme Import → Scene → Play).
 */
export const GODOT_PARITY_REGISTRY: readonly GodotParityFeature[] = [
  {
    id: 'godot.filesystem_dock',
    godotFeature: 'FileSystem dock — arborescence res://',
    godotDocPath: 'tutorials/assets_pipeline/import_process.html',
    ellipseEquivalent: 'WorkspaceTab + 01_inputs → 08_ops',
    ellipsePackages: ['packages/studio', 'packages/orchestrator'],
    agents: ['integration'],
    pipelineStages: ['01_source'],
    status: 'implemented',
    agentOutputs: ['workspace tree index', 'reference-index.json'],
    gapFr: 'Pas de reimport auto au changement de preset.',
  },
  {
    id: 'godot.import_dock',
    godotFeature: 'Import dock — presets par fichier (filter, compress, mips)',
    godotDocPath: 'tutorials/assets_pipeline/importing_images.html',
    ellipseEquivalent: 'pipeline.contract.json + stage 01_source metadata',
    ellipsePackages: ['packages/shared', 'packages/pipeline'],
    agents: ['character', 'decor'],
    pipelineStages: ['01_source', '06_exports'],
    status: 'partial',
    agentOutputs: ['style-lock.json', 'import-preset.json (filter: nearest|linear, compress: lossless)'],
    gapFr: 'Pas d’UI Import dock ; presets non appliqués au runtime Pixi.',
  },
  {
    id: 'godot.reimport',
    godotFeature: 'Reimport — réappliquer preset après changement',
    godotDocPath: 'tutorials/assets_pipeline/import_process.html',
    ellipseEquivalent: 'POST /api/assets/:id/stages/:stage/run',
    ellipsePackages: ['packages/orchestrator'],
    agents: ['character', 'animation', 'qa'],
    pipelineStages: ['02_cutouts', '03_cleanup', '05_animation', '06_exports'],
    status: 'partial',
    agentOutputs: ['stage status completed', 'artefacts régénérés'],
    gapFr: 'Veloria CLI ne bloque pas sur échec ; pas de watch filesystem.',
  },
  {
    id: 'godot.editor_scene_post_import',
    godotFeature: 'EditorScenePostImport — script tool après import 3D/2D',
    godotDocPath: 'classes/class_editorscenepostimport.html',
    ellipseEquivalent: 'Hook post-stage dans AssetPipelineService + agents',
    ellipsePackages: ['packages/orchestrator', 'packages/pipeline'],
    agents: ['character', 'integration', 'qa'],
    pipelineStages: ['03_cleanup', '06_exports'],
    status: 'stub',
    agentOutputs: ['post-import-manifest.json', 'GDL patches automatiques'],
    gapFr: 'Pas de hook _post_import générique ; logique éparpillée dans refine.mjs.',
  },
  {
    id: 'godot.advanced_import_settings',
    godotFeature: 'Advanced Import — preview 3D + options par nœud',
    godotDocPath: 'tutorials/assets_pipeline/importing_3d_scenes/advanced_import_settings.html',
    ellipseEquivalent: 'ExtractionTab bbox + tolérance + preview cutout',
    ellipsePackages: ['packages/studio', 'packages/pipeline'],
    agents: ['character'],
    pipelineStages: ['02_cutouts'],
    status: 'partial',
    agentOutputs: ['cutout-alpha.png', 'segmentation-mask.png', 'cutting-report.json'],
    gapFr: 'Pas de preview 3D ; pas d’options par mesh/bone.',
  },
  {
    id: 'godot.scene_tree',
    godotFeature: 'Scene tree — hiérarchie Node parent/enfant',
    godotDocPath: 'getting_started/step_by_step/nodes_and_scenes.html',
    ellipseEquivalent: 'GDL entities[] + scenes[] + scene.veloria layout',
    ellipsePackages: ['packages/shared', 'packages/engine'],
    agents: ['level', 'gameplay', 'integration'],
    pipelineStages: [],
    status: 'partial',
    agentOutputs: ['gdl.json scenes/entities', 'scene-assembly.json'],
    gapFr: 'Pas d’éditeur arbre visuel ; SceneEditorTab = plateformes seulement.',
  },
  {
    id: 'godot.scene_inheritance',
    godotFeature: 'Scène héritée — extends sans casser la base',
    godotDocPath: 'tutorials/scripting/scene_unique_nodes.html',
    ellipseEquivalent: 'GDL mergeGameplayTemplate + gdl-edit patches',
    ellipsePackages: ['packages/shared'],
    agents: ['gameplay', 'integration'],
    pipelineStages: [],
    status: 'partial',
    agentOutputs: ['gdl_patches[]', 'merged GDL'],
    gapFr: 'Pas de UI « instancier scène » ; merge JSON seulement.',
  },
  {
    id: 'godot.skeleton2d',
    godotFeature: 'Skeleton2D + Bone2D + rest pose + skin weights',
    godotDocPath: 'tutorials/animation/2d_skeletons.html',
    ellipseEquivalent: '04_rig/rig.json + runtime_atlas (cible godot-2d-skeleton)',
    ellipsePackages: ['packages/pipeline', 'packages/engine'],
    agents: ['animation', 'character'],
    pipelineStages: ['04_rig', '05_animation'],
    status: 'stub',
    agentOutputs: ['rig.json bones/pivots', 'anim-state-machine.json', 'export godot_scene.tscn (futur)'],
    gapFr: 'Engine lit strip plat — pas de déformation Bone2D.',
  },
  {
    id: 'godot.animation_player',
    godotFeature: 'AnimationPlayer — clips, blend, timeline',
    godotDocPath: 'tutorials/animation/introduction.html',
    ellipseEquivalent: 'GDL assets/animations + anim-state-machine.json',
    ellipsePackages: ['packages/engine', 'packages/shared'],
    agents: ['animation'],
    pipelineStages: ['05_animation'],
    status: 'partial',
    agentOutputs: ['spritesheet-*.png', 'animation clips metadata'],
    gapFr: 'Pas de timeline Studio ; pas de blend trees.',
  },
  {
    id: 'godot.sprite_frames',
    godotFeature: 'SpriteFrames — grille animations 2D',
    godotDocPath: 'classes/class_spriteframes.html',
    ellipseEquivalent: '06_exports/runtime_atlas.json + frame rects',
    ellipsePackages: ['packages/pipeline'],
    agents: ['animation', 'integration'],
    pipelineStages: ['06_exports'],
    status: 'implemented',
    agentOutputs: ['runtime_atlas.png', 'runtime_atlas.json'],
    gapFr: 'Format propriétaire JSON, pas .tres Godot.',
  },
  {
    id: 'godot.signals',
    godotFeature: 'Signals — événements entre nœuds',
    godotDocPath: 'getting_started/step_by_step/signals.html',
    ellipseEquivalent: 'SimEvent[] + GDL systems hooks',
    ellipsePackages: ['packages/engine'],
    agents: ['gameplay', 'integration'],
    pipelineStages: [],
    status: 'partial',
    agentOutputs: ['sim events: collect, damage, win, scene_change'],
    gapFr: 'Pas de bus signal déclaratif GDL ; events code-only.',
  },
  {
    id: 'godot.autoload',
    godotFeature: 'Autoload / Singleton — services globaux',
    godotDocPath: 'tutorials/scripting/singletons_autoload.html',
    ellipseEquivalent: 'GDL meta + systems[] + veloria state',
    ellipsePackages: ['packages/engine', 'packages/shared'],
    agents: ['gameplay', 'integration'],
    pipelineStages: [],
    status: 'partial',
    agentOutputs: ['systems[] registry', 'meta.veloria_runtime'],
    gapFr: 'Pas de couche singleton explicite (audio bus, game state).',
  },
  {
    id: 'godot.tilemap',
    godotFeature: 'TileMap / TileSet — collision + layers',
    godotDocPath: 'tutorials/2d/using_tilemaps.html',
    ellipseEquivalent: 'layout.platforms + TilemapLayer (engine) + world-factory',
    ellipsePackages: ['packages/engine', 'packages/shared'],
    agents: ['level', 'decor'],
    pipelineStages: ['06_exports'],
    status: 'partial',
    agentOutputs: ['tileset PNG', 'collision map', 'GDL layout platforms'],
    gapFr: 'tile_collision non simulé ; pas d’éditeur tilemap Studio.',
  },
  {
    id: 'godot.remote_transform',
    godotFeature: 'RemoteTransform2D — caméra suit joueur',
    godotDocPath: 'classes/class_remotetransform2d.html',
    ellipseEquivalent: 'camera_follow (rendu) + updateCamera engine',
    ellipsePackages: ['packages/engine'],
    agents: ['camera', 'integration'],
    pipelineStages: [],
    status: 'partial',
    agentOutputs: ['camera offset GDL', 'preview follow'],
    gapFr: 'Déclaré GDL mais pas gated systems[].',
  },
  {
    id: 'godot.export_presets',
    godotFeature: 'Export presets — HTML5, mobile, desktop',
    godotDocPath: 'tutorials/export/exporting_projects.html',
    ellipseEquivalent: 'BuildTab + /export/html5 + evaluateProjectExportQaGate',
    ellipsePackages: ['packages/orchestrator', 'packages/studio'],
    agents: ['qa', 'integration'],
    pipelineStages: ['07_qa'],
    status: 'partial',
    agentOutputs: ['07_exports/web/', 'export blocked if QA fail'],
    gapFr: 'Pas d’export .pck Godot natif (godot_adapter stub).',
  },
  {
    id: 'godot.godot_adapter',
    godotFeature: 'Projet Godot natif (.tscn, .godot)',
    godotDocPath: 'tutorials/export/exporting_projects.html',
    ellipseEquivalent: 'durable-workflows automation_targets: godot_adapter',
    ellipsePackages: ['packages/orchestrator'],
    agents: ['integration', 'gameplay'],
    pipelineStages: ['06_exports'],
    status: 'planned',
    agentOutputs: ['res://scenes/main.tscn', 'SpriteFrames import', 'project.godot'],
    gapFr: 'Mentionné workflows ; aucun convertisseur GDL→Godot.',
  },
] as const;

export function getGodotParityByStatus(status: GodotParityStatus): GodotParityFeature[] {
  return GODOT_PARITY_REGISTRY.filter((f) => f.status === status);
}

export function getGodotParityForAgent(agent: AgentType): GodotParityFeature[] {
  return GODOT_PARITY_REGISTRY.filter((f) => f.agents.includes(agent));
}

/** Tâches agent suggérées pour combler une feature Godot (injectable MasterAI). */
export function buildGodotParityAgentTasks(featureId: string): string[] {
  const f = GODOT_PARITY_REGISTRY.find((x) => x.id === featureId);
  if (!f) return [];
  const tasks: string[] = [];
  if (f.status === 'stub' || f.status === 'planned') {
    tasks.push(`[${f.agents.join('+')}] Implémenter ${f.ellipseEquivalent} (parité ${f.godotFeature})`);
    tasks.push(`Livrables: ${f.agentOutputs.join(', ')}`);
  }
  if (f.pipelineStages.length) {
    tasks.push(`Exécuter stages: ${f.pipelineStages.join(' → ')}`);
  }
  return tasks;
}

/** Résumé pour RAG / Cortex — densité agents. */
export function summarizeGodotParityForAgents(): string {
  const lines = ['# Parité Godot → Ellipse (agents)'];
  for (const f of GODOT_PARITY_REGISTRY) {
    lines.push(
      `- **${f.godotFeature}** [${f.status}] → ${f.ellipseEquivalent} | agents: ${f.agents.join(', ')} | ${f.gapFr}`,
    );
  }
  return lines.join('\n');
}
