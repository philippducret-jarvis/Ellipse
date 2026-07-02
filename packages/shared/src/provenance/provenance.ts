/**
 * Graphe de provenance + compliance (Lot 5) — souverain, sérialisable, sans DB.
 *
 * Modélise la généalogie : prompt → décision → asset → scène → export, avec arêtes typées.
 * Requêtable (`ancestorsOf`). Le store DB (Lot 10) se branchera derrière `snapshot()`.
 * Compliance : photo de personne `private_only` par défaut + **gate d'export** bloquante tant
 * que consentement/licence ne sont pas résolus (droit à l'image, RGPD).
 */
export type ProvenanceNodeKind =
  | 'prompt'
  | 'decision'
  | 'asset'
  | 'scene'
  | 'export'
  | 'person_reference';

export interface ProvenanceNode {
  id: string;
  kind: ProvenanceNodeKind;
  label?: string;
  meta?: Record<string, unknown>;
}

export type ProvenanceEdgeKind = 'derives_from' | 'decided_by' | 'used_in' | 'exported_as';

export interface ProvenanceEdge {
  from: string;
  to: string;
  kind: ProvenanceEdgeKind;
}

export class ProvenanceGraph {
  private nodes = new Map<string, ProvenanceNode>();
  private edges: ProvenanceEdge[] = [];

  addNode(node: ProvenanceNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  /** `from` dérive de / est décidé par `to`. */
  addEdge(from: string, to: string, kind: ProvenanceEdgeKind): this {
    this.edges.push({ from, to, kind });
    return this;
  }

  getNode(id: string): ProvenanceNode | undefined {
    return this.nodes.get(id);
  }

  /** Tous les ancêtres (transitifs) d'un nœud — « d'où vient cet asset ? ». */
  ancestorsOf(id: string): ProvenanceNode[] {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of this.edges) {
        if (e.from === cur && !seen.has(e.to)) {
          seen.add(e.to);
          stack.push(e.to);
        }
      }
    }
    return [...seen].map((nid) => this.nodes.get(nid)).filter((n): n is ProvenanceNode => !!n);
  }

  snapshot(): { nodes: ProvenanceNode[]; edges: ProvenanceEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.edges] };
  }
}

/* ── Compliance ──────────────────────────────────────────────────────────── */

export type PrivacyMode = 'standard' | 'private_only' | 'sensitive_person';
export type LicenseMode = 'internal' | 'commercial' | 'restricted' | 'unresolved';
export type ConsentScope = 'internal_generation_only' | 'internal_and_preview' | 'public_release';

export interface AssetCompliance {
  asset_id: string;
  privacy_mode: PrivacyMode;
  license_mode: LicenseMode;
  consent_scope?: ConsentScope;
}

export interface ExportGateResult {
  allowed: boolean;
  blockers: { asset_id: string; reason: string }[];
}

/**
 * Gate d'export : bloque si une photo de personne n'a pas de consentement `public_release`,
 * ou si une licence est non résolue. Privacy-by-default.
 */
export function evaluateExportGate(
  assets: AssetCompliance[],
  target: 'preview' | 'public' = 'public',
): ExportGateResult {
  const blockers: ExportGateResult['blockers'] = [];
  for (const a of assets) {
    if (a.license_mode === 'unresolved') {
      blockers.push({ asset_id: a.asset_id, reason: 'Licence non résolue' });
    }
    if (a.privacy_mode === 'sensitive_person') {
      if (target === 'public' && a.consent_scope !== 'public_release') {
        blockers.push({ asset_id: a.asset_id, reason: 'Photo de personne sans consentement public_release' });
      }
      if (target === 'preview' && a.consent_scope === 'internal_generation_only') {
        blockers.push({ asset_id: a.asset_id, reason: 'Photo de personne non autorisée en preview' });
      }
    }
  }
  return { allowed: blockers.length === 0, blockers };
}

/** Défaut privacy-by-default pour une photo de personne ingérée. */
export function defaultPersonReferenceCompliance(asset_id: string): AssetCompliance {
  return { asset_id, privacy_mode: 'sensitive_person', license_mode: 'restricted', consent_scope: 'internal_generation_only' };
}
