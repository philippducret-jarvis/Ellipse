/**
 * Registre des backends génératifs de la Forge.
 *
 * Sélection : FORGE_BACKEND=pollinations|comfyui, sinon auto :
 *   1. ComfyUI local s'il répond (GPU, qualité maîtrisée, LoRA/ControlNet)
 *   2. Pollinations (keyless, sans GPU) — la voie « réelle » par défaut
 *
 * Interface commune : generate({prompt, negative, width, height, seed}) → Buffer.
 * Toute étape du pipeline passe par ici : ajouter fal.ai/Replicate = un fichier.
 */
import * as pollinations from './pollinations.mjs';
import * as comfyui from './comfyui.mjs';

const BACKENDS = { pollinations, comfyui };

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
  if (await pollinations.available()) return (cached = pollinations);
  return null; // hors-ligne → l'appelant bascule en mode PLAN
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
