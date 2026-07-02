/**
 * Ellipse Cortex — client Ollama local.
 * ORDRE-001 : aucun appel LLM externe — Ollama tourne on-premise.
 * Variables : OLLAMA_URL (défaut http://localhost:11434)
 *             OLLAMA_MODEL (défaut llama3.2 ou mistral)
 */

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  message: { content: string };
  done: boolean;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = (config.baseUrl ?? process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
    this.model = config.model ?? process.env.OLLAMA_MODEL ?? 'llama3.2';
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: OllamaChatMessage[], opts: { temperature?: number } = {}): Promise<string> {
    const body = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.3,
        num_predict: 1024,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as OllamaResponse;
    return data.message.content.trim();
  }

  /** Génère une réponse JSON parsée. Re-tente si le JSON est invalide (max 2 fois). */
  async chatJson<T>(messages: OllamaChatMessage[], opts: { temperature?: number } = {}): Promise<T> {
    const jsonMessages: OllamaChatMessage[] = [
      ...messages,
      {
        role: 'system',
        content: 'IMPORTANT: respond ONLY with valid JSON, no markdown, no explanation, no ```json blocks.',
      },
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await this.chat(jsonMessages, opts);
      const cleaned = raw.replace(/^```(?:json)?[\r\n]*/i, '').replace(/[\r\n]*```$/i, '').trim();
      try {
        return JSON.parse(cleaned) as T;
      } catch {
        if (attempt === 2) throw new Error(`Ollama JSON parse failed after 3 attempts. Last output: ${raw.slice(0, 200)}`);
      }
    }
    throw new Error('Unreachable');
  }
}

let _client: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!_client) _client = new OllamaClient();
  return _client;
}
