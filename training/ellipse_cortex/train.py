"""Entraînement du Cortex Planner FROM-SCRATCH (CPU-friendly).

Usage :
    python -m ellipse_cortex.train                  # entraînement complet
    python -m ellipse_cortex.train --smoke          # preuve d'exécution (1 epoch, mini)

Génère le dataset s'il est absent. Sauvegarde checkpoint + tokenizer + metrics
dans --artifacts (défaut training/artifacts/cortex-planner-v0).
"""

from __future__ import annotations

import argparse
import json
import os
import random

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

from .checkpoint import save_checkpoint
from .config import ModelConfig, TrainConfig
from .dataset import PlannerDataset, collate, read_jsonl
from .eval import compute_metrics
from .model import CortexPlanner
from .synth_data import generate, write_jsonl
from .tokenizer import Tokenizer


def _ensure_dataset(path: str, size: int, seed: int) -> list[dict]:
    if os.path.exists(path):
        return read_jsonl(path)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    rows = generate(size, seed)
    write_jsonl(rows, path)
    print(f"ℹ️  Dataset généré ({len(rows)} exemples) → {path}")
    return rows


def _loss(out, targets) -> torch.Tensor:
    g, d, mech, feat = out
    return (
        F.cross_entropy(g, targets["genre"])
        + F.cross_entropy(d, targets["dimension"])
        + F.binary_cross_entropy_with_logits(mech, targets["mechanics"])
        + F.binary_cross_entropy_with_logits(feat, targets["features"])
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="training/data/planner.jsonl")
    ap.add_argument("--artifacts", default="training/artifacts/cortex-planner-v0")
    ap.add_argument("--epochs", type=int, default=None)
    ap.add_argument("--batch-size", type=int, default=None)
    ap.add_argument("--lr", type=float, default=None)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--smoke", action="store_true", help="1 epoch sur un mini-dataset (preuve d'exécution)")
    args = ap.parse_args()

    tcfg = TrainConfig()
    epochs = args.epochs if args.epochs is not None else (1 if args.smoke else tcfg.epochs)
    batch_size = args.batch_size if args.batch_size is not None else tcfg.batch_size
    lr = args.lr if args.lr is not None else tcfg.lr
    dataset_size = 256 if args.smoke else tcfg.dataset_size

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Entraînement Cortex Planner — device={device}, epochs={epochs}, smoke={args.smoke}")

    rows = _ensure_dataset(args.data, dataset_size, args.seed)
    if args.smoke:
        rows = rows[:dataset_size]

    random.Random(args.seed).shuffle(rows)
    n_val = max(1, int(len(rows) * tcfg.val_split))
    val_rows, train_rows = rows[:n_val], rows[n_val:]

    mcfg = ModelConfig()
    tokenizer = Tokenizer.train((r["prompt"] for r in train_rows), mcfg.vocab_size, mcfg.max_len)
    mcfg.vocab_size = len(tokenizer)  # ajuste à la taille réelle du vocab

    train_loader = DataLoader(PlannerDataset(train_rows, tokenizer), batch_size=batch_size, shuffle=True, collate_fn=collate)
    val_loader = DataLoader(PlannerDataset(val_rows, tokenizer), batch_size=batch_size, collate_fn=collate)

    model = CortexPlanner(mcfg).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=tcfg.weight_decay)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"   modèle : {n_params/1e6:.2f}M params, vocab={mcfg.vocab_size}, train={len(train_rows)}, val={len(val_rows)}")

    for epoch in range(1, epochs + 1):
        model.train()
        running = 0.0
        for input_ids, targets in train_loader:
            input_ids = input_ids.to(device)
            targets = {k: v.to(device) for k, v in targets.items()}
            opt.zero_grad()
            loss = _loss(model(input_ids), targets)
            loss.backward()
            opt.step()
            running += loss.item() * len(input_ids)
        train_loss = running / max(len(train_rows), 1)
        metrics = compute_metrics(model, val_loader, device)
        print(
            f"  epoch {epoch:>2}/{epochs}  loss={train_loss:.4f}  "
            f"genre={metrics['genre_acc']:.3f}  dim={metrics['dimension_acc']:.3f}  "
            f"mech_f1={metrics['mechanics_f1']:.3f}  feat_f1={metrics['features_f1']:.3f}"
        )

    os.makedirs(args.artifacts, exist_ok=True)
    save_checkpoint(os.path.join(args.artifacts, "checkpoint.pt"), model, mcfg)
    tokenizer.save(os.path.join(args.artifacts, "tokenizer.json"))
    final = compute_metrics(model, val_loader, device)
    with open(os.path.join(args.artifacts, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({"final": final, "epochs": epochs, "smoke": args.smoke, "n_params": n_params}, f, indent=2)

    print(f"✅ Artifacts → {args.artifacts}  (checkpoint.pt, tokenizer.json, metrics.json)")
    print("   Étape suivante : python -m ellipse_cortex.export_onnx")


if __name__ == "__main__":
    main()
