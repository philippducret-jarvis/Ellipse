/**
 * Corpus de connaissances Ellipse — injecté dans le contexte de chaque agent.
 * Source de vérité pédagogique : pipelines, GDL, Godot-parité, gameplay, QA.
 */
import type { AgentType } from './catalog.js';

export interface KnowledgeBlock {
  id: string;
  titleFr: string;
  agents: AgentType[] | 'all';
  content: string;
}

/** Connaissance universelle (tous agents). */
const UNIVERSAL_CORE = `
## Ellipse — principes non négociables
- Workspace canonique : 01_source → 08_ops. Jamais intégrer un asset sans 07_qa passed (IoU shipping ≥ 0.72).
- GDL = contrat runtime : meta, entities[], scenes[], systems[]. Toute mécanique = system + composants data-driven.
- Procédural = brouillon si IoU < 0.55. Hybrid planche = vérité silhouette enrichie.
- agent_notes obligatoires : { method, iou?, operation_id?, next_engine, recovery_hints[] }.
- Workflow autonome 14 étapes : design → narrative → assets → animation → level → gameplay → enemy_ai → npc → audio → ui → vfx → integration → qa → export.
- Mémoire durable : 08_ops/telemetry/agent-memory.jsonl — lire avant agir, écrire après échec/succès.
- Intent contract : 02_design/specs/intent-contract.json — bloquer export si systems[] hors contrat.
`.trim();

