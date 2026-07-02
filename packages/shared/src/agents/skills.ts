/**
 * Compétences denses par agent — injectées dans TaskSpec.context via MasterAI.
 * Source unique pour playbooks, directives fidelity et chaînes de correction.
 */
import type { AgentType } from './catalog.js';
import { formatImagePlaybookForAgents } from './image-playbook.js';
import { formatAgentKnowledgeCorpus } from './agent-knowledge-corpus.js';
import { formatTrainingRoadmapForAgents } from './training-roadmap.js';

export interface AgentSkillProfile {
  agent: AgentType;
  mission: string;
  directives: string[];
  reports_to: AgentType | 'master';
  collaborates_with: AgentType[];
  auto_correct_triggers: string[];
  fidelity_rules: string[];
}

const SHARED_FIDELITY = [
  'IoU pass ≥ 0.42, strong ≥ 0.55, shipping ≥ 0.72 vs planche concept.',
  'Ne jamais shipper procédural seul si IoU < 0.55 — hybrid board obligatoire.',
  'Écrire agent_notes avec method, iou, next_engine (concept_fidelity_engine | qa_compliance_engine).',
];

export const AGENT_SKILL_PROFILES: Record<AgentType, AgentSkillProfile> = {
  character: {
    agent: 'character',
    mission: 'Sprites personnage fidèles planche — cutout, hybrid, atlas runtime (parité Godot Import + PostImport).',
    directives: [
      'Prioriser board-cutout-reference.png comme vérité silhouette.',
      'Si recovery_hints contient fidelity — relancer hybrid overlay ou generateHeroRuntimePack.',
      'Patches GDL : entities/player/assets sprite, frame_count, atlas.',
      'Stage 02 = flood-fill extractSubject (ellipse-extract-subject-v1), jamais crop rect seul.',
      'IoU 0.42–0.55 → retouch_hybrid_board ; IoU 0.55–0.72 → retouch_inpaint_cpu (stage 08).',
      'Action retouch_image : autoRetouchAssetPack selon dernier qa-report IoU.',
      'Action create_image sans photo → create_procedural ; avec photo → create_lot0_photo.',
      'Après 03_cleanup : hook post-import — parts nommées, pivots, import-preset.json.',
    ],
    reports_to: 'master',
    collaborates_with: ['animation', 'qa', 'integration'],
    auto_correct_triggers: ['fidelity:iou', 'missing cutout', 'human_qc_required', 'retouch_required'],
    fidelity_rules: SHARED_FIDELITY,
  },
  decor: {
    agent: 'decor',
    mission: 'Arènes, tilesets, fonds — lisibilité mobile vertical dark fantasy.',
    directives: [
      'Palette or/violet/carmin, contraste lanes 3 voies.',
      'Environnement = planche hybrid si cutout disponible.',
      'Patch GDL scenes/*/background image + alpha.',
      'Arènes statiques : retouch_enhance ou retouch_inpaint_cpu (role environment).',
      'IoU faible sur décor → inpaint CPU stage 08 avant export atlas.',
    ],
    reports_to: 'master',
    collaborates_with: ['level', 'lighting', 'integration'],
    auto_correct_triggers: ['missing background', 'fidelity:iou'],
    fidelity_rules: SHARED_FIDELITY,
  },
  animation: {
    agent: 'animation',
    mission: 'Clips idle/run/attack, state machine, synchro atlas — parité Godot Skeleton2D + SpriteFrames.',
    directives: [
      'Frames depuis runtime-manifest clips.',
      'Patch GDL assets/animations.',
      'Produire rig.json hiérarchie Bone2D-like (parent, pivot, rotation) — cf. godot-parity-registry skeleton2d.',
      'Rest pose = frame 0 idle ; exporter anim-state-machine.json compatible transitions Godot.',
      'Ne pas aplatir en strip si rig multi-parts — préparer export godot_scene.tscn (planned).',
    ],
    reports_to: 'character',
    collaborates_with: ['character', 'integration'],
    auto_correct_triggers: ['frame_count mismatch', 'missing rig.json', 'bone_setup_changed'],
    fidelity_rules: ['Aligner frame_count atlas avec GDL player.', 'Pivots cohérents avec 04_rig/rig.json.'],
  },
  level: {
    agent: 'level',
    mission: 'Scènes, lanes, vagues, boss phases, hazards, collision data-driven.',
    directives: [
      'Veloria : 6 arènes, 12 vagues, blessing_breaks 3/6/9, lane_meta 3 voies.',
      'scene.veloria.encounters + layout.lane_meta obligatoires pour survivors.',
      'Max 5 ennemis simultanés — soft cap dans encounters design.',
      'Wireframe → anchors → collision_map JSON, jamais peint dans le fond.',
      'Parallax : foreground/playfield/background séparés en entities ou scene layers.',
    ],
    reports_to: 'master',
    collaborates_with: ['gameplay', 'decor', 'qa'],
    auto_correct_triggers: ['invalid scene', 'missing veloria', 'missing encounters'],
    fidelity_rules: [],
  },
  mesh_3d: {
    agent: 'mesh_3d',
    mission: 'Meshes stub GLB Phase 2.',
    directives: ['Lot 0 mesh-from-silhouette si demandé 2.5d.'],
    reports_to: 'master',
    collaborates_with: ['character', 'lighting'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  lighting: {
    agent: 'lighting',
    mission: 'Ambiance, tint scène, post-process léger.',
    directives: ['Tint GDL background si mood dark fantasy.'],
    reports_to: 'decor',
    collaborates_with: ['decor', 'camera'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  camera: {
    agent: 'camera',
    mission: 'Mode caméra top_down / follow pour survivors vertical.',
    directives: ['Veloria : camera.mode top_down, résolution 720×1280.'],
    reports_to: 'level',
    collaborates_with: ['gameplay', 'integration'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  gameplay: {
    agent: 'gameplay',
    mission: 'Systèmes GDL, IA ennemis, équilibrage, boucle core — data-driven sans hardcode.',
    directives: [
      'Déclarer systems[] explicites — pas seulement meta.',
      'Veloria : physics_topdown + lane_runner + wave_spawner + blessing_draft + hazard_scheduler + boss_phases + auto_attack.',
      'enemy_ai : patrol { range, speed } sur entités enemy ; wave tables dans scene.veloria.encounters.',
      'Utiliser createSurvivorsEnemyAiPack() comme base patches narrative.enemy_ai.',
      'Après playtest faible : iterate:gameplay_balance — ajuster HP, spawn_interval, dégâts.',
      'Patches : /systems, /entities, /scenes/0/veloria, meta.hazard_scripts.',
    ],
    reports_to: 'master',
    collaborates_with: ['level', 'integration', 'qa', 'vfx'],
    auto_correct_triggers: ['validate_gdl systems missing', 'playtest low win rate', 'enemy_ai missing'],
    fidelity_rules: ['Win rate playtest ≥ 25% avant shipping.'],
  },
  narrative: {
    agent: 'narrative',
    mission: 'Histoire, quêtes, dialogues, PNJ — canon cohérent dark fantasy.',
    directives: [
      'Patch gdl.narrative : intro, quests[], dialogues[] avec id/speaker/text/next/trigger.',
      'PNJ : entities npc__* + mergeNpcRoutinesIntoGdl — schedules idle/walk/talk.',
      'Triggers : enter_zone, quest_complete, player_proximity → open_dialogue.',
      'Veloria : lore Veille des Lames, blessings flavor, boss barks.',
      'Gate : ≥3 dialogues, cohérence genre survivors_like ou narrative template.',
    ],
    reports_to: 'master',
    collaborates_with: ['ui', 'gameplay', 'level'],
    auto_correct_triggers: ['narrative missing', 'dialogue orphan', 'npc_no_schedule'],
    fidelity_rules: [],
  },
  music: {
    agent: 'music',
    mission: 'BGM tension montante, loop seamless.',
    directives: ['Patch gdl.audio.bgm ou meta.audio.bgm URL workspace.'],
    reports_to: 'master',
    collaborates_with: ['sfx', 'integration'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  sfx: {
    agent: 'sfx',
    mission: 'SFX combat, collect, damage, victory.',
    directives: ['gdl.audio.sfx map jump/collect/hit/hurt/victory.'],
    reports_to: 'master',
    collaborates_with: ['music', 'gameplay'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  ui: {
    agent: 'ui',
    mission: 'HUD PV, vague, timer, draft bénédictions.',
    directives: ['Veloria : HUD minimal portrait, touches 1-3 draft.'],
    reports_to: 'master',
    collaborates_with: ['gameplay', 'integration'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  vfx: {
    agent: 'vfx',
    mission: 'FX holy slash, collapse hazard, hit sparks.',
    directives: ['Déclarer hazards visuels si vfx demandé.'],
    reports_to: 'gameplay',
    collaborates_with: ['decor'],
    auto_correct_triggers: [],
    fidelity_rules: [],
  },
  qa: {
    agent: 'qa',
    mission: 'Valider GDL, playtest synthétique, gates export — orchestrer retry agents amont.',
    directives: [
      'validateGdl + scoreGdl ≥ 80 avant integration step pass.',
      'runSyntheticPlaytest 24 runs — win rate, avg_health, avg_score.',
      'Échec → recovery_hints : character|gameplay|integration + handler iterate:*.',
      'Vérifier systems Veloria, asset_atlas URLs, intent-contract alignment.',
      'Workflow autonome : bloquer export_delivery si score < 85.',
    ],
    reports_to: 'master',
    collaborates_with: ['integration', 'character', 'gameplay'],
    auto_correct_triggers: ['GDL invalid', 'export_blocked', 'playtest fail'],
    fidelity_rules: ['Bloquer export si qa-report passed=false dans 03_assets.', 'IoU shipping 0.72.'],
  },
  integration: {
    agent: 'integration',
    mission: 'Assemblage final GDL, preview, export HTML5/PWA.',
    directives: [
      'Vérifier gate export QA avant PWA.',
      'Câbler meta.asset_atlas depuis registry generated-assets-hd.json.',
    ],
    reports_to: 'master',
    collaborates_with: ['qa', 'character', 'decor', 'gameplay'],
    auto_correct_triggers: ['export_blocked', '422'],
    fidelity_rules: [],
  },
};

export function formatAgentSkillsForContext(agent: AgentType): string {
  const p = AGENT_SKILL_PROFILES[agent];
  const imagePlaybook =
    agent === 'character' || agent === 'decor' || agent === 'animation' || agent === 'qa'
      ? formatImagePlaybookForAgents(agent)
      : '';
  const knowledge = formatAgentKnowledgeCorpus(agent);
  const training = formatTrainingRoadmapForAgents(agent);
  return [
    `## Agent ${p.agent}`,
    `Mission: ${p.mission}`,
    'Directives:',
    ...p.directives.map((d) => `- ${d}`),
    p.fidelity_rules.length ? `Fidelity:\n${p.fidelity_rules.map((r) => `- ${r}`).join('\n')}` : '',
    imagePlaybook,
    training,
    knowledge,
    `Collaboration: ${p.collaborates_with.join(', ')}`,
    `Auto-correct si: ${p.auto_correct_triggers.join(', ') || 'n/a'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getAgentsForAutoCorrect(trigger: string): AgentType[] {
  const hits: AgentType[] = [];
  for (const [id, profile] of Object.entries(AGENT_SKILL_PROFILES)) {
    if (profile.auto_correct_triggers.some((t) => trigger.toLowerCase().includes(t.toLowerCase()))) {
      hits.push(id as AgentType);
    }
  }
  return hits;
}
