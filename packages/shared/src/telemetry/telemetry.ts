/**
 * Télémétrie / observabilité souveraine (Lot 10) — collecteur sérialisable, sans SaaS tiers.
 *
 * Enregistre les métriques du PDF (temps prompt→preview, retries/type, validator failures,
 * builds cassés, score QA, ratio variantes/originaux) + métriques agent (modèle, seed, durée).
 * `summary()` agrège ; `snapshot()` est persistable en DB (Lot 5/store). Reproductibilité :
 * chaque run porte son seed.
 */
export type MetricName =
  | 'prompt_to_preview_ms'
  | 'retry'
  | 'validator_failure'
  | 'build_broken'
  | 'qa_score'
  | 'agent_duration_ms';

export interface MetricSample {
  name: MetricName;
  value: number;
  at: string;
  tags?: Record<string, string>;
}

export class Telemetry {
  private samples: MetricSample[] = [];

  constructor(private now: () => string = () => new Date().toISOString()) {}

  record(name: MetricName, value: number, tags?: Record<string, string>): void {
    this.samples.push({ name, value, at: this.now(), tags });
  }

  /** Compteur (retries, échecs…) — value=1 par défaut. */
  increment(name: MetricName, tags?: Record<string, string>): void {
    this.record(name, 1, tags);
  }

  /** Agrégats : count, sum, avg, min, max par métrique. */
  summary(): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
    const out: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
    for (const s of this.samples) {
      const a = (out[s.name] ??= { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity });
      a.count += 1;
      a.sum += s.value;
      a.min = Math.min(a.min, s.value);
      a.max = Math.max(a.max, s.value);
      a.avg = a.sum / a.count;
    }
    return out;
  }

  snapshot(): { samples: MetricSample[] } {
    return { samples: [...this.samples] };
  }
}
