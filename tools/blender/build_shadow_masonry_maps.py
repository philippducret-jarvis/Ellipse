"""Derive aligned stone roughness and shallow normal maps for 3D masonry."""

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "workspaces/shadow-echoes/03_assets/environments/campaign-tactical"
color = Image.open(OUT / "bridge-stone-albedo-v1.webp").convert("RGB").resize((1024, 1024))
gray = color.convert("L")
source = np.asarray(gray, dtype=np.float32) / 255
blur = np.asarray(gray.filter(ImageFilter.GaussianBlur(3)), dtype=np.float32) / 255
height = np.clip((source - blur) * .9 + source * .28, 0, 1)
dy, dx = np.gradient(height)
nx, ny, nz = -dx * 3.5, dy * 3.5, np.ones_like(dx)
length = np.sqrt(nx * nx + ny * ny + nz * nz)
normal = np.stack(((nx / length + 1) * 127.5, (ny / length + 1) * 127.5, (nz / length + 1) * 127.5), axis=-1)
Image.fromarray(np.clip(normal, 0, 255).astype(np.uint8), "RGB").save(OUT / "bridge-stone-normal-v2.webp", quality=92)
roughness = np.clip(.77 + .16 * (1 - source), 0, 1)
Image.fromarray((roughness * 255).astype(np.uint8), "L").save(OUT / "bridge-stone-roughness-v2.webp", quality=90)
print("Masonry PBR maps written beside bridge-stone-albedo-v1.webp")
