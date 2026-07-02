/**
 * Veloria — GRAPHES DE WORKFLOW ComfyUI (format API).
 *
 * Génère des graphes ComfyUI exécutables : txt2img SDXL, txt2img + ControlNet OpenPose
 * (pour les frames d'animation à pose imposée), et variante décor large. Ce sont les
 * « recettes machine » qui transforment une spec de prompt en image HD réelle.
 *
 * Réglages issus de la bible de style. Noms de checkpoints/ControlNet configurables.
 */
import STYLE from './style-bible.mjs';

const CKPT = process.env.VELORIA_SDXL_CKPT || 'dreamshaperXL_v21.safetensors';
const CN_OPENPOSE = process.env.VELORIA_CN_OPENPOSE || 'controlnet-openpose-sdxl-1.0.safetensors';

function baseNodes({ positive, negative, width, height, seed, steps, cfg, sampler, scheduler, prefix }) {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: positive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['4', 1] } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: prefix, images: ['8', 0] } },
    __ksampler: { seed, steps, cfg, sampler, scheduler },
  };
}

/** txt2img SDXL simple (pose libre — image de référence/idle). */
export function txt2imgGraph(spec, { seed = 1, prefix = 'veloria' } = {}) {
  const r = STYLE.render;
  const n = baseNodes({ positive: spec.positive, negative: spec.negative, width: spec.size[0], height: spec.size[1], seed, steps: r.steps, cfg: r.cfg, sampler: r.sampler, scheduler: r.scheduler, prefix });
  const k = n.__ksampler; delete n.__ksampler;
  n['3'] = { class_type: 'KSampler', inputs: { seed: k.seed, steps: k.steps, cfg: k.cfg, sampler_name: k.sampler, scheduler: k.scheduler, denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } };
  return n;
}

/** txt2img + ControlNet OpenPose : impose une pose (frame d'animation déterministe). */
export function controlnetPoseGraph(spec, poseFile, { seed = 1, prefix = 'veloria', strength = 0.85 } = {}) {
  const r = STYLE.render;
  const n = baseNodes({ positive: spec.positive, negative: spec.negative, width: spec.size[0], height: spec.size[1], seed, steps: r.steps, cfg: r.cfg, sampler: r.sampler, scheduler: r.scheduler, prefix });
  const k = n.__ksampler; delete n.__ksampler;
  n['10'] = { class_type: 'LoadImage', inputs: { image: poseFile } };
  n['11'] = { class_type: 'ControlNetLoader', inputs: { control_net_name: CN_OPENPOSE } };
  n['12'] = { class_type: 'ControlNetApply', inputs: { conditioning: ['6', 0], control_net: ['11', 0], image: ['10', 0], strength } };
  n['3'] = { class_type: 'KSampler', inputs: { seed: k.seed, steps: k.steps, cfg: k.cfg, sampler_name: k.sampler, scheduler: k.scheduler, denoise: 1, model: ['4', 0], positive: ['12', 0], negative: ['7', 0], latent_image: ['5', 0] } };
  return n;
}

/** décor large (couche parallax). */
export function decorGraph(spec, { seed = 1, prefix = 'veloria_decor' } = {}) {
  return txt2imgGraph(spec, { seed, prefix });
}

export const FORGE_MODELS = { checkpoint: CKPT, controlnet_openpose: CN_OPENPOSE };
