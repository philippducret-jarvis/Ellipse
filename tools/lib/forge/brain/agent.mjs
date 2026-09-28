/**
 * ELLISPHERE — agent conversationnel du studio Ellipse.
 *
 * Vrai dialogue (LLM), PAS de réponses pré-faites. Tool-calling NATIF : le
 * modèle choisit d'appeler un outil, on l'exécute réellement, on lui rend le
 * résultat, il enchaîne ou répond. Boucle jusqu'à une réponse en clair.
 */
import { chat } from './providers.mjs';
import { toolSpecs, runTool } from './tools.mjs';

const SYSTEM = `Tu es Ellisphere, l'intelligence de production du studio de jeux vidéo Ellipse. Tu tutoies, tu parles français, avec naturel et concision — comme un collègue de studio, jamais un formulaire ou un message générique.

Ellipse forge de vrais jeux 2D/2,5D HD à partir de prompts : chaque jeu est une campagne (niveaux enchaînés, boss, histoire, reliques), faite d'assets générés, définie en GDL et jouable dans le navigateur. Tu aides l'utilisateur à piloter ce studio.

Tu disposes d'outils pour AGIR et pour CONNAÎTRE l'état réel du studio. Utilise-les dès qu'une réponse dépend de faits (quels jeux existent, leur qualité, leurs agents, appliquer une modification…) : ne devine jamais, vérifie. Ne confonds jamais « jouable », « HD » et « commercialement prêt ». Orbes d'Astra, Veloria et Echoes of the Mushroom Realm ont des runtimes spécialisés qui ne doivent jamais être remplacés par la Forge générique. Quand tu as l'information, réponds en français clair et bref. Si une action est refusée, explique le garde-fou et indique le pipeline spécialisé requis.`;

/**
 * Un tour d'Ellisphere. `history` = messages OpenAI (user/assistant/tool).
 * @returns {Promise<{reply, actions, brain, history}>}
 */
export async function ellisphereTurn(history, { maxSteps = 7 } = {}) {
  const messages = [{ role: 'system', content: SYSTEM }, ...history];
  const specs = toolSpecs();
  const actions = [];
  let brainName = null;

  for (let step = 0; step < maxSteps; step++) {
    const { text, toolCalls, brain } = await chat(messages, { tools: specs, temperature: 0.6 });
    brainName = brain;

    if (!toolCalls?.length) {
      messages.push({ role: 'assistant', content: text });
      return { reply: text, actions, brain: brainName, history: messages.slice(1) };
    }

    // tour assistant portant les appels d'outils (format OpenAI)
    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: toolCalls.map((tc) => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.args) } })),
    });
    // exécuter chaque outil et rendre l'observation
    for (const tc of toolCalls) {
      const result = await runTool(tc.name, tc.args);
      actions.push({ tool: tc.name, args: tc.args, result });
      messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.name, content: JSON.stringify(result) });
    }
  }

  // trop d'étapes → forcer une réponse en clair (sans outils)
  const { text } = await chat([...messages, { role: 'user', content: 'Réponds maintenant à l’utilisateur en français, sans appeler d’outil.' }], { temperature: 0.6 });
  messages.push({ role: 'assistant', content: text });
  return { reply: text, actions, brain: brainName, history: messages.slice(1) };
}
