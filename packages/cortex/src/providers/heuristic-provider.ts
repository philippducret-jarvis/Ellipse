/**
 * Provider heuristique — classifieur déterministe par mots-clés.
 * Toujours disponible : c'est le dernier maillon de fallback du routeur.
 */
import type { UserIntent } from '@ellipse/shared';
import type { CortexProvider, LLMPlanHints } from '../provider.js';
import { parseFallbackIntent } from './heuristics.js';

export class HeuristicProvider implements CortexProvider {
  readonly name = 'heuristic';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async parseIntent(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    return parseFallbackIntent(prompt, sourceImages);
  }

  /** Pas d'indices : la planification heuristique de `PlanModule` prend le relais. */
  async planHints(_intent: UserIntent): Promise<LLMPlanHints | null> {
    return null;
  }
}
