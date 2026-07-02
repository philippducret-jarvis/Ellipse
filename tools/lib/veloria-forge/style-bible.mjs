/**
 * Veloria — BIBLE DE STYLE (style lock du générateur).
 *
 * Dérivée des planches concept (l'IDÉE de l'univers). Elle n'est PAS découpée des
 * planches : elle en extrait les RÈGLES (palette, matières, lumière, caméra, lisibilité)
 * pour que TOUTE génération (perso, décor, anim, VFX) soit cohérente et fidèle à l'univers.
 *
 * Consommée par prompts.mjs (fragments de prompt) et comfy-workflows.mjs (résolution,
 * sampler, ControlNet). C'est le « game art bible » d'un vrai studio, en données.
 */
export const STYLE = {
  id: 'veloria-veille-des-lames',
  pitch: 'Action-roguelite mobile vertical · dark fantasy premium · gacha',

  // Palette canonique (planche "Personnages Principaux" → Palette Chromatique)
  palette: {
    or_sacre: '#c9a227', violet_occulte: '#5a3a72', pourpre_mystere: '#7a2f5a',
    carmin: '#a33046', bronze_bastion: '#8a6a3a', indigo_malediction: '#3b3a72', noir: '#07060a',
    ivoire: '#f0e6cf',
  },
  paletteWords: ['sacred gold', 'occult violet', 'mystic purple', 'blood crimson', 'bastion bronze', 'malediction indigo', 'ink black', 'ivory'],

  // Direction artistique (planche "Signature Visuelle")
  artDirection: [
    'dark fantasy premium', 'adult elegant powerful heroines', 'rich noble materials (gold filigree, silk, blackened steel)',
    'dramatic chiaroscuro lighting', 'cool ambient shadows with warm gold rim light', 'cinematic, painterly, high detail',
  ],
  // Lisibilité jeu (planche "Conception & Lisibilité")
  readability: [
    'clear readable silhouette', 'strong rim light separating subject from background',
    'fast read at mobile size', 'controlled contrast', 'no text, no watermark, no frame, no border',
  ],

  // Rendu cible (mobile 2,5D vertical)
  render: {
    base_checkpoint: 'sdxl', // famille recommandée : SDXL/Illustrious dark-fantasy
    sprite_resolution: 1024, // génération HD, downscale runtime
    upscale: 1.5,
    sampler: 'dpmpp_2m_sde', scheduler: 'karras', steps: 30, cfg: 6.5,
    background: 'transparent', // sortie alpha (rembg/SAM en post)
    camera: '3/4 front, full body, feet visible, centered, slight low angle (hero) / eye level (enemy)',
  },

  // Prompt global (toujours injecté)
  positiveGlobal: [
    'masterpiece, best quality, ultra detailed, cinematic lighting, dark fantasy, gothic, premium gacha character art',
    'dramatic chiaroscuro, cool shadow ambient, warm gold rim light, painterly, sharp focus, full body, clean silhouette',
  ].join(', '),
  negativeGlobal: [
    'lowres, blurry, jpeg artifacts, bad anatomy, extra limbs, fused fingers, watermark, signature, text, ui, frame, border',
    'flat lighting, washed out, oversaturated, sticker, cut-out, pasted, plain background, deformed, mutated',
  ].join(', '),
};

// fragment palette pour un rôle/teinte donné
export function paletteFor(keys) {
  return (keys ?? []).map((k) => STYLE.palette[k] ? k.replace(/_/g, ' ') : k).join(', ');
}

export default STYLE;
