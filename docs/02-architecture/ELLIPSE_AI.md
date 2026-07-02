# Ellipse Cortex — IA native

Ellipse vise une intelligence **souveraine** portée par **Ellipse Cortex** : modèles
**from-scratch** spécialisés jeu vidéo, exécutés en self-host. En transition, un **pont
open-weights auto-hébergé** est toléré (ORDRE-001) — aucun SaaS cognitif tiers, aucune
donnée hors infra.

Le cerveau est interchangeable derrière un **`CortexProvider`** sélectionné par
`ELLIPSE_CORTEX_BACKEND` :

| Backend | Provider | Statut | Rôle |
|---------|----------|--------|------|
| `ellipse` | `EllipseProvider` | 🟡 modèle v0 en entraînement (`training/`) | **Cible souveraine** — modèle from-scratch ONNX |
| `ollama` | `OllamaProvider` | 🟢 opérationnel | **Pont** open-weights (Llama/Mistral) auto-hébergé |
| `heuristic` | `HeuristicProvider` | 🟢 opérationnel | Filet déterministe (mots-clés) |
| `auto` (défaut) | `ProviderRouter` | 🟢 | ellipse → ollama → heuristique (premier dispo) |

Code : `packages/cortex/src/provider-registry.ts`. Entraînement : `training/` (voir plus bas).

---

## Principes

1. **Souveraineté** — Poids, inference et données restent sous contrôle Ellipse
2. **Spécialisation** — Modèles entraînés/affinés pour jeux 2D/3D, pas du généraliste
3. **Modularité** — Une maîtresse + N modules domaine, pas un monolithe
4. **Contrats stricts** — Entrées/sorties typées (TaskSpec, GDL patches)

---

## Architecture Cortex

```
                    ┌─────────────────────────────┐
                    │     ELLIPSE CORTEX          │
                    │  packages/cortex/           │
                    └─────────────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │ CortexMaster│        │ Model       │        │ Memory      │
   │ intent+plan │        │ Registry    │        │ projet      │
   └──────┬──────┘        └──────┬──────┘        └─────────────┘
          │                      │
          │         ┌────────────┴────────────┐
          │         ▼            ▼            ▼
          │    asset.model  level.model  gameplay.model …
          │         │            │            │
          └─────────┴────────────┴────────────┘
                              │
                    packages/agents/ (exécution)
                              │
                    packages/pipeline/ (ML weights)
```

---

## Composants

### CortexMaster — IA Maîtresse

| Module | Rôle | Phase |
|--------|------|-------|
| `intent.parse` | NLU jeu : genre, mécaniques, dimension, mood | 1 |
| `plan.build` | DAG TaskSpec avec dépendances | 1 |
| `conflict.resolve` | Fusion sorties agents incohérentes | 2 |
| `synthesize.gdl` | Assemblage GDL final | 2 |
| `dialogue.respond` | Réponses utilisateur naturelles | 2 |

**Implémentation Phase 1 :** règles + petit classifieur entraîné Ellipse (remplace heuristiques `TaskPlanner`).

**Implémentation Phase 2+ :** transformer léger Ellipse (~1-3B) fine-tuné sur corpus game-design.

### Model Registry

Chaque sous-agent référence un **modèle Ellipse** :

```json
{
  "asset": {
    "id": "ellipse-asset-v1",
    "type": "diffusion",
    "weights_path": "${ELLIPSE_MODELS_DIR}/asset-v1",
    "runtime": "comfyui-local"
  },
  "gameplay": {
    "id": "ellipse-gameplay-v1",
    "type": "structured-generator",
    "weights_path": "${ELLIPSE_MODELS_DIR}/gameplay-v1",
    "output_schema": "schemas/gdl/game.schema.json"
  }
}
```

Fichier source : `packages/cortex/models/manifest.json`

### Pipeline ML (non cognitif externe)

Les workers `packages/pipeline/` exécutent des **modèles open-weights en local** :

