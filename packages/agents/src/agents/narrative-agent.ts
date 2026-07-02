import type { TaskSpec } from '@ellipse/shared';
import { generateNarrative } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

/** Essaie d'importer Ollama si @ellipse/cortex est disponible (worker optionnel). */
async function tryOllamaNarrative(genre: string, prompt: string, branching: boolean): Promise<string | null> {
  try {
    const { getOllamaClient } = await import('@ellipse/cortex');
    const ollama = getOllamaClient();
    if (!(await ollama.isAvailable())) return null;

    const systemPrompt = `You are a game narrative writer for Ellipse, an AI game engine.
Create a short but evocative game narrative pack in JSON.
Genre: ${genre}. Respond ONLY with valid JSON, no markdown.
Schema:
{
  "title": "string",
  "logline": "string (1 sentence)",
  "hero_name": "string",
  "villain_name": "string",
  "world_name": "string",
  "opening_line": "string (spoken by hero at game start)",
  "quest_title": "string",
  "quest_description": "string (2-3 sentences)",
  "win_text": "string",
  "lose_text": "string",
  "dialogues": [
    { "id": "dlg_01", "speaker": "hero", "text": "string", "trigger": "game_start" },
    { "id": "dlg_02", "speaker": "villain", "text": "string", "trigger": "first_enemy" },
    { "id": "dlg_03", "speaker": "hero", "text": "string", "trigger": "level_complete" }
  ]
}`;

    const result = await ollama.chatJson<{
      title: string;
      logline: string;
      hero_name: string;
      villain_name: string;
      world_name: string;
      opening_line: string;
      quest_title: string;
      quest_description: string;
      win_text: string;
      lose_text: string;
      dialogues: Array<{ id: string; speaker: string; text: string; trigger: string }>;
    }>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Game concept: "${prompt}". Genre: ${genre}. Branching: ${branching}.` },
    ], { temperature: 0.7 });

    return JSON.stringify({
      generated_by: 'ollama',
      title: result.title,
      logline: result.logline,
      characters: {
        hero: { name: result.hero_name },
        villain: { name: result.villain_name },
      },
      world: { name: result.world_name },
      opening_line: result.opening_line,
      quests: [
        {
          id: 'quest_main',
          title: result.quest_title,
          description: result.quest_description,
          branching,
        },
      ],
      dialogues: result.dialogues,
      win_text: result.win_text,
      lose_text: result.lose_text,
    });
  } catch {
    return null;
  }
}

export class NarrativeAgent extends BaseAgent {
  readonly id = 'narrative' as const;
  readonly name = 'Le Conteur';
  readonly description = 'Histoire, dialogues et quêtes — Ollama → procédural fallback';

  async execute(task: TaskSpec) {
    const genre = this.getGenre(task);
    const prompt = this.getPromptExcerpt(task);
    const branching = (task.input.branching as boolean) ?? false;

    // Essai Ollama pour une narrative riche
    const ollamaNarrative = await tryOllamaNarrative(genre, prompt, branching);
    if (ollamaNarrative) {
      const pack = JSON.parse(ollamaNarrative) as Record<string, unknown>;
      const dialogues = (pack.dialogues as unknown[]) ?? [];
      const quests = (pack.quests as unknown[]) ?? [];
      return this.success(task, {
        gdl_patches: [{ op: 'replace', path: '/narrative', value: pack }],
        agent_notes: `Narrative Ollama · ${dialogues.length} dialogues · ${quests.length} quêtes · ton ${genre}`,
      });
    }

    // Fallback procédural
    const pack = generateNarrative(genre, prompt, branching);
    return this.success(task, {
      gdl_patches: [{ op: 'replace', path: '/narrative', value: pack }],
      agent_notes: `${pack.dialogues.length} dialogues · ${pack.quests.length} quêtes · ton ${genre} · ${this.getModelHint()}`,
    });
  }
}
