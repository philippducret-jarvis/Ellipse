"""Cortex Planner — Transformer encodeur FROM-SCRATCH (PyTorch).

Embeddings + attention multi-têtes + FFN, init aléatoire, entraînés sur corpus
Ellipse. AUCUN poids pré-entraîné, AUCun LLM tiers. 4 têtes de sortie :
  genre (softmax) · dimension {2d,2.5d,3d} (softmax) · mechanics (multi-label) · features (multi-label)

Self-test :
    python -m ellipse_cortex.model --selftest
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import PAD_ID, ModelConfig


class MultiHeadSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, dropout: float):
        super().__init__()
        assert d_model % n_heads == 0, "d_model doit être divisible par n_heads"
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, add_mask: torch.Tensor) -> torch.Tensor:
        # x: [B, T, D] ; add_mask: [B, 1, 1, T] (0 pour token réel, -inf pour pad)
        b, t, d = x.shape
        qkv = self.qkv(x).reshape(b, t, 3, self.n_heads, self.d_head).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]  # [B, H, T, d_head]
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_head)  # [B, H, T, T]
        scores = scores + add_mask
        attn = self.dropout(F.softmax(scores, dim=-1))
        ctx = attn @ v  # [B, H, T, d_head]
        ctx = ctx.transpose(1, 2).reshape(b, t, d)
        return self.out(ctx)


class EncoderBlock(nn.Module):
    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.attn = MultiHeadSelfAttention(cfg.d_model, cfg.n_heads, cfg.dropout)
        self.norm1 = nn.LayerNorm(cfg.d_model)
        self.norm2 = nn.LayerNorm(cfg.d_model)
        self.ff = nn.Sequential(
            nn.Linear(cfg.d_model, cfg.d_ff),
            nn.GELU(),
            nn.Dropout(cfg.dropout),
            nn.Linear(cfg.d_ff, cfg.d_model),
        )
        self.dropout = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor, add_mask: torch.Tensor) -> torch.Tensor:
        x = x + self.dropout(self.attn(self.norm1(x), add_mask))
        x = x + self.dropout(self.ff(self.norm2(x)))
        return x


class CortexPlanner(nn.Module):
    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.cfg = cfg
        self.pad_id = PAD_ID
        self.embed = nn.Embedding(cfg.vocab_size, cfg.d_model, padding_idx=PAD_ID)
        self.pos = nn.Parameter(torch.zeros(1, cfg.max_len, cfg.d_model))
        nn.init.normal_(self.pos, std=0.02)
        self.blocks = nn.ModuleList([EncoderBlock(cfg) for _ in range(cfg.n_layers)])
        self.norm = nn.LayerNorm(cfg.d_model)
        self.genre_head = nn.Linear(cfg.d_model, cfg.n_genres)
        self.dimension_head = nn.Linear(cfg.d_model, cfg.n_dimensions)
        self.mechanics_head = nn.Linear(cfg.d_model, cfg.n_mechanics)
        self.features_head = nn.Linear(cfg.d_model, cfg.n_features)

    def forward(self, input_ids: torch.Tensor):
        # input_ids: [B, T] (int64)
        keep = (input_ids != self.pad_id).float()  # [B, T] — 1 token réel, 0 pad
        add_mask = (1.0 - keep)[:, None, None, :] * -1e9  # [B,1,1,T]

        x = self.embed(input_ids) + self.pos[:, : input_ids.shape[1], :]
        for blk in self.blocks:
            x = blk(x, add_mask)
        x = self.norm(x)

        # Mean-pool masqué (ignore les positions pad).
        m = keep[:, :, None]
        pooled = (x * m).sum(dim=1) / m.sum(dim=1).clamp(min=1.0)

        return (
            self.genre_head(pooled),
            self.dimension_head(pooled),
            self.mechanics_head(pooled),
            self.features_head(pooled),
        )


def _selftest() -> None:
    cfg = ModelConfig()
    model = CortexPlanner(cfg).eval()
    n_params = sum(p.numel() for p in model.parameters())
    x = torch.randint(0, cfg.vocab_size, (2, cfg.max_len), dtype=torch.long)
    x[0, cfg.max_len // 2 :] = PAD_ID  # simule du padding
    with torch.no_grad():
        g, d, mech, feat = model(x)
    print(f"CortexPlanner OK — {n_params/1e6:.2f}M params")
    print(f"  genre_logits     {tuple(g.shape)}  (attendu (2, {cfg.n_genres}))")
    print(f"  dimension_logits {tuple(d.shape)}  (attendu (2, {cfg.n_dimensions}))")
    print(f"  mechanics_logits {tuple(mech.shape)}  (attendu (2, {cfg.n_mechanics}))")
    print(f"  features_logits  {tuple(feat.shape)}  (attendu (2, {cfg.n_features}))")


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        _selftest()
    else:
        ap.print_help()
