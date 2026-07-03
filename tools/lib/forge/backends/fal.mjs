/**
 * Backend FAL.AI — génération serverless payante (~0,003–0,03 $/image),
 * qualité et contrôle supérieurs à la voie gratuite, sans GPU local.
 * S'active dès que FAL_KEY est défini (https://fal.ai/dashboard/keys).
 *
 * Modèle par défaut : flux/schnell (rapide, bon marché). FORGE_FAL_MODEL
 * pour changer (ex. fal-ai/flux/dev, fal-ai/flux-pro).
 * Supporte l'IMG2IMG (composition verrouillée sur une planche) via refImage.
 */
const KEY = () => process.env.FAL_KEY;
const MODEL = () => process.env.FORGE_FAL_MODEL || 'fal-ai/flux/schnell';

export const name = 'fal';

export async function available() {
  return Boolean(KEY());
}

/** @returns {Promise<Buffer>} */
export async function generate({ prompt, negative = '', width = 1024, height = 1024, seed = 1, refImage = null, denoise = 0.6, timeoutMs = 180000 }) {
  const model = refImage ? (process.env.FORGE_FAL_I2I_MODEL || 'fal-ai/flux/dev/image-to-image') : MODEL();
  const body = {
    prompt: negative ? `${prompt}. Avoid: ${negative}` : prompt,
    image_size: { width, height },
    seed,
    num_images: 1,
    enable_safety_checker: false,
  };
  if (refImage) {
    body.image_url = `data:image/png;base64,${refImage.toString('base64')}`;
    body.strength = denoise;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${KEY()}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`fal HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const url = data.images?.[0]?.url;
    if (!url) throw new Error('fal: pas d’image dans la réponse');
    if (url.startsWith('data:')) return Buffer.from(url.split(',')[1], 'base64');
    const img = await fetch(url, { signal: ctrl.signal });
    return Buffer.from(await img.arrayBuffer());
  } finally { clearTimeout(t); }
}
