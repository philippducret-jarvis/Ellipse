/**
 * Cortex — sélection du provider cognitif.
 *
 * `ELLIPSE_CORTEX_BACKEND` :
 *   - `ellipse`   : modèle Ellipse from-scratch uniquement (→ heuristique si poids absents).
 *   - `ollama`    : pont open-weights uniquement (→ heuristique si service absent).
 *   - `heuristic` : déterministe pur (jamais d'inférence).
 *   - `auto` (défaut) : ellipse → ollama → heuristique (premier disponible).
 *
 * Objectif : basculer du PONT tiers vers le modèle souverain sans toucher le reste du code.
 */
import type { CortexProvider, LLMPlanHints } from './provider.js';
import type { UserIntent } from '@ellipse/shared';
import { HeuristicProvider } from './providers/heuristic-provider.js';
import { OllamaProvider } from './providers/ollama-provider.js';
import { EllipseProvider } from './providers/ellipse-provider.js';

/** Essaie les providers dans l'ordre ; délègue au premier disponible (heuristique en dernier). */
export class ProviderRouter implements CortexProvider {
  readonly name = 'router';

  constructor(private readonly providers: CortexProvider[]) {
    if (providers.length === 0) throw new Error('ProviderRouter: liste de providers vide');
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private get fallback(): CortexProvider {
    return this.providers[this.providers.length - 1]!;
  }

  private async pick(): Promise<CortexProvider> {
    for (const p of this.providers) {
      try {
        if (await p.isAvailable()) return p;
      } catch {
        /* provider en erreur → suivant */
      }
    }
    return this.fallback;
  }

  async parseIntent(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    const provider = await this.pick();
    try {
      return await provider.parseIntent(prompt, sourceImages);
    } catch {
      return this.fallback.parseIntent(prompt, sourceImages);
    }
  }

  async planHints(intent: UserIntent): Promise<LLMPlanHints | null> {
    const provider = await this.pick();
    try {
      return await provider.planHints(intent);
    } catch {
      return null;
    }
  }
}

let _provider: CortexProvider | null = null;

export function getCortexProvider(): CortexProvider {
  if (_provider) return _provider;
  const backend = (process.env.ELLIPSE_CORTEX_BACKEND ?? 'auto').toLowerCase();
  const heuristic = new HeuristicProvider();

  switch (backend) {
    case 'heuristic':
      _provider = heuristic;
      break;
    case 'ollama':
      _provider = new ProviderRouter([new OllamaProvider(), heuristic]);
      break;
    case 'ellipse':
      _provider = new ProviderRouter([new EllipseProvider(), heuristic]);
      break;
    case 'auto':
    default:
      _provider = new ProviderRouter([new EllipseProvider(), new OllamaProvider(), heuristic]);
  }
  return _provider;
}

/** Réinitialise le singleton (tests / changement de backend à chaud). */
export function resetCortexProvider(): void {
  _provider = null;
}
