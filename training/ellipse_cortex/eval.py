"""Évaluation du Cortex Planner — accuracy genre/dimension, F1 mechanics/features."""

from __future__ import annotations

import argparse
import os

import torch
from torch.utils.data import DataLoader

from .checkpoint import load_checkpoint
from .dataset import PlannerDataset, collate, read_jsonl
from .tokenizer import Tokenizer


def _f1(tp: int, fp: int, fn: int) -> float:
    p = tp / (tp + fp) if (tp + fp) else 0.0
    r = tp / (tp + fn) if (tp + fn) else 0.0
    return 2 * p * r / (p + r) if (p + r) else 0.0


@torch.no_grad()
def compute_metrics(model, loader, device: str = "cpu") -> dict:
    model.eval()
    g_correct = d_correct = total = 0
    mtp = mfp = mfn = 0
    ftp = ffp = ffn = 0
    for input_ids, t in loader:
        input_ids = input_ids.to(device)
        g, d, mech, feat = model(input_ids)
        gp = g.argmax(-1).cpu()
        dp = d.argmax(-1).cpu()
        total += len(gp)
        g_correct += int((gp == t["genre"]).sum())
        d_correct += int((dp == t["dimension"]).sum())

        mp = (torch.sigmoid(mech).cpu() > 0.5).float()
        mtp += int(((mp == 1) & (t["mechanics"] == 1)).sum())
        mfp += int(((mp == 1) & (t["mechanics"] == 0)).sum())
        mfn += int(((mp == 0) & (t["mechanics"] == 1)).sum())

        fp_ = (torch.sigmoid(feat).cpu() > 0.5).float()
        ftp += int(((fp_ == 1) & (t["features"] == 1)).sum())
        ffp += int(((fp_ == 1) & (t["features"] == 0)).sum())
        ffn += int(((fp_ == 0) & (t["features"] == 1)).sum())

    return {
        "genre_acc": g_correct / max(total, 1),
        "dimension_acc": d_correct / max(total, 1),
        "mechanics_f1": _f1(mtp, mfp, mfn),
        "features_f1": _f1(ftp, ffp, ffn),
        "n": total,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", default="training/artifacts/cortex-planner-v0")
    ap.add_argument("--data", default="training/data/planner.jsonl")
    ap.add_argument("--batch-size", type=int, default=128)
    args = ap.parse_args()

    model, _ = load_checkpoint(os.path.join(args.artifacts, "checkpoint.pt"))
    tok = Tokenizer.load(os.path.join(args.artifacts, "tokenizer.json"))
    rows = read_jsonl(args.data)
    loader = DataLoader(PlannerDataset(rows, tok), batch_size=args.batch_size, collate_fn=collate)

    metrics = compute_metrics(model, loader)
    print("📊 Évaluation Cortex Planner")
    for k, v in metrics.items():
        print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")


if __name__ == "__main__":
    main()
