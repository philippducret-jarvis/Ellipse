/**
 * CONNEXIONS EXTERNES — docteur : pnpm forge:connections
 * Vérifie chaque intégration qui renforce le projet (ping réel quand c'est
 * possible), explique ce qu'elle débloque et comment l'obtenir.
 * Rapport : 08_ops/manifests/connections-report.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ping = async (url, opts = {}) => {
  try { const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(4000) }); return r.ok || r.status < 500; }
  catch { return false; }
};

const CONNECTIONS = [
  // ── Génération d'images (le cœur) ──
  {
    id: 'pollinations', tier: 'gratuit', env: null,
    unlocks: 'Génération d’images keyless (voie par défaut actuelle, Flux)',
    check: () => ping('https://image.pollinations.ai/', { method: 'HEAD' }),
    how: 'Rien à faire — actif.',
  },
  {
    id: 'comfyui', tier: 'gratuit (GPU requis)', env: 'COMFYUI_URL',
    unlocks: 'img2img sur les planches (composition exacte), LoRA d’identité par personnage, ControlNet — LE saut de qualité',
    check: () => process.env.COMFYUI_URL ? ping(`${process.env.COMFYUI_URL}/system_stats`) : false,
    how: 'Installer ComfyUI (local RTX 8Go+ / RunPod / Colab) puis COMFYUI_URL=http://127.0.0.1:8188. Plans prêts : pnpm forge:gpu-plan -- <id>.',
  },
  {
    id: 'fal', tier: '~0,01–0,03 $/image', env: 'FAL_KEY',
    unlocks: 'Génération serverless premium + img2img SANS GPU — bascule automatique du registre',
    check: () => Boolean(process.env.FAL_KEY),
    how: 'https://fal.ai/dashboard/keys → FAL_KEY=… (backend déjà codé).',
  },
  {
    id: 'replicate', tier: '~0,01–0,05 $/image', env: 'REPLICATE_API_TOKEN',
    unlocks: 'Alternative serverless (flux, SDXL, modèles vidéo/inbetweening ToonCrafter)',
    check: () => Boolean(process.env.REPLICATE_API_TOKEN),
    how: 'https://replicate.com/account/api-tokens (backend à activer sur demande — même contrat que fal).',
  },
  {
    id: 'huggingface', tier: 'gratuit', env: 'HUGGINGFACE_TOKEN',
    unlocks: 'Téléchargement des checkpoints SDXL/LoRA bases pour ComfyUI/kohya',
    check: () => Boolean(process.env.HUGGINGFACE_TOKEN),
    how: 'https://huggingface.co/settings/tokens (read).',
  },
  {
    id: 'runpod', tier: '~0,3–0,7 $/h GPU', env: 'RUNPOD_API_KEY',
    unlocks: 'GPU cloud à la demande : entraînement LoRA (kohya) + ComfyUI hébergé',
    check: () => Boolean(process.env.RUNPOD_API_KEY),
    how: 'https://runpod.io → Settings → API Keys.',
  },
  // ── Cognition ──
  {
    id: 'anthropic', tier: '~0,01 $/design', env: 'ANTHROPIC_API_KEY',
    unlocks: 'GDD riches (titres, lore, équilibrage) + itération par prompt en langage totalement libre',
    check: async () => process.env.ANTHROPIC_API_KEY
      ? ping('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } })
      : false,
    how: 'https://console.anthropic.com → API Keys (design.mjs + iterate.mjs déjà câblés).',
  },
  {
    id: 'ollama', tier: 'gratuit (local)', env: 'OLLAMA_URL',
    unlocks: 'LLM local pour le pont Cortex (ELLIPSE_CORTEX_BACKEND) sans API externe',
    check: () => ping(`${process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'}/api/tags`),
    how: 'https://ollama.com → installer + `ollama pull llama3.2`.',
  },
  // ── Audio ──
  {
    id: 'elevenlabs', tier: 'freemium', env: 'ELEVENLABS_API_KEY',
    unlocks: 'Voix de narration des dialogues + SFX premium (remplace le WebAudio procédural)',
    check: () => Boolean(process.env.ELEVENLABS_API_KEY),
    how: 'https://elevenlabs.io → Profile → API Key.',
  },
  // ── LiveOps / télémétrie / publication ──
  {
    id: 'playfab', tier: 'freemium', env: 'PLAYFAB_TITLE_ID',
    unlocks: 'Économie/gacha serveur : catalogues, monnaies, inventaire, bannières (economy-agent)',
    check: () => Boolean(process.env.PLAYFAB_TITLE_ID && process.env.PLAYFAB_DEV_SECRET_KEY),
    how: 'https://developer.playfab.com → créer un Title → TITLE_ID + DEV_SECRET_KEY.',
  },
  {
    id: 'firebase', tier: 'freemium', env: 'FIREBASE_CONFIG',
    unlocks: 'Remote config + A/B tests (difficulté, économie) sans re-livrer',
    check: () => Boolean(process.env.FIREBASE_CONFIG),
    how: 'https://console.firebase.google.com → projet → config JSON.',
  },
  {
    id: 'gameanalytics', tier: 'gratuit', env: 'GAMEANALYTICS_GAME_KEY',
    unlocks: 'Télémétrie design/économie (rétention, funnels de niveaux, morts par zone)',
    check: () => Boolean(process.env.GAMEANALYTICS_GAME_KEY && process.env.GAMEANALYTICS_SECRET_KEY),
    how: 'https://gameanalytics.com → créer un jeu → GAME_KEY + SECRET_KEY.',
  },
  {
    id: 'sentry', tier: 'freemium', env: 'SENTRY_DSN',
    unlocks: 'Crash/erreurs en production (Studio + runtimes web)',
    check: () => Boolean(process.env.SENTRY_DSN),
    how: 'https://sentry.io → projet JS → DSN.',
  },
  {
    id: 'itchio', tier: 'gratuit', env: 'BUTLER_API_KEY',
    unlocks: 'Publication en un clic des jeux forgés (butler push 05_runtime → itch.io)',
    check: () => Boolean(process.env.BUTLER_API_KEY),
    how: 'https://itch.io/user/settings/api-keys + installer butler.',
  },
];

const rows = [];
for (const c of CONNECTIONS) {
  const ok = await c.check();
  rows.push({ id: c.id, ok, tier: c.tier, env: c.env, unlocks: c.unlocks, how: ok ? null : c.how });
  console.log(`${ok ? '✅' : '⬜'} ${c.id.padEnd(14)} ${c.tier.padEnd(24)} ${c.unlocks}`);
  if (!ok) console.log(`   ↳ ${c.how}`);
}

const outDir = join(process.cwd(), '08_ops', 'manifests');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'connections-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), connections: rows }, null, 2), 'utf8');
const active = rows.filter((r) => r.ok).length;
console.log(`\n${active}/${rows.length} connexions actives · rapport : 08_ops/manifests/connections-report.json`);
