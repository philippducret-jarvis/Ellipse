import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema, type GameDefinition } from '../index.js';
import { buildSceneFromBoard, checkSceneTraversability } from './world-factory.js';
import { addEntityToScene, setEntityComponent, addPlatform, movePlatform, addSceneTransition } from './gdl-edit.js';
import {
  ProvenanceGraph,
  evaluateExportGate,
  defaultPersonReferenceCompliance,
} from '../provenance/provenance.js';
import { buildMobileExport } from '../export/pwa.js';
import { Telemetry } from '../telemetry/telemetry.js';

function baseGdl(): GameDefinition {
  return GameDefinitionSchema.parse({
    meta: { title: 'Echoes', dimension: '2d', genre: 'platformer', resolution: [1280, 720], version: '1' },
    style: { palette: ['#120f18', '#5ec7ef'] },
    systems: ['platformer_physics'],
    entities: [{ id: 'player', type: 'character', components: [{ transform: { x: 96, y: 560 } }] }],
    scenes: [{ id: 'level_01', entities: ['player'], layout: buildSceneFromBoard({ id: 'level_01', modules: [] }).layout }],
  });
}

describe('Lot 6 — world factory', () => {
  it('construit une scène jouable depuis un board', () => {
    const scene = buildSceneFromBoard({
      id: 'lvl',
      biome: 'mushroom',
      modules: [
        { x: 300, y: 520, width: 160, collectible: 'spore' },
        { x: 600, y: 460, width: 140 },
      ],
      checkpoints: [{ x: 100, y: 560, label: 'Start' }],
    });
    expect(scene.id).toBe('lvl');
    expect(scene.layout!.platforms.length).toBeGreaterThanOrEqual(3);
    expect(scene.layout!.collectibles[0]!.type).toBe('spore');
    expect(checkSceneTraversability(scene).ok).toBe(true);
  });

  it('signale un écart infranchissable', () => {
    const scene = buildSceneFromBoard({ id: 'gap', width: 2000, modules: [{ x: 1500, y: 300, width: 60 }] });
    const r = checkSceneTraversability(scene, 200);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('Lot 7 — édition GDL (round-trip)', () => {
  it('ajoute entité, composant, plateforme, transition — reste valide', () => {
    let g = baseGdl();
    g = addEntityToScene(g, 'level_01', { id: 'enemy_1', type: 'enemy', components: [{ transform: { x: 400, y: 560 } }] });
    g = setEntityComponent(g, 'player', 'health', { max: 5, current: 5 });
    g = addPlatform(g, 'level_01', { x: 700, y: 450, w: 120, h: 24 });
    g = movePlatform(g, 'level_01', 0, { x: 0, y: 632 });
    g = addSceneTransition(g, 'level_01', 'level_02');
    expect(() => GameDefinitionSchema.parse(g)).not.toThrow();
    expect(g.entities.find((e) => e.id === 'enemy_1')).toBeTruthy();
    const player = g.entities.find((e) => e.id === 'player')!;
    expect(player.components.find((c) => c.health)?.health?.max).toBe(5);
    expect(g.scenes[0]!.transitions?.[0]?.to_scene).toBe('level_02');
  });
});

describe('Lot 5 — provenance & compliance', () => {
  it('trace les ancêtres d’un export', () => {
    const g = new ProvenanceGraph();
    g.addNode({ id: 'prompt1', kind: 'prompt' })
      .addNode({ id: 'photo1', kind: 'person_reference' })
      .addNode({ id: 'hero', kind: 'asset' })
      .addNode({ id: 'scene1', kind: 'scene' })
      .addNode({ id: 'build1', kind: 'export' });
    g.addEdge('hero', 'photo1', 'derives_from');
    g.addEdge('hero', 'prompt1', 'decided_by');
    g.addEdge('scene1', 'hero', 'used_in');
    g.addEdge('build1', 'scene1', 'exported_as');
    const ancestors = g.ancestorsOf('build1').map((n) => n.id);
    expect(ancestors).toContain('photo1');
    expect(ancestors).toContain('prompt1');
  });

  it('bloque l’export public d’une photo de personne sans consentement', () => {
    const person = defaultPersonReferenceCompliance('photo1');
    const gate = evaluateExportGate([person], 'public');
    expect(gate.allowed).toBe(false);
    expect(gate.blockers[0]!.asset_id).toBe('photo1');
  });

  it('autorise l’export quand licence + consentement sont résolus', () => {
    const gate = evaluateExportGate(
      [{ asset_id: 'a', privacy_mode: 'standard', license_mode: 'commercial' }],
      'public',
    );
    expect(gate.allowed).toBe(true);
  });
});

describe('Lot 9 — export mobile PWA', () => {
  it('génère un manifest + service worker par profil', () => {
    const exp = buildMobileExport(baseGdl(), 'high', ['/hero.png']);
    expect(exp.manifest.name).toBe('Echoes');
    expect(exp.pixel_ratio).toBe(3);
    expect(exp.service_worker).toContain('caches');
  });
});

describe('Lot 10 — télémétrie', () => {
  it('agrège les métriques', () => {
    const t = new Telemetry(() => '2026-01-01T00:00:00Z');
    t.record('prompt_to_preview_ms', 1200);
    t.record('prompt_to_preview_ms', 800);
    t.increment('retry', { agent: 'character' });
    const s = t.summary();
    expect(s.prompt_to_preview_ms!.avg).toBe(1000);
    expect(s.retry!.count).toBe(1);
  });
});
