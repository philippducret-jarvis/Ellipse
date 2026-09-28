"""Deterministic tileable PBR maps for V4 silver hair and layered silk."""

from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/textures/v4"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1024
rng = np.random.default_rng(241)
y, x = np.mgrid[0:SIZE, 0:SIZE]


def save(name, data, mode="RGB"):
    Image.fromarray(np.clip(data, 0, 255).astype(np.uint8), mode).save(OUT / name)


def normal_from_height(height, strength):
    dy, dx = np.gradient(height.astype(np.float32))
    nx, ny, nz = -dx * strength, dy * strength, np.ones_like(dx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack(((nx / length + 1) * 127.5, (ny / length + 1) * 127.5, (nz / length + 1) * 127.5), axis=-1)


# The UVs follow the length of each ribbon. Multiple narrow streaks make the
# broad locks read as many fibers without painting a view-dependent highlight.
fiber = .50 + .18 * np.sin(x * .82 + 2.4 * np.sin(y * .014)) + .10 * np.sin(x * 2.8 + y * .016)
fiber += rng.normal(0, .028, (SIZE, SIZE))
root_shadow = .90 + .10 * np.minimum(1, y / (SIZE * .25))
base = np.clip(fiber * root_shadow, .15, .95)
hair = np.stack((196 + 45 * base, 190 + 43 * base, 201 + 41 * base), axis=-1)
save("hair-albedo.png", hair)
save("hair-roughness.png", np.clip((.48 + .10 * (1 - base)) * 255, 0, 255), "L")
save("hair-metallic.png", np.full((SIZE, SIZE), 3), "L")
save("hair-normal.png", normal_from_height(fiber, 1.7))


# Organic diagonal weave and fine thread noise. The cloth geometry supplies
# the large folds; the normal map only adds shallow surface relief.
weave = np.sin(x * .55 + y * .16) * np.sin(y * .47 - x * .13)
weave += .35 * np.sin(x * .11 + y * .08)
weave += rng.normal(0, .16, (SIZE, SIZE))
weave = np.clip(weave / 2.2, -1, 1)
for label, color in (("crimson", (82, 12, 28)), ("charcoal", (23, 19, 29))):
    albedo = np.stack([np.clip(channel * (1 + .14 * weave), 0, 255) for channel in color], axis=-1)
    save(f"silk-{label}-albedo.png", albedo)
    save(f"silk-{label}-roughness.png", np.full((SIZE, SIZE), 177 if label == "crimson" else 192), "L")
    save(f"silk-{label}-metallic.png", np.full((SIZE, SIZE), 2), "L")
    save(f"silk-{label}-normal.png", normal_from_height(weave, 2.1))

print(f"V4 hair and silk PBR maps: {OUT}")
