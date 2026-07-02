/**
 * Mémoire d'exécution Cortex (Lot 2a).
 *
 * Journal sérialisable des décisions cognitives (intent, plan, arbitrages). En mémoire ici ;
 * persisté plus tard en base (Lot 4/5/10) sans changer l'interface. Sert à la reproductibilité
 * et à l'explicabilité : « pourquoi ce plan, quels agents abandonnés et pourquoi ».
 */
import type { ProductionBudget } from './budget.js';

export type MemoryKind = 'intent' | 'plan' | 'arbitration' | 'note';

export interface MemoryEntry {
  at: string;
  kind: MemoryKind;
  summary: string;
  data?: unknown;
}

export class ExecutionMemory {
  private entries: MemoryEntry[] = [];

  constructor(private now: () => string = () => new Date().toISOString()) {}

  record(kind: MemoryKind, summary: string, data?: unknown): MemoryEntry {
    const entry: MemoryEntry = { at: this.now(), kind, summary, data };
    this.entries.push(entry);
    return entry;
  }

  recordArbitration(budget: ProductionBudget): MemoryEntry {
    const dropped = budget.decisions.filter((d) => d.kind === 'drop_agent').map((d) => d.agent);
    const summary =
      `Arbitrage ${budget.quality_target} : ${budget.estimate_before.total_minutes}→` +
      `${budget.estimate_after.total_minutes} min` +
      (dropped.length ? `, abandonnés: ${dropped.join(', ')}` : ', plan complet');
    return this.record('arbitration', summary, budget);
  }

  list(): readonly MemoryEntry[] {
    return this.entries;
  }

  /** Snapshot sérialisable (persistable tel quel). */
  snapshot(): { entries: MemoryEntry[] } {
    return { entries: [...this.entries] };
  }
}
