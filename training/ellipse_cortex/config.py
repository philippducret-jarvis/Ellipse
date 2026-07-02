"""Configuration du Cortex Planner v0.

Les espaces de labels DOIVENT rester alignés avec :
  - heuristiques TS : packages/cortex/src/providers/heuristics.ts
  - catalogue agents : packages/shared/src/agents/catalog.ts
Ils sont aussi exportés dans labels.json pour l'inférence ONNX côté Node.
"""

from __future__ import annotations

from dataclasses import dataclass

# ── Espaces de sortie (têtes du modèle) ──────────────────────────────────────
GENRES = ["platformer", "rpg", "puzzle", "runner", "fighting"]
DIMENSIONS = ["2d", "2.5d", "3d"]
MECHANICS = [
    "double jump",
    "collect",
    "score",
    "health",
    "enemy",
    "power-up",
    "dash",
    "wall jump",
]
FEATURES = ["narrative", "vfx", "cinematic"]

# ── Tokens spéciaux (miroir exact du tokenizer TS) ───────────────────────────
PAD_TOKEN = "<pad>"
UNK_TOKEN = "<unk>"
PAD_ID = 0
UNK_ID = 1


@dataclass
class ModelConfig:
    """Petit Transformer encodeur — dimensionné pour un entraînement CPU."""

    vocab_size: int = 4096
    max_len: int = 32
    d_model: int = 128
    n_heads: int = 4
    n_layers: int = 2
    d_ff: int = 256
    dropout: float = 0.1

    @property
    def n_genres(self) -> int:
        return len(GENRES)

    @property
    def n_dimensions(self) -> int:
        return len(DIMENSIONS)

    @property
    def n_mechanics(self) -> int:
        return len(MECHANICS)

    @property
    def n_features(self) -> int:
        return len(FEATURES)


@dataclass
class TrainConfig:
    epochs: int = 30
    batch_size: int = 64
    lr: float = 3e-4
    weight_decay: float = 1e-2
    val_split: float = 0.1
    seed: int = 42
    dataset_size: int = 8000


def labels_dict() -> dict:
    """Bloc labels.json exporté à côté du modèle ONNX."""
    return {
        "genres": GENRES,
        "dimensions": DIMENSIONS,
        "mechanics": MECHANICS,
        "features": FEATURES,
    }
