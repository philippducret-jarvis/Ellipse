/**
 * CERVEAU CONVERSATIONNEL — chaîne de providers LLM avec TOOL-CALLING NATIF.
 *
 * Priorité (auto) : Anthropic (si ANTHROPIC_API_KEY) → Ollama (si local) →
 * Pollinations texte (keyless, sans clé, sans GPU — défaut immédiat).
 * Forcer : FORGE_BRAIN=pollinations|ollama|anthropic.
 *
 * chat(messages, {tools, temperature}) → { text, toolCalls, brain }
 *   messages : format OpenAI canonique — {role, content, tool_calls?, tool_call_id?}
 *   tools    : specs OpenAI [{type:'function', function:{name, description, parameters}}]
 *   toolCalls: [{ id, name, args }]  (args déjà parsés)
 *
 * Aucune réponse pré-faite : un vrai modèle de langage répond et décide d'agir.
 */

const T = (ms) => AbortSignal.timeout(ms);

// ── Pollinations (keyless, OpenAI-compatible) ──
const pollinations = {
  name: 'pollinations',
  async available() {
    try { const r = await fetch('https://text.pollinations.ai/', { method: 'HEAD', signal: T(4000) }); return r.ok || r.status < 500; }
    catch { return false; }
  },
  async chat(messages, { tools, temperature = 0.6 } = {}) {
    const models = process.env.FORGE_BRAIN_MODEL ? [process.env.FORGE_BRAIN_MODEL] : ['openai', 'openai-fast'];
    let lastErr;
    for (const model of models) {
      const body = { model, messages, temperature, seed: Math.floor(Math.random() * 1e6), private: true, referrer: 'ellipse-forge' };
      if (tools?.length) { body.tools = tools; body.tool_choice = 'auto'; }
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: T(90000),
      });
      if (!res.ok) { lastErr = new Error(`pollinations-text HTTP ${res.status}`); continue; }
      const msg = (await res.json()).choices?.[0]?.message ?? {};
      const toolCalls = (msg.tool_calls ?? []).map((tc) => ({ id: tc.id, name: tc.function.name, args: safeParse(tc.function.arguments) }));
      const text = stripAd((msg.content && msg.content.trim()) || '');
      if (text || toolCalls.length) return { text, toolCalls, raw: msg };
      lastErr = new Error('pollinations-text: réponse vide');
    }
    throw lastErr;
  },
};

// ── Ollama (local, souverain — OpenAI-style tools dans /api/chat) ──
const ollama = {
  name: 'ollama',
  base: () => process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  async available() {
    try { const r = await fetch(`${ollama.base()}/api/tags`, { signal: T(2500) }); return r.ok; }
    catch { return false; }
  },
  async chat(messages, { tools, temperature = 0.6 } = {}) {
    const body = { model: process.env.OLLAMA_MODEL || 'llama3.2', messages, stream: false, options: { temperature } };
    if (tools?.length) body.tools = tools;
    const res = await fetch(`${ollama.base()}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: T(120000),
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
    const msg = (await res.json()).message ?? {};
    const toolCalls = (msg.tool_calls ?? []).map((tc, i) => ({ id: `call_${i}`, name: tc.function.name, args: typeof tc.function.arguments === 'string' ? safeParse(tc.function.arguments) : (tc.function.arguments ?? {}) }));
    return { text: (msg.content ?? '').trim(), toolCalls, raw: msg };
  },
};

// ── Anthropic (si clé — le plus capable) ──
const anthropic = {
  name: 'anthropic',
  async available() { return Boolean(process.env.ANTHROPIC_API_KEY); },
  async chat(messages, { tools, temperature = 0.6, maxTokens = 1024 } = {}) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = toAnthropicTurns(messages.filter((m) => m.role !== 'system'));
    const body = { model: process.env.FORGE_DESIGN_MODEL || 'claude-sonnet-5', max_tokens: maxTokens, temperature, system, messages: turns };
    if (tools?.length) body.tools = tools.map((t) => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body), signal: T(90000),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);
    const data = await res.json();
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const toolCalls = data.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, args: b.input ?? {} }));
    return { text, toolCalls, raw: data };
  },
};

/** Convertit l'historique OpenAI (tool_calls/tool) en blocs Anthropic. */
function toAnthropicTurns(msgs) {
  const out = [];
  for (const m of msgs) {
    if (m.role === 'assistant') {
      const blocks = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const tc of m.tool_calls ?? []) blocks.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: safeParse(tc.function.arguments) });
      out.push({ role: 'assistant', content: blocks.length ? blocks : m.content });
    } else if (m.role === 'tool') {
      out.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }] });
    } else {
      out.push({ role: 'user', content: m.content });
    }
  }
  return out;
}

function safeParse(s) { try { return typeof s === 'string' ? JSON.parse(s || '{}') : (s ?? {}); } catch { return {}; } }

/** Retire le pied de page promotionnel injecté par la voie keyless. */
function stripAd(text) {
  const cut = text.search(/\n[-*\s]*\n?\s*(?:🌸|\*\*(?:Ad|Support|Sponsored|Powered by Pollinations))/i);
  let out = cut > 0 ? text.slice(0, cut) : text;
  out = out.replace(/(?:🌸|Powered by Pollinations|Support (?:our mission|Pollinations)|pollinations\.ai\/redirect)[\s\S]*$/i, '');
  return out.replace(/\n{3,}/g, '\n\n').replace(/[\s-]+$/g, '').trim();
}

const ALL = { anthropic, ollama, pollinations };
let cached = null;

export async function pickBrain() {
  if (cached) return cached;
  const forced = process.env.FORGE_BRAIN;
  if (forced) {
    const b = ALL[forced];
    if (!b) throw new Error(`FORGE_BRAIN inconnu : ${forced} (${Object.keys(ALL).join(', ')})`);
    return (cached = b);
  }
  for (const b of [anthropic, ollama, pollinations]) {
    try { if (await b.available()) return (cached = b); } catch { /* suivant */ }
  }
  return null;
}

export async function chat(messages, opts = {}) {
  const brain = await pickBrain();
  if (!brain) throw new Error('Aucun cerveau conversationnel joignable (hors-ligne ?).');
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try { const r = await brain.chat(messages, opts); return { ...r, brain: brain.name }; }
    catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw lastErr;
}
