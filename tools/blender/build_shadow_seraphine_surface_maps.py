"""Derive aligned material maps from the two approved V3 color plates.

This is a deterministic technical conversion: it does not invent artwork. Gold,
cloth, gem and skin regions receive different metallic/roughness responses;
micro-normal relief stays subtle because silhouette comes from the geometry.
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
TEXTURES = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/textures/v3"


def save_gray(name, values):
    Image.fromarray(np.clip(values * 255, 0, 255).astype(np.uint8), "L").save(TEXTURES / name)


def save_normal(name, color, strength):
    grayscale = Image.fromarray(color.astype(np.uint8), "RGB").convert("L")
    low = np.asarray(grayscale.filter(ImageFilter.GaussianBlur(radius=4)), dtype=np.float32) / 255
    high = np.asarray(grayscale.filter(ImageFilter.GaussianBlur(radius=.7)), dtype=np.float32) / 255
    height = np.clip(high - low, -.08, .08)
    dy, dx = np.gradient(height)
    nx, ny = -dx * strength, dy * strength
    nz = np.ones_like(nx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack(((nx / length + 1) * 127.5, (ny / length + 1) * 127.5, (nz / length + 1) * 127.5), axis=-1)
    Image.fromarray(np.clip(normal, 0, 255).astype(np.uint8), "RGB").save(TEXTURES / name)


face = np.asarray(Image.open(TEXTURES / "face-albedo.png").convert("RGBA"), dtype=np.float32)
face_rgb = face[:, :, :3]
red = face_rgb[:, :, 0]
lip_or_iris = (red > face_rgb[:, :, 1] * 1.18) & (red > face_rgb[:, :, 2] * 1.12)
skin_roughness = np.where(lip_or_iris, .37, .61)
skin_roughness = np.where(face[:, :, 3] < 32, .65, skin_roughness)
save_gray("face-roughness.png", skin_roughness)
save_gray("face-metallic.png", np.zeros_like(skin_roughness))
save_normal("face-normal.png", face_rgb, 1.2)

bodice = np.asarray(Image.open(TEXTURES / "bodice-albedo.png").convert("RGBA"), dtype=np.float32)
rgb = bodice[:, :, :3]
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
gold = (r > 95) & (g > 65) & (r > g * 1.17) & (g > b * 1.12)
gem = (r > 75) & (r > g * 1.8) & (r > b * 1.7) & ~gold
metallic = np.where(gold, .82, .015)
roughness = np.where(gold, .31, np.where(gem, .23, .73))
save_gray("bodice-metallic.png", metallic)
save_gray("bodice-roughness.png", roughness)
save_normal("bodice-normal.png", rgb, 3.2)
print(f"PBR map set created: {TEXTURES}")
