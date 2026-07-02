/**
 * Provider Ollama — PONT open-weights auto-hébergé (Llama/Mistral) — transition assumée.
 *
 * ⚠️ Ce provider exécute des modèles TIERS (généralistes), en local. Il sert de pont
 * opérationnel le temps que le modèle Ellipse from-scratch (`training/`) soit entraîné.
 * Cible souveraine : `EllipseProvider`. Voir ORDRE-001 (CONSTRUCTION_ORDERS.md).
 *
 * Conforme ORDRE-003 : inférence on-premise, aucun SaaS cognitif tiers, aucune donnée
 * qui sort de l'infra.
 */
import type { UserIntent } from '@ellipse/shared';
import type { CortexProvider, LLMPlanHints } from '../provider.js';
import { getOllamaClient } from '../modules/ollama-client.js';
import { parseFallbackIntent } from './heuristics.js';

interface LLMIntentResult {
  genre: string;
  dimension: '2d' | '2.5d' | '3d';
  mechanics: string[];
  features: { narrative: boolean; vfx: boolean; cinematic: boolean };
  mood?: string;
  subjects: string[];
  difficulty: 'easy' | 'normal' | 'hard';
  summary: string;
}

const INTENT_SYSTEM_PROMPT = `You are Ellipse Cortex, the AI core of a video game generation engine.
Your task: parse a game creation request and extract a structured intent JSON.

Rules:
- genre: one of platformer, rpg, puzzle, runner, fighting (pick the closest)
- dimension: "2d", "2.5d" (depth/parallax over a 2D base), or "3d"
- mechanics: array of detected gameplay mechanics (double jump, collect, score, health, enemy, power-up, dash, wall jump, etc.)
- features.narrative: true if story/dialog/quests are relevant
- features.vfx: true if particles/explosions/effects are mentioned
- features.cinematic: true if camera work or cutscenes are mentioned
- mood: dark, retro, cute, epic, or null
- subjects: main character types mentioned (cat, dog, ninja, robot, wizard, etc.)
- difficulty: easy, normal, or hard
- summary: 1 sentence describing the game

Respond ONLY with valid JSON matching this exact structure:
{
  "genre": "platformer",
  "dimension": "2d",
  "mechanics": ["collect", "enemy"],
  "features": { "narrative": false, "vfx": false, "cinematic": false },
  "mood": "retro",
  "subjects": ["cat"],
  "difficulty": "normal",
  "summary": "A retro 2D platformer featuring a cat ninja collecting coins and avoiding enemies."
}`;

const PLAN_SYSTEM_PROMPT = `You are Ellipse Cortex, the planning AI of a video game generation engine.
Given a parsed game intent, decide which specialized agents are actually needed.

Available agents: character, decor, animation, level, mesh_3d, lighting, camera, gameplay, narrative, music, sfx, ui, vfx, qa, integration

Rules:
- character, decor, level, gameplay, music, sfx, ui, qa, integration: ALWAYS include
- animation: include if source_images present or if genre requires rich movement (fighting)
- mesh_3d + lighting: only if dimension is 3d
- narrative: only if features.narrative is true OR genre is rpg or fighting
- vfx: only if features.vfx is true OR genre is fighting
- camera: only if features.cinematic is true OR dimension is 3d
- extra_mechanics: any mechanics you infer from context not already listed
- estimated_minutes: 8-25 depending on complexity
- project_notes: editorial note on what makes this game interesting/challenging to generate

Respond ONLY with valid JSON:
{
  "required_agents": ["character","decor","level","gameplay","music","sfx","ui","qa","integration"],
  "extra_mechanics": [],
  "project_notes": "...",
  "estimated_minutes": 12
}`;

export class OllamaProvider implements CortexProvider {
  readonly name = 'ollama';

  async isAvailable(): Promise<boolean> {
    return getOllamaClient().isAvailable();
  }

  async parseIntent(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    try {
      const result = await getOllamaClient().chatJson<LLMIntentResult>(
        [
          { role: 'system', content: INTENT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Game request: ${prompt}${sourceImages.length > 0 ? `\n(${sourceImages.length} source image(s) provided)` : ''}`,
          },
        ],
        { temperature: 0.2 },
      );

      const dimension = result.dimension === '3d' || result.dimension === '2.5d' ? result.dimension : '2d';
      return {
        raw_prompt: prompt,
        genre: result.genre ?? 'platformer',
        dimension,
        mechanics: Array.isArray(result.mechanics) ? result.mechanics : [],
        source_images: sourceImages,
        features: {
          narrative: Boolean(result.features?.narrative),
          vfx: Boolean(result.features?.vfx),
          cinematic: Boolean(result.features?.cinematic),
        },
      };
    } catch {
      // Pont indisponible/incohérent → repli déterministe.
      return parseFallbackIntent(prompt, sourceImages);
    }
  }

  async planHints(intent: UserIntent): Promise<LLMPlanHints | null> {
    try {
      return await getOllamaClient().chatJson<LLMPlanHints>(
        [
          { role: 'system', content: PLAN_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              prompt: intent.raw_prompt,
              genre: intent.genre,
              dimension: intent.dimension,
              mechanics: intent.mechanics,
              source_images_count: intent.source_images.length,
              features: intent.features,
            }),
          },
        ],
        { temperature: 0.1 },
      );
    } catch {
      return null;
    }
  }
}
