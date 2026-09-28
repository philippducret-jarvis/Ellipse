import { describe, expect, it } from 'vitest';
import {
  formatAgentKnowledgeCorpus,
  formatFullKnowledgeIndex,
  AGENT_KNOWLEDGE_BLOCKS,
} from './agent-knowledge-corpus.js';
import {
  TRAINING_ROADMAP_PHASES,
  buildTrainingProgressSnapshot,
  buildTrainingRoadmapManifest,
  formatTrainingRoadmapForAgents,
  recommendCurrentTrainingPhase,
} from './training-roadmap.js';

describe('agent-knowledge-corpus', () => {
  it('expose des blocs par domaine', () => {
    expect(AGENT_KNOWLEDGE_BLOCKS.length).toBeGreaterThan(5);
    expect(formatFullKnowledgeIndex()).toContain('pipeline_assets');
  });

  it('injecte le corpus pour gameplay', () => {
    const text = formatAgentKnowledgeCorpus('gameplay');
    expect(text).toContain('GDL systems');
    expect(text).toContain('enemy_ai');
  });

  it('tronque au maxChars', () => {
    const text = formatAgentKnowledgeCorpus('character', 200);
    expect(text.length).toBeLessThanOrEqual(201);
  });
});

describe('training-roadmap', () => {
  it('définit 6 phases P0–P5', () => {
    expect(TRAINING_ROADMAP_PHASES).toHaveLength(6);
    expect(TRAINING_ROADMAP_PHASES[0]!.id).toBe('P0_foundation');
    expect(TRAINING_ROADMAP_PHASES[5]!.id).toBe('P5_shipping');
  });

  it('recommande une phase selon scores', () => {
    expect(recommendCurrentTrainingPhase({ a: 20 })).toBe('P0_foundation');
    expect(recommendCurrentTrainingPhase({ a: 90, b: 88 })).toBe('P5_shipping');
  });

  it('construit un snapshot de progression', () => {
    const snap = buildTrainingProgressSnapshot({ asset_pipeline: 70, gameplay_systems: 65 });
    expect(snap.current_phase_id).toBeTruthy();
    expect(snap.report_type).toBe('training_curriculum');
    expect(snap.release_gate).toBe(false);
    expect(snap.commercial_ready).toBe(false);
    expect(Object.keys(snap.phase_scores).length).toBe(6);
  });

  it('formate la roadmap pour un agent', () => {
    const text = formatTrainingRoadmapForAgents('narrative');
    expect(text).toContain('P3_narrative_npc');
    expect(text).not.toContain('P1_perception');
  });

  it('manifest curriculum', () => {
    const m = buildTrainingRoadmapManifest();
    expect(m.phases.length).toBe(6);
    expect(m.curriculum_note_fr).toContain('Drill');
  });
});
