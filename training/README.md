# Ellipse Cortex — Entraînement du modèle Planner (FROM-SCRATCH)

Premier modèle **souverain** d'Ellipse (ORDRE-001). Aucun poids pré-entraîné, aucun
LLM tiers : un petit Transformer encodeur init aléatoire, **développé et entraîné** sur
un corpus Ellipse, qui transforme un prompt en **intent structuré** :

```
prompt (FR/EN) ──► CortexPlanner ──► { genre, dimension(2d|2.5d|3d), mechanics[], features{} }
```

Le modèle est exporté en **ONNX** et chargé sans Python par les services Node via
`@ellipse/cortex` (`EllipseProvider`). Tant qu'il n'est pas exporté, le cerveau retombe
sur le **pont open-weights** (Ollama) puis l'**heuristique** — voir
`packages/cortex/src/provider-registry.ts` et `ELLIPSE_CORTEX_BACKEND`.

> Scope v0 : **2D / 2.5D** (le 2.5D = profondeur/parallaxe sur base 2D). La tête de
> *planification* (choix des agents) n'est pas dans v0 ; elle reste heuristique.

---

## 1. Environnement

```powershell
# Windows PowerShell, depuis la racine du dépôt
py -3.11 -m venv training\.venv
training\.venv\Scripts\Activate.ps1
pip install -r training\requirements.txt
```

> Pas de GPU requis pour v0 (modèle ~0.5–1M params). Si CUDA est dispo, l'entraînement
> l'utilise automatiquement.

## 2. Pipeline

Toutes les commandes se lancent depuis la racine du dépôt (module `ellipse_cortex`).

```powershell
# (a) Self-test du modèle — forward pass, vérifie les shapes
python -m ellipse_cortex.model --selftest

# (b) Générer le dataset synthétique (FR/EN, labels vérité-terrain)
python -m ellipse_cortex.synth_data --out training\data\planner.jsonl --n 8000

# (c) Entraînement
python -m ellipse_cortex.train             # complet
python -m ellipse_cortex.train --smoke     # preuve d'exécution (1 epoch, mini)

# (d) Évaluation (accuracy genre/dim, F1 mechanics/features)
python -m ellipse_cortex.eval

# (e) Export ONNX vers ${ELLIPSE_MODELS_DIR}/cortex-planner-v0 (défaut <repo>/models/...)
python -m ellipse_cortex.export_onnx
```

Puis activer le modèle souverain côté services :

```
ELLIPSE_CORTEX_BACKEND=ellipse
```

## 3. Structure

| Fichier | Rôle |
|---------|------|
| `config.py` | Espaces de labels (alignés `heuristics.ts` / `catalog.ts`) + hyperparams |
| `tokenizer.py` | Tokenizer word-level FR+EN (miroir EXACT du tokenizer TS) |
| `model.py` | Transformer encodeur from-scratch, 4 têtes de sortie |
| `synth_data.py` | Générateur de corpus synthétique étiqueté |
| `dataset.py` | JSONL → tenseurs multi-tâches |
| `train.py` | Boucle d'entraînement CPU (AdamW, perte multi-tâches) |
| `eval.py` | Métriques par tête |
| `export_onnx.py` | Export ONNX + `tokenizer.json` + `labels.json` |
| `checkpoint.py` | Save/load des poids |

## 4. Parité tokenizer (critique)

Le découpage Python et TS doit être identique, sinon l'inférence ONNX diverge :

- **PY** : `re.findall(r"[^\W_]+", text.lower(), re.UNICODE)`
- **TS** : `text.toLowerCase().match(/[\p{L}\p{N}]+/gu)`

`tokenizer.json` (vocab + `max_len`/`pad_id`/`unk_id`) est partagé : écrit par l'export,
lu par `EllipseProvider`.

## 5. Flywheel de données (amélioration continue, ORDRE-001)

Le corpus synthétique est un *bootstrap*. La qualité viendra des **prompts réels**
capturés **opt-in** côté orchestrateur (paires `prompt → intent`), stockés **localement**
en JSONL, puis ajoutés au dataset d'entraînement. Les données ne quittent jamais l'infra
Ellipse. (Hook de capture : à brancher derrière un flag env dans l'orchestrateur.)

## 6. Roadmap modèle

- **v0** (ici) : intent 2D/2.5D, entraîné CPU sur synthétique.
- **v1** : ajout tête *planification* (sélection d'agents) → remplace l'heuristique de `PlanModule`.
- **v2** : scaling GPU, corpus réel (flywheel), distillation, contexte photo.
