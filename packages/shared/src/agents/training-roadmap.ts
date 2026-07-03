/**
 * Roadmap renforcement & entraînement IA/agents — phases, métriques, curriculum.
 */
import type { AgentType } from './catalog.js';

export interface TrainingPhase {
  id: string;
  order: number;
  labelFr: string;
  horizon: string;
  objectiveFr: string;
  successMetrics: string[];
  agentFocus: AgentType[];
  workspaceArtifacts: string[];
  trainingDrills: TrainingDrill[];
}

export interface TrainingDrill {
  id: string;
  labelFr: string;
  command?: string;
  handler?: string;
  passCriteriaFr: string;
}

export const TRAINING_ROADMAP_PHASES: readonly TrainingPhase[] = [
  {
    id: 'P0_foundation',
    order: 0,
    labelFr: 'Fondations — mémoire & scoring',
    horizon: 'Semaine 1–2',
    objectiveFr: 'Unifier score 0–100 par étape workflow, mémoire agents, retry automatique.',
    successMetrics: ['100% steps ont passScore', 'agent-memory.jsonl écrit sur échec', 'autonomous-workflow-report.json'],
    agentFocus: ['producer', 'qa', 'integration', 'character'],
    workspaceArtifacts: ['08_ops/workflow-runs/', '08_ops/telemetry/agent-memory.jsonl', '08_ops/manifests/autonomous-workflow-report.json'],
    trainingDrills: [
      { id: 'assess_only', labelFr: 'Évaluer sans exécuter', command: 'pnpm training:assess', passCriteriaFr: '14 scores calculés' },
      { id: 'retry_loop', labelFr: 'Retry 3× sur asset IoU', handler: 'asset:retouch', passCriteriaFr: 'IoU ≥ 0.55 ou awaiting_human' },
    ],
  },
  {
    id: 'P1_perception',
    order: 1,
    labelFr: 'Perception — image → asset manipulable',
    horizon: 'Semaine 3–5',
    objectiveFr: 'Maîtriser cutout, hybrid, inpaint ; rejeter pixel soup ; F2 rig engine.',
    successMetrics: ['IoU shipping ≥ 0.72 sur 90% héros', 'CorpsPreview + skeletal2d runtime', '0 placeholder en GDL player'],
    agentFocus: ['character', 'animation', 'decor'],
    workspaceArtifacts: ['02_cutouts/', '04_rig/rig.json', '06_exports/runtime_atlas.json'],
    trainingDrills: [
      { id: 'floodfill_100', labelFr: '100 cutouts flood-fill', handler: 'segment_floodfill', passCriteriaFr: 'removed_ratio > 0.15' },
      { id: 'inpaint_shipping', labelFr: 'Shipping pass Veloria', command: 'pnpm veloria:shipping', passCriteriaFr: '29/29 IoU ≥ 0.72' },
      { id: 'lot0_photo', labelFr: 'Lot0 depuis photo', handler: 'create_lot0_photo', passCriteriaFr: 'learning score ≥ 60' },
    ],
  },
  {
    id: 'P2_gameplay_code',
    order: 2,
    labelFr: 'Gameplay & code data-driven',
    horizon: 'Semaine 6–8',
    objectiveFr: 'systems[] complets, Veloria parité sim, patches GDL sans régression.',
    successMetrics: ['validateGdl score ≥ 80', '26/26 tests engine', 'lane_runner + wave_spawner actifs'],
    agentFocus: ['gameplay', 'economy', 'level', 'integration'],
    workspaceArtifacts: ['05_runtime/gdl/*.gdl.json', '08_ops/manifests/mechanics-audit.json'],
    trainingDrills: [
      { id: 'mechanics_audit', labelFr: 'Audit mécaniques', command: 'pnpm mechanics:audit', passCriteriaFr: '0 système manquant engine' },
      { id: 'gdl_patch', labelFr: '10 itérations GDL', handler: 'iterate:gameplay', passCriteriaFr: 'scoreGdl ≥ 75' },
      { id: 'playtest_24', labelFr: 'Playtest 24 runs', handler: 'qa:playtest', passCriteriaFr: 'win rate ≥ 25%' },
    ],
  },
  {
    id: 'P3_narrative_npc',
    order: 3,
    labelFr: 'Narrative, PNJ & routines',
    horizon: 'Semaine 9–11',
    objectiveFr: 'Story graph, dialogues triggers, NPC schedules (data), quêtes secondaires.',
    successMetrics: ['gdl.narrative ≥ 3 dialogues', '≥ 2 NPC entities', 'gate cohérence narrative'],
    agentFocus: ['narrative', 'ui', 'gameplay'],
    workspaceArtifacts: ['gdl.narrative', 'story-architecture.json', '02_design/specs/npc-routines.json'],
    trainingDrills: [
      { id: 'narrative_pack', labelFr: 'Pack narratif complet', handler: 'iterate:narrative', passCriteriaFr: 'quests + dialogues' },
      { id: 'npc_routines', labelFr: 'Schedules PNJ', handler: 'iterate:npc_routines', passCriteriaFr: 'npc_schedule par PNJ' },
      { id: 'dialogue_triggers', labelFr: 'Triggers scène', handler: 'iterate:narrative_dialogue', passCriteriaFr: 'trigger par dialogue' },
    ],
  },
  {
    id: 'P4_enemy_ai',
    order: 4,
    labelFr: 'IA ennemis & boss',
    horizon: 'Semaine 12–14',
    objectiveFr: 'Vagues, lanes, phases boss, hazards ; équilibrage playtest.',
    successMetrics: ['encounters par arène', 'boss_phases ≥ 2', 'soft cap 5 respecté'],
    agentFocus: ['gameplay', 'level', 'vfx'],
    workspaceArtifacts: ['scenes/*/veloria.encounters', 'meta.hazard_scripts'],
    trainingDrills: [
      { id: 'wave_tables', labelFr: 'Tables de vagues', handler: 'iterate:enemy_waves', passCriteriaFr: '12 vagues Veloria-like' },
      { id: 'boss_script', labelFr: 'Script boss 3 phases', handler: 'iterate:boss_phases', passCriteriaFr: 'phase transitions en sim' },
      { id: 'balance_loop', labelFr: 'Boucle balance', handler: 'iterate:gameplay_balance', passCriteriaFr: 'avg_health ≥ 2 après 24 runs' },
    ],
  },
  {
    id: 'P5_shipping',
    order: 5,
    labelFr: 'Shipping multi-cible & agents autonomes',
    horizon: 'Semaine 15–18',
    objectiveFr: 'Export HTML5/PWA/Godot, intent gate, workflow autonome bout-en-bout.',
    successMetrics: ['export sans 422', '14/14 steps passed', 'integrableArtifacts ≥ 5'],
    agentFocus: ['integration', 'qa', 'character'],
    workspaceArtifacts: ['07_exports/', '07_exports/godot/', 'intent-contract.json'],
    trainingDrills: [
      { id: 'full_autonomous', labelFr: 'Run autonome 14 steps', command: 'pnpm training:autonomous', passCriteriaFr: 'status completed' },
      { id: 'godot_export', labelFr: 'Export Godot', handler: 'export:godot', passCriteriaFr: 'project.godot + main.tscn' },
      { id: 'revolution_roadmap', labelFr: 'Suite révolution', command: 'pnpm roadmap:revolution', passCriteriaFr: 'tests green' },
    ],
  },
] as const;

