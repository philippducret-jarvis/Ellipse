/**
 * Ellipse Cortex — contrat de provider cognitif.
 *
 * Un `CortexProvider` est une source d'intelligence interchangeable derrière laquelle
 * se cache l'implémentation réelle :
 *   - `heuristic` : classifieur déterministe par mots-clés (toujours dispo, filet).
 *   - `ollama`    : PONT open-weights auto-hébergé (Llama/Mistral) — transition assumée.
 *   - `ellipse`   : modèle Ellipse from-scratch (ONNX), cible souveraine (voir `training/`).
 *
 * Cette couture permet de remplacer le cerveau sans toucher orchestrateur ni agents.
 * Sélection : variable `ELLIPSE_CORTEX_BACKEND` (voir `provider-registry.ts`).
 */
import type { UserIntent } from '@ellipse/shared';

/** Indices de planification produits par un provider (sous-ensemble d'agents, mécaniques, notes). */
export interface LLMPlanHints {
  /** Agents réellement nécessaires pour ce jeu (subset de la liste complète). */
  required_agents: string[];
  /** Mécaniques additionnelles détectées. */
  extra_mechanics: string[];
  /** Notes éditoriales sur le projet. */
  project_notes: string;
  /** Durée estimée en minutes. */
  estimated_minutes: number;
}

export interface CortexProvider {
  /** Identifiant lisible : `heuristic` | `ollama` | `ellipse` | `router`. */
  readonly name: string;
  /** Le provider est-il opérationnel maintenant (poids présents, service joignable…) ? */
  isAvailable(): Promise<boolean>;
  /** Prompt (+ photos) → intent structuré Ellipse. */
  parseIntent(prompt: string, sourceImages?: string[]): Promise<UserIntent>;
  /** Intent → indices de planification, ou `null` si le provider laisse l'heuristique décider. */
  planHints(intent: UserIntent): Promise<LLMPlanHints | null>;
}
