/**
 * Veloria — FORGE (orchestrateur de génération).
 *
 * Transforme l'IDÉE (planches/lore) en VRAIS assets via le pipeline génératif :
 *   bible de style → prompts → graphes ComfyUI → (génération) → spritesheets + atlas
 *   → forge-manifest.json (consommé par le runtime).
 *
 * Deux modes :
 *   PLAN (par défaut, sans GPU) — écrit, pour chaque livrable, le prompt + le graphe
 *     ComfyUI + l'atlas attendu + les inputs requis (poses). 100% vérifiable hors-ligne.
 *   EXECUTE (ComfyUI en ligne) — soumet les graphes, récupère les images, détoure (hook
 *     rembg), assemble les spritesheets.
 *
 * Mappe sur les agents Ellipse : character / animation (héros+ennemis), decor (arènes),
 * lighting (passe de grade, hook). Voir cortex/models/manifest.json.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import STYLE from './style-bible.mjs';
import { heroPromptSpec, enemyPromptSpec, arenaPromptSpecs, HERO_KEYS, ENEMY_KEYS, ARENA_KEYS } from './prompts.mjs';
import { txt2imgGraph, controlnetPoseGraph, decorGraph, FORGE_MODELS } from './comfy-workflows.mjs';
import { available as comfyAvailable, generate as comfyGenerate } from './comfy-client.mjs';
import { planAtlas, packSheet } from './spritesheet.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces', 'veloria-veille-des-lames');
const FORGE = join(WS, '03_assets', 'forge');
const FRAME = { w: 384, h: 512 };

function poseFile(poseSet, clip, i) { return `01_inputs/poses/${poseSet}/${clip}_${String(i).padStart(2, '0')}.png`; }

async function writeJson(p, obj) { await mkdir(join(FORGE, p, '..'), { recursive: true }).catch(() => {}); await writeFile(join(FORGE, p), JSON.stringify(obj, null, 2), 'utf8'); }

// construit tous les livrables (graphe par frame) pour une entité animée
function buildEntityJobs(spec, agent) {
  const jobs = [];
  for (const clip of spec.clips) {
    for (let i = 0; i < clip.frames; i++) {
      const seed = hashSeed(`${spec.id}_${clip.name}_${i}`);
      const prefix = `${spec.id}/${clip.name}_${String(i).padStart(2, '0')}`;
      // frame 0 d'idle = rendu de référence (pose libre) ; le reste = pose imposée (ControlNet)
      const usePose = !(clip.name === 'idle' && i === 0);
      const graph = usePose
        ? controlnetPoseGraph(spec, poseFile(spec.controlnet.poseSet, clip.name, i), { seed, prefix })
        : txt2imgGraph(spec, { seed, prefix });
      jobs.push({ agent, entity: spec.id, clip: clip.name, frame: i, seed, usePose,
        poseInput: usePose ? poseFile(spec.controlnet.poseSet, clip.name, i) : null, graph, outPrefix: prefix });
    }
  }
  return jobs;
}
function hashSeed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 2147483647; }

export async function runForge({ mode = 'plan', only = null, hero = null } = {}) {
  await mkdir(FORGE, { recursive: true });
  const live = mode === 'execute' && (await comfyAvailable());
  if (mode === 'execute' && !live) console.warn('⚠ ComfyUI injoignable → bascule en mode PLAN.');
  const effectiveMode = live ? 'execute' : 'plan';

  const manifest = {
    game: 'veloria-veille-des-lames', generatedAt: new Date().toISOString(),
    mode: effectiveMode, models: FORGE_MODELS, frame: FRAME,
    style: { palette: STYLE.palette, render: STYLE.render },
    characters: [], enemies: [], arenas: [], totals: {},
  };

  const want = (k) => !only || only === k;
  const heroKeys = hero ? [hero] : HERO_KEYS;

  // ── CHARACTER + ANIMATION : héroïnes ──
  if (want('character') || want('hero')) {
    for (const key of heroKeys) {
      const spec = heroPromptSpec(key); if (!spec) continue;
      const jobs = buildEntityJobs(spec, 'animation');
      const atlas = planAtlas(spec.clips, FRAME.w, FRAME.h);
      const entry = await materialize(spec, jobs, atlas, effectiveMode, 'characters');
      manifest.characters.push(entry);
    }
  }
  // ── ennemis + boss ──
  if (want('enemy')) {
    for (const key of ENEMY_KEYS) {
      const spec = enemyPromptSpec(key); if (!spec) continue;
      const jobs = buildEntityJobs(spec, 'animation');
      const atlas = planAtlas(spec.clips, FRAME.w, FRAME.h);
      const entry = await materialize(spec, jobs, atlas, effectiveMode, 'enemies');
      manifest.enemies.push(entry);
    }
  }
  // ── DECOR : arènes (couches parallax) ──
  if (want('decor') || want('arena')) {
    for (const key of ARENA_KEYS) {
      const layers = arenaPromptSpecs(key);
      const layerOut = [];
      for (const lspec of layers) {
        const seed = hashSeed(lspec.id);
        const graph = decorGraph(lspec, { seed, prefix: lspec.id });
        if (effectiveMode === 'plan') {
          await writeJson(`decor/${lspec.id}.workflow.json`, graph);
          layerOut.push({ id: lspec.id, layer: lspec.layer, prompt: lspec.positive, size: lspec.size, workflow: `decor/${lspec.id}.workflow.json`, asset: null });
        } else {
          const bufs = await comfyGenerate(graph);
          const out = join('decor', `${lspec.id}.png`);
          if (bufs[0]) await writeFile(join(FORGE, out), bufs[0]);
          layerOut.push({ id: lspec.id, layer: lspec.layer, size: lspec.size, asset: `03_assets/forge/${out}` });
        }
      }
      manifest.arenas.push({ key, name: layers[0]?.name?.split(' · ')[0], layers: layerOut });
    }
  }

  // ── LIGHTING : passe de grade (hook — appliquée au runtime, décrite ici) ──
  manifest.lighting = {
    note: 'Passe de cohérence appliquée à la composition runtime (grade + ombres de contact + bloom + grain).',
    grade: { shadows: STYLE.palette.indigo_malediction, highlights: STYLE.palette.or_sacre, vignette: 0.5, grain: 0.04 },
  };

  manifest.totals = {
    characters: manifest.characters.length, enemies: manifest.enemies.length, arenas: manifest.arenas.length,
    frames_planned: [...manifest.characters, ...manifest.enemies].reduce((s, e) => s + e.atlas.total, 0),
  };
  await writeFile(join(FORGE, 'forge-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await writeFile(join(FORGE, 'PLAN.md'), planMarkdown(manifest), 'utf8');
  return manifest;
}

async function materialize(spec, jobs, atlas, mode, bucket) {
  const sheetOut = join(bucket, `${spec.id}.png`).replace(/\\/g, '/');
  if (mode === 'plan') {
    // écrire un graphe par frame + la fiche de prompt
    for (const j of jobs) await writeJson(`${bucket}/${spec.id}/${j.clip}_${String(j.frame).padStart(2, '0')}.workflow.json`, j.graph);
    await writeJson(`${bucket}/${spec.id}.prompt.json`, { id: spec.id, name: spec.name, kind: spec.kind, positive: spec.positive, negative: spec.negative, clips: spec.clips, controlnet: spec.controlnet });
    return {
      id: spec.id, name: spec.name, kind: spec.kind, palette: spec.palette,
      atlas: { ...atlas, sheet: `03_assets/forge/${sheetOut}` },
      requiredInputs: jobs.filter((j) => j.poseInput).map((j) => j.poseInput),
      workflowsDir: `03_assets/forge/${bucket}/${spec.id}/`, prompt: `03_assets/forge/${bucket}/${spec.id}.prompt.json`,
    };
  }
  // EXECUTE : générer toutes les frames puis packer
  const frames = [];
  for (const j of jobs) { const bufs = await comfyGenerate(j.graph); frames.push(bufs[0]); }
  const packed = await packSheet(frames, spec.clips, FRAME.w, FRAME.h, join(FORGE, sheetOut));
  return { id: spec.id, name: spec.name, kind: spec.kind, palette: spec.palette, atlas: { ...packed, sheet: `03_assets/forge/${sheetOut}` } };
}

function planMarkdown(m) {
  const lines = [];
  lines.push(`# Veloria — Plan de forge (${m.mode})`, '');
  lines.push(`Modèles : ${m.models.checkpoint} · ControlNet ${m.models.controlnet_openpose}`, '');
  lines.push(`Frame : ${m.frame.w}×${m.frame.h} · Frames planifiées : ${m.totals.frames_planned}`, '');
  lines.push('## Personnages (character + animation)');
  for (const c of m.characters) lines.push(`- **${c.name}** (${c.id}) — clips ${Object.keys(c.atlas.clips).join(', ')} · ${c.atlas.total} frames → ${c.atlas.sheet}`);
  lines.push('', '## Ennemis');
  for (const e of m.enemies) lines.push(`- **${e.name}** (${e.id}) — ${e.atlas.total} frames`);
  lines.push('', '## Arènes (decor parallax)');
  for (const a of m.arenas) lines.push(`- **${a.name}** — couches ${a.layers.map((l) => l.layer).join(', ')}`);
  lines.push('', '## Inputs requis (bibliothèque de poses OpenPose)');
  const poses = new Set(); for (const c of [...m.characters, ...m.enemies]) (c.requiredInputs ?? []).forEach((p) => poses.add(p.split('/').slice(0, -1).join('/')));
  for (const p of poses) lines.push(`- ${p}/*.png`);
  return lines.join('\n');
}
