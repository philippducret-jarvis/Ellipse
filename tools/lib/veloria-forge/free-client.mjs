/**
 * Veloria — BACKEND GÉNÉRATIF GRATUIT (sans GPU, sans clé, sans compte).
 *
 * Utilise un service d'images keyless (Pollinations.ai, modèles Flux/SDXL) via une
 * simple requête HTTP. C'est la voie « gratuite » de la Forge : qualité premium, zéro
 * installation. Alternative à ComfyUI quand on n'a ni GPU ni budget.
 *
 * NB : service externe public — le prompt (style/identité, non sensible) y est envoyé.
 */
const ENDPOINT = process.env.VELORIA_FREE_IMG || 'https://image.pollinations.ai/prompt';

export async function available() {
  try { const r = await fetch('https://image.pollinations.ai/', { method: 'HEAD' }); return r.ok || r.status < 500; }
  catch { return false; }
}

/** génère une image et renvoie un Buffer (JPEG/PNG). */
export async function generate(prompt, { width = 768, height = 1024, seed = 1, model = 'flux', timeoutMs = 90000 } = {}) {
  const url = `${ENDPOINT}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`free-img ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally { clearTimeout(t); }
}
