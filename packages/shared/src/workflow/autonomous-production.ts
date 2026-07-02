/**
 * Workflow de production autonome — toutes les dimensions du jeu.
 * Chaque étape : score 0–100, seuil de passage, retry, actions proposées.
 */
import type { GameProjectSnapshot } from '../game-factory.js';
import type { GameDefinition } from '../index.js';
import { validateGdl } from '../gdl/validate.js';
import { isEngineImplementedSystem } from '../gdl/mechanics-registry.js';
import { buildProductionRecipe } from '../catalog/production-recipe.js';

export type ProductionDomain =
  | 'design'
  | 'narrative'
  | 'assets'
  | 'animation'
  | 'level'
  | 'gameplay'
  | 'enemy_ai'
  | 'npc'
  | 'audio'
  | 'ui'
  | 'vfx'
  | 'integration'
  | 'qa'
  | 'export';

export interface AutonomousActionTemplate {
  id: string;
  labelFr: string;
  descriptionFr: string;
  /** Handler orchestrator — ex. iterate:narrative, asset:pipeline, qa:playtest */
  handler: string;
  priority: number;
}

export interface AutonomousStepDefinition {
  id: string;
  order: number;
  domain: ProductionDomain;
  labelFr: string;
  descriptionFr: string;
  ownerAgent: string;
  passScore: number;
  maxAttempts: number;
  deliverables: string[];
  /** Actions disponibles si score insuffisant */
  actionTemplates: AutonomousActionTemplate[];
}

export interface ProposedAction {
  id: string;
  labelFr: string;
  descriptionFr: string;
  handler: string;
  reasonFr: string;
}

export interface AutonomousEvalContext {
  snapshot: GameProjectSnapshot;
  gdl?: GameDefinition | null;
  playtest?: { wins: number; losses: number; avg_score: number; avg_health: number } | null;
  exportBlocked?: boolean;
}

export interface StepScoreResult {
  stepId: string;
  score: number;
  passScore: number;
  passed: boolean;
  detailFr: string;
  gaps: string[];
  deliverablesFound: string[];
  deliverablesMissing: string[];
}

export interface AutonomousStepState extends StepScoreResult {
  status: 'pending' | 'running' | 'passed' | 'retrying' | 'blocked' | 'awaiting_human';
  attempts: number;
  maxAttempts: number;
  proposedActions: ProposedAction[];
  lastAction?: string;
  lastError?: string;
}

export interface AutonomousWorkflowRun {
  runId: string;
  projectId: string;
  status: 'idle' | 'running' | 'completed' | 'awaiting_human' | 'failed';
  currentStepId: string;
  steps: Record<string, AutonomousStepState>;
  integrableArtifacts: IntegrableArtifact[];
  startedAt?: string;
  updatedAt: string;
}

export interface IntegrableArtifact {
  kind: string;
  path: string;
  domain: ProductionDomain;
  validated: boolean;
}