export interface TrainingProgressSnapshot {
  generated_at: string;
  current_phase_id: string;
  phase_scores: Record<string, number>;
  drills_completed: string[];
  agent_training_hours_estimate: number;
  next_drills: string[];
}

export function formatTrainingRoadmapForAgents(agent?: AgentType): string {
  const phases = agent
    ? TRAINING_ROADMAP_PHASES.filter((p) => p.agentFocus.includes(agent))
    : TRAINING_ROADMAP_PHASES;

  const lines = [
    '## Roadmap entraînement agents Ellipse',
    '',
    'Boucle d\'apprentissage : Drill → Score → Mémoire → Retry → Étape suivante.',
    '',
    ...phases.flatMap((p) => [
      `### ${p.id} — ${p.labelFr} (${p.horizon})`,
      p.objectiveFr,
      'Métriques :',
      ...p.successMetrics.map((m) => `- ${m}`),
      'Drills :',
      ...p.trainingDrills.map((d) => `- ${d.id}: ${d.labelFr} — ${d.passCriteriaFr}${d.command ? ` [${d.command}]` : ''}`),
      '',
    ]),
  ];
  return lines.join('\n');
}

/** Étapes workflow autonome → phase curriculum. */
const STEP_TO_PHASE: Record<string, string> = {
  design_brief: 'P0_foundation',
  narrative_world: 'P3_narrative_npc',
  asset_pipeline: 'P1_perception',
  animation_motion: 'P1_perception',
  level_scenes: 'P2_gameplay_code',
  gameplay_systems: 'P2_gameplay_code',
  enemy_ai: 'P4_enemy_ai',
  npc_routines: 'P3_narrative_npc',
  audio_soundscape: 'P2_gameplay_code',
  ui_hud: 'P2_gameplay_code',
  vfx_juice: 'P4_enemy_ai',
  integration_runtime: 'P5_shipping',
  qa_playtest: 'P0_foundation',
  export_delivery: 'P5_shipping',
};

