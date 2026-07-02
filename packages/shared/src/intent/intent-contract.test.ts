import { describe, it, expect } from 'vitest';
import { deriveIntentContract, evaluateAssetAgainstIntent, validateIntentContract } from './intent-contract.js';
import { buildStyleLockFromIntent, evaluateManifoldDrift } from './concept-manifold.js';
import { buildSemanticGraphFromGdl } from '../semantic/game-semantic-graph.js';

describe('intent-contract', () => {
  it('derive et valide un contrat', () => {
    const c = deriveIntentContract({
      title: 'Test',
      prompt: 'survivors portrait dark fantasy #9e4f5c',
      genre: 'survivors_like',
      mechanics: ['lane_runner'],
    });
    const v = validateIntentContract(c);
    expect(v.valid).toBe(true);
    expect(c.fidelity.min_iou_shipping).toBe(0.72);
  });

  it('bloque procédural sous seuil', () => {
    const c = deriveIntentContract({ title: 'T', prompt: 'x' });
    const violations = evaluateAssetAgainstIntent(c, { method: 'procedural', iou: 0.3 });
    expect(violations.some((v) => v.severity === 'block')).toBe(true);
  });
});

describe('concept-manifold', () => {
  it('détecte drift hors palette', () => {
    const c = deriveIntentContract({ title: 'T', prompt: '#ff0000 gold' });
    const lock = buildStyleLockFromIntent(c);
    const ev = evaluateManifoldDrift(lock, { palette: ['#0000ff'], method: 'procedural', iou: 0.35 });
    expect(ev.within_manifold).toBe(false);
  });
});

describe('game-semantic-graph', () => {
  it('extrait nœuds depuis GDL Veloria-like', () => {
    const gsg = buildSemanticGraphFromGdl({
      meta: { title: 'V', dimension: '2d', version: '1' },
      systems: ['blessing_draft', 'lane_runner'],
      entities: [],
      scenes: [{ id: 's1', entities: [], veloria: { blessings: [{ id: 'sacred_edge', label: 'Edge' }] } }],
    });
    expect(gsg.nodes.some((n) => n.id === 'bless:sacred_edge')).toBe(true);
  });
});
