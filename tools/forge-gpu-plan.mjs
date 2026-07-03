/**
 * PLAN GPU — prépare tout ce qui s'exécutera dès qu'un GPU (ComfyUI local,
 * RunPod, Colab) ou une clé fal.ai sera disponible :
 *
 *   pnpm forge:gpu-plan -- <game-id>
 *
 * Émet dans workspaces/<id>/08_ops/gpu/ :
 *   - lora/<perso>/ : dataset (références générées + captions) + config kohya
 *     → un LoRA par personnage = fidélité visage/costume définitive ;
 *   - arenas/<arène>.i2i.workflow.json : workflow ComfyUI API img2img
 *     verrouillé sur la planche de composition de la bible ;
 *   - README.md : étapes exactes (checkpoints, commandes, coûts estimés).
 * 100 % vérifiable hors-ligne — rien à générer.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const id = process.argv.slice(2).filter((a) => a !== '--')[0];
if (!id) { console.error('Usage : pnpm forge:gpu-plan -- <game-id>'); process.exit(1); }

const ws = join(ROOT, 'workspaces', id);
const gpuDir = join(ws, '08_ops', 'gpu');
const gdl = JSON.parse(await readFile(join(ws, '05_runtime', 'game.gdl.json'), 'utf8'));
const bible = existsSync(join(ws, '02_design', 'style-bible.json'))
  ? JSON.parse(await readFile(join(ws, '02_design', 'style-bible.json'), 'utf8')) : {};

// ── 1. datasets + configs LoRA par personnage ──
const charDirs = [['hero', join(ws, '05_runtime', 'assets', 'hero')], ['enemies', join(ws, '05_runtime', 'assets', 'enemies')]];
const loraJobs = [];
for (const [, dir] of charDirs) {
  if (!existsSync(dir)) continue;
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.identity-card.json')) continue;
    const card = JSON.parse(await readFile(join(dir, f), 'utf8'));
    const loraDir = join(gpuDir, 'lora', card.id);
    const dataDir = join(loraDir, 'dataset', `10_${card.id}`); // kohya : <repeats>_<token>
    await mkdir(dataDir, { recursive: true });
    let n = 0;
    for (const [view, ref] of Object.entries(card.refs ?? {})) {
      const src = join(dir, ref.file);
      if (!existsSync(src)) continue;
      await copyFile(src, join(dataDir, `${card.id}_${view}.png`));
      await writeFile(join(dataDir, `${card.id}_${view}.txt`), `${card.id}, ${card.blockRef ?? card.block}`, 'utf8');
      n++;
    }
    await writeFile(join(loraDir, `${card.id}.kohya.toml`), `# LoRA identité — ${card.name} (${card.id})
[model]
pretrained_model_name_or_path = "stabilityai/stable-diffusion-xl-base-1.0"

[dataset]
train_data_dir = "./dataset"
resolution = "1024,1024"
caption_extension = ".txt"

[training]
output_name = "${card.id}_identity"
network_module = "networks.lora"
network_dim = 16
network_alpha = 8
learning_rate = 1e-4
max_train_steps = 1200
train_batch_size = 1
mixed_precision = "bf16"
save_every_n_steps = 400
seed = ${card.seed}
`, 'utf8');
    loraJobs.push({ id: card.id, name: card.name, images: n, trigger: card.id });
  }
}

// ── 2. workflows img2img par arène (composition des planches) ──
const CKPT = 'sd_xl_base_1.0.safetensors';
const arenaJobs = [];
for (const [arenaId, boardRel] of Object.entries(bible.composition ?? {})) {
  const prompt = `midground environment, side-scrolling game background, wide panoramic view, ${bible.render ?? ''}, ${bible.mood ?? ''}`;
  const wf = {
    3: { class_type: 'KSampler', inputs: { seed: 7, steps: 30, cfg: 6.5, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 0.55, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['12', 0] } },
    4: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    6: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    7: { class_type: 'CLIPTextEncode', inputs: { text: 'text, watermark, characters, people, ui, borders, blurry', clip: ['4', 1] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    9: { class_type: 'SaveImage', inputs: { filename_prefix: `${id}_${arenaId}`, images: ['8', 0] } },
    10: { class_type: 'LoadImage', inputs: { image: `<UPLOADER ${boardRel}>` } },
    12: { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
  };
  await mkdir(join(gpuDir, 'arenas'), { recursive: true });
  await writeFile(join(gpuDir, 'arenas', `${arenaId}.i2i.workflow.json`), JSON.stringify(wf, null, 2), 'utf8');
  arenaJobs.push({ arenaId, board: boardRel });
}

// ── 3. README opératoire ──
await writeFile(join(gpuDir, 'README.md'), `# Plan GPU — ${gdl.title}

Tout est prêt : dès qu'un GPU répond, la qualité passe au niveau supérieur
SANS changer l'architecture (mêmes contrats, bascule automatique).

## Option A — ComfyUI local (RTX 3060+ / 8 Go VRAM min)
1. Installer ComfyUI + checkpoint SDXL (\`${CKPT}\`).
2. \`set COMFYUI_URL=http://127.0.0.1:8188\` puis \`pnpm forge:game -- --id ${id} …\`
   → les arènes MID se génèrent en **img2img sur tes planches** (denoise 0.55),
   automatiquement (bible.composition). Workflows manuels : \`arenas/*.i2i.workflow.json\`.

## Option B — fal.ai (sans GPU, ~0,01–0,03 $/image)
1. Créer une clé sur https://fal.ai/dashboard/keys
2. \`set FAL_KEY=…\` → bascule automatique (img2img compris).

## LoRA d'identité par personnage (fidélité visage/costume définitive)
${loraJobs.map((j) => `- **${j.name}** (\`lora/${j.id}/\`) : ${j.images} images de référence + captions + config kohya. Trigger word : \`${j.trigger}\`.`).join('\n')}

Entraînement (kohya_ss, ~15-30 min/perso sur RTX 4070, ou RunPod ~0,50 $/h) :
\`\`\`
accelerate launch sdxl_train_network.py --config_file <perso>.kohya.toml
\`\`\`
Puis déposer les .safetensors dans ComfyUI/models/loras — les prompts de la
Forge référencent le trigger word \`<id>\` : le LoRA s'applique naturellement.

## Arènes (composition des planches)
${arenaJobs.map((j) => `- ${j.arenaId} ← \`${j.board}\``).join('\n')}
`, 'utf8');

console.log(`✔ Plan GPU émis : workspaces/${id}/08_ops/gpu/`);
console.log(`  - ${loraJobs.length} datasets LoRA (${loraJobs.map((j) => j.id).join(', ')})`);
console.log(`  - ${arenaJobs.length} workflows img2img d'arènes verrouillés sur les planches`);
