"""Sauvegarde / chargement de checkpoints du Cortex Planner."""

from __future__ import annotations

import torch

from .config import ModelConfig
from .model import CortexPlanner


def save_checkpoint(path: str, model: CortexPlanner, cfg: ModelConfig) -> None:
    torch.save({"state_dict": model.state_dict(), "config": cfg.__dict__}, path)


def load_checkpoint(path: str, map_location: str = "cpu") -> tuple[CortexPlanner, ModelConfig]:
    ckpt = torch.load(path, map_location=map_location)
    cfg = ModelConfig(**ckpt["config"])
    model = CortexPlanner(cfg)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, cfg
