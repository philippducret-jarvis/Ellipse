# Forge v2 — prompt → vrai jeu HD 2D/2,5D généré

> **La règle : un jeu forgé ne contient AUCUN pixel copié d'une planche et
> AUCUNE ligne de code écrite pour ce titre.** Les assets sont générés, le
> gameplay est de la donnée (GDL) interprétée par un runtime générique.

```
pnpm forge:game -- --prompt "une chevalière d'argent dans une citadelle gothique maudite"
pnpm forge:serve            # jouer (http://localhost:4300)
pnpm forge:smoke            # CI : chaîne pure + auto-play des deux genres
```

---

## La chaîne (tools/lib/forge/)

```
prompt
  │  design.mjs — GDD structuré (Claude si ANTHROPIC_API_KEY, sinon heuristique
  │               d'archétypes ; traçé dans meta.designBackend)
  ▼
GDD ──compileGdl──► GDL 1.0 (schemas/gdl-1.0.schema.json) + plan d'assets
  │
  │  POUR CHAQUE PERSONNAGE :
  │   identity.mjs — carte d'identité (ADN visuel canonique + seed maître)
  │        │         → référence A-pose/creature GÉNÉRÉE (backends/), rendue
  │        │           en ÉCLAIRAGE STUDIO NEUTRE (le mood contamine le fond)
  │   cutout.mjs   — segmentation neuronale LOCALE CPU (isnet/onnxruntime via
  │                  @imgly/background-removal-node) ; fallback chroma-flood
  │   qa.mjs       — portes : palette deltaE, netteté, couverture ; auto-retry
  │                  (la QA se mesure APRÈS détourage)
  │   rig.mjs      — paper-doll : 8 pièces pivotées (humanoid) ou monopart
  │   clips.mjs    — animations procédurales retargetables (idle/run/attack/…)
  │
  │  POUR CHAQUE ARÈNE :
  │   decor.mjs    — 1 génération PAR couche parallax (ciel/lointain/médian/
  │                  proche) + grade CPU par profondeur
  ▼
workspaces/<id>/05_runtime/  ← auto-porteur : index.html + runtime générique
  │                             (logic.js PURE + skeleton.js + render.js)
  │                             + game.gdl.json + assets/
  ▼
build.mjs — AUTO-PLAY HEADLESS : un bot joue le niveau ; s'il ne peut pas
            gagner, le build ÉCHOUE. Rapport : forge-build.json (backends,
            seeds, scores QA, résultat du bot).
```

## Leçon de production (2026-07-02) — le détourage

Trois méthodes testées sur le même cas réel (chevalière d'argent) :

1. **Flood sur fond gris clair** ✗ — l'armure argentée ≈ le fond : le matte
   mange l'intérieur du sujet.
2. **Chroma key (fond vert demandé au prompt)** ✗ — piège subtil : le modèle
   de diffusion HARMONISE le costume avec le fond (chevalière verte sur fond
   vert, cape verte…). Tout keying par couleur est structurellement condamné.
3. **Segmentation neuronale locale CPU** ✓ — isnet (onnxruntime, ~7 s/image,
   aucun GPU, aucune clé) extrait parfaitement le sujet MÊME vert-sur-vert.

Corollaire : les vues de référence se génèrent en **éclairage studio neutre**
(`blockRef`) — le mood (« pénombre aux chandelles ») teinte fond ET costume ;
il n'appartient qu'aux décors et aux splash arts.

## Les cinq verrous « pro »

1. **Identité verrouillée** — un personnage = une carte d'identité (bloc de
   prompt canonique + seed maître dérivé de l'id). Tout rendu la réutilise
   verbatim. Zéro dérive de costume entre assets.
2. **Jamais d'animation frame-par-frame générée** — le scintillement
   d'identité est un défaut de conception, pas de modèle. Une seule référence
   générée → rig squelettal → clips procéduraux : cohérence par construction.
3. **QA mesurable ou rien** — chaque image passe deltaE palette / netteté /
   couverture ; l'échec re-génère (seed suivant) ; le score est tracé.
4. **Le jeu est de la donnée** — GDL 1.0 versionné. Le runtime est écrit une
   fois PAR GENRE (sidescroller, vertical-arena), plus jamais par titre.
   « Rends le héros plus rapide » = un patch JSON.
5. **Un niveau injouable ne sort pas** — l'auto-play headless (logic.js pure,
   sans DOM) est une porte de build, exécutée aussi en CI (`forge:smoke`).

## Pont usine ↔ Forge (orchestrateur)

`packages/orchestrator/src/game-factory/forge-bridge.ts` relie la fabrique de
projets à la production réelle :

- `forgeGame(root, { prompt, id })` — forge le jeu **dans le workspace du
  projet** (`--id <slug>`) ; lit `forge-build.json` ; refuse un jeu dont le
  bot d'auto-play ne gagne pas ; ne lève jamais (`{ ok:false, error }`).
- La **production autonome** (`runAutonomousProductionForProject`) tente la
  Forge D'ABORD pour la preview (projets non-flagship avec prompt) ; hors-ligne
  ou échec → fallback preview GDL générique. `ELLIPSE_FORGE_PREVIEW=0` coupe.
- Preview jouable servie par le static : `/workspaces/<slug>/05_runtime/`.
- Manifest `08_ops/manifests/autonomous-production.json` : champ `forge`
  (ok, durée, rapport complet — seeds, QA, auto-play).

## Backends génératifs (backends/registry.mjs)

| Backend | Coût | Matériel | Quand |
|---|---|---|---|
| `pollinations` (défaut) | gratuit, keyless | aucun | aujourd'hui, sans GPU |
| `comfyui` | gratuit | GPU local | bascule auto dès que `COMFYUI_URL` répond |
| (à venir) fal.ai / Replicate | ~0,01–0,05 $/image | aucun | qualité/contrôle supérieurs sans GPU |

Forcer : `FORGE_BACKEND=pollinations|comfyui`.

## Montée en gamme (quand GPU ou budget API)

Chaque étape s'améliore SANS changer l'architecture — mêmes contrats :

- **Identité** : la planche de référence devient dataset d'un LoRA par
  personnage (ComfyUI) → fidélité de visage/costume supérieure. La carte
  d'identité est déjà le format d'entrée.
- **Détourage** : floodMatte → rembg/BiRefNet (même contrat buffer→PNG alpha).
- **Rig** : boîtes proportionnelles → segmentation SAM des membres.
- **Clips** : keyframes procéduraux → capture de mouvement retargetée, ou
  inbetweening vidéo (ToonCrafter) pour les FX uniquement.
- **Design** : heuristique → Claude (il suffit d'`ANTHROPIC_API_KEY`) ;
  à terme distillation vers le Cortex souverain (ORDRE-001), qui reste
  l'objectif long-terme, pas le point de départ.

## Ce que la Forge remplace

- `tools/lib/hd-faithful/` (cut+matte de planches) : **requalifié préviz** —
  utile pour valider une composition, interdit en asset final.
- Les runtimes par titre (`gacha-renderer.js`, `preview.js`) : remplacés par
  le runtime générique GDL au fil des migrations.
