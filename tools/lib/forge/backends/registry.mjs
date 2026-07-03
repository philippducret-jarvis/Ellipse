/**
 * Registre des backends génératifs de la Forge.
 *
 * Sélection : FORGE_BACKEND=pollinations|comfyui|fal, sinon auto :
 *   1. ComfyUI local s'il répond (GPU : LoRA/ControlNet/img2img, contrôle total)
 *   2. fal.ai si FAL_KEY (serverless payant, img2img, qualité supérieure)
 *   3. Pollinations (keyless, sans GPU) — la voie gratuite par défaut
 *
 * Interface commune : generate({prompt, negative, width, height, seed,
 * refImage?, denoise?}) → Buffer. refImage (composition verrouillée sur une
 * planche) n'est honoré que par comfyui/fal — capability `img2img`.
 */
import * as pollinations from './pollinations.mjs';
import * as comfyui from './comfyui.mjs';
import * as fal from './fal.mjs';

const BACKENDS = { pollinations, comfyui, fal };
export const IMG2IMG_CAPABLE = new Set(['comfyui', 'fal']);

let cached = null;

export async function pickBackend() {
  if (cached) return cached;
  const forced = process.env.FORGE_BACKEND;
  if (forced) {
    const b = BACKENDS[forced];
    if (!b) throw new Error(`FORGE_BACKEND inconnu : ${forced} (${Object.keys(BACKENDS).join(', ')})`);
    if (!(await b.available())) throw new Error(`Backend ${forced} forcé mais injoignable.`);
    return (cached = b);
  }
  if (await comfyui.available()) return (cached = comfyui);
  if (await fal.available()) return (cached = fal);
  if (await pollinations.available()) return (cached = pollinations);
  return null; // hors-ligne → l'appelant bascule en mode PLAN
}

/** Le backend actif sait-il verrouiller la composition sur une image ? */
export async function hasImg2Img() {
  const b = await pickBackend();
  return b ? IMG2IMG_CAPABLE.has(b.name) : false;
}

/** Génère avec retries (seed++ à chaque tentative pour varier le tirage). */
export async function generateImage(spec, { retries = 2 } = {}) {
  const backend = await pickBackend();
  if (!backend) throw new Error('Aucun backend génératif joignable (hors-ligne ?).');
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const buf = await backend.generate({ ...spec, seed: (spec.seed ?? 1) + i * 1000 });
      return { buf, backend: backend.name, seed: (spec.seed ?? 1) + i * 1000 };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
