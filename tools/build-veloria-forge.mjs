/**
 * Veloria — FORGE CLI : transforme l'idée (planches/lore) en vrais assets générés.
 *
 *   pnpm veloria:forge                 # mode PLAN (sans GPU) : prompts + graphes ComfyUI + manifest
 *   pnpm veloria:forge -- --execute    # mode EXECUTE : génère via ComfyUI (COMFYUI_URL)
 *   pnpm veloria:forge -- --only=character|enemy|decor   # cibler un agent
 *   pnpm veloria:forge -- --hero=aureline                # une seule héroïne
 *
 * Le PLAN est 100% vérifiable hors-ligne. L'EXECUTE nécessite ComfyUI + checkpoints
 * (VELORIA_SDXL_CKPT, VELORIA_CN_OPENPOSE) + une bibliothèque de poses OpenPose.
 */
import { runForge } from './lib/veloria-forge/forge.mjs';

const args = process.argv.slice(2);
const mode = args.includes('--execute') ? 'execute' : 'plan';
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const hero = (args.find((a) => a.startsWith('--hero=')) || '').split('=')[1] || null;

runForge({ mode, only, hero })
  .then((m) => {
    console.log(`Veloria forge [${m.mode}] :`,
      m.totals.characters, 'persos,', m.totals.enemies, 'ennemis,', m.totals.arenas, 'arènes,',
      m.totals.frames_planned, 'frames planifiées.');
    console.log('→ workspaces/veloria-veille-des-lames/03_assets/forge/forge-manifest.json + PLAN.md');
  })
  .catch((e) => { console.error(e); process.exit(1); });
