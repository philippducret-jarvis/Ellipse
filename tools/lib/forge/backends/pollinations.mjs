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

/** @returns {Promise<Buffer>} image (JPEG/PNG) */
export async function generate({ prompt, negative = '', width = 1024, height = 1024, seed = 1, model = 'flux', timeoutMs = 120000 }) {
  const full = negative ? `${prompt} ### avoid: ${negative}` : prompt;
  const url = `${ENDPOINT}/${encodeURIComponent(full)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`pollinations HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) throw new Error('pollinations: image vide');
    return buf;
  } finally { clearTimeout(t); }
}