/** Pipeline complet — assets + code + animation + histoire + PNJ + IA ennemis + audio + export */
export const AUTONOMOUS_PRODUCTION_STEPS: readonly AutonomousStepDefinition[] = [
  {
    id: 'design_brief',
    order: 1,
    domain: 'design',
    labelFr: 'Brief & contrat design',
    descriptionFr: 'GDD, intent contract, genre et mécaniques verrouillés.',
    ownerAgent: 'producer',
    passScore: 70,
    maxAttempts: 3,
    deliverables: ['documents', 'intent-contract.json', 'prompts'],
    actionTemplates: [
      { id: 'gen_docs', labelFr: 'Générer documents fondateurs', descriptionFr: 'Pitch + GDD via itération agents', handler: 'iterate:design', priority: 1 },
      { id: 'gen_intent', labelFr: 'Dériver contrat d\'intention', descriptionFr: 'intent-contract.json depuis prompt', handler: 'intent:derive', priority: 2 },
    ],
  },
  {
    id: 'narrative_world',
    order: 2,
    domain: 'narrative',
    labelFr: 'Histoire & arcs narratifs',
    descriptionFr: 'Story graph, quêtes, lore, dialogues clés.',
    ownerAgent: 'narrative',
    passScore: 65,
    maxAttempts: 4,
    deliverables: ['narrative pack', 'gdl.narrative', 'story documents'],
    actionTemplates: [
      { id: 'gen_narrative', labelFr: 'Générer pack narratif', descriptionFr: 'Agent narrative → GDL / documents', handler: 'iterate:narrative', priority: 1 },
      { id: 'gen_dialogues', labelFr: 'Écrire dialogues triggers', descriptionFr: 'Branches et triggers scène', handler: 'iterate:narrative_dialogue', priority: 2 },
    ],
  },
  {
    id: 'asset_pipeline',
    order: 3,
    domain: 'assets',
    labelFr: 'Assets validés (QA IoU)',
    descriptionFr: 'Personnages, décors, props — gate 07_qa passée.',
    ownerAgent: 'character',
    passScore: 72,
    maxAttempts: 5,
    deliverables: ['07_qa/qa-report.json passed', 'runtime_atlas', 'approved assets'],
    actionTemplates: [
      { id: 'run_cutouts', labelFr: 'Lancer détourage (02)', descriptionFr: 'Flood-fill + segmentation', handler: 'asset:stage:02_cutouts', priority: 1 },
      { id: 'run_cleanup', labelFr: 'Cleanup + rig (03→06)', descriptionFr: 'Pipeline complet asset', handler: 'asset:pipeline', priority: 2 },
      { id: 'retouch_inpaint', labelFr: 'Retouche auto IoU', descriptionFr: 'Hybrid/inpaint CPU stage 08', handler: 'asset:retouch', priority: 3 },
    ],
  },
  {
    id: 'animation_motion',
    order: 4,
    domain: 'animation',
    labelFr: 'Animation & rig runtime',
    descriptionFr: 'rig.json, clips idle/run/attack, state machine.',
    ownerAgent: 'animation',
    passScore: 68,
    maxAttempts: 4,
    deliverables: ['04_rig/rig.json', '05_animation', 'anim-state-machine.json'],
    actionTemplates: [
      { id: 'run_anim', labelFr: 'Générer spritesheets', descriptionFr: 'Stage 05 animation', handler: 'asset:stage:05_animation', priority: 1 },
      { id: 'bind_rig', labelFr: 'Valider rig + atlas', descriptionFr: 'Agent animation patches GDL', handler: 'iterate:animation', priority: 2 },
    ],
  },
  {
    id: 'level_scenes',
    order: 5,
    domain: 'level',
    labelFr: 'Niveaux & scènes',
    descriptionFr: 'Layouts, lanes, encounters, collisions, triggers.',
    ownerAgent: 'level',
    passScore: 70,
    maxAttempts: 4,
    deliverables: ['gdl.scenes', 'collision', 'encounters'],
    actionTemplates: [
      { id: 'gen_level', labelFr: 'Assembler scènes GDL', descriptionFr: 'Agent level + wireframe', handler: 'iterate:level', priority: 1 },
      { id: 'validate_flow', labelFr: 'Valider traversabilité', descriptionFr: 'Smoke layout', handler: 'qa:layout', priority: 2 },
    ],
  },
  {
    id: 'gameplay_systems',
    order: 6,
    domain: 'gameplay',
    labelFr: 'Systèmes & code gameplay',
    descriptionFr: 'systems[] implémentés, boucle de jeu, mécaniques genre.',
    ownerAgent: 'gameplay',
    passScore: 75,
    maxAttempts: 4,
    deliverables: ['gdl.systems', 'components', 'mechanics implemented'],
    actionTemplates: [
      { id: 'gen_systems', labelFr: 'Déclarer & brancher systèmes', descriptionFr: 'Agent gameplay patches GDL', handler: 'iterate:gameplay', priority: 1 },
      { id: 'codegen_bind', labelFr: 'Intégration runtime', descriptionFr: 'Agent integration preview', handler: 'iterate:integration', priority: 2 },
    ],
  },
  {
    id: 'enemy_ai',
    order: 7,
    domain: 'enemy_ai',
    labelFr: 'IA ennemis & vagues',
    descriptionFr: 'Patrol, aggro, boss phases, wave_spawner, lane_runner.',
    ownerAgent: 'gameplay',
    passScore: 70,
    maxAttempts: 4,
    deliverables: ['enemy entities', 'wave_spawner', 'boss_phases', 'patrol components'],
    actionTemplates: [
      { id: 'gen_waves', labelFr: 'Configurer vagues & lanes', descriptionFr: 'Veloria encounters / wave tables', handler: 'iterate:enemy_waves', priority: 1 },
      { id: 'gen_boss', labelFr: 'Phases boss', descriptionFr: 'boss_phases + hazard_scheduler', handler: 'iterate:boss_phases', priority: 2 },
    ],
  },
  {
    id: 'npc_routines',
    order: 8,
    domain: 'npc',
    labelFr: 'PNJ & routines',
    descriptionFr: 'NPCs, horaires, dialogues, quêtes secondaires.',
    ownerAgent: 'narrative',
    passScore: 60,
    maxAttempts: 3,
    deliverables: ['npc entities', 'dialogue triggers', 'npc schedules'],
    actionTemplates: [
      { id: 'gen_npcs', labelFr: 'Créer PNJ + dialogues', descriptionFr: 'Entités NPC + narrative triggers', handler: 'iterate:npc', priority: 1 },
      { id: 'gen_routines', labelFr: 'Définir routines PNJ', descriptionFr: 'Schedules / zones / états', handler: 'iterate:npc_routines', priority: 2 },
    ],
  },
  {
    id: 'audio_soundscape',
    order: 9,
    domain: 'audio',
    labelFr: 'Musique & SFX',
    descriptionFr: 'BGM, sfx map, mix mobile.',
    ownerAgent: 'music',
    passScore: 55,
    maxAttempts: 3,
    deliverables: ['gdl.audio.bgm', 'gdl.audio.sfx'],
    actionTemplates: [
      { id: 'gen_audio', labelFr: 'Générer audio procédural', descriptionFr: 'Agents music + sfx', handler: 'iterate:audio', priority: 1 },
    ],
  },
  {
    id: 'ui_hud',
    order: 10,
    domain: 'ui',
    labelFr: 'Interface & HUD',
    descriptionFr: 'HUD combat, menus, draft UI.',
    ownerAgent: 'ui',
    passScore: 55,
    maxAttempts: 3,
    deliverables: ['gdl.ui', 'hud shell assets'],
    actionTemplates: [
      { id: 'gen_ui', labelFr: 'Assembler HUD GDL', descriptionFr: 'Agent UI patches', handler: 'iterate:ui', priority: 1 },
    ],
  },
  {
    id: 'vfx_juice',
    order: 11,
    domain: 'vfx',
    labelFr: 'FX & game feel',
    descriptionFr: 'Hit sparks, hazards visuels, feedback joueur.',
    ownerAgent: 'vfx',
    passScore: 50,
    maxAttempts: 2,
    deliverables: ['gdl.vfx', 'fx assets'],
    actionTemplates: [
      { id: 'gen_vfx', labelFr: 'Déclarer FX GDL', descriptionFr: 'Agent vfx + assets fx', handler: 'iterate:vfx', priority: 1 },
    ],
  },
  {
    id: 'integration_runtime',
    order: 12,
    domain: 'integration',
    labelFr: 'Assemblage runtime',
    descriptionFr: 'GDL valide, atlas liés, preview jouable.',
    ownerAgent: 'integration',
    passScore: 80,
    maxAttempts: 4,
    deliverables: ['gdl.json valid', 'preview bundle', 'asset_atlas'],
    actionTemplates: [
      { id: 'bind_all', labelFr: 'Relier assets validés', descriptionFr: 'meta.asset_atlas + player sprite', handler: 'iterate:integration', priority: 1 },
      { id: 'fix_gdl', labelFr: 'Corriger erreurs GDL', descriptionFr: 'Re-validation + patches', handler: 'gdl:validate_fix', priority: 2 },
    ],
  },
  {
    id: 'qa_playtest',
    order: 13,
    domain: 'qa',
    labelFr: 'QA & playtest synthétique',
    descriptionFr: 'Headless sim, win rate, santé moyenne.',
    ownerAgent: 'qa',
    passScore: 65,
    maxAttempts: 5,
    deliverables: ['synthetic-playtest-report.json', 'qa pass'],
    actionTemplates: [
      { id: 'run_playtest', labelFr: 'Playtest 24 runs', descriptionFr: 'Synthetic headless', handler: 'qa:playtest', priority: 1 },
      { id: 'fix_balance', labelFr: 'Rééquilibrer', descriptionFr: 'Agent gameplay après échec', handler: 'iterate:gameplay_balance', priority: 2 },
    ],
  },
  {
    id: 'export_delivery',
    order: 14,
    domain: 'export',
    labelFr: 'Export & livrables intégrables',
    descriptionFr: 'HTML5/PWA sans blockers — tous artefacts récupérables.',
    ownerAgent: 'integration',
    passScore: 85,
    maxAttempts: 3,
    deliverables: ['07_exports/web', 'export gate pass', 'integrable manifest'],
    actionTemplates: [
      { id: 'run_export_gate', labelFr: 'Vérifier gates export', descriptionFr: 'QA + intent', handler: 'export:gate_check', priority: 1 },
      { id: 'build_preview', labelFr: 'Rebuild preview', descriptionFr: 'Bundle web', handler: 'export:preview', priority: 2 },
    ],
  },
] as const;