| Capacité | Modèle intégré | Rôle |
|----------|----------------|------|
| Segmentation | SAM 2 / rembg | Photo → mask |
| Stylisation | SDXL / Flux (weights locaux) | Photo → sprite |
| Depth | Depth Anything V2 | Photo → parallax |
| Mesh | TripoSR | Photo → glTF |
| Audio | AudioCraft | SFX procéduraux |
| Embeddings | CLIP (local) | Style matching |

> Ces modèles sont des **outils d'exécution** des sous-agents, pas des cerveaux de remplacement. La décision reste dans Cortex.

---

## Flux inference

```
Prompt utilisateur
    → CortexMaster.intent.parse()
    → CortexMaster.plan.build() → GenerationPlan
    → orchestrator dispatch
    → agent.execute() → charge cortex.models[agent]
    → pipeline workers si besoin (GPU local)
    → TaskResult → CortexMaster.synthesize.gdl()
    → engine.load(GDL)
```

---

## Déploiement modèles

| Variable | Description |
|----------|-------------|
| `ELLIPSE_MODELS_DIR` | Racine des poids Ellipse |
| `ELLIPSE_CORTEX_MASTER` | Chemin modèle maître |
| `ELLIPSE_GPU_DEVICE` | `cuda:0` ou `cpu` |
| `COMFYUI_URL` | Runtime diffusion **local** |

---

## Entraînement (Phase 2+)

| Dataset | Usage |
|---------|-------|
| Corpus GDL | Gameplay agent — génération structurée |
| Paires prompt ↔ plan | CortexMaster planification |
| Photos + sprites pairs | Asset agent stylisation |
| Logs sessions utilisateurs (opt-in) | Amélioration continue |

**ORDRE-001 :** les données d'entraînement ne quittent pas l'infra Ellipse sans consentement explicite.

---

## Modèle Cortex Planner — from-scratch (cible souveraine)

Premier modèle **développé et entraîné** par Ellipse, scope **2D / 2.5D**. Petit
Transformer encodeur (init aléatoire, aucun poids tiers) : `prompt → intent`
(genre, dimension `2d|2.5d|3d`, mechanics multi-label, features). Stack **PyTorch → ONNX**,
inférence Node via `onnxruntime-node` (`EllipseProvider`).

```
training/ellipse_cortex/
  config.py · tokenizer.py · model.py · synth_data.py
  dataset.py · train.py · eval.py · export_onnx.py
→ ${ELLIPSE_MODELS_DIR}/cortex-planner-v0/{model.onnx, tokenizer.json, labels.json}
```

Pipeline : `synth_data` → `train` → `eval` → `export_onnx`, puis `ELLIPSE_CORTEX_BACKEND=ellipse`.
Détails : [`training/README.md`](../../training/README.md).

- **v0** : intent 2D/2.5D (CPU, corpus synthétique).
- **v1** : tête de planification (sélection d'agents) → remplace l'heuristique de `PlanModule`.
- **v2** : scaling GPU, corpus réel (flywheel opt-in), contexte photo.

---

## État actuel

| Composant | Statut |
|-----------|--------|
| `@ellipse/cortex` (routeur providers) | 🟢 Opérationnel |
| Pont open-weights (`OllamaProvider`) | 🟢 Opérationnel (transition) |
| Heuristique (`HeuristicProvider`) | 🟢 Opérationnel (filet) |
| Modèle Planner from-scratch (`EllipseProvider`) | 🟡 Scaffold entraînable — poids à exporter |
| Modèles assets/3D spécialisés | 🔴 Phase 2 (pont open-weights en attendant) |

---

## Interdictions explicites

Voir [CONSTRUCTION_ORDERS.md](../04-roadmap/CONSTRUCTION_ORDERS.md) ORDRE-001 :

- Packages npm : `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, etc.
- Appels HTTP vers endpoints cognitifs tiers
- « Fallback Claude/GPT si échec »