export const AGENT_KNOWLEDGE_BLOCKS: KnowledgeBlock[] = [
  {
    id: 'pipeline_assets',
    titleFr: 'Pipeline asset 8 stages',
    agents: ['character', 'animation', 'decor', 'qa'],
    content: `
Stages : 01_source (planche verrouillée) → 02_cutouts (extractSubject flood-fill, pas crop rect) → 03_cleanup (parts, silhouette-clean) → 04_rig (rig.json pivots) → 05_animation (spritesheets) → 06_exports (atlas, runtime-manifest) → 07_qa GATE IoU → 08_inpaint/remote (retouche si IoU<0.72).
Seuils IoU : pass 0.42, strong 0.55, shipping 0.72. Décision : procedural_ok | hybrid_board | board_master_inpaint | human_qc.
Veloria : 29 packs, refine-all, shipping-pass, stage-08-inpaint CPU overlay planche+master.
`.trim(),
  },
  {
    id: 'image_ops',
    titleFr: 'Création & retouche image',
    agents: ['character', 'decor', 'animation'],
    content: `
Opérations : segment_floodfill | retouch_hybrid_board | retouch_inpaint_cpu | create_procedural | create_lot0_photo | create_comfyui_remote (Phase 2).
Handlers : iterate:*, asset:pipeline, asset:retouch, qa:playtest. API POST .../image/retouch auto IoU.
Lot0 : photo → éléments head/torso/accent → layered sprite + palette + learning score.
`.trim(),
  },
  {
    id: 'gdl_systems',
    titleFr: 'GDL systems & composants',
    agents: ['gameplay', 'integration', 'level', 'qa'],
    content: `
Systems engine implémentés : input, physics, physics_topdown, lane_runner, wave_spawner, auto_attack, blessing_draft, hazard_scheduler, boss_phases, enemy_ai, collectibles, camera_follow, animation, ui.
Composants IR : transform, physics, health, patrol, topdown_controller, sprite, collision.
Veloria survivors : résolution 720×1280, top_down, 3 lanes, max 5 ennemis, blessing_breaks 3/6/9, 6 arènes.
Patch GDL : op replace/add sur paths JSON pointer (/entities/0/assets/sprite, /systems, /scenes/0/veloria).
`.trim(),
  },
  {
    id: 'enemy_ai',
    titleFr: 'IA ennemis & combat',
    agents: ['gameplay', 'level', 'vfx'],
    content: `
Enemy AI runtime (engine/sim/systems.ts) : patrol range/speed, stomp kill, spawn depuis wave_spawner.
Veloria (veloria-survival.ts) : lanes, soft cap 5, boss phases, hazards GDL scripts, auto_attack, draft blessings 1-3.
GDL enemy : entity type enemy + components patrol { range, speed } + health. Scenes veloria.encounters.waves[] avec type/lane/count/boss.
Boss : phase_count, spawn_lane, hazard_scripts meta. Équilibrage : TTK, win rate playtest ≥ 30%.
`.trim(),
  },
  {
    id: 'npc_narrative',
    titleFr: 'PNJ, dialogues & routines',
    agents: ['narrative', 'gameplay', 'ui'],
    content: `
Narrative pack : gdl.narrative { intro, quests[], dialogues[] { id, speaker, text, next, trigger } }.
PNJ : entities type npc/npc__* + narrative.npcs[] { id, zone, schedule[], default_state }.
Routines (cible) : npc_schedule states idle|walk|talk, triggers on_enter_zone, on_quest_complete.
Dialogue triggers : scene enter, proximity, quest stage. UI popup vs ambient vs altar flash.
Echoes : Myla, story-architecture.json, branching canon. Gate QA : cohérence narrative genre.
`.trim(),
  },
  {
    id: 'level_design',
    titleFr: 'Niveaux & scènes',
    agents: ['level', 'decor', 'camera'],
    content: `
map_kind : tilemap | arena | lane_runner | hub. scene.layout platforms/collectibles/goal ou veloria.lane_meta.
Parallax : environment layers séparés, collision en data pas en pixels. Wireframe → anchors → scene_assembly.json.
Camera : top_down portrait mobile, follow player, bounds worldWidth/worldHeight depuis sim.
`.trim(),
  },
  {
    id: 'animation_rig',
    titleFr: 'Animation & rig 2D',
    agents: ['animation', 'character', 'integration'],
    content: `
rig.json formats : bones[] string+pivots (Veloria) ou bones[] hiérarchie (pipeline). Engine F2 : createSkeletal2D + idlePosePhase.
Godot parité : Skeleton2D, SpriteFrames, anim-state-machine.json. frame_count atlas = GDL player.assets.frame_count.
Clips requis gameplay : idle, walk/run, attack, hurt. Portrait motion (LivePortrait) = menu only, pas combat loop.
`.trim(),
  },
  {
    id: 'audio_vfx',
    titleFr: 'Audio & game feel',
    agents: ['music', 'sfx', 'vfx'],
    content: `
gdl.audio : { bgm: url, sfx: { jump, hit, hurt, collect, victory, draft } }. Procedural WAV via shared/audio/procedural-wav.
GameFeelAudio engine si pas gdl sfx. VFX : gdl.vfx hazards, hit sparks — déclarer si features.vfx=true.
Mix mobile : loops seamless, SFX < 200ms, pas de samples tiers en shipping sans licence.
`.trim(),
  },
  {
    id: 'qa_export',
    titleFr: 'QA, playtest & export',
    agents: ['qa', 'integration'],
    content: `
Gates : asset 07_qa IoU | validateGdl errors/warnings | intent-contract | export-gate 422 | playtest synthétique wins/losses.
Playtest : runSyntheticPlaytest 24+ runs, rapport 08_ops/manifests/synthetic-playtest-report.json.
Export : HTML5 bundle, PWA, Godot adapter minimal. Bloquer si qa-report passed=false ou intent blocked.
`.trim(),
  },
  {
    id: 'godot_cortex',
    titleFr: 'Godot parité & Cortex',
    agents: ['integration', 'animation', 'character'],
    content: `
godot-parity-registry : Import dock, Skeleton2D, TileMap, AudioStream, export .tscn. Gap : SpriteFrames depuis atlas réel.
Cortex plan : genre → template gameplay → DAG agents character/decor/level/gameplay/narrative/qa/integration.
Itération : filterIterationPlan 13 agents, GDL → 05_runtime/gdl/*.preview.gdl.json. Auto-correct 1 retry via getAgentsForAutoCorrect.
`.trim(),
  },
  {
    id: 'code_integration',
    titleFr: 'Code & intégration runtime',
    agents: ['integration', 'gameplay'],
    content: `
Engine : sim/ headless testable, render Pixi sync SimWorld. systems[] décident stepSimulation branches.
Codegen shared : templates platformer, mechanics.ts applyMechanics. Preview : 07_exports/web/preview.html charge gdl.json.
Semantic graph GSG : buildSemanticGraphFromGdl — thèmes, blessings, hazards pour contexte MasterAI.
`.trim(),
  },
];

/** ~120 lignes max par agent pour contexte LLM. */
export function formatAgentKnowledgeCorpus(agent: AgentType, maxChars = 4500): string {
  const blocks = AGENT_KNOWLEDGE_BLOCKS.filter((b) => b.agents === 'all' || b.agents.includes(agent));
  const parts = [UNIVERSAL_CORE, ...blocks.map((b) => `### ${b.titleFr}\n${b.content}`)];
  let text = parts.join('\n\n');
  if (text.length > maxChars) text = `${text.slice(0, maxChars)}…`;
  return text;
}

export function formatFullKnowledgeIndex(): string {
  return AGENT_KNOWLEDGE_BLOCKS.map((b) => `- ${b.id}: ${b.titleFr} → ${Array.isArray(b.agents) ? b.agents.join(', ') : 'all'}`).join('\n');
}
