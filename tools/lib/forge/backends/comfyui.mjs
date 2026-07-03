/**
 * Backend COMFYUI — génération locale (GPU requis), qualité maîtrisée :
 * checkpoints SDXL/Flux locaux, ControlNet, LoRA d'identité par personnage.
 * S'active dès qu'un serveur ComfyUI répond sur COMFYUI_URL.
 */
const BASE = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const CKPT = process.env.FORGE_SDXL_CKPT || 'sd_xl_base_1.0.safetensors';

export const name = 'comfyui';

export async function available() {
  try {
    const r = await fetch(`${BASE}/system_stats`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch { return false; }
}

function txt2imgGraph({ prompt, negative, width, height, seed, steps = 28, cfg = 6.5 }) {
  return {
    3: { class_type: 'KSampler', inputs: { seed, steps, cfg, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    4: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    5: { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    6: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    7: { class_type: 'CLIPTextEncode', inputs: { text: negative || 'blurry, lowres, watermark, text', clip: ['4', 1] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    9: { class_type: 'SaveImage', inputs: { filename_prefix: 'forge', images: ['8', 0] } },
  };
}

/** Upload d'une image de référence (planche) vers ComfyUI. */
async function uploadRef(refImage) {
  const form = new FormData();
  form.append('image', new Blob([refImage], { type: 'image/png' }), `forge-ref-${Date.now()}.png`);
  const r = await fetch(`${BASE}/upload/image`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`comfyui upload HTTP ${r.status}`);
  return (await r.json()).name;
}

/** img2img : composition VERROUILLÉE sur une planche (denoise bas = fidèle). */
function img2imgGraph({ prompt, negative, seed, refName, denoise = 0.55, steps = 30, cfg = 6.5 }) {
  return {
    3: { class_type: 'KSampler', inputs: { seed, steps, cfg, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['12', 0] } },
    4: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    6: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    7: { class_type: 'CLIPTextEncode', inputs: { text: negative || 'blurry, lowres, watermark, text', clip: ['4', 1] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    9: { class_type: 'SaveImage', inputs: { filename_prefix: 'forge_i2i', images: ['8', 0] } },
    10: { class_type: 'LoadImage', inputs: { image: refName } },
    12: { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
  };
}

/** @returns {Promise<Buffer>} */
export async function generate({ prompt, negative = '', width = 1024, height = 1024, seed = 1, refImage = null, denoise = 0.55, timeoutMs = 300000 }) {
  const graph = refImage
    ? img2imgGraph({ prompt, negative, seed, refName: await uploadRef(refImage), denoise })
    : txt2imgGraph({ prompt, negative, width, height, seed });
  const q = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: graph }) });
  if (!q.ok) throw new Error(`comfyui queue HTTP ${q.status}`);
  const { prompt_id } = await q.json();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const h = await fetch(`${BASE}/history/${prompt_id}`);
    if (!h.ok) continue;
    const hist = (await h.json())[prompt_id];
    if (!hist?.outputs) continue;
    for (const node of Object.values(hist.outputs)) {
      for (const img of node.images ?? []) {
        const r = await fetch(`${BASE}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type}`);
        if (r.ok) return Buffer.from(await r.arrayBuffer());
      }
    }
  }
  throw new Error('comfyui: timeout de génération');
}
