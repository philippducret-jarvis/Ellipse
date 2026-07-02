"""Générateur de dataset synthétique pour le Cortex Planner.

Compose des prompts FR/EN à partir de gabarits dont on CONNAÎT les labels
(vérité-terrain par construction). Bootstrap d'entraînement en attendant le
flywheel de prompts réels (capture opt-in côté orchestrateur).

Usage :
    python -m ellipse_cortex.synth_data --out training/data/planner.jsonl --n 8000
"""

from __future__ import annotations

import argparse
import json
import random

from .config import DIMENSIONS, GENRES, MECHANICS

# ── Fragments par label (FR / EN) ────────────────────────────────────────────
GENRE_PHRASES = {
    "platformer": {
        "fr": ["un jeu de plateforme", "un platformer", "un jeu de saut"],
        "en": ["a platformer", "a jump-and-run game", "a platforming game"],
    },
    "rpg": {
        "fr": ["un RPG", "un jeu de rôle", "un jeu d'aventure et de donjon"],
        "en": ["an RPG", "a role-playing game", "a dungeon crawler"],
    },
    "puzzle": {
        "fr": ["un jeu de puzzle", "un casse-tête", "un jeu de réflexion"],
        "en": ["a puzzle game", "a brain teaser", "a logic game"],
    },
    "runner": {
        "fr": ["un runner infini", "un jeu de course effrénée", "un endless runner"],
        "en": ["an endless runner", "an infinite runner", "a running game"],
    },
    "fighting": {
        "fr": ["un jeu de combat", "un jeu de baston", "un versus fighting"],
        "en": ["a fighting game", "a versus brawler", "an arena fighter"],
    },
}

DIM_PHRASES = {
    "2d": {"fr": ["en 2D", "en pixel art 2D"], "en": ["in 2D", "with 2D sprites"]},
    "2.5d": {
        "fr": ["en 2.5D avec parallaxe", "en 2.5D avec de la profondeur", "avec un effet de profondeur isométrique"],
        "en": ["in 2.5D with parallax", "with 2.5D depth", "with parallax depth"],
    },
    "3d": {"fr": ["en 3D", "en 3D temps réel", "avec des modèles 3D"], "en": ["in 3D", "with 3D models", "fully 3D"]},
}

MECH_PHRASES = {
    "double jump": {"fr": ["avec double saut"], "en": ["with double jump"]},
    "collect": {"fr": ["où on collecte des pièces", "avec collecte de gemmes"], "en": ["collecting coins", "with collectibles"]},
    "score": {"fr": ["avec un système de score"], "en": ["with a score system", "with high scores"]},
    "health": {"fr": ["avec des points de vie"], "en": ["with a health bar", "with HP"]},
    "enemy": {"fr": ["avec des ennemis", "avec des monstres et un boss"], "en": ["with enemies", "with monsters and a boss"]},
    "power-up": {"fr": ["avec des bonus", "avec des power-ups"], "en": ["with power-ups", "with boosts"]},
    "dash": {"fr": ["avec un dash"], "en": ["with a dash move", "with sprinting"]},
    "wall jump": {"fr": ["avec saut mural"], "en": ["with wall jump"]},
}

FEATURE_PHRASES = {
    "narrative": {"fr": ["avec une histoire et des dialogues", "avec une quête narrative"], "en": ["with a story and dialogues", "with a narrative quest"]},
    "vfx": {"fr": ["avec des particules et des explosions", "avec beaucoup d'effets visuels"], "en": ["with particles and explosions", "with juicy effects"]},
    "cinematic": {"fr": ["avec des cinématiques", "avec des plans caméra"], "en": ["with cutscenes", "with cinematic camera work"]},
}

SUBJECT_PHRASES = {
    "fr": ["un chat", "un chien", "un ninja", "un robot", "un magicien"],
    "en": ["a cat", "a dog", "a ninja", "a robot", "a wizard"],
}
MOOD_PHRASES = {
    "fr": ["ambiance sombre", "style rétro pixel", "ton mignon", "épique"],
    "en": ["dark mood", "retro pixel style", "cute tone", "epic"],
}

INTRO = {
    "fr": ["Je veux créer", "J'aimerais faire", "Crée-moi", "On part sur"],
    "en": ["I want to make", "I'd like to create", "Build me", "Let's make"],
}

DIM_WEIGHTS = {"2d": 0.5, "2.5d": 0.3, "3d": 0.2}


def _sample_dimension(rng: random.Random) -> str:
    r = rng.random()
    acc = 0.0
    for dim in DIMENSIONS:
        acc += DIM_WEIGHTS[dim]
        if r <= acc:
            return dim
    return "2d"


def generate(n: int, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    rows: list[dict] = []
    for _ in range(n):
        lang = rng.choice(["fr", "en"])
        genre = rng.choice(GENRES)
        dim = _sample_dimension(rng)

        n_mech = rng.choices([0, 1, 2, 3, 4], weights=[1, 3, 4, 3, 2])[0]
        mechanics = rng.sample(MECHANICS, k=min(n_mech, len(MECHANICS)))
        feats = {
            "narrative": rng.random() < 0.35,
            "vfx": rng.random() < 0.30,
            "cinematic": rng.random() < 0.25,
        }

        clauses: list[str] = [rng.choice(GENRE_PHRASES[genre][lang])]

        # Dimension : 2D souvent implicite (défaut), 2.5D/3D toujours signalées.
        if dim == "2d":
            if rng.random() < 0.5:
                clauses.append(rng.choice(DIM_PHRASES[dim][lang]))
        else:
            clauses.append(rng.choice(DIM_PHRASES[dim][lang]))

        if rng.random() < 0.5:
            clauses.append(rng.choice(SUBJECT_PHRASES[lang]))
        for m in mechanics:
            clauses.append(rng.choice(MECH_PHRASES[m][lang]))
        for f, on in feats.items():
            if on:
                clauses.append(rng.choice(FEATURE_PHRASES[f][lang]))
        if rng.random() < 0.4:
            clauses.append(rng.choice(MOOD_PHRASES[lang]))

        body = clauses[:1] + rng.sample(clauses[1:], len(clauses) - 1)
        prompt = f"{rng.choice(INTRO[lang])} {' '.join(body)}."

        rows.append({
            "prompt": prompt,
            "genre": genre,
            "dimension": dim,
            "mechanics": mechanics,
            "features": feats,
        })
    return rows


def write_jsonl(rows: list[dict], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="Génère le dataset synthétique du Cortex Planner.")
    ap.add_argument("--out", default="training/data/planner.jsonl")
    ap.add_argument("--n", type=int, default=8000)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    import os

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    rows = generate(args.n, args.seed)
    write_jsonl(rows, args.out)
    print(f"✅ {len(rows)} exemples → {args.out}")


if __name__ == "__main__":
    main()