export function recommendCurrentTrainingPhase(stepScores: Record<string, number>): string {
  const avg = Object.values(stepScores).reduce((a, b) => a + b, 0) / Math.max(Object.keys(stepScores).length, 1);
  if (avg >= 85) return 'P5_shipping';
  if (avg >= 70) return 'P4_enemy_ai';
  if (avg >= 55) return 'P2_gameplay_code';
  if (avg >= 40) return 'P1_perception';
  return 'P0_foundation';
}

export function buildTrainingProgressSnapshot(
  stepScores: Record<string, number>,
  drillsCompleted: string[] = [],
): TrainingProgressSnapshot {
  const phaseScores: Record<string, number> = {};
  for (const phase of TRAINING_ROADMAP_PHASES) {
    const relatedSteps = Object.entries(STEP_TO_PHASE)
      .filter(([, pid]) => pid === phase.id)
      .map(([sid]) => sid);
    const scores = relatedSteps.map((s) => stepScores[s]).filter((n) => n != null) as number[];
    phaseScores[phase.id] =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  const currentPhaseId = recommendCurrentTrainingPhase(stepScores);
  const currentPhase = TRAINING_ROADMAP_PHASES.find((p) => p.id === currentPhaseId);
  const nextDrills =
    currentPhase?.trainingDrills.filter((d) => !drillsCompleted.includes(d.id)).map((d) => d.id) ?? [];

  return {
    generated_at: new Date().toISOString(),
    current_phase_id: currentPhaseId,
    phase_scores: phaseScores,
    drills_completed: drillsCompleted,
    agent_training_hours_estimate: Math.round(Object.keys(stepScores).length * 0.5 * 10) / 10,
    next_drills: nextDrills.slice(0, 5),
  };
}

export function buildTrainingRoadmapManifest(): {
  version: string;
  generated_at: string;
  phases: readonly TrainingPhase[];
  curriculum_note_fr: string;
} {
  return {
    version: '1',
    generated_at: new Date().toISOString(),
    phases: TRAINING_ROADMAP_PHASES,
    curriculum_note_fr:
      'Boucle : Drill → Score étape → Mémoire agent → Retry (max 3–5) → Phase suivante. Corpus injecté via formatAgentSkillsForContext.',
  };
}
