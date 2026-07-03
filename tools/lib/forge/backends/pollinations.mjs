/**
 * Backend POLLINATIONS — génération réelle sans GPU, sans clé, sans compte.
 * Modèles Flux (défaut) via https://image.pollinations.ai.
 *
 * NB : service public — le prompt (direction artistique, non sensible) y transite.
 * Déterminisme : même (prompt, seed, taille) → même image côté service.
 */
const ENDPOINT = process.env.FORGE_FREE_IMG || 'https://image.pollinations.ai/prompt';

export const name = 'pollinations';

export async function available() {
  try {
    const r = await fetch('https://image.pollinations.ai/', { method: 'HEAD' });
    return r.ok || r.status < 500;
  } catch { return false; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @returns {Promise<Buffer>} image (JPEG/PNG). Backoff sur 429/5xx. */
export async function generate({ prompt, negative = '', width = 1024, height = 1024, seed = 1, model = 'flux', timeoutMs = 120000 }) {
  const full = negative ? `${prompt} ### avoid: ${negative}` : prompt;
  const url = `${ENDPOINT}/${encodeURIComponent(full)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(12000 * attempt); // backoff : 12s, 24s, 36s
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) { lastErr = new Error(`pollinations HTTP ${res.status}`); continue; }
      if (!res.ok) throw new Error(`pollinations HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) { lastErr = new Error('pollinations: image vide'); continue; }
      return buf;
    } catch (e) {
      if (e.name === 'AbortError') { lastErr = new Error('pollinations: timeout'); continue; }
      throw e;
    } finally { clearTimeout(t); }
  }
  throw lastErr ?? new Error('pollinations: échec après retries');
}
