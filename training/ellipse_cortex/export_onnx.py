"""Export ONNX du Cortex Planner → consommé par @ellipse/cortex (EllipseProvider).

Écrit dans ${ELLIPSE_MODELS_DIR}/cortex-planner-v0/ (défaut <repo>/models/...) :
  model.onnx · tokenizer.json · labels.json

Usage :
    python -m ellipse_cortex.export_onnx
    python -m ellipse_cortex.export_onnx --out ../models/cortex-planner-v0
"""

from __future__ import annotations

import argparse
import json
import os

import torch

from .checkpoint import load_checkpoint
from .config import labels_dict
from .tokenizer import Tokenizer


def _default_out() -> str:
    env = os.environ.get("ELLIPSE_MODELS_DIR")
    if env:
        return os.path.join(env, "cortex-planner-v0")
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(repo_root, "models", "cortex-planner-v0")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", default="training/artifacts/cortex-planner-v0")
    ap.add_argument("--out", default=None, help="cible (défaut: ${ELLIPSE_MODELS_DIR}/cortex-planner-v0)")
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()

    out_dir = args.out or _default_out()
    os.makedirs(out_dir, exist_ok=True)

    model, cfg = load_checkpoint(os.path.join(args.artifacts, "checkpoint.pt"))
    model.eval()
    tok = Tokenizer.load(os.path.join(args.artifacts, "tokenizer.json"))

    dummy = torch.ones(1, cfg.max_len, dtype=torch.long)
    onnx_path = os.path.join(out_dir, "model.onnx")
    torch.onnx.export(
        model,
        (dummy,),
        onnx_path,
        input_names=["input_ids"],
        output_names=["genre_logits", "dimension_logits", "mechanics_logits", "features_logits"],
        dynamic_axes={
            "input_ids": {0: "batch"},
            "genre_logits": {0: "batch"},
            "dimension_logits": {0: "batch"},
            "mechanics_logits": {0: "batch"},
            "features_logits": {0: "batch"},
        },
        opset_version=args.opset,
    )

    tok.save(os.path.join(out_dir, "tokenizer.json"))
    with open(os.path.join(out_dir, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(labels_dict(), f, ensure_ascii=False, indent=2)

    print(f"✅ Export ONNX → {out_dir}")
    print("   Activez le modèle Ellipse : ELLIPSE_CORTEX_BACKEND=ellipse")


if __name__ == "__main__":
    main()
