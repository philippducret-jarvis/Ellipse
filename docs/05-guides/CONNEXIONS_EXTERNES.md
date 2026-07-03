# Connexions externes — renforcer Ellipse

> `pnpm forge:connections` vérifie tout et écrit
> `08_ops/manifests/connections-report.json`. Variables : `.env.example`.
> **Tout est déjà câblé côté code** — poser la clé suffit, la bascule est
> automatique (aucun changement d'architecture).

## Priorité 1 — le saut de qualité visuelle

| Connexion | Coût | Débloque |
|---|---|---|
| `COMFYUI_URL` (GPU local/RunPod/Colab) | gratuit + matériel | **img2img sur les planches** (la composition exacte de tes boards devient le décor — automatique via `bible.composition`), **LoRA d'identité** par personnage (Auréline reste Auréline), ControlNet poses |
| `FAL_KEY` (fal.ai) | ~0,01–0,03 $/image | La même chose **sans GPU** (img2img compris) — backend codé, bascule auto |
| `RUNPOD_API_KEY` | ~0,3–0,7 $/h | GPU cloud pour entraîner les LoRA (`pnpm forge:gpu-plan -- <id>` a déjà préparé datasets + configs kohya) |
| `HUGGINGFACE_TOKEN` | gratuit | Télécharger les checkpoints SDXL/bases LoRA |

## Priorité 2 — cognition et contenu

| Connexion | Coût | Débloque |
|---|---|---|
| `ANTHROPIC_API_KEY` | ~0,01 $/design | GDD riches (lore, équilibrage) + itération par prompt en langage totalement libre (design.mjs / iterate.mjs déjà câblés) |
| `OLLAMA_URL` | gratuit local | LLM local pour le pont Cortex (souveraineté) |
| `ELEVENLABS_API_KEY` | freemium | Narration vocale des dialogues + SFX premium (le WebAudio procédural reste le fallback) |

## Priorité 3 — produit vivant (liveops, mesure, publication)

| Connexion | Coût | Débloque |
|---|---|---|
| `PLAYFAB_TITLE_ID` + secret | freemium | Économie gacha serveur (catalogues, monnaies, bannières — consommé par l'economy-agent) |
| `FIREBASE_CONFIG` | freemium | Remote config / A-B tests (difficulté, économie) sans re-livrer |
| `GAMEANALYTICS_*` | gratuit | Rétention, funnels de niveaux, morts par zone |
| `SENTRY_DSN` | freemium | Crashs/erreurs en prod (Studio + runtimes) |
| `BUTLER_API_KEY` (itch.io) | gratuit | Publier un jeu forgé en un clic (`butler push workspaces/<id>/05_runtime …`) |

## Ce qui tourne déjà sans aucune clé

Pollinations (génération keyless), segmentation neuronale locale CPU (isnet),
rig squelettal + clips procéduraux, GDL + runtime générique, auto-play,
audio WebAudio procédural, itération par prompt heuristique FR/EN.
