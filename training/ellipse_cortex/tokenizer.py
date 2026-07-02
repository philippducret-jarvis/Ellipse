"""Tokenizer word-level FROM-SCRATCH (FR + EN), sérialisé en tokenizer.json.

Le découpage est le MIROIR EXACT de la version TS
(`packages/cortex/src/providers/ellipse-provider.ts`, fonction `tokenize`) :
  - TS  : text.toLowerCase().match(/[\\p{L}\\p{N}]+/gu)
  - PY  : re.findall(r"[^\\W_]+", text.lower(), re.UNICODE)
Les deux extraient les suites de lettres/chiffres Unicode, underscore exclu.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from typing import Iterable

from .config import PAD_ID, PAD_TOKEN, UNK_ID, UNK_TOKEN

_TOKEN_RE = re.compile(r"[^\W_]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


class Tokenizer:
    def __init__(self, vocab: dict[str, int], max_len: int, pad_id: int = PAD_ID, unk_id: int = UNK_ID):
        self.vocab = vocab
        self.max_len = max_len
        self.pad_id = pad_id
        self.unk_id = unk_id

    @classmethod
    def train(cls, texts: Iterable[str], vocab_size: int, max_len: int) -> "Tokenizer":
        counter: Counter[str] = Counter()
        for t in texts:
            counter.update(tokenize(t))
        vocab: dict[str, int] = {PAD_TOKEN: PAD_ID, UNK_TOKEN: UNK_ID}
        for tok, _ in counter.most_common(max(0, vocab_size - len(vocab))):
            vocab[tok] = len(vocab)
        return cls(vocab, max_len)

    def encode(self, text: str) -> list[int]:
        ids = [self.vocab.get(t, self.unk_id) for t in tokenize(text)]
        ids = ids[: self.max_len]
        ids += [self.pad_id] * (self.max_len - len(ids))
        return ids

    def save(self, path: str) -> None:
        payload = {
            "version": "planner-tok-v0",
            "max_len": self.max_len,
            "pad_id": self.pad_id,
            "unk_id": self.unk_id,
            "vocab": self.vocab,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> "Tokenizer":
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return cls(d["vocab"], d["max_len"], d["pad_id"], d["unk_id"])

    def __len__(self) -> int:
        return len(self.vocab)
