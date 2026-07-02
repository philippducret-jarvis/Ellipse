/**
 * IDENTITÉ — verrouillage de la cohérence personnage, version sans GPU.
 *
 * Principe : chaque personnage a une CARTE D'IDENTITÉ — son ADN visuel sous
 * forme d'un bloc de prompt canonique (silhouette, visage, tenue, couleurs hex,
 * matières) + un seed maître dérivé de son id. TOUT rendu de ce personnage
 * réutilise ce bloc verbatim et un seed de la même famille : c'est ce qui tient
 * l'identité d'un rendu à l'autre sans LoRA.
 *
 * Montée en gamme (GPU/API) : la planche de référence générée ici devient le
 * dataset d'entraînement d'un LoRA par personnage — même carte, même contrat.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateImage } from './backends/registry.mjs';
import { assess, generateValidated } from './qa.mjs';
import { cutoutGenerated, hasNeuralMatte } from './cutout.mjs';

export function masterSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483000;
}

const NEGATIVE = 'blurry, lowres, deformed hands, extra limbs, text, watermark, signature, cropped body, multiple characters, photo, photorealistic skin, drop shadow, ground shadow, background scenery';

/** Fond chroma le plus ÉLOIGNÉ de la palette du personnage (détourage fiable). */
const CHROMAS = [
  { hex: '#22cc55', phrase: 'perfectly uniform pure vivid green chroma key backdrop, flat solid green color fill, brightly lit green screen' },
  { hex: '#e02ba0', phrase: 'perfectly uniform pure vivid magenta chroma key backdrop, flat solid magenta color fill, brightly lit magenta screen' },
  { hex: '#28a8e8', phrase: 'perfectly uniform pure vivid sky blue chroma key backdrop, flat solid blue color fill, brightly lit blue screen' },
];
export function pickChroma(paletteHex = []) {
  const rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  let best = CHROMAS[0], bestD = -1;
  for (const c of CHROMAS) {
    const cc = rgb(c.hex);
    const d = Math.min(...(paletteHex.length ? paletteHex : ['#808080']).map((p) => { const pp = rgb(p); return Math.hypot(cc[0] - pp[0], cc[1] - pp[1], cc[2] - pp[2]); }));
    if (d > bestD) { bestD = d; best = c; }
  }
  return best;
}

/**
 * Bloc d'identité canonique — l'ADN visuel, réutilisé verbatim partout.
 * mood=false pour les vues de RÉFÉRENCE à détourer : l'ambiance (pénombre,
 * chandelles…) teinte le fond et le costume et sabote le chroma key ; la
 * référence se rend en éclairage studio neutre, le mood habille décors/splash.
 */
export function identityBlock(dna, style, { mood = true } = {}) {
  const colors = Object.entries(dna.colors ?? {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ');
  return [
    dna.archetype,
    dna.silhouette,
    dna.face,
    dna.hair,
    dna.outfit,
    colors ? `color palette strictly: ${colors}` : null,
    dna.materials,
    dna.props,
    style.render,
    mood ? style.mood : 'even neutral studio lighting, vibrant saturated colors, crisp clean edges',
  ].filter(Boolean).join(', ');
}

export function buildIdentityCard({ id, name, role = 'hero', dna, style }) {
  return {
    id, name, role,
    dna,
    block: identityBlock(dna, style),
    blockRef: identityBlock(dna, style, { mood: false }),
    negative: NEGATIVE,
    seed: masterSeed(id),
    palette: Object.values(dna.colors ?? {}),
  };
}

const VIEWS = {
  apose: {
    suffix: 'full body visible head to toe, standing straight facing viewer, arms held away from body at 45 degrees (A-pose), legs slightly apart, neutral expression, centered composition, game character reference sheet',
    size: { width: 832, height: 1216 }, seedOff: 0, cutout: true,
  },
  portrait: {
    suffix: 'head and shoulders portrait, three-quarter view, detailed face, character reference',
    size: { width: 832, height: 832 }, seedOff: 17, cutout: false,
  },
  action: {
    suffix: 'dynamic action pose, full body, mid-combat, dramatic lighting, game splash art',
    size: { width: 832, height: 1216 }, seedOff: 31, cutout: false,
  },
  creature: {
    suffix: 'full body, whole creature visible, side profile view, centered composition, game sprite reference',
    size: { width: 1024, height: 1024 }, seedOff: 0, cutout: true,
  },
};

/**
 * Génère la planche de référence (A-pose détourée = source du rig, portrait,
 * pose d'action) + écrit identity-card.json. Chaque vue passe la QA.
 * @returns {Promise<object>} carte enrichie des chemins + rapports QA
 */
export async function generateReferenceSheet(card, outDir, { views = ['apose', 'portrait'], qaThreshold = 50 } = {}) {
  await mkdir(outDir, { recursive: true });
  const refs = {};
  // segmentation neuronale : fond studio neutre (palette respectée) ;
  // fallback chroma : fond saturé le plus loin de la palette du personnage.
  const bgPhrase = hasNeuralMatte()
    ? 'plain uniform neutral grey studio background'
    : pickChroma(card.palette).phrase;
  for (const v of views) {
    const view = VIEWS[v];
    const file = `${card.id}.${v}.png`;

    if (view.cutout) {
      // la QA se joue APRÈS détourage (le fond fausserait le score palette)
      let best = null;
      for (let i = 0; i < 3 && !best?.report.pass; i++) {
        const prompt = `${card.blockRef ?? card.block}, ${view.suffix}, isolated on a ${bgPhrase}`;
        const out = await generateImage({ prompt, negative: card.negative, ...view.size, seed: card.seed + view.seedOff + i * 7919 });
        try {
          const cut = await cutoutGenerated(out.buf, { targetHeight: 1024 });
          const report = await assess(cut.png, { palette: card.palette, kind: 'character', threshold: qaThreshold });
          if (!best || report.score > best.report.score) best = { ...out, cut, report };
        } catch (e) { if (!best && i === 2) throw e; }
      }
      await writeFile(join(outDir, file), best.cut.png);
      refs[v] = { file, backend: best.backend, seed: best.seed, matte: best.cut.matte, qa: best.report, cutout: { width: best.cut.width, height: best.cut.height, coverage: best.cut.coverage } };
    } else {
      const best = await generateValidated(
        (spec) => generateImage(spec),
        { prompt: `${card.block}, ${view.suffix}`, negative: card.negative, ...view.size, seed: card.seed + view.seedOff },
        { palette: card.palette, kind: 'decor', threshold: qaThreshold },
        { attempts: 3 },
      );
      await writeFile(join(outDir, file), best.buf);
      refs[v] = { file, backend: best.backend, seed: best.seed, qa: best.report };
    }
  }
  const enriched = { ...card, refs, generatedAt: new Date().toISOString() };
  await writeFile(join(outDir, `${card.id}.identity-card.json`), JSON.stringify(enriched, null, 2), 'utf8');
  return enriched;
}
