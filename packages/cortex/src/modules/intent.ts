/**
 * Module Intent Ellipse — façade stable.
 *
 * Délègue au provider cognitif sélectionné (ellipse → ollama → heuristique) via le
 * registry. La logique mots-clés vit désormais dans `../providers/heuristics.ts`.
 */
import type { UserIntent } from '@ellipse/shared';
import { getCortexProvider } from '../provider-registry.js';
import { parseFallbackIntent, analyzePrompt } from '../providers/heuristics.js';

export class IntentModule {
  /** Parse async — provider sélectionné (modèle Ellipse / pont open-weights / heuristique). */
  async parseAsync(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    return getCortexProvider().parseIntent(prompt, sourceImages);
  }

  /** Synchrone — heuristique déterministe (contextes non-async / legacy). */
  parse(prompt: string, sourceImages: string[] = []): UserIntent {
    return parseFallbackIntent(prompt, sourceImages);
  }

  /** Enrichissement contextuel (mood, sujets, difficulté). */
  analyze(prompt: string): ReturnType<typeof analyzePrompt> {
    return analyzePrompt(prompt);
  }
}
