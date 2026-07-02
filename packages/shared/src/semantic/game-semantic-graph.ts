/**
 * Graphe Sémantique du Jeu (GSG) — le « pourquoi » au-delà du GDL.
 */
import type { GameDefinition } from '../index.js';

export type SemanticNodeKind = 'theme' | 'mechanic' | 'blessing' | 'hazard' | 'character' | 'arena' | 'system';

export interface SemanticNode {
  id: string;
  kind: SemanticNodeKind;
  label: string;
  tags: string[];
}

export interface SemanticEdge {
  from: string;
  to: string;
  relation: 'reinforces' | 'requires' | 'conflicts' | 'expresses' | 'modifies';
}

export interface GameSemanticGraph {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
}

export function buildSemanticGraphFromGdl(gdl: GameDefinition): GameSemanticGraph {
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];

  for (const sys of gdl.systems ?? []) {
    nodes.push({ id: `sys:${sys}`, kind: 'system', label: sys, tags: ['runtime'] });
  }

  const meta = gdl.meta as {
    hazard_scripts?: Record<string, { id?: string; label?: string }>;
    veloria_runtime?: { roster?: Array<{ key: string; role: string }> };
  };

  for (const [sceneId, script] of Object.entries(meta?.hazard_scripts ?? {})) {
    const nid = `hazard:${script.id ?? sceneId}`;
    nodes.push({ id: nid, kind: 'hazard', label: script.label ?? sceneId, tags: [sceneId] });
    edges.push({ from: nid, to: 'theme:tension', relation: 'expresses' });
  }

  const scene = gdl.scenes?.[0] as { veloria?: { blessings?: Array<{ id: string; label: string }> } } | undefined;
  for (const b of scene?.veloria?.blessings ?? []) {
    nodes.push({ id: `bless:${b.id}`, kind: 'blessing', label: b.label, tags: [] });
    edges.push({ from: `bless:${b.id}`, to: 'sys:blessing_draft', relation: 'requires' });
    if (b.id.includes('sacred') || b.id.includes('edge')) {
      edges.push({ from: `bless:${b.id}`, to: 'theme:divine_violence', relation: 'reinforces' });
    }
  }

  for (const hero of meta?.veloria_runtime?.roster ?? []) {
    nodes.push({ id: `char:${hero.key}`, kind: 'character', label: hero.role, tags: [hero.key] });
  }

  if (!nodes.find((n) => n.id === 'theme:tension')) {
    nodes.push({ id: 'theme:tension', kind: 'theme', label: 'Tension combat', tags: [] });
  }
  if (!nodes.find((n) => n.id === 'theme:divine_violence')) {
    nodes.push({ id: 'theme:divine_violence', kind: 'theme', label: 'Violence divine', tags: [] });
  }

  return { nodes, edges };
}

export interface PropagationHint {
  target: string;
  action: string;
  agent: string;
}

/** Suggère des actions agents quand un nœud change. */
export function propagateSemanticChange(
  graph: GameSemanticGraph,
  changedNodeId: string,
): PropagationHint[] {
  const hints: PropagationHint[] = [];
  for (const edge of graph.edges) {
    if (edge.from !== changedNodeId && edge.to !== changedNodeId) continue;
    const other = edge.from === changedNodeId ? edge.to : edge.from;
    const node = graph.nodes.find((n) => n.id === other);
    if (!node) continue;
    if (node.kind === 'hazard') {
      hints.push({ target: node.id, action: 'Ajuster telegraph_ms et pick_lane', agent: 'level' });
    }
    if (node.kind === 'blessing') {
      hints.push({ target: node.id, action: 'Recalibrer modifiers sim + UI draft', agent: 'gameplay' });
    }
    if (node.kind === 'system') {
      hints.push({ target: node.id, action: 'Vérifier engine + GDL systems[]', agent: 'integration' });
    }
  }
  return hints;
}

export function summarizeSemanticGraph(graph: GameSemanticGraph): string {
  return graph.nodes.map((n) => `[${n.kind}] ${n.id}: ${n.label}`).join('\n');
}
