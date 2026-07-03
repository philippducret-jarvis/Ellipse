/**
 * DÉCORS 2,5D GÉNÉRÉS — une génération PAR COUCHE de parallaxe (pas de
 * découpe de planche) : ciel / lointain / médian / proche, prompts dédiés
 * partageant la direction artistique du jeu, puis grade CPU par profondeur
 * (luminosité, désaturation, flou lointain, rampe alpha de la couche proche).
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from './sharp.mjs';
import { generateImage, hasImg2Img } from './backends/registry.mjs';
import { generateValidated } from './qa.mjs';
import { masterSeed } from './identity.mjs';

const LAYERS = [
  {
    id: 'sky', depth: 0.06, size: { width: 1536, height: 640 },
    prompt: (t) => `distant sky and atmosphere of ${t}, wide panoramic view, soft gradients, no foreground elements`,
    grade: { brightness: 0.92, saturation: 0.7, blur: 6 },
  },
  {
    id: 'far', depth: 0.22, size: { width: 1536, height: 640 },
    prompt: (t) => `far background landscape of ${t}, wide panoramic view, hazy distant shapes, no characters`,
    grade: { brightness: 0.8, saturation: 0.75, blur: 3.5 },
  },
  {
    id: 'mid', depth: 0.55, size: { width: 1536, height: 768 },
    prompt: (t) => `midground environment of ${t}, side-scrolling game background, wide panoramic view, detailed scenery at eye level, walkable ground strip along the bottom, no characters, no text`,
    grade: { brightness: 1.0, saturation: 1.0, blur: 0 },
  },
  {
    id: 'near', depth: 0.85, size: { width: 1536, height: 512 },
    prompt: (t) => `close foreground silhouettes of ${t}, dark shapes framing the bottom of the scene, high contrast, no characters, no text`,
    grade: { brightness: 0.45, saturation: 0.7, blur: 0, alphaRamp: 0.45 },
  },
  {
    id: 'ground', depth: 0.98, size: { width: 1024, height: 256 },
    prompt: (t) => `seamless tileable ground texture strip of ${t}, walkable terrain surface seen from the side at eye level, game platform ground, horizontal band, no characters, no text`,
    grade: { brightness: 0.9, saturation: 0.95, blur: 0 },
  },
];

/** rampe alpha verticale : opaque en bas, fondu vers le haut sur `frac` de la hauteur. */
async function applyAlphaRamp(buf, frac) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const rampEnd = Math.round(h * frac);
  for (let y = 0; y < rampEnd; y++) {
    const a = y / rampEnd;
    for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = Math.round(data[(y * w + x) * 4 + 3] * a * a);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * Génère l'arène complète (5 couches) → PNGs + <id>.parallax.json.
 * `arena.compositionBoard` (chemin absolu d'une planche) : quand le backend
 * sait faire de l'img2img (ComfyUI/fal), la couche MID est générée EN
 * VERROUILLANT LA COMPOSITION sur la planche (denoise 0.55) — la vallée de
 * la planche devient LA vallée du jeu. Sans backend capable : txt2img stylé.
 * @param {{id:string, theme:string, style:{render:string,mood:string}, palette:string[], compositionBoard?:string}} arena
 */
export async function generateArena(arena, outDir, { qaThreshold = 45 } = {}) {
  await mkdir(outDir, { recursive: true });
  const layersOut = [];
  const i2i = arena.compositionBoard && existsSync(arena.compositionBoard) && (await hasImg2Img());
  const boardBuf = i2i ? await readFile(arena.compositionBoard) : null;
  for (const layer of LAYERS) {
    const prompt = `${layer.prompt(arena.theme)}, ${arena.style.render}, ${arena.style.mood}`;
    const useRef = layer.id === 'mid' && boardBuf;
    const best = await generateValidated(
      (spec) => generateImage(spec),
      {
        prompt, negative: 'text, watermark, characters, people, ui, borders',
        ...layer.size, seed: masterSeed(`${arena.id}_${layer.id}`),
        ...(useRef ? { refImage: boardBuf, denoise: 0.55 } : {}),
      },
      { palette: arena.palette, kind: 'decor', threshold: qaThreshold },
      { attempts: 2 },
    );
    let img = sharp(best.buf)
      .modulate({ brightness: layer.grade.brightness, saturation: layer.grade.saturation });
    if (layer.grade.blur > 0) img = img.blur(layer.grade.blur);
    let out = await img.png().toBuffer();
    if (layer.grade.alphaRamp) out = await applyAlphaRamp(out, layer.grade.alphaRamp);
    const file = `${arena.id}.${layer.id}.png`;
    await writeFile(join(outDir, file), out);
    layersOut.push({ id: layer.id, file, depth: layer.depth, size: layer.size, backend: best.backend, seed: best.seed, composition: useRef ? 'img2img-board' : 'txt2img', qa: { score: best.report.score, pass: best.report.pass } });
  }
  const manifest = { version: 'forge-parallax-1', id: arena.id, theme: arena.theme, layers: layersOut, generatedAt: new Date().toISOString() };
  await writeFile(join(outDir, `${arena.id}.parallax.json`), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
