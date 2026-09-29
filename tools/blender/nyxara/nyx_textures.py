"""Nyxara — textures procédurales PBR (numpy + PIL), cuites depuis la géométrie du personnage."""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi


def sstep(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=np.float32) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


# --------------------------------------------------------------------------- bruit 3D (valeur) sur listes de points
def _hash(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761 & 0x7FFFFFFF)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0x7FFFFF).astype(np.float32) / 0x7FFFFF


def value_noise(P, scale, seed=0):
    Q = P.astype(np.float64) * scale
    i = np.floor(Q).astype(np.int64)
    f = (Q - i).astype(np.float32)
    f = f * f * (3 - 2 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[:, 0] if dx else 1 - f[:, 0]) * (f[:, 1] if dy else 1 - f[:, 1]) * (f[:, 2] if dz else 1 - f[:, 2])
                out = out + w * _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return out


def fbm(P, scale, octaves=4, seed=0):
    amp, tot, out = 1.0, 0.0, 0.0
    for o in range(octaves):
        out = out + amp * value_noise(P, scale * (2 ** o), seed + o * 17)
        tot += amp
        amp *= 0.5
    return out / tot


# --------------------------------------------------------------------------- cuisson de la carte de positions
def bake_position_map(obj, res=2048):
    me = obj.data
    me.calc_loop_triangles()
    uvl = me.uv_layers.active
    nl = len(me.loops)
    uv = np.zeros(nl * 2, dtype=np.float32)
    uvl.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2) * res
    co = np.zeros(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    tris = me.loop_triangles
    tl = np.zeros(len(tris) * 3, dtype=np.int32); tris.foreach_get("loops", tl); tl = tl.reshape(-1, 3)
    tv = np.zeros(len(tris) * 3, dtype=np.int32); tris.foreach_get("vertices", tv); tv = tv.reshape(-1, 3)
    P = np.zeros((res, res, 3), dtype=np.float32)
    M = np.zeros((res, res), dtype=bool)
    for i in range(len(tris)):
        a, b, c = uv[tl[i]]
        pa, pb, pc = co[tv[i]]
        minx = max(0, int(math.floor(min(a[0], b[0], c[0])))); maxx = min(res - 1, int(math.ceil(max(a[0], b[0], c[0]))))
        miny = max(0, int(math.floor(min(a[1], b[1], c[1])))); maxy = min(res - 1, int(math.ceil(max(a[1], b[1], c[1]))))
        if maxx < minx or maxy < miny:
            continue
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9:
            continue
        xs = np.arange(minx, maxx + 1, dtype=np.float32) + 0.5
        ys = np.arange(miny, maxy + 1, dtype=np.float32) + 0.5
        X, Y = np.meshgrid(xs, ys)
        l1 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d
        l2 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d
        l3 = 1 - l1 - l2
        inside = (l1 >= -0.03) & (l2 >= -0.03) & (l3 >= -0.03)
        if not inside.any():
            continue
        iy, ix = np.nonzero(inside)
        pos = l1[iy, ix, None] * pa + l2[iy, ix, None] * pb + l3[iy, ix, None] * pc
        P[miny + iy, minx + ix] = pos
        M[miny + iy, minx + ix] = True
    return P, M


def dilate(img, M, pad=8):
    """Remplit les texels hors îlots par le texel valide le plus proche (évite les coutures)."""
    dist, idx = ndi.distance_transform_edt(~M, return_indices=True)
    fill = (~M) & (dist <= pad)
    out = img.copy()
    out[fill] = img[idx[0][fill], idx[1][fill]]
    return out


def to_height_normal(h, strength=1.0):
    """h en repère v vers le haut (ligne 0 = v 0). Retourne l'encodage 8 bits d'une normale tangente."""
    gy, gx = np.gradient(h.astype(np.float32))
    nx, ny, nz = -gx * strength, -gy * strength, np.ones_like(h, dtype=np.float32)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([(nx / ln * 0.5 + 0.5), (ny / ln * 0.5 + 0.5), (nz / ln * 0.5 + 0.5)], -1)


def save_png(arr, path, flip=True):
    a = np.clip(arr, 0.0, 1.0)
    a = (a * 255 + 0.5).astype(np.uint8)
    if flip:
        a = np.flipud(a)
    Image.fromarray(a).save(path, optimize=False)


# --------------------------------------------------------------------------- peau
def paint_skin(P, M, ctx, seed=3):
    """Retourne (base RGB, MR RGB, hauteur) en tableaux (res,res,*) ; ctx: joints, ouverture des yeux, lèvres."""
    res = P.shape[0]
    idx = np.nonzero(M)
    pts = P[idx]
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    ax = np.abs(x)
    n_low = fbm(pts, 5.0, 4, seed)
    n_mid = fbm(pts, 22.0, 3, seed + 1)
    n_hi = fbm(pts, 900.0, 2, seed + 2)
    n_vhi = fbm(pts, 2400.0, 1, seed + 3)
    base = np.array([0.905, 0.752, 0.700], dtype=np.float32)
    col = np.tile(base, (len(x), 1))
    col[:, 0] += 0.030 * (n_low - 0.5) + 0.010 * (n_mid - 0.5)
    col[:, 1] += 0.040 * (n_low - 0.5) + 0.014 * (n_mid - 0.5)
    col[:, 2] += 0.045 * (n_low - 0.5) + 0.016 * (n_mid - 0.5)

    def blend(rgb, a):
        rgb = np.asarray(rgb, dtype=np.float32)
        for k in range(3):
            col[:, k] = col[:, k] * (1 - a) + rgb[k] * a

    front_face = y < -0.115
    # joues, nez, front, menton (rougeurs)
    for sg in (1, -1):
        g = np.exp(-(((x - sg * 0.060) / 0.030) ** 2 + ((z - 1.678) / 0.022) ** 2)) * front_face
        blend((0.88, 0.48, 0.47), 0.30 * g)
    nose = np.exp(-(((x) / 0.011) ** 2 + ((z - 1.692) / 0.012) ** 2)) * (y < -0.135)
    blend((0.90, 0.55, 0.52), 0.32 * nose)
    chin = np.exp(-((x / 0.02) ** 2 + ((z - 1.612) / 0.014) ** 2)) * front_face
    blend((0.88, 0.60, 0.57), 0.12 * chin)
    # articulations : coudes, genoux, mains
    J = ctx["J"]
    for nm, s in (("elbow", 0.032), ("knee", 0.040), ("hand", 0.030)):
        for side in ("l", "r"):
            j = J[side + "-" + nm]
            d2 = ((x - j.x) ** 2 + (y - j.y) ** 2 + (z - j.z) ** 2) / (s * s)
            blend((0.86, 0.52, 0.50), 0.16 * np.exp(-d2))
    # veines discrètes bleutées à l'intérieur des poignets et des cuisses
    veins = sstep(0.62, 0.72, fbm(pts * np.array([1, 1, 0.35]), 14.0, 2, seed + 9)) * (1 - sstep(0.0, 0.10, np.abs(z - 0.55))) * 0
    # lèvres (peintes)
    Z0, W = ctx["lip_z0"], ctx["lip_w"]
    lip_top, lip_bot, lip_line = ctx["lip_top"], ctx["lip_bot"], ctx["lip_line"]
    top = np.vectorize(lip_top)(np.clip(x, -W * 1.4, W * 1.4)) if False else None
    xs = np.linspace(-W * 1.3, W * 1.3, 512)
    tops = np.array([lip_top(v) for v in xs]); bots = np.array([lip_bot(v) for v in xs]); lines = np.array([lip_line(v) for v in xs])
    top = np.interp(x, xs, tops); bot = np.interp(x, xs, bots); line = np.interp(x, xs, lines)
    within = front_face & (ax < W * 1.25) & (z > Z0 - 0.03) & (z < Z0 + 0.03)
    d_in = np.minimum(z - bot, top - z)
    lipmask = sstep(-0.0005, 0.0009, d_in) * sstep(W * 1.15, W * 0.95, ax) * within
    tt = np.clip((z - bot) / np.maximum(top - bot, 1e-5), 0, 1)
    lip_col = np.stack([lerp(0.66, 0.50, sstep(0.0, 1.0, np.abs(tt - 0.45))), lerp(0.05, 0.02, sstep(0.0, 1.0, np.abs(tt - 0.45))), lerp(0.10, 0.06, sstep(0.0, 1.0, np.abs(tt - 0.45)))], -1)
    hl = np.exp(-(((z - (bot + 0.0035)) / 0.0016) ** 2 + (x / 0.010) ** 2))
    lip_col += 0.10 * hl[:, None]
    seam = np.exp(-(((z - line) / 0.0009) ** 2))
    lip_col *= (1 - 0.55 * seam)[:, None]
    for k in range(3):
        col[:, k] = col[:, k] * (1 - lipmask) + lip_col[:, k] * lipmask
    # contour de lèvres légèrement plus sombre
    edge = sstep(-0.0012, -0.0002, d_in) * (1 - sstep(-0.0002, 0.0007, d_in)) * within
    blend((0.55, 0.20, 0.22), 0.30 * edge)

    # maquillage des yeux
    ap = ctx["aperture"]
    ux = np.array([q[0] for q in ap]); uz = np.array([q[1] for q in ap])
    order = np.argsort(ux); ux, uz = ux[order], uz[order]
    xin, xout = ux[0], ux[-1]
    zl = np.interp(ax, ux, uz)
    zl = np.where(ax > xout, uz[-1] + 0.65 * (ax - xout), zl)
    zl = np.where(ax < xin, uz[0] - 0.15 * (xin - ax), zl)
    dz = z - zl
    u = (ax - xin) / max(xout - xin, 1e-4)
    near = front_face & (u > -0.25) & (u < 1.55) & (dz > -0.006) & (dz < 0.030)
    H = 0.0060 + 0.0100 * np.sin(np.pi * np.clip(u * 0.85 + 0.1, 0, 1)) ** 0.8
    H = H * (1 - 0.6 * sstep(1.0, 1.5, u))
    a_sh = sstep(-0.0002, 0.0012, dz) * (1 - sstep(0.35 * H, H, dz)) * sstep(-0.25, 0.05, u) * (1 - sstep(1.1, 1.5, u)) * near
    t = np.clip(dz / np.maximum(H, 1e-4), 0, 1)
    sh_col = np.stack([lerp(0.10, 0.42, sstep(0.0, 0.7, t)), lerp(0.02, 0.15, sstep(0.0, 0.7, t)), lerp(0.18, 0.64, sstep(0.0, 0.7, t))], -1)
    sh_col *= (1 - 0.40 * sstep(0.55, 1.15, u))[:, None]
    sh_col += 0.06 * (fbm(pts, 400.0, 1, seed + 21) - 0.5)[:, None]
    for k in range(3):
        col[:, k] = col[:, k] * (1 - 0.92 * a_sh) + sh_col[:, k] * 0.92 * a_sh
    # eye-liner et cils
    liner_w = 0.0010 + 0.0018 * sstep(0.75, 1.25, u)
    liner = sstep(-0.0014, -0.0004, dz) * 0 + (1 - sstep(liner_w * 0.7, liner_w, np.abs(dz - 0.0004 - 0.0012 * sstep(0.9, 1.3, u)))) * near * sstep(-0.10, 0.02, u) * (1 - sstep(1.15, 1.45, u))
    blend((0.012, 0.006, 0.020), 0.96 * liner)
    # ombre sous l'œil (fumée légère)
    low = front_face & (u > -0.05) & (u < 1.1) & (dz < -0.001) & (dz > -0.010)
    a_lo = sstep(-0.010, -0.002, dz) * (1 - sstep(-0.0012, -0.0004, dz)) * low * 0.22
    blend((0.25, 0.10, 0.36), a_lo)

    col = np.clip(col, 0, 1)
    img = np.zeros((res, res, 3), dtype=np.float32)
    img[idx] = col

    rough = np.full(len(x), 0.54, dtype=np.float32) + 0.07 * (n_hi - 0.5)
    rough -= 0.10 * ((z > 1.74) & front_face) * sstep(0.2, 0.8, n_mid)
    rough = rough * (1 - lipmask) + 0.26 * lipmask
    mr = np.zeros((res, res, 3), dtype=np.float32)
    mr[idx] = np.stack([np.ones_like(rough), np.clip(rough, 0.05, 1), np.zeros_like(rough)], -1)

    height = np.zeros((res, res), dtype=np.float32)
    pore = np.clip(n_hi * 0.7 + n_vhi * 0.6 - 0.35, 0, 1)
    height[idx] = pore * 0.25 + 0.75 * fbm(pts, 60.0, 2, seed + 4) * 0.4
    height[idx] *= (1.0 + 0.4 * front_face)
    return img, mr, height


# --------------------------------------------------------------------------- iris
def iris_texture(size=512, seed=5):
    rng = np.random.RandomState(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    cx = cy = (size - 1) / 2
    px = (xx - cx) / (size / 2); py = (yy - cy) / (size / 2)
    rho = np.sqrt(px * px + py * py)
    th = np.arctan2(py, px)
    # fibres radiales
    nb = 180
    r1 = ndi.gaussian_filter1d(rng.rand(nb), 1.2, mode="wrap")
    r2 = ndi.gaussian_filter1d(rng.rand(nb), 3.0, mode="wrap")
    ang = (th + math.pi) / (2 * math.pi) * nb
    fib = np.interp(ang, np.arange(nb + 1), np.append(r1, r1[0])) * (0.55 + 0.45 * np.interp((ang * 3 + rho * 40) % nb, np.arange(nb + 1), np.append(r2, r2[0])))
    fib = (fib - fib.min()) / (fib.max() - fib.min())
    inner = np.array([0.66, 0.24, 0.78], dtype=np.float32)
    mid = np.array([0.36, 0.12, 0.66], dtype=np.float32)
    outer = np.array([0.10, 0.04, 0.34], dtype=np.float32)
    t = sstep(0.36, 0.95, rho)
    col = np.where((t < 0.5)[..., None], lerp(inner, mid, (t * 2)[..., None]), lerp(mid, outer, ((t - 0.5) * 2)[..., None]))
    col = col * (0.55 + 0.75 * fib)[..., None]
    # collerette claire
    col += np.array([0.20, 0.10, 0.22], dtype=np.float32) * np.exp(-((rho - 0.46) / 0.05) ** 2)[..., None]
    # limbe sombre
    limb = sstep(0.80, 0.97, rho)
    col = col * (1 - 0.85 * limb)[..., None]
    # pupille
    pupil = 1 - sstep(0.30, 0.37, rho)
    col = col * (1 - pupil)[..., None] + np.array([0.004, 0.002, 0.008], dtype=np.float32) * pupil[..., None]
    # reflets (catchlight)
    for (hx, hy, hr, st) in ((-0.30, -0.30, 0.13, 1.0), (0.34, 0.30, 0.055, 0.55)):
        g = np.exp(-(((px - hx) ** 2 + (py - hy) ** 2) / (hr * hr) * 2.2))
        col = col * (1 - g[..., None] * st) + np.array([1.0, 0.98, 1.0], dtype=np.float32) * g[..., None] * st
    alpha = 1 - sstep(0.965, 1.0, rho)
    rgba = np.concatenate([np.clip(col, 0, 1), alpha[..., None]], -1)
    return rgba


# --------------------------------------------------------------------------- cheveux : carte de mèches fines
def hair_texture(size=(512, 1024), seed=1, tone=0, ss=2):
    rng = np.random.RandomState(seed)
    W, H = size[0] * ss, size[1] * ss
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    tones = {
        0: ((0.004, 0.002, 0.009), (0.010, 0.005, 0.022), 0.03),
        1: ((0.008, 0.004, 0.019), (0.022, 0.010, 0.050), 0.07),
        2: ((0.014, 0.007, 0.034), (0.045, 0.019, 0.105), 0.11),
        3: ((0.006, 0.003, 0.014), (0.060, 0.026, 0.150), 0.16),
    }
    dark, light, hi_p = tones[tone]
    n_strands = 300
    for _ in range(26):
        bx = rng.uniform(0.0, 1.0) * W; bw = rng.uniform(0.05, 0.14) * W
        pts_ = [(bx + 0.06 * W * math.sin(2 * math.pi * (0.8 * s / 30 + bx / W)), s / 30 * H * rng.uniform(0.85, 1.0)) for s in range(31)]
        cbase = tuple(int(255 * v ** (1 / 2.2)) for v in dark)
        for (xa, ya), (xb, yb) in zip(pts_[:-1], pts_[1:]):
            d.line([(xa, ya), (xb, yb)], fill=cbase + (255,), width=int(bw * (1.0 - 0.6 * (ya / H) ** 2)))
    order = rng.permutation(n_strands)
    for k in order:
        x0 = rng.uniform(-0.05, 1.05) * W
        freq = rng.uniform(0.6, 2.4)
        amp = rng.uniform(3, 26) * ss
        ph = rng.uniform(0, 6.28)
        drift = rng.uniform(-0.10, 0.10) * W
        vend = rng.uniform(0.62, 1.0)
        w0 = rng.uniform(5.0, 12.0) * ss / 2.2
        t = rng.rand()
        c = [lerp(dark[i], light[i], t) for i in range(3)]
        if rng.rand() < hi_p:
            c = [lerp(light[i], (0.22, 0.09, 0.42)[i], rng.uniform(0.2, 0.7)) for i in range(3)]
        col = tuple(int(255 * v ** (1 / 2.2)) for v in c)  # sRGB
        pts = []
        steps = 40
        for s in range(steps + 1):
            v = s / steps * vend
            y = v * H
            x = x0 + drift * v + amp * math.sin(2 * math.pi * freq * v + ph) + 0.4 * amp * math.sin(2 * math.pi * freq * 2.7 * v + ph * 1.7)
            pts.append((x, y, w0 * (1.0 - 0.75 * (v / max(vend, 1e-3)) ** 1.6)))
        for (xa, ya, wa), (xb, yb, wb) in zip(pts[:-1], pts[1:]):
            d.line([(xa, ya), (xb, yb)], fill=col + (255,), width=max(1, int(round((wa + wb) / 2))))
    img = img.filter(ImageFilter.GaussianBlur(0.6 * ss / 2))
    img = img.resize(size, Image.LANCZOS)
    a = np.asarray(img).astype(np.float32) / 255.0
    # fenêtre latérale douce et pointe
    xw = np.linspace(0, 1, size[0])
    edge = sstep(0.0, 0.10, xw) * (1 - sstep(0.90, 1.0, xw))
    a[..., 3] *= edge[None, :]
    a[..., 3] = np.clip((a[..., 3] - 0.15) / 0.85, 0, 1)
    return a


# --------------------------------------------------------------------------- dentelle / filet (calculé en 3D puis cuit en UV)
def lace_alpha(P, M, res, J):
    idx = np.nonzero(M)
    pts = P[idx]
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    torso = z > 1.0
    # coordonnées cylindriques : torse autour de (0,-0.02), jambes autour de l'axe de chaque jambe
    cx = np.where(torso, 0.0, np.sign(x) * 0.155)
    cy = np.where(torso, -0.02, -0.01)
    th = np.arctan2(x - cx, -(y - cy))
    r_eff = np.where(torso, 0.125, 0.065)
    s = th * r_eff
    tt = z
    p = np.where(torso, 0.0105, 0.0125)
    u1 = (s + tt) / p; u2 = (s - tt) / p
    f1 = np.abs(u1 - np.round(u1)); f2 = np.abs(u2 - np.round(u2))
    w = 0.13
    a1 = 1 - sstep(w * 0.7, w * 1.1, f1)
    a2 = 1 - sstep(w * 0.7, w * 1.1, f2)
    knot = 1 - sstep(0.10, 0.20, np.sqrt(f1 ** 2 + f2 ** 2))
    a = np.maximum(np.maximum(a1, a2), knot * 0.9)
    a = np.clip(a * 1.05, 0, 1)
    img = np.zeros((res, res, 4), dtype=np.float32)
    col = np.tile(np.array([0.012, 0.010, 0.018], dtype=np.float32), (len(x), 1))
    img[idx] = np.concatenate([col, a[:, None]], -1)
    return img


# --------------------------------------------------------------------------- tissu (tuile) : trame + fibres
def cloth_texture(size=1024, seed=2, hem=False):
    rng = np.random.RandomState(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    px = 2 * math.pi * xx / size * 48
    py = 2 * math.pi * yy / size * 48
    weave = 0.5 + 0.25 * np.sin(px + 0.8 * np.sin(py)) + 0.25 * np.sin(py + 0.8 * np.sin(px))
    noise = ndi.gaussian_filter(rng.rand(size, size).astype(np.float32), 1.0)
    fibers = ndi.gaussian_filter(rng.rand(size, size).astype(np.float32), (0.6, 14.0))
    fibers = (fibers - fibers.min()) / (fibers.max() - fibers.min())
    h = 0.55 * weave + 0.25 * noise + 0.2 * fibers
    if hem:
        base = np.array([0.050, 0.011, 0.150], dtype=np.float32)
        col = base[None, None, :] * (0.55 + 0.7 * fibers)[..., None] * (0.85 + 0.3 * weave)[..., None]
        col += np.array([0.04, 0.012, 0.08], dtype=np.float32) * (fibers ** 3)[..., None]
        rough = 0.5 - 0.15 * fibers
    else:
        base = np.array([0.020, 0.013, 0.040], dtype=np.float32)
        col = base[None, None, :] * (0.7 + 0.6 * weave)[..., None] * (0.8 + 0.4 * fibers)[..., None]
        col += np.array([0.012, 0.004, 0.030], dtype=np.float32) * (fibers ** 4)[..., None]
        rough = 0.62 - 0.12 * fibers
    mr = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    nrm = to_height_normal(h, 3.0)
    return np.clip(col, 0, 1) ** (1 / 2.2), mr, nrm


# --------------------------------------------------------------------------- orbe : tourbillon émissif
def swirl_texture(w=1024, h=512, seed=4):
    rng = np.random.RandomState(seed)
    u = np.linspace(0, 1, w, dtype=np.float32)[None, :].repeat(h, 0)
    v = np.linspace(0, 1, h, dtype=np.float32)[:, None].repeat(w, 1)
    def sm(seed_, sig):
        return ndi.gaussian_filter(rng.rand(h, w).astype(np.float32), sig, mode="wrap")
    n1 = sm(0, 18); n1 = (n1 - n1.min()) / (n1.max() - n1.min())
    n2 = sm(1, 6); n2 = (n2 - n2.min()) / (n2.max() - n2.min())
    sw = np.sin((u * 6 + v * 3 + n1 * 3.0) * 2 * math.pi) * 0.5 + 0.5
    val = sstep(0.55, 0.95, sw * (0.6 + 0.6 * n2))
    col = np.stack([0.35 + 0.5 * val, 0.06 + 0.2 * val, 0.55 + 0.45 * val], -1) * (0.15 + 0.85 * val)[..., None]
    return np.clip(col, 0, 1)


# --------------------------------------------------------------------------- matériaux Blender
def apply_pbr(mat, base=None, mr=None, nrm=None, emit=None, emit_strength=1.0, alpha_clip=None, normal_strength=1.0, tile=None, base_alpha=False):
    import bpy
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    def img_node(path, noncolor, loc):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        n.image.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
        n.location = loc
        n.extension = "REPEAT"
        if tile:
            mp = nt.nodes.new("ShaderNodeMapping")
            mp.inputs["Scale"].default_value = (tile[0], tile[1], 1.0)
            tc = nt.nodes.new("ShaderNodeTexCoord")
            nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
            nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    if base:
        n = img_node(base, False, (-600, 300))
        nt.links.new(n.outputs["Color"], bsdf.inputs["Base Color"])
        if base_alpha:
            nt.links.new(n.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.diffuse_color = (0.5, 0.5, 0.5, 1)
    if mr:
        n = img_node(mr, True, (-600, 0))
        sp = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(n.outputs["Color"], sp.inputs["Color"])
        nt.links.new(sp.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sp.outputs["Blue"], bsdf.inputs["Metallic"])
    if nrm:
        n = img_node(nrm, True, (-600, -300))
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if emit:
        n = img_node(emit, False, (-600, -600))
        nt.links.new(n.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    if alpha_clip is not None:
        mat.blend_method = "CLIP"
        mat.alpha_threshold = alpha_clip