export function getAutonomousStep(id: string): AutonomousStepDefinition {
  const step = AUTONOMOUS_PRODUCTION_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Étape autonome inconnue: ${id}`);
  return step;
}

/** Score GDL numérique 0–100 */
export function scoreGdl(gdl: GameDefinition): { score: number; errors: string[]; warnings: string[] } {
  const v = validateGdl(gdl);
  let score = 100;
  score -= v.errors.length * 18;
  score -= v.warnings.length * 4;
  const systems = gdl.systems ?? [];
  const implemented = systems.filter((s) => isEngineImplementedSystem(s) || s === 'input' || s === 'ui').length;
  if (systems.length) score = Math.min(100, score * 0.7 + (implemented / systems.length) * 30);
  if ((gdl.entities?.length ?? 0) >= 2) score += 5;
  if ((gdl.scenes?.length ?? 0) >= 1) score += 5;
  const audio = gdl.audio as { bgm?: string; sfx?: Record<string, string> } | undefined;
  if (audio?.bgm) score += 3;
  if (audio?.sfx && Object.keys(audio.sfx).length >= 3) score += 4;
  const narrative = gdl.narrative as Record<string, unknown> | undefined;
  if (narrative && Object.keys(narrative).length > 0) score += 5;
  return { score: Math.max(0, Math.min(100, Math.round(score))), errors: v.errors, warnings: v.warnings };
}

function approvedAssets(snap: GameProjectSnapshot) {
  return (snap.assets ?? []).filter((a) => a.status === 'approved');
}

function npcLikeEntities(gdl: GameDefinition | null | undefined): number {
  if (!gdl) return 0;
  return gdl.entities.filter((e: { id: string; type?: string; role?: string; components?: unknown[] }) =>
    e.type === 'npc' || e.id.includes('npc') || e.role === 'npc',
  ).length;
}

function enemyEntities(gdl: GameDefinition | null | undefined): number {
  if (!gdl) return 0;
  return gdl.entities.filter((e: { id: string; type?: string; components?: unknown[] }) =>
    e.type === 'enemy' || e.id.includes('enemy') || (e.components as unknown[])?.some((c) => c && typeof c === 'object' && 'patrol' in (c as object)),
  ).length;
}

/** Évalue le score d'une étape depuis l'état projet. */
export function evaluateAutonomousStep(stepId: string, ctx: AutonomousEvalContext): StepScoreResult {
  const step = getAutonomousStep(stepId);
  const snap = ctx.snapshot;
  const gdl = ctx.gdl ?? null;
  const gaps: string[] = [];
  const found: string[] = [];
  const missing: string[] = [];
  let score = 0;

  switch (stepId) {
    case 'design_brief': {
      const docScore = Math.min(35, (snap.documents?.length ?? 0) * 15);
      const promptScore = Math.min(20, (snap.prompts?.length ?? 0) * 12);
      const briefScore = snap.project.source_prompt?.trim() ? 25 : 0;
      const summaryScore = snap.project.summary?.trim() ? 20 : 0;
      score = docScore + promptScore + briefScore + summaryScore;
      if (docScore < 20) gaps.push('Documents design insuffisants');
      if (!briefScore) gaps.push('Prompt source manquant');
      if (docScore >= 12) found.push('documents');
      else missing.push('documents');
      break;
    }
    case 'narrative_world': {
      const docNarr = snap.documents?.filter((d) => /story|narrative|quest|lore/i.test(d.kind + d.title)).length ?? 0;
      const gdlNarr = gdl?.narrative && Object.keys(gdl.narrative as object).length > 0;
      score = Math.min(100, docNarr * 25 + (gdlNarr ? 50 : 0) + (snap.project.summary ? 15 : 0));
      if (!gdlNarr) gaps.push('gdl.narrative absent');
      if (docNarr === 0) gaps.push('Aucun document narratif');
      if (gdlNarr) found.push('gdl.narrative');
      break;
    }
    case 'asset_pipeline': {
      const total = snap.assets?.length ?? 0;
      const ok = approvedAssets(snap).length;
      score = total === 0 ? 0 : Math.round((ok / total) * 100);
      if (total === 0) gaps.push('Aucun asset enregistré');
      else if (ok < total) gaps.push(`${total - ok} asset(s) sans gate 07_qa`);
      if (ok > 0) found.push(`${ok} approved assets`);
      else missing.push('07_qa passed assets');
      break;
    }
    case 'animation_motion': {
      const chars = snap.assets?.filter((a) => a.kind === 'character' || a.role === 'hero') ?? [];
      const ready = chars.filter((a) => ['review', 'approved'].includes(a.status)).length;
      score = chars.length ? Math.round((ready / chars.length) * 85 + (gdl?.entities.find((e) => e.id === 'player')?.assets ? 15 : 0)) : 30;
      if (ready < chars.length) gaps.push('Rig/animation incomplets sur personnages');
      break;
    }
    case 'level_scenes': {
      const sceneCount = gdl?.scenes?.length ?? snap.scenes?.length ?? 0;
      score = Math.min(100, sceneCount * 25 + ((gdl?.scenes?.[0] as { layout?: unknown } | undefined)?.layout ? 25 : 0) + (gdl?.scenes?.[0] ? 20 : 0));
      if (sceneCount === 0) gaps.push('Aucune scène GDL');
      if (sceneCount) found.push(`${sceneCount} scènes`);
      break;
    }
    case 'gameplay_systems': {
      if (!gdl) {
        score = 0;
        gaps.push('GDL absent');
        break;
      }
      const { score: gs } = scoreGdl(gdl);
      const genre = snap.project.genre ?? 'platformer';
      try {
        const recipe = buildProductionRecipe(genre);
        const required = recipe.stages.find((s: { id: string }) => s.id === 'systems')?.outputs ?? [];
        const present = (gdl.systems ?? []).filter((s: string) => required.includes(s) || isEngineImplementedSystem(s)).length;
        score = Math.min(100, Math.round(gs * 0.5 + (required.length ? (present / Math.max(required.length, 1)) * 50 : gs * 0.5)));
      } catch {
        score = Math.min(100, gs);
      }
      if ((gdl.systems?.length ?? 0) < 3) gaps.push('Peu de systems[] déclarés');
      break;
    }
    case 'enemy_ai': {
      if (!gdl) {
        score = 0;
        gaps.push('GDL absent');
        break;
      }
      const enemies = enemyEntities(gdl);
      const wave = gdl.systems?.includes('wave_spawner') ? 30 : 0;
      const lane = gdl.systems?.includes('lane_runner') ? 20 : 0;
      const boss = gdl.systems?.includes('boss_phases') ? 25 : 0;
      const patrol = enemies > 0 ? 25 : 0;
      score = Math.min(100, wave + lane + boss + patrol + Math.min(25, enemies * 8));
      if (!wave && !lane) gaps.push('wave_spawner / lane_runner absents');
      if (enemies === 0) gaps.push('Aucune entité ennemie');
      break;
    }
    case 'npc_routines': {
      if (!gdl) {
        score = snap.documents?.some((d) => /npc|pnj/i.test(d.title)) ? 40 : 0;
        gaps.push('GDL absent pour PNJ');
        break;
      }
      const npcs = npcLikeEntities(gdl);
      const narr = gdl.narrative as { dialogues?: unknown[]; npcs?: unknown[] } | undefined;
      const dlg = narr?.dialogues?.length ?? narr?.npcs?.length ?? 0;
      score = Math.min(100, npcs * 20 + dlg * 10 + (snap.project.genre === 'survivors_like' ? 20 : 0));
      if (npcs === 0 && snap.project.genre !== 'survivors_like') gaps.push('Aucun PNJ dans entities[]');
      break;
    }
    case 'audio_soundscape': {
      const audio = gdl?.audio as { bgm?: string; sfx?: Record<string, string> } | undefined;
      score = (audio?.bgm ? 45 : 0) + Math.min(55, Object.keys(audio?.sfx ?? {}).length * 11);
      if (!audio?.bgm) gaps.push('BGM manquant');
      if (!audio?.sfx || Object.keys(audio.sfx).length < 3) gaps.push('SFX insuffisants');
      break;
    }
    case 'ui_hud': {
      const ui = gdl?.ui as Record<string, unknown> | undefined;
      score = ui && Object.keys(ui).length > 0 ? 70 : gdl?.systems?.includes('ui') ? 50 : 20;
      if (score < step.passScore) gaps.push('HUD / gdl.ui incomplet');
      break;
    }
    case 'vfx_juice': {
      const vfx = gdl?.vfx as Record<string, unknown> | undefined;
      score = vfx && Object.keys(vfx).length > 0 ? 65 : gdl?.systems?.includes('vfx') ? 45 : 25;
      break;
    }
    case 'integration_runtime': {
      if (!gdl) {
        score = 0;
        gaps.push('GDL preview absent');
        break;
      }
      score = scoreGdl(gdl).score;
      const atlas = (gdl.meta as { asset_atlas?: Record<string, string> })?.asset_atlas;
      if (atlas && Object.keys(atlas).length > 0) score = Math.min(100, score + 10);
      else gaps.push('meta.asset_atlas manquant');
      break;
    }
    case 'qa_playtest': {
      const pt = ctx.playtest;
      if (!pt) {
        score = snap.builds.some((b) => b.status === 'ready') ? 40 : 0;
        gaps.push('Playtest synthétique non exécuté');
        break;
      }
      const total = pt.wins + pt.losses;
      if (total === 0) {
        score = Math.round(30 + Math.min(35, (pt.avg_health ?? 0) * 10));
        gaps.push('Sim sans fin de run (win/loss) — ajuster durée ou conditions victoire Veloria');
        break;
      }
      const winRate = pt.wins / total;
      score = Math.round(winRate * 65 + Math.min(35, (pt.avg_health ?? 0) * 7));
      if (winRate < 0.3) gaps.push('Win rate playtest faible');
      else if (winRate >= 0.5) found.push(`win rate ${Math.round(winRate * 100)}%`);
      break;
    }
    case 'export_delivery': {
      score = ctx.exportBlocked ? 20 : 90;
      if (snap.builds.some((b) => b.status === 'ready')) score = Math.min(100, score + 10);
      if (ctx.exportBlocked) gaps.push('Export bloqué par gate QA/intent');
      if (!snap.builds.length) gaps.push('Aucun build enregistré');
      break;
    }
    default:
      score = 0;
      gaps.push('Étape non évaluée');
  }

  const passed = score >= step.passScore;
  return {
    stepId,
    score,
    passScore: step.passScore,
    passed,
    detailFr: passed ? `OK (${score}/${step.passScore})` : `Score ${score}/${step.passScore} — ${gaps[0] ?? 'incomplet'}`,
    gaps,
    deliverablesFound: found,
    deliverablesMissing: missing.length ? missing : passed ? [] : step.deliverables,
  };
}

/** Propose les actions triées par priorité selon les gaps. */
export function proposeActionsForStep(stepId: string, evalResult: StepScoreResult): ProposedAction[] {
  if (evalResult.passed) return [];
  const step = getAutonomousStep(stepId);
  const gapText = evalResult.gaps.join('; ') || 'Score insuffisant';
  return [...step.actionTemplates]
    .sort((a, b) => a.priority - b.priority)
    .map((t) => ({
      id: t.id,
      labelFr: t.labelFr,
      descriptionFr: t.descriptionFr,
      handler: t.handler,
      reasonFr: gapText,
    }));
}

/** État initial d'un run autonome. */
export function createAutonomousWorkflowRun(projectId: string, runId: string): AutonomousWorkflowRun {
  const steps: Record<string, AutonomousStepState> = {};
  for (const step of AUTONOMOUS_PRODUCTION_STEPS) {
    steps[step.id] = {
      stepId: step.id,
      score: 0,
      passScore: step.passScore,
      passed: false,
      detailFr: 'En attente',
      gaps: [],
      deliverablesFound: [],
      deliverablesMissing: step.deliverables,
      status: 'pending',
      attempts: 0,
      maxAttempts: step.maxAttempts,
      proposedActions: [],
    };
  }
  return {
    runId,
    projectId,
    status: 'idle',
    currentStepId: AUTONOMOUS_PRODUCTION_STEPS[0]!.id,
    steps,
    integrableArtifacts: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Collecte les artefacts intégrables une fois les étapes passées. */
export function collectIntegrableArtifacts(ctx: AutonomousEvalContext, run: AutonomousWorkflowRun): IntegrableArtifact[] {
  const out: IntegrableArtifact[] = [];
  const gdl = ctx.gdl;
  const slug = ctx.snapshot.project.slug;

  if (run.steps.design_brief?.passed) {
    out.push({ kind: 'documents', path: `workspaces/${slug}/02_design`, domain: 'design', validated: true });
  }
  for (const asset of approvedAssets(ctx.snapshot)) {
    out.push({
      kind: 'asset',
      path: `workspaces/${slug}/03_assets/${asset.title}`,
      domain: 'assets',
      validated: true,
    });
  }
  if (gdl && run.steps.integration_runtime?.passed) {
    out.push({ kind: 'gdl', path: `workspaces/${slug}/05_runtime/gdl`, domain: 'integration', validated: true });
  }
  if (run.steps.qa_playtest?.passed) {
    out.push({ kind: 'playtest', path: `workspaces/${slug}/08_ops/manifests/synthetic-playtest-report.json`, domain: 'qa', validated: true });
  }
  if (run.steps.export_delivery?.passed) {
    out.push({ kind: 'export', path: `workspaces/${slug}/07_exports/web`, domain: 'export', validated: true });
  }
  return out;
}

/** Met à jour le run après évaluation (sans exécution). */
export function assessAutonomousWorkflow(
  ctx: AutonomousEvalContext,
  run: AutonomousWorkflowRun,
  opts?: { scoreAllSteps?: boolean },
): AutonomousWorkflowRun {
  const next = structuredClone(run);
  let currentStepId = AUTONOMOUS_PRODUCTION_STEPS[0]!.id;
  const scoreAll = opts?.scoreAllSteps === true;
  let firstBlocked: string | undefined;

  for (const step of AUTONOMOUS_PRODUCTION_STEPS) {
    const evalResult = evaluateAutonomousStep(step.id, ctx);
    const st = next.steps[step.id]!;
    st.score = evalResult.score;
    st.passScore = evalResult.passScore;
    st.passed = evalResult.passed;
    st.detailFr = evalResult.detailFr;
    st.gaps = evalResult.gaps;
    st.deliverablesFound = evalResult.deliverablesFound;
    st.deliverablesMissing = evalResult.deliverablesMissing;
    st.proposedActions = proposeActionsForStep(step.id, evalResult);

    if (scoreAll) {
      if (evalResult.passed) st.status = 'passed';
      else if (st.attempts >= st.maxAttempts) st.status = 'awaiting_human';
      else if (st.attempts > 0) st.status = 'retrying';
      else st.status = 'pending';
      if (!evalResult.passed && !firstBlocked) firstBlocked = step.id;
      continue;
    }

    if (evalResult.passed) {
      st.status = 'passed';
    } else if (st.attempts >= st.maxAttempts) {
      st.status = 'awaiting_human';
      next.status = 'awaiting_human';
      currentStepId = step.id;
      break;
    } else if (st.attempts > 0) {
      st.status = 'retrying';
      currentStepId = step.id;
      break;
    } else {
      st.status = step.order === 1 || next.steps[AUTONOMOUS_PRODUCTION_STEPS[step.order - 2]!.id]?.passed ? 'running' : 'pending';
      if (!evalResult.passed && st.status === 'running') {
        currentStepId = step.id;
        break;
      }
    }
  }

  if (scoreAll) {
    currentStepId = firstBlocked ?? AUTONOMOUS_PRODUCTION_STEPS.at(-1)!.id;
    const allPassed = AUTONOMOUS_PRODUCTION_STEPS.every((s) => next.steps[s.id]?.passed);
    next.status = allPassed ? 'completed' : 'running';
  } else {
    const allPassed = AUTONOMOUS_PRODUCTION_STEPS.every((s) => next.steps[s.id]?.passed);
    if (allPassed) next.status = 'completed';
    else if (next.status !== 'awaiting_human' && next.status !== 'failed') next.status = 'running';
  }

  next.currentStepId = currentStepId;
  next.integrableArtifacts = collectIntegrableArtifacts(ctx, next);
  next.updatedAt = new Date().toISOString();
  return next;
}
