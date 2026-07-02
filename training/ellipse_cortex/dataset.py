"""Dataset Planner : JSONL → tenseurs (input_ids + cibles multi-tâches)."""

from __future__ import annotations

import json

import torch
from torch.utils.data import Dataset

from .config import DIMENSIONS, FEATURES, GENRES, MECHANICS
from .tokenizer import Tokenizer

_GENRE_IDX = {g: i for i, g in enumerate(GENRES)}
_DIM_IDX = {d: i for i, d in enumerate(DIMENSIONS)}
_MECH_IDX = {m: i for i, m in enumerate(MECHANICS)}


def read_jsonl(path: str) -> list[dict]:
    rows: list[dict] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


class PlannerDataset(Dataset):
    def __init__(self, rows: list[dict], tokenizer: Tokenizer):
        self.rows = rows
        self.tok = tokenizer

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        r = self.rows[idx]
        input_ids = torch.tensor(self.tok.encode(r["prompt"]), dtype=torch.long)

        genre = torch.tensor(_GENRE_IDX.get(r.get("genre", "platformer"), 0), dtype=torch.long)
        dimension = torch.tensor(_DIM_IDX.get(r.get("dimension", "2d"), 0), dtype=torch.long)

        mech = torch.zeros(len(MECHANICS), dtype=torch.float)
        for m in r.get("mechanics", []):
            if m in _MECH_IDX:
                mech[_MECH_IDX[m]] = 1.0

        feats = r.get("features", {})
        feat = torch.tensor([1.0 if feats.get(name) else 0.0 for name in FEATURES], dtype=torch.float)

        return input_ids, {"genre": genre, "dimension": dimension, "mechanics": mech, "features": feat}


def collate(batch):
    input_ids = torch.stack([b[0] for b in batch])
    targets = {
        "genre": torch.stack([b[1]["genre"] for b in batch]),
        "dimension": torch.stack([b[1]["dimension"] for b in batch]),
        "mechanics": torch.stack([b[1]["mechanics"] for b in batch]),
        "features": torch.stack([b[1]["features"] for b in batch]),
    }
    return input_ids, targets
