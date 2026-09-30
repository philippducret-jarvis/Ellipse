"""Nyxara — constructeur complet (phase 1 : tête).

usage: blender -b -P nyx_build.py -- <body.blend> <out_prefix> [params.json]
"""
import bpy, sys, os, math, json, random, mathutils, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index("--") + 1:]
blend, outprefix = args[0], args[1]
P = json.load(open(args[2])) if len(args) > 2 else {}
def prm(k, d):
    return P.get(k, d)

LIB = prm("libdir", os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, LIB)
import nyx_textures as T
TEX = outprefix + "_tex"
os.makedirs(TEX, exist_ok=True)
GEO_MAKEUP = prm("geo_makeup", False)
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
body = bpy.data.objects["Mira_MPFB_Basemesh"]
me = body.data
rng = random.Random(prm("seed", 7))
LM_ = json.load(open(blend.replace('_body.blend', '_landmarks.json')))

def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)

# ---------------------------------------------------------------- matériaux
def mk_mat(name, rgb, metallic=0.0, rough=0.5, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = 1.5
    m.diffuse_color = (*rgb, 1)
    m.metallic = metallic
    m.roughness = rough
    return m

M = {
    "skin": mk_mat("nyx_skin", prm("skin", (0.90, 0.74, 0.68)), 0.0, 0.55),
    "lips": mk_mat("nyx_lips", (0.55, 0.04, 0.09), 0.0, 0.3),
    "shadow": mk_mat("nyx_eyeshadow", (0.30, 0.12, 0.46), 0.0, 0.5),
    "sclera": mk_mat("nyx_sclera", (0.92, 0.90, 0.90), 0.0, 0.2),
    "iris": mk_mat("nyx_iris", (0.42, 0.14, 0.62), 0.0, 0.2, emit=(0.25, 0.08, 0.4)),
    "pupil": mk_mat("nyx_pupil", (0.01, 0.0, 0.02), 0.0, 0.1),
    "brow": mk_mat("nyx_brow", (0.03, 0.015, 0.05), 0.0, 0.6),
    "gold": mk_mat("nyx_gold", (0.95, 0.68, 0.16), 1.0, 0.25),
    "gem": mk_mat("nyx_amethyst", (0.50, 0.15, 0.80), 0.0, 0.1, emit=(0.3, 0.08, 0.5)),
}
HAIR_COLORS = [
    ((0.010, 0.004, 0.022), 0.34),
    ((0.030, 0.011, 0.068), 0.34),
    ((0.070, 0.025, 0.150), 0.22),
    ((0.160, 0.058, 0.320), 0.10),
]
HM = [mk_mat("nyx_hair_%d" % i, c, 0.0, 0.5) for i, (c, _) in enumerate(HAIR_COLORS)]
for _i, _m in enumerate(HM):
    _p = os.path.join(TEX, "hair_%d.png" % _i)
    T.save_png(T.hair_texture((512, 1024), 10 + _i, _i), _p, flip=True)
    T.apply_pbr(_m, base=_p, alpha_clip=0.5, base_alpha=True)
    _m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.42
for _m in HM:
    _b = _m.node_tree.nodes["Principled BSDF"]
    for _k in ("Specular IOR Level", "Specular"):
        if _k in _b.inputs:
            _b.inputs[_k].default_value = 0.12
    if "Sheen Weight" in _b.inputs:
        _b.inputs["Sheen Weight"].default_value = 0.10
        _b.inputs["Sheen Tint"].default_value = (0.5, 0.25, 0.9, 1)
_sb = M["skin"].node_tree.nodes["Principled BSDF"]
_sb.inputs["Base Color"].default_value = (0.86, 0.63, 0.57, 1)
M["skin"].diffuse_color = (0.86, 0.63, 0.57, 1)
if "Subsurface Weight" in _sb.inputs:
    _sb.inputs["Subsurface Weight"].default_value = 0.30
    _sb.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.25)
    _sb.inputs["Subsurface Scale"].default_value = 0.02

# ---------------------------------------------------------------- corps : matériaux visage
for v in me.vertices:
    c = v.co
    if c.y < -0.02 and 1.57 < c.z < 1.78:
        jaw = smooth((c.z - 1.585) / 0.03) * (1 - smooth((c.z - 1.665) / 0.05))
        c.x *= 1 - prm("jaw_slim", 0.13) * jaw
        if abs(c.x) < 0.024 and 1.665 < c.z < 1.765 and c.y < -0.125:
            c.x *= 1 - prm("nose_slim", 0.14) * smooth((0.024 - abs(c.x)) / 0.024)
def face_shift(z):
    """Remontée verticale du bas du visage (0 au-dessus de 1.70, max au menton, nulle au cou)."""
    k = prm("face_short", 0.075)
    return k * max(0.0, 1.70 - z) * smooth((z - 1.53) / 0.06)
for v in me.vertices:
    c = v.co
    if c.y < 0.03 and 1.50 < c.z < 1.70:
        wy_ = smooth((0.03 - c.y) / 0.07)
        c.z += face_shift(c.z) * wy_
for v in me.vertices:
    c = v.co
    if c.y < -0.10 and 1.58 < c.z < 1.78:
        g_ = math.exp(-(((abs(c.x) - 0.070) / 0.022) ** 2 + ((c.z - 1.688) / 0.022) ** 2))
        c.y -= prm("cheek_push", 0.0055) * g_
        c.x += (1 if c.x > 0 else -1) * 0.0012 * g_
        gl_ = math.exp(-((c.x / 0.024) ** 2 + ((c.z - 1.648) / 0.014) ** 2))
        c.y -= prm("lip_push", 0.0035) * gl_
        gc_ = math.exp(-((c.x / 0.016) ** 2 + ((c.z - 1.612) / 0.014) ** 2))
        c.y -= 0.004 * gc_
# ouverture des paupières : agrandissement doux autour de chaque oeil
def _rim_verts(cx, cz):
    """Bord des paupières : sommets de peau adjacents à la poche oculaire (fond à y > -0.138)."""
    bm_ = bmesh.new(); bm_.from_mesh(me); bm_.verts.ensure_lookup_table()
    cav = {v.index for v in bm_.verts if math.hypot(v.co.x - cx, v.co.z - cz) < 0.0165 and -0.138 < v.co.y < -0.10}
    rim = set()
    for i in cav:
        for e_ in bm_.verts[i].link_edges:
            w_ = e_.other_vert(bm_.verts[i])
            if w_.index not in cav and math.hypot(w_.co.x - cx, w_.co.z - cz) < 0.026:
                rim.add(w_.index)
    bm_.free()
    return rim
_eye0 = {"L": Vector(LM_["l-eye"]), "R": Vector(LM_["r-eye"])}
_k_x, _k_z = prm("eye_open_x", 1.15), prm("eye_open_z", 1.55)
for k, e in _eye0.items():
    rc = Vector((e.x, e.y, e.z + prm("eye_dz", 0.002)))
    for v in me.vertices:
        if v.co.y > -0.10:
            continue
        dx, dz = v.co.x - rc.x, v.co.z - rc.z
        d = math.hypot(dx, dz)
        w = 1.0 - smooth((d - 0.013) / 0.019)
        if w <= 0:
            continue
        v.co.x = rc.x + dx * (1 + (_k_x - 1) * w)
        v.co.z = rc.z + dz * (1 + (_k_z - 1) * w)
_drop = prm("lid_drop", 0.0028)
for k, e in _eye0.items():
    ex_, ez_ = e.x, e.z + 0.002
    for v in me.vertices:
        if v.co.y > -0.10:
            continue
        dx_, dz_ = v.co.x - ex_, v.co.z - ez_
        if dz_ <= 0:
            continue
        d_ = math.hypot(dx_ / 1.35, dz_)
        w_ = (1.0 - smooth((d_ - 0.006) / 0.016)) * smooth(dz_ / 0.003)
        if w_ > 0:
            v.co.z -= _drop * w_
            v.co.y -= 0.45 * _drop * w_
me.update()
me.materials.clear()
for k in ("skin", "lips", "shadow"):
    me.materials.append(M[k])
mesh_bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
LM = json.load(open(blend.replace("_body.blend", "_landmarks.json")))
EYE_L = Vector(LM["l-eye"]); EYE_R = Vector(LM["r-eye"])

RIM = {}

def surface_y(x, z):
    h = mesh_bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return h[0].y if h[0] else None

MOUTH_Z, MOUTH_HALF_W = prm("mouth_z", 1.648) + face_shift(prm("mouth_z", 1.648)), 0.026
for p in me.polygons:
    c = p.center
    m = 0
    if False:
        if abs(c.x) < MOUTH_HALF_W * (1 - 0.4 * abs((c.z - MOUTH_Z) / 0.02)) and abs(c.z - MOUTH_Z) < 0.0115:
            m = 1
        else:
            for ex in (EYE_L.x, EYE_R.x):
                dx = (c.x - ex) / 0.024
                dz = (c.z - (EYE_L.z + 0.004)) / 0.0115
                if dx * dx + dz * dz < 1.0:
                    m = 2
    p.material_index = m

# ---------------------------------------------------------------- yeux
def add_sphere(name, loc, radius, scale=(1, 1, 1), mat=None, seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=radius, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if mat:
        o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o

def add_iris_disc(name, center, R, ir, mat):
    """Disque d'iris posé sur la sphère oculaire (avant = -y), UV planaires 0..1."""
    bm_ = bmesh.new()
    uvl_ = bm_.loops.layers.uv.new("UVMap")
    nseg, nring = 40, 8
    ang_max = math.asin(min(0.99, ir / R))
    rings = []
    cv = bm_.verts.new(center + Vector((0, -R * 1.002, 0)))
    for k in range(1, nring + 1):
        rho = k / nring
        phi = rho * ang_max
        row = []
        for s in range(nseg):
            th = 2 * math.pi * s / nseg
            p = Vector((math.sin(phi) * math.cos(th), -math.cos(phi), math.sin(phi) * math.sin(th))) * (R * 1.002)
            row.append(bm_.verts.new(center + p))
        rings.append(row)
    def uv_of(v):
        d = v.co - center
        if v is cv:
            return (0.5, 0.5)
        phi = math.acos(max(-1, min(1, -d.y / (R * 1.002))))
        rho = phi / ang_max
        th = math.atan2(d.z, d.x)
        return (0.5 + 0.5 * rho * math.cos(th), 0.5 + 0.5 * rho * math.sin(th))
    for s in range(nseg):
        f = bm_.faces.new((cv, rings[0][s], rings[0][(s + 1) % nseg]))
        for l in f.loops: l[uvl_].uv = uv_of(l.vert)
    for k in range(nring - 1):
        for s in range(nseg):
            f = bm_.faces.new((rings[k][s], rings[k + 1][s], rings[k + 1][(s + 1) % nseg], rings[k][(s + 1) % nseg]))
            for l in f.loops: l[uvl_].uv = uv_of(l.vert)
    for f in bm_.faces: f.smooth = True
    me_ = bpy.data.meshes.new(name); bm_.to_mesh(me_); bm_.free()
    ob_ = bpy.data.objects.new(name, me_); sc.collection.objects.link(ob_); me_.materials.append(mat)
    return ob_

# texture d'iris
T.save_png(T.iris_texture(512, 5), os.path.join(TEX, "iris.png"), flip=True)
T.apply_pbr(M["iris"], base=os.path.join(TEX, "iris.png"), emit=os.path.join(TEX, "iris.png"), emit_strength=0.30, alpha_clip=0.5, base_alpha=True)
M["iris"].node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.16

eyes = []
EYE_OBJ = {}
for side, e in (("L", EYE_L), ("R", EYE_R)):
    rad = prm('eye_r', 0.0135)
    cy = e.y + prm("eye_shift", -0.002)
    ez = e.z + prm("eye_dz", 0.001)
    ball = add_sphere("nyx_eye_%s" % side, (e.x, cy, ez), rad, mat=M["sclera"])
    EYE_OBJ[side] = (ball, Vector((e.x, cy, ez)), rad)
    eyes.append(ball)
    iris = add_iris_disc("nyx_iris_%s" % side, Vector((e.x, cy, ez)), rad, prm("iris_r", 0.0072), M["iris"])
    eyes += [iris]

bpy.context.view_layer.update()
_dg = bpy.context.evaluated_depsgraph_get()
def measure_aperture(side):
    ball, ctr, rad = EYE_OBJ[side]
    sbvh = BVHTree.FromObject(ball, _dg)
    ups, los = [], []
    for i in range(49):
        x = ctr.x + (i - 24) * 0.0011
        col = []
        z = ctr.z + 0.02
        while z > ctr.z - 0.02:
            hb = mesh_bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
            hs = sbvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
            if hs[0] is not None and (hb[0] is None or hs[0].y < hb[0].y - 0.0003):
                col.append(z)
            z -= 0.0004
        if len(col) < 3:
            continue
        runs, cur = [], [col[0]]
        for z_ in col[1:]:
            if cur[-1] - z_ > 0.0011:
                runs.append(cur); cur = [z_]
            else:
                cur.append(z_)
        runs.append(cur)
        run = min(runs, key=lambda r: abs((max(r) + min(r)) / 2 - ctr.z))
        ups.append(Vector((x, 0, max(run)))); los.append(Vector((x, 0, min(run))))
    if not ups:
        return dict(c=ctr, up=[Vector((ctr.x + dx, 0, ctr.z + 0.006)) for dx in (-0.012, 0, 0.012)], lo=[], xmin=ctr.x - 0.012, xmax=ctr.x + 0.012, zmax=ctr.z + 0.006, zmin=ctr.z - 0.005)
    xs = [q.x for q in ups]
    zc = (sum(q.z for q in ups) / len(ups) + sum(q.z for q in los) / len(los)) / 2
    return dict(c=Vector(((min(xs) + max(xs)) / 2, ctr.y, zc)), up=ups, lo=los, xmin=min(xs), xmax=max(xs), zmax=max(q.z for q in ups), zmin=min(q.z for q in los))

for _side in ("L", "R"):
    RIM[_side] = measure_aperture(_side)
    r_ = RIM[_side]
    print("APERTURE", _side, "x", round(r_["xmin"], 4), round(r_["xmax"], 4), "w", round(r_["xmax"] - r_["xmin"], 4), "h", round(r_["zmax"] - r_["zmin"], 4), "zc", round(r_["c"].z, 4))

# ---------------------------------------------------------------- sourcils
def add_curve(name, pts, radii, mat, bevel=0.002, cyclic=False, res=1):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = bevel
    cu.bevel_resolution = res
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, (pt, r) in enumerate(zip(pts, radii)):
        sp.points[i].co = (pt[0], pt[1], pt[2], 1)
        sp.points[i].radius = r
    sp.use_cyclic_u = cyclic
    cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu)
    sc.collection.objects.link(o)
    return o

for sgn, side in ((1, "L"), (-1, "R")):
    pts, rad = [], []
    n = 9
    for i in range(n):
        t = i / (n - 1)
        x = sgn * (0.012 + 0.052 * t)
        z = RIM['L']['zmax'] + 0.026 + 0.012 * math.sin(math.pi * (t * 0.85 + 0.05)) - 0.004 * t
        y = surface_y(x, z)
        pts.append((x, (y if y is not None else -0.15) - 0.0025, z))
        rad.append(1.0 - 0.75 * t ** 1.5 if t > 0.5 else 0.6 + 0.8 * t)
    add_curve("nyx_brow_%s" % side, pts, rad, M["brow"], 0.0028)

# ---------------------------------------------------------------- couronne
CC = Vector((0.0, -0.025, prm("crown_z", 1.80)))
ring = []
N_RING = 72
for i in range(N_RING):
    a = 2 * math.pi * i / N_RING
    d = Vector((math.sin(a), -math.cos(a), 0.0))         # a=0 -> avant (-y)
    h = mesh_bvh.ray_cast(CC + d * 0.5, -d)
    p = h[0] + d * prm("crown_off", 0.004) if h[0] else CC + d * 0.10
    p.z = CC.z + 0.006 * math.cos(a) * -1 + 0.004      # léger tilt : plus haut derrière
    ring.append(p)
def ring_line(dz, r_off):
    out = []
    for i in range(N_RING):
        a_ = 2 * math.pi * i / N_RING
        d_ = Vector((math.sin(a_), -math.cos(a_), 0.0))
        p_ = ring[i] + d_ * r_off + Vector((0, 0, dz))
        out.append((p_.x, p_.y, p_.z))
    return out
add_curve("nyx_crown_band", ring_line(0.0, 0.0), [1.0] * N_RING, M["gold"], 0.0050, cyclic=True, res=1)
add_curve("nyx_crown_band2", ring_line(0.0135, 0.0018), [1.0] * N_RING, M["gold"], 0.0030, cyclic=True, res=1)

def add_gem(name, loc, size, tilt_dir=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size * 0.55, size * 0.55, size * 1.2)
    o.data.materials.append(M["gem"])
    bpy.ops.object.shade_flat()
    return o

for i_ in range(0, N_RING, 3):
    a_ = 2 * math.pi * i_ / N_RING
    d_ = Vector((math.sin(a_), -math.cos(a_), 0.0))
    add_gem("nyx_gem_b%d" % i_, ring[i_] + d_ * 0.0045 + Vector((0, 0, 0.0068)), 0.0052)

crng = random.Random(41)
def thorn(name, base, d_out, height, lean, bend, side, curl, rad, n_side, gem_size):
    pts, rads, poses = [], [], []
    for i in range(9):
        t = i / 8
        p = base + Vector((0, 0, height * t)) + d_out * (lean * height * t + bend * height * t * t) + side * (curl * height * math.sin(math.pi * t))
        pts.append((p.x, p.y, p.z)); rads.append(1.0 - 0.95 * t ** 0.85); poses.append(p)
    add_curve(name, pts, rads, M["gold"], rad, False, 0)
    def at(t):
        f = t * 8; i = min(int(f), 7)
        return poses[i].lerp(poses[i + 1], f - i)
    for j in range(n_side):
        t0 = 0.28 + 0.22 * j + crng.uniform(-0.04, 0.04)
        p0 = at(t0)
        sg = 1 if (j % 2 == 0) else -1
        dirv = (side * sg * 0.9 + d_out * 0.5 + Vector((0, 0, 0.75))).normalized()
        Ls = height * crng.uniform(0.16, 0.28)
        sp = [p0 + dirv * Ls * (k / 4) + Vector((0, 0, 0.004 * (k / 4) ** 2)) for k in range(5)]
        add_curve(name + "_s%d" % j, [(q.x, q.y, q.z) for q in sp], [1.0 - 0.93 * (k / 4) for k in range(5)], M["gold"], rad * 0.62, False, 0)
    if gem_size > 0:
        add_gem("nyx_gem_" + name[10:], at(0.24) + d_out * 0.003, gem_size)
    return at(0.5)

NF = prm("thorns_front", 23)
mids = []
for k in range(NF):
    u_ = k / (NF - 1)
    a_ = math.radians(-118 + 236 * u_)
    h_ = 0.032 + 0.078 * math.cos(a_ * 0.8) ** 2
    h_ *= crng.uniform(0.70, 1.22) * (0.66 if k % 2 else 1.0)
    if k == NF // 2:
        h_ = 0.150
    if abs(k - NF // 2) == 1:
        h_ = max(h_, 0.105)
    d_ = Vector((math.sin(a_), -math.cos(a_), 0.0))
    sd_ = Vector((math.cos(a_), math.sin(a_), 0.0))
    idx_ = int(((a_ / (2 * math.pi)) % 1.0) * N_RING) % N_RING
    m1 = thorn("nyx_spike_%d" % k, ring[idx_].copy(), d_, h_, crng.uniform(0.16, 0.34), crng.uniform(-0.12, 0.10), sd_, crng.uniform(-0.06, 0.06),
               0.0068 * (0.75 + 0.5 * min(1.0, h_ / 0.09)), 2 if h_ > 0.06 else 1, 0.0062 if (k % 2 == 0 and h_ > 0.05) else 0.0)
    mids.append(m1)
for k in range(NF - 1):
    A_ = mids[k]; B_ = mids[k + 1]
    pts_ = []
    for i in range(7):
        t = i / 6
        q = A_.lerp(B_, t)
        q.z -= 0.010 * math.sin(math.pi * t)
        pts_.append((q.x, q.y, q.z))
    add_curve("nyx_crown_arc_%d" % k, pts_, [1.0] * 7, M["gold"], 0.0022, False, 0)
for k in range(11):
    a_ = math.radians(128 + 104 * k / 10)
    d_ = Vector((math.sin(a_), -math.cos(a_), 0.0))
    sd_ = Vector((math.cos(a_), math.sin(a_), 0.0))
    idx_ = int(((a_ / (2 * math.pi)) % 1.0) * N_RING) % N_RING
    thorn("nyx_spike_b%d" % k, ring[idx_].copy(), d_, crng.uniform(0.028, 0.060), crng.uniform(0.15, 0.3), crng.uniform(-0.1, 0.1), sd_, 0.0, 0.0062, 1, 0.0)

# ---------------------------------------------------------------- maquillage : surfaces projetées sur la peau
def project_grid(name, fn, nu, nv, mat, lift=0.0012):
    bm_ = bmesh.new()
    verts = []
    for j in range(nv):
        row = []
        for i in range(nu):
            x, z = fn(i / (nu - 1), j / (nv - 1))
            y = surface_y(x, z)
            row.append(bm_.verts.new((x, (y if y is not None else -0.15) - lift, z)))
        verts.append(row)
    for j in range(nv - 1):
        for i in range(nu - 1):
            bm_.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    m_ = bpy.data.meshes.new(name)
    bm_.to_mesh(m_); bm_.free()
    o_ = bpy.data.objects.new(name, m_)
    sc.collection.objects.link(o_)
    o_.data.materials.append(mat)
    for pl in m_.polygons:
        pl.use_smooth = True
    return o_

W = prm("lip_w", 0.026)
Z0 = MOUTH_Z
def lip_top(x):
    a = min(1.0, abs(x) / W)
    return Z0 + 0.0072 * math.cos(math.pi / 2 * a) ** 0.85 - 0.0020 * math.exp(-(x / 0.0045) ** 2) + 0.0011 * math.exp(-((abs(x) - 0.0085) / 0.004) ** 2)
def lip_bot(x):
    a = min(1.0, abs(x) / W)
    return Z0 - 0.0105 * math.cos(math.pi / 2 * a) ** 0.9
def lip_line(x):
    a = min(1.0, abs(x) / W)
    return Z0 - 0.0004 - 0.0016 * a ** 3
if GEO_MAKEUP:
    project_grid("nyx_lips", lambda u, v: ((u * 2 - 1) * W, lip_bot((u * 2 - 1) * W) + (lip_top((u * 2 - 1) * W) - lip_bot((u * 2 - 1) * W)) * v), 34, 7, M["lips"], 0.0011)
    lp = []
    for i in range(30):
        x = (i / 29 * 2 - 1) * W
        y = surface_y(x, lip_line(x))
        lp.append((x, (y if y is not None else -0.15) - 0.0024, lip_line(x)))
    add_curve("nyx_lipline", lp, [0.5 + 0.7 * math.sin(math.pi * i / 29) for i in range(30)], M["brow"], 0.0011)

def make_eye_makeup(key):
    rim = RIM[key]
    up = rim["up"]
    xin = rim["xmin"] if key == "L" else rim["xmax"]
    xout = rim["xmax"] if key == "L" else rim["xmin"]
    dirx = 1.0 if xout > xin else -1.0
    def z_up(x):
        xs = [q.x for q in up]
        if not xs:
            return rim["c"].z + 0.006
        lo, hi = min(xs), max(xs)
        if x < lo or x > hi:
            edge = min(up, key=lambda q: abs(q.x - x))
            return edge.z + 0.6 * abs(x - edge.x)
        best = sorted(up, key=lambda q: abs(q.x - x))[:2]
        if abs(best[0].x - best[1].x) < 1e-6:
            return best[0].z
        t = (x - best[0].x) / (best[1].x - best[0].x)
        return best[0].z + (best[1].z - best[0].z) * t
    def lid_edge(u):
        x = xin + (xout - xin) * u + dirx * 0.010 * smooth((u - 0.82) / 0.18)
        return x, z_up(x) + prm("liner_dz", -0.0032)
    def shade(u, v):
        x, z0 = lid_edge(u)
        top = 0.0050 + 0.0085 * math.sin(math.pi * min(1.0, u * 0.95 + 0.03)) ** 0.8
        return x, z0 + top * v
    if GEO_MAKEUP:
        project_grid("nyx_shadow_" + key, shade, 24, 5, M["shadow"], 0.0008)
    if GEO_MAKEUP:
        pts, rad = [], []
        for i in range(18):
            u = i / 17
            x, z = lid_edge(u)
            y = surface_y(x, z + 0.002)
            pts.append((x, (y if y is not None else -0.15) - 0.0022, z + 0.0004))
            rad.append(0.55 + 0.95 * math.sin(math.pi * (u * 0.85 + 0.08)) + 0.55 * smooth((u - 0.8) / 0.2))
        add_curve("nyx_liner_" + key, pts, rad, M["brow"], 0.0015)
    for k in range(9):
        u = 0.10 + 0.82 * k / 8
        x, z = lid_edge(u)
        y = surface_y(x, z + 0.002)
        yy = (y if y is not None else -0.15) - 0.0026
        dx = dirx * (0.0010 + 0.0055 * u)
        add_curve("nyx_lash_%s_%d" % (key, k), [(x, yy, z), (x + dx * 0.6, yy - 0.0012, z + 0.0038), (x + dx * 1.5, yy - 0.0018, z + 0.0068 + 0.002 * u)], [1.0, 0.7, 0.2], M["brow"], 0.0007)

make_eye_makeup("L")
make_eye_makeup("R")

# boucles d'oreilles : chaîne dorée + gouttes d'améthyste
for sgn in (1, -1):
    h = mesh_bvh.ray_cast(Vector((sgn * 1.0, -0.02, 1.675)), Vector((-sgn, 0, 0)))
    if not h[0]:
        continue
    st = h[0] + h[1] * 0.002
    add_sphere("nyx_ear_stud_%d" % sgn, st, 0.0045, mat=M["gold"], seg=12)
    xs = st.x + sgn * 0.004
    pts = [(xs, st.y, st.z), (xs + sgn * 0.004, st.y + 0.004, st.z - 0.040), (xs + sgn * 0.002, st.y + 0.002, st.z - 0.085), (xs + sgn * 0.004, st.y + 0.004, st.z - 0.135)]
    add_curve("nyx_ear_chain_%d" % sgn, pts, [1.0, 0.9, 0.9, 0.9], M["gold"], 0.0013)
    for zz, sz in ((0.046, 0.0050), (0.092, 0.0058)):
        add_gem("nyx_ear_gem_%d_%d" % (sgn, int(zz * 1000)), (xs + sgn * 0.003, st.y + 0.003, st.z - zz), sz)
    g = add_gem("nyx_ear_drop_%d" % sgn, (xs + sgn * 0.004, st.y + 0.004, st.z - 0.152), 0.0075)
    g.scale = (0.0085, 0.0085, 0.024)

# ---------------------------------------------------------------- chevelure
HEAD_C = Vector((0.0, -0.02, 1.72))

def hairline_zmin(x, y):
    ax = abs(x)
    if y < -0.06:
        return 1.795 - 0.06 * smooth((ax - 0.055) / 0.04)
    if y < 0.0:
        t = smooth((y + 0.06) / 0.06)
        return 1.735 + (1.68 - 1.735) * t
    return 1.68 + (1.60 - 1.68) * smooth(y / 0.07)

roots = []
tries = 0
while len(roots) < prm("strands", 760) and tries < 60000:
    tries += 1
    d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1) + 0.25))
    if d.length < 1e-3:
        continue
    d.normalize()
    if d.z < 0.0 and d.y > -0.4:
        pass
    h = mesh_bvh.ray_cast(HEAD_C + d * 0.5, -d)
    if not h[0]:
        continue
    p, n = h[0], h[1]
    if p.z < 1.60 or p.z > 1.86:
        continue
    if p.z < hairline_zmin(p.x, p.y):
        continue
    if p.y < -0.05 and p.z < 1.75:
        continue
    roots.append((p, n))
print("HAIR roots", len(roots), "tries", tries)

_locks = {}
def wave_params(p0):
    key = (round(p0.x / 0.032), round(p0.y / 0.032), round(p0.z / 0.05))
    if key not in _locks:
        _locks[key] = (rng.uniform(0.75, 1.35), rng.uniform(0, 2 * math.pi), rng.uniform(0.8, 1.35), rng.uniform(0.7, 1.15))
    fr, ph, am, sp = _locks[key]
    return fr * rng.uniform(0.95, 1.05), ph + rng.uniform(-0.25, 0.25), am * rng.uniform(0.9, 1.1), sp

STRANDS = []
hair_curves = bpy.data.curves.new("nyx_hair_unused", "CURVE")
hair_curves.dimensions = "3D"
hair_curves.bevel_depth = prm("strand_r", 0.0026)
hair_curves.bevel_resolution = 1
for m in HM:
    hair_curves.materials.append(m)

pool = [i for i, (_, w) in enumerate(HAIR_COLORS) for _ in range(int(w * 100))]
NPTS = prm("strand_pts", 36)
SPREAD = prm("spread", 0.36)
LEN_MIN, LEN_MAX = prm("len_min", 0.80), prm("len_max", 1.30)

def push_out(pos, margin=0.006):
    for _ in range(3):
        loc, nor, idx, dist = mesh_bvh.find_nearest(pos)
        if loc is None:
            return pos
        if (pos - loc).dot(nor) < margin:
            pos = loc + nor * margin
        else:
            break
    return pos

def loft(z):
    return 0.006 + prm("hair_loft", 0.011) * smooth((z - 1.66) / 0.14)

for (p0, n0) in roots:
    L = rng.uniform(LEN_MIN, LEN_MAX)
    sx = 1.0 if p0.x > 0 else -1.0
    if abs(p0.x) < 0.012:
        sx = rng.choice((-1.0, 1.0))
    front = p0.y < -0.03
    pos = p0 + n0 * loft(p0.z)
    fr, ph, am, lock_spread = wave_params(p0)
    spread = SPREAD * lock_spread * rng.uniform(0.85, 1.15) * (0.45 if front else 1.0)
    ds = L / (NPTS - 1)
    base_pts = [pos.copy()]
    for i in range(1, NPTS):
        s = i * ds
        loc, nor, idx, dist = mesh_bvh.find_nearest(pos)
        down = Vector((0, 0, -1.0))
        tang = down - nor * down.dot(nor)
        tang = tang.normalized() if tang.length > 1e-4 else down
        w = smooth(s / (0.22 if front else 0.11))
        dr = (tang * (1 - w) + down * w)
        if front:
            dr = Vector((sx * 0.6 * (1 - w), 0.30 * (1 - w), -0.25 * (1 - w))) + down * w
        pos = pos + dr.normalized() * ds
        pos = push_out(pos, loft(pos.z))
        base_pts.append(pos.copy())
    pts = []
    for i, bp in enumerate(base_pts):
        u = i / (NPTS - 1)
        s = u * L
        lat = sx * spread * (u ** 1.25)
        wx = am * (0.020 + 0.085 * u) * math.sin(2 * math.pi * fr * s * 2.2 + ph)
        wy = am * (0.012 + 0.045 * u) * math.sin(2 * math.pi * fr * s * 1.6 + ph * 1.7)
        q = Vector((bp.x + lat + wx, bp.y + wy + (0.02 * u if not front else 0), bp.z))
        q = push_out(q, loft(q.z)) if u < 0.98 else q
        pts.append(q)
    for _ in range(7):
        pts = [pts[0]] + [(pts[i - 1] + 2 * pts[i] + pts[i + 1]) * 0.25 for i in range(1, len(pts) - 1)] + [pts[-1]]
    STRANDS.append((pts, rng.choice(pool), p0))

def catmull(pts, n):
    out = []
    m = len(pts)
    for k in range(n):
        f = k / (n - 1) * (m - 1)
        i = min(int(f), m - 2); t = f - i
        p0_ = pts[max(i - 1, 0)]; p1_ = pts[i]; p2_ = pts[i + 1]; p3_ = pts[min(i + 2, m - 1)]
        out.append(0.5 * ((2 * p1_) + (-p0_ + p2_) * t + (2 * p0_ - 5 * p1_ + 4 * p2_ - p3_) * t * t + (-p0_ + 3 * p1_ - 3 * p2_ + p3_) * t ** 3))
    return out

# ---------------------------------------------------------------- frange (mèches en travers du front)
def scalp_top(x, y):
    h_ = mesh_bvh.ray_cast(Vector((x, y, 2.3)), Vector((0, 0, -1)))
    return (h_[0], h_[1]) if h_[0] else (None, None)

brng = random.Random(23)
def bang_family(n, ctrl, x_range, y_range, jit, cut_rng, width):
    for _ in range(n):
        x_ = brng.uniform(*x_range); y_ = brng.uniform(*y_range)
        p_, n_ = scalp_top(x_, y_)
        if p_ is None:
            continue
        root = p_ + n_ * loft(p_.z)
        cp_ = [root] + [Vector(c_) + Vector((brng.uniform(-jit, jit), brng.uniform(-jit * 0.5, jit * 0.5), brng.uniform(-jit, jit))) for c_ in ctrl]
        path = catmull(cp_, 40)
        cut = brng.uniform(*cut_rng)
        path = path[: max(8, int(len(path) * cut))]
        path = [push_out(q, max(0.008, loft(q.z))) for q in path]
        for _ in range(4):
            path = [path[0]] + [(path[i - 1] + 2 * path[i] + path[i + 1]) * 0.25 for i in range(1, len(path) - 1)] + [path[-1]]
        STRANDS.append((path, brng.choice(pool), root, width * brng.uniform(0.7, 1.2)))

bang_family(prm("bangs_l", 70), [(-0.010, -0.140, 1.818), (-0.052, -0.146, 1.748), (-0.080, -0.118, 1.672), (-0.100, -0.082, 1.585), (-0.118, -0.035, 1.43)],
            (0.010, 0.030), (-0.080, -0.020), 0.011, (0.55, 1.0), 0.55)
bang_family(prm("bangs_r", 36), [(0.050, -0.122, 1.830), (0.086, -0.100, 1.742), (0.104, -0.070, 1.640), (0.122, -0.030, 1.45)],
            (0.018, 0.034), (-0.075, -0.030), 0.010, (0.6, 1.0), 0.6)

HB = bmesh.new()
uvl = HB.loops.layers.uv.new("UVMap")
NS = prm("ribbon_pts", 22)
W0 = prm("ribbon_w", 0.017)
for st_ in STRANDS:
    pts, midx, p0 = st_[:3]
    wf_ = st_[3] if len(st_) > 3 else 1.0
    cp = catmull(pts, NS)
    uc = rng.uniform(0, 0.5); flip_ = rng.random() < 0.5
    w0 = W0 * rng.uniform(0.8, 1.3) * wf_
    L, R = [], []
    for i, q in enumerate(cp):
        u = i / (NS - 1)
        t = (cp[min(i + 1, NS - 1)] - cp[max(i - 1, 0)]).normalized()
        out = Vector((q.x, q.y + 0.02, 0.0))
        out = out.normalized() if out.length > 1e-4 else Vector((0, -1, 0))
        side = t.cross(out)
        side = side.normalized() if side.length > 1e-4 else Vector((1, 0, 0))
        w = w0 * (0.28 + 0.72 * smooth(u / 0.22)) * (1.0 - 0.50 * u ** 1.3)
        L.append(HB.verts.new(q - side * w)); R.append(HB.verts.new(q + side * w))
    for i in range(NS - 1):
        f = HB.faces.new((L[i], R[i], R[i + 1], L[i + 1]))
        f.smooth = True
        f.material_index = midx
        for lp, (uu, vv) in zip(f.loops, ((0, i / (NS - 1)), (1, i / (NS - 1)), (1, (i + 1) / (NS - 1)), (0, (i + 1) / (NS - 1)))):
            lp[uvl].uv = (uc + (1 - uu if flip_ else uu) * 0.5, vv)
hair_me = bpy.data.meshes.new("nyx_hair")
HB.to_mesh(hair_me); HB.free()
for m in HM:
    hair_me.materials.append(m)
hair = bpy.data.objects.new("nyx_hair", hair_me)
sc.collection.objects.link(hair)
print("HAIR ribbons", len(STRANDS), "tris", len(hair_me.polygons) * 2)

# ---------------------------------------------------------------- mèches folles (fines, désordonnées)
WISP_MAT = mk_mat("nyx_hair_wisp", (0.006, 0.003, 0.016), 0.0, 0.62)
for _k in ("Specular IOR Level", "Specular"):
    if _k in WISP_MAT.node_tree.nodes["Principled BSDF"].inputs:
        WISP_MAT.node_tree.nodes["Principled BSDF"].inputs[_k].default_value = 0.08
wb = bmesh.new()
wrng = random.Random(77)
for wi in range(prm("wisps", 150)):
    p0, n0 = roots[wrng.randrange(len(roots))]
    sx = 1.0 if p0.x > 0 else -1.0
    front = p0.y < -0.03
    pos = p0 + n0 * 0.007
    cross = front and wrng.random() < 0.55
    L = wrng.uniform(0.16, 0.34) if cross else wrng.uniform(0.25, 0.80)
    npt = 16
    d0 = Vector((-sx * wrng.uniform(0.7, 1.0), -0.10, -wrng.uniform(0.05, 0.35))) if cross else Vector((sx * wrng.uniform(0.3, 1.0), wrng.uniform(-0.4, 0.6), -wrng.uniform(0.1, 0.5)))
    ph = wrng.uniform(0, 6.28); ca = wrng.uniform(0.6, 2.2)
    wp = [pos.copy()]
    for i in range(1, npt):
        u = i / (npt - 1)
        wgt = smooth(u / (0.9 if cross else 0.35)) * (0.55 if cross else 1.0)
        dr = d0 * (1 - wgt) + Vector((0, 0, -1)) * wgt
        dr += Vector((math.sin(ph + u * 11) * 0.2 * ca, math.cos(ph * 1.3 + u * 9) * 0.14 * ca, 0))
        pos = pos + dr.normalized() * (L / (npt - 1))
        pos = push_out(pos, 0.006 if cross else 0.010)
        wp.append(pos.copy())
    for _ in range(3):
        wp = [wp[0]] + [(wp[i - 1] + 2 * wp[i] + wp[i + 1]) * 0.25 for i in range(1, len(wp) - 1)] + [wp[-1]]
    Lv, Rv = [], []
    for i, q in enumerate(wp):
        u = i / (npt - 1)
        t = (wp[min(i + 1, npt - 1)] - wp[max(i - 1, 0)]).normalized()
        out = Vector((q.x, q.y + 0.02, 0.0))
        out = out.normalized() if out.length > 1e-4 else Vector((0, -1, 0))
        side = t.cross(out)
        side = side.normalized() if side.length > 1e-4 else Vector((1, 0, 0))
        w = 0.0030 * (1.0 - 0.9 * u ** 1.2)
        Lv.append(wb.verts.new(q - side * w)); Rv.append(wb.verts.new(q + side * w))
    for i in range(npt - 1):
        wb.faces.new((Lv[i], Rv[i], Rv[i + 1], Lv[i + 1])).smooth = True
wisp_me = bpy.data.meshes.new("nyx_hair_wisps"); wb.to_mesh(wisp_me); wb.free()
wisp_me.materials.append(WISP_MAT)
wisps_ob = bpy.data.objects.new("nyx_hair_wisps", wisp_me)
sc.collection.objects.link(wisps_ob)
print("HAIR wisps tris", len(wisp_me.polygons) * 2)



# =====================================================================================
# PHASE 2 : costume, tissus, accessoires, rig, pose
# =====================================================================================
import os
LIB = prm("libdir", os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, LIB)
import importlib, nyx_rig, nyx_costume as C
importlib.reload(nyx_rig); importlib.reload(C)

J = {k: Vector(v) for k, v in LM_.items()}

# ---------------------------------------------------------------- textures peau (cuisson de la position -> UV)
TEXRES = prm("tex_res", 2048)
_Pm, _Mm = T.bake_position_map(body, TEXRES)
print("TEX position map", TEXRES, "texels", int(_Mm.sum()))
_ap = [(q.x, q.z) for q in RIM["L"]["up"]] if RIM.get("L") and RIM["L"].get("up") else [(0.021, 1.72), (0.033, 1.728), (0.045, 1.72)]
_ctx = dict(J=J, aperture=_ap, lip_z0=MOUTH_Z, lip_w=W, lip_top=lip_top, lip_bot=lip_bot, lip_line=lip_line)
_col, _mr, _h = T.paint_skin(_Pm, _Mm, _ctx, 3)
_col = T.dilate(_col, _Mm, 10); _mr = T.dilate(_mr, _Mm, 10); _h = T.dilate(_h, _Mm, 10)
T.save_png(_col, os.path.join(TEX, "skin_base.png"))
T.save_png(_mr, os.path.join(TEX, "skin_mr.png"))
T.save_png(T.to_height_normal(_h, prm("skin_bump", 1.2)), os.path.join(TEX, "skin_normal.png"))
T.apply_pbr(M["skin"], base=os.path.join(TEX, "skin_base.png"), mr=os.path.join(TEX, "skin_mr.png"), nrm=os.path.join(TEX, "skin_normal.png"), normal_strength=0.5)
_sb2 = M["skin"].node_tree.nodes["Principled BSDF"]
if "Subsurface Weight" in _sb2.inputs:
    _sb2.inputs["Subsurface Weight"].default_value = 0.22
    _sb2.inputs["Subsurface Radius"].default_value = (1.0, 0.30, 0.20)
    _sb2.inputs["Subsurface Scale"].default_value = 0.018
    _sb2.inputs["Subsurface Weight"].default_value = 0.22
del _col, _mr, _h
# dentelle : motif calculé en 3D (cylindrique) puis cuit en UV, résolution plus fine
_LR = prm("lace_res", 4096)
_P4, _M4 = T.bake_position_map(body, _LR)
_lace = T.lace_alpha(_P4, _M4, _LR, J)
_lace[..., :3] = T.dilate(_lace[..., :3], _M4, 6); _lace[..., 3] = T.dilate(_lace[..., 3:4], _M4, 6)[..., 0]
_lp = os.path.join(TEX, "lace.png")
_lace4 = _lace.copy(); _lace4[..., :3] = _lace4[..., :3] ** (1 / 2.2)
T.save_png(_lace4, _lp)
_cup = _lace.copy()
_a_ = _cup[..., 3:4]
import numpy as np
_dk = np.array([0.006, 0.004, 0.011], dtype=np.float32); _lt = np.array([0.060, 0.040, 0.085], dtype=np.float32)
_cup[..., :3] = (_dk + (_lt - _dk) * _a_) ** (1 / 2.2)
_cup[..., 3] = 1.0
T.save_png(_cup, os.path.join(TEX, "cup_base.png"))
del _P4, _M4, _lace, _lace4, _cup
# tissu
for _hem, _nm in ((False, "cloth"), (True, "hem")):
    _c, _m, _n = T.cloth_texture(1024, 2 if not _hem else 5, _hem)
    T.save_png(_c, os.path.join(TEX, _nm + "_base.png")); T.save_png(_m, os.path.join(TEX, _nm + "_mr.png")); T.save_png(_n, os.path.join(TEX, _nm + "_normal.png"))
T.save_png(T.swirl_texture(1024, 512, 4), os.path.join(TEX, "orb_swirl.png"))
HEEL = prm("heel", 38.0)
ZMIN = nyx_rig.apply_heels(body, J, HEEL)
json.dump({k: list(v) for k, v in J.items()}, open(outprefix + "_joints.json", "w"))
print("ZMIN toes", round(ZMIN, 4))

_bt = bmesh.new(); _bt.from_mesh(body.data); _bt.verts.ensure_lookup_table()
for _side in ("l", "r"):
    _ball = J[_side + "-foot-1"]; _sg = 1 if _side == "l" else -1
    _sel = [v for v in _bt.verts if v.co.x * _sg > 0.0 and v.co.y < _ball.y + 0.025 and v.co.z < _ball.z + 0.13]
    for _ in range(30):
        _new = {}
        for v in _sel:
            nb = [e.other_vert(v) for e in v.link_edges]
            if nb:
                _new[v.index] = v.co.lerp(sum((n.co for n in nb), Vector((0, 0, 0))) / len(nb), 0.7)
        for i, p in _new.items():
            _bt.verts[i].co = p
_bt.to_mesh(body.data); _bt.free()
bm0 = bmesh.new(); bm0.from_mesh(body.data)
bvh = BVHTree.FromBMesh(bm0)

def front_y(x, z, off=0.0):
    h = bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return (h[0].y if h[0] else -0.12) - off

# ---------------------------------------------------------------- matériaux costume
CM = dict(
    lace=C.mk_mat("nyx_lace_black", (0.012, 0.010, 0.018), 0.0, 0.35),
    net=C.mk_mat("nyx_net_black", (0.010, 0.008, 0.016), 0.0, 0.4, alpha=0.62),
    glove=C.mk_mat("nyx_glove", (0.010, 0.008, 0.016), 0.0, 0.22),
    shoe=C.mk_mat("nyx_shoe", (0.008, 0.006, 0.012), 0.0, 0.18),
    cloth=C.mk_mat("nyx_cloth_black", (0.007, 0.004, 0.014), 0.0, 0.62),
    hem=C.mk_mat("nyx_cloth_violet", (0.20, 0.06, 0.38), 0.0, 0.5, emit=(0.14, 0.04, 0.26), emit_strength=0.45),
    raven=C.mk_mat("nyx_raven", (0.012, 0.008, 0.022), 0.15, 0.22),
    beak=C.mk_mat("nyx_beak", (0.07, 0.06, 0.09), 0.0, 0.25),
    orb=C.mk_mat("nyx_orb_core", (0.006, 0.002, 0.014), 0.0, 0.08),
    orbglow=C.mk_mat("nyx_orb_glow", (0.55, 0.20, 0.95), 0.0, 0.2, emit=(0.62, 0.22, 1.0), emit_strength=11.0),
    orbhalo=C.mk_mat("nyx_orb_halo", (0.40, 0.14, 0.75), 0.0, 0.2, emit=(0.4, 0.12, 0.8), emit_strength=0.5, alpha=0.03),
)
GOLD, GEM = M["gold"], M["gem"]
CM["raven_eye"] = C.mk_mat("nyx_raven_eye", (0.6, 0.2, 1.0), 0.0, 0.1, emit=(0.7, 0.25, 1.0), emit_strength=8.0)
T.apply_pbr(CM["net"], base=_lp, base_alpha=True, alpha_clip=0.3)
CM["net"].node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.5
T.apply_pbr(CM["cloth"], base=os.path.join(TEX, "cloth_base.png"), mr=os.path.join(TEX, "cloth_mr.png"), nrm=os.path.join(TEX, "cloth_normal.png"), normal_strength=0.9)
T.apply_pbr(CM["hem"], base=os.path.join(TEX, "hem_base.png"), mr=os.path.join(TEX, "hem_mr.png"), nrm=os.path.join(TEX, "hem_normal.png"), normal_strength=0.9, emit=os.path.join(TEX, "hem_base.png"), emit_strength=0.12)
T.apply_pbr(CM["orb"], emit=os.path.join(TEX, "orb_swirl.png"), emit_strength=0.9)
CM["scalp"] = C.mk_mat("nyx_scalp", (0.004, 0.002, 0.008), 0.0, 0.6)
CM["cup"] = C.mk_mat("nyx_cup_lace", (0.02, 0.015, 0.03), 0.0, 0.40)
T.apply_pbr(CM["cup"], base=os.path.join(TEX, "cup_base.png"))
body.data.materials.clear(); body.data.materials.append(M["skin"])

gi = lambda names: C.gindex(body, names)
SIDES = ("l", "r")
G_TORSO = gi(["spine_01", "spine_02", "spine_03", "pelvis", "breast_l", "breast_r", "neck_01"])
G_ARM = gi(["clavicle_l", "clavicle_r", "upperarm_l", "upperarm_r"])
G_FORE = gi([n for s in SIDES for n in ["lowerarm_" + s, "hand_" + s] + [f"{f}_0{i}_{s}" for f in ("index", "middle", "ring", "pinky", "thumb") for i in (1, 2, 3)]])
G_FOOT = gi(["foot_l", "foot_r", "ball_l", "ball_r"])
G_LEG = gi(["thigh_l", "thigh_r", "calf_l", "calf_r"])
G_NECK = gi(["neck_01"])
G_SCALP = gi(["scalp"])
cen = lambda f: f.calc_center_median()
wsum = lambda f, dl, g: sum(C.group_weight(v, dl, g) for v in f.verts) / len(f.verts)
z_low = lambda x: 0.88 + 0.15 * smooth(abs(x) / 0.19)

def pred_bra(f, dl):
    c = cen(f)
    return c.y < -0.05 and abs(c.x) > 0.004 and math.hypot((abs(c.x) - 0.105) / 0.100, (c.z - 1.31) / 0.090) < 1.0
def pred_brief(f, dl):
    c = cen(f)
    return z_low(c.x) < c.z < 1.035 and abs(c.x) < 0.25 and wsum(f, dl, G_ARM + G_FORE) < 0.2
def pred_stock(f, dl):
    c = cen(f)
    return c.z < 0.86 + 0.14 * smooth(abs(c.x) / 0.19) and wsum(f, dl, G_LEG) > 0.55 and wsum(f, dl, G_FOOT) < 0.5
def pred_torso(f, dl):
    c = cen(f)
    return 1.03 < c.z < 1.535 and wsum(f, dl, G_TORSO) > 0.5 and wsum(f, dl, G_ARM + G_FORE) < 0.25
def pred_glove(f, dl):
    return wsum(f, dl, G_FORE) > 0.55
def pred_shoe(f, dl):
    return wsum(f, dl, G_FOOT) > 0.5
def pred_collar(f, dl):
    c = cen(f)
    return 1.54 < c.z < 1.615 and wsum(f, dl, G_NECK) > 0.6

parts = {}
parts["bra"] = C.shell(body, "nyx_bra", pred_bra, 0.0065, CM["cup"], sc)
parts["brief"] = C.shell(body, "nyx_brief", pred_brief, 0.0045, CM["cup"], sc)
parts["stock"] = C.shell(body, "nyx_stockings", pred_stock, 0.0028, CM["net"], sc)
parts["glove"] = C.shell(body, "nyx_gloves", pred_glove, 0.0034, CM["glove"], sc)
parts["shoe"] = C.shell(body, "nyx_shoes", pred_shoe, 0.0090, CM["shoe"], sc)
parts["collar"] = C.shell(body, "nyx_collar", pred_collar, 0.0042, CM["lace"], sc)
parts["scalp"] = C.shell(body, "nyx_scalp", lambda f, dl: wsum(f, dl, G_SCALP) > 0.4 and (cen(f).z > 1.795 or (cen(f).z > 1.72 and cen(f).y > -0.02)), 0.0060, CM["scalp"], sc)
for k in ("bra", "brief", "stock", "collar"):
    C.relax_boundary(parts[k], 10, 0.5)

# bouts de chaussure : enveloppe convexe lisse de la zone des orteils
bmt = bmesh.new()
for side in SIDES:
    ball = J[side + "-foot-1"]; sg = 1 if side == "l" else -1
    pts = [v.co.copy() for v in parts["shoe"].data.vertices if v.co.x * sg > 0.0 and v.co.y < ball.y + 0.022]
    tmp = bmesh.new()
    vv = [tmp.verts.new(p + Vector((0, 0, 0))) for p in pts]
    hull = bmesh.ops.convex_hull(tmp, input=vv)
    keep_f = set(hull["geom"]) if "geom" in hull else set()
    dead = [g for g in hull.get("geom_interior", [])] + [g for g in hull.get("geom_unused", [])]
    dead_v = list({g for g in dead if isinstance(g, bmesh.types.BMVert)})
    if dead_v:
        bmesh.ops.delete(tmp, geom=dead_v, context="VERTS")
    tmp.verts.ensure_lookup_table()
    for _ in range(2):
        newp = {}
        for v in tmp.verts:
            nb = [e.other_vert(v) for e in v.link_edges]
            if nb:
                newp[v.index] = v.co.lerp(sum((n.co for n in nb), Vector((0, 0, 0))) / len(nb), 0.35)
        for i, p in newp.items():
            tmp.verts[i].co = p
    mp = {}
    for v in tmp.verts:
        mp[v.index] = bmt.verts.new(v.co)
    for f in tmp.faces:
        bmt.faces.new([mp[v.index] for v in f.verts]).smooth = True
    tmp.free()
me_t = bpy.data.meshes.new("nyx_toecaps"); bmt.to_mesh(me_t); bmt.free()
toecap = bpy.data.objects.new("nyx_toecaps", me_t); sc.collection.objects.link(toecap); me_t.materials.append(CM["shoe"])
bmesh_recalc = bmesh.new(); bmesh_recalc.from_mesh(me_t); bmesh.ops.recalc_face_normals(bmesh_recalc, faces=bmesh_recalc.faces); bmesh_recalc.to_mesh(me_t); bmesh_recalc.free()

# filets d'or sur les bords
trim_lines = []
for k in ("bra", "brief", "stock", "glove", "shoe", "collar"):
    for loop in C.boundary_loops(parts[k]):
        trim_lines.append(C.smooth_polyline(loop, 3))
trim = C.add_curve_obj(sc, "nyx_trim", trim_lines, GOLD, 0.0021, cyclic=False)

# treillis d'or
def hw(z): return 0.215 if z < 1.08 else (0.16 if z < 1.25 else 0.235)
def acc_torso(p, n): return 1.06 < p.z < 1.52 and abs(p.x) <= hw(p.z) and abs(n.x) < 0.95
leg = []
for side in SIDES:
    a = J[side + "-upper-leg"]; b = J[side + "-ankle"]
    def axis(z, a=a, b=b):
        t = (z - a.z) / (b.z - a.z)
        return Vector((a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, z))
    def acc_leg(p, n, axis=axis):
        c = axis(p.z)
        return 0.13 < p.z < 0.99 and math.hypot(p.x - c.x, p.y - c.y) < 0.14
    leg += C.lattice_lines(bvh, axis, 0.14, 0.98, 12, 4.2, prm("leg_steps", 36), acc_leg, 0.0040)
lat = C.add_curve_obj(sc, "nyx_lattice", leg, GOLD, 0.0014, cyclic=False)

import numpy as np
def off_torso(p):
    in_cup = p.y < -0.05 and math.hypot((abs(p.x) - 0.105) / 0.100, (p.z - 1.31) / 0.090) < 1.08
    return 0.0105 if in_cup else 0.0048
fil_lines, fil_nodes = C.voronoi_tube(bvh, Vector((0, -0.02, 1.07)), Vector((0, -0.02, 1.53)), 0.13, prm("fil_spacing", 0.040),
                                      -1.95, 1.95, acc_torso, off_torso, seed=5, subdiv=2)
arm_lines, arm_nodes = [], []
for side in SIDES:
    a_ = J[side + "-shoulder"]; b_ = J[side + "-hand"]
    al_, an_ = C.voronoi_tube(bvh, a_, b_, 0.042, 0.034, -math.pi, math.pi, lambda p, n: True, lambda p: 0.0062,
                              seed=11 if side == "l" else 13, subdiv=2, max_axis_dist=0.075)
    arm_lines += al_; arm_nodes += an_
C.add_curve_obj(sc, "nyx_filigree", fil_lines + arm_lines, GOLD, 0.0019)
print("FILIGREE torso", len(fil_lines), "arms", len(arm_lines), "nodes", len(fil_nodes) + len(arm_nodes))

grng = random.Random(31)
gbm = bmesh.new()
drop_chains = []
for (p_, n_) in fil_nodes:
    r_ = grng.random()
    if r_ < 0.34:
        C.add_octa(gbm, p_ + n_ * 0.002, 0.0050 + 0.0022 * grng.random(), up=Vector((0, 0, 1)))
    elif r_ < 0.52 and p_.y < -0.03:
        Ld = grng.uniform(0.014, 0.034)
        end = p_ + Vector((0, 0, -Ld))
        loc_, nor_, idx_, dist_ = bvh.find_nearest(end)
        if loc_ is not None and (end - loc_).dot(nor_) > 0.004:
            drop_chains.append([p_ + Vector((0, 0, -Ld * k / 4)) for k in range(5)])
            C.add_octa(gbm, end + Vector((0, 0, -0.008)), 0.0048, up=Vector((0, 0, 1)), stretch=2.1)
for (p_, n_) in arm_nodes:
    if grng.random() < 0.22:
        C.add_octa(gbm, p_ + n_ * 0.002, 0.0042, up=n_)
# gemmes aux croisements du treillis des jambes (hélices analytiques)
twist, nl, z0_, z1_ = 4.2, 12, 0.14, 0.98
for side in SIDES:
    a = J[side + "-upper-leg"]; b = J[side + "-ankle"]
    def axis(z, a=a, b=b):
        t_ = (z - a.z) / (b.z - a.z)
        return Vector((a.x + (b.x - a.x) * t_, a.y + (b.y - a.y) * t_, z))
    for i in range(nl):
        for j in range(nl):
            for k in range(-2, 4):
                tt = (2 * math.pi * (j - i) / nl + 2 * math.pi * k) / (2 * twist)
                if not (0.0 <= tt <= 1.0) or grng.random() > 0.42:
                    continue
                th = 2 * math.pi * i / nl + twist * tt
                z = z0_ + (z1_ - z0_) * tt
                d = Vector((math.sin(th), -math.cos(th), 0.0))
                h = bvh.ray_cast(axis(z) + d * 0.6, -d, 0.8)
                if h[0] is None:
                    continue
                c_ = axis(h[0].z)
                if not (0.13 < h[0].z < 0.99 and math.hypot(h[0].x - c_.x, h[0].y - c_.y) < 0.14):
                    continue
                C.add_octa(gbm, h[0] + h[1] * 0.0058, 0.0038, up=Vector((0, 0, 1)))
fgem_me = bpy.data.meshes.new("nyx_fgems"); gbm.to_mesh(fgem_me); gbm.free()
fgem_obj = bpy.data.objects.new("nyx_fgems", fgem_me); sc.collection.objects.link(fgem_obj); fgem_me.materials.append(GEM)
if drop_chains:
    C.add_curve_obj(sc, "nyx_dropchains", drop_chains, GOLD, 0.0010)
crng2 = random.Random(57)
hang = []
cand = [q for q in fil_nodes if q[0].y < -0.02 and 0.96 < q[0].z < 1.30]
cand.sort(key=lambda q: q[0].z)
used_ = set()
def catenary(a, b, sag, n=14):
    pts = []
    for i in range(n + 1):
        t = i / n
        p = a.lerp(b, t) + Vector((0, 0, -sag * 4 * t * (1 - t)))
        for _ in range(2):
            loc_, nor_, idx_, dist_ = bvh.find_nearest(p)
            if loc_ is not None and (p - loc_).dot(nor_) < 0.007:
                p = loc_ + nor_ * 0.007
        pts.append(p)
    return pts
for i, (pa, na) in enumerate(cand):
    if len(hang) >= prm("hang_chains", 46) or i in used_:
        continue
    best = None
    for j, (pb, nb) in enumerate(cand):
        if j == i or j in used_:
            continue
        d = (pb - pa)
        if 0.045 < d.length < 0.11 and abs(d.z) < 0.03:
            best = j
            break
    if best is None:
        continue
    used_.add(i); used_.add(best)
    pb = cand[best][0]
    sag = crng2.uniform(0.018, 0.050)
    pts = catenary(pa, pb, sag)
    hang.append(pts)
    low = min(pts, key=lambda q: q.z)
    gb2 = bmesh.new()
    C.add_octa(gb2, low + Vector((0, 0, -0.009)), 0.0050, up=Vector((0, 0, 1)), stretch=2.0)
    for extra in range(crng2.randint(0, 2)):
        q = pts[crng2.randint(3, len(pts) - 4)]
        C.add_octa(gb2, q + Vector((0, 0, -0.007)), 0.0036, up=Vector((0, 0, 1)), stretch=1.8)
    gb2.to_mesh(fgem_me) if False else None
    tmp_me = bpy.data.meshes.new("tmp_hg"); gb2.to_mesh(tmp_me); gb2.free()
    bm_all = bmesh.new(); bm_all.from_mesh(fgem_me); bm_all.from_mesh(tmp_me); bm_all.to_mesh(fgem_me); bm_all.free()
    bpy.data.meshes.remove(tmp_me)
# chaînes verticales tombant des hanches sur les cuisses
for k in range(prm("thigh_chains", 14)):
    side = 1 if k % 2 == 0 else -1
    a_ = math.radians(crng2.uniform(-40, 40))
    d_ = Vector((math.sin(a_) * side, -math.cos(a_), 0))
    h_ = bvh.ray_cast(Vector((side * 0.13, -0.02, 0.97)) + d_ * 0.5, -d_, 0.8)
    if h_[0] is None:
        continue
    top = h_[0] + h_[1] * 0.009
    L_ = crng2.uniform(0.06, 0.16)
    pts = [top + Vector((0, 0, -L_ * t / 10)) for t in range(11)]
    pts2 = []
    for p in pts:
        loc_, nor_, idx_, dist_ = bvh.find_nearest(p)
        if loc_ is not None and (p - loc_).dot(nor_) < 0.007:
            p = loc_ + nor_ * 0.007
        pts2.append(p)
    hang.append(pts2)
    gb3 = bmesh.new(); C.add_octa(gb3, pts2[-1] + Vector((0, 0, -0.010)), 0.0055, up=Vector((0, 0, 1)), stretch=2.2)
    tmp_me = bpy.data.meshes.new("tmp_hg"); gb3.to_mesh(tmp_me); gb3.free()
    bm_all = bmesh.new(); bm_all.from_mesh(fgem_me); bm_all.from_mesh(tmp_me); bm_all.to_mesh(fgem_me); bm_all.free()
    bpy.data.meshes.remove(tmp_me)
if hang:
    C.add_curve_obj(sc, "nyx_hangchains", hang, GOLD, 0.0012)
print("HANGING chains", len(hang))
print("GEMS", len(fgem_me.polygons) // 8, "drops", len(drop_chains))

# griffes dorées
bmc = bmesh.new()
for side in SIDES:
    for fi in (1, 2, 3, 4, 5):
        p3 = J["%s-finger-%d-3" % (side, fi)]; p4 = J["%s-finger-%d-4" % (side, fi)]
        d = (p4 - p3).normalized()
        b = p4; t = p4 + d * 0.042 + Vector((0, 0, -0.004))
        ax = (t - b).normalized()
        u = ax.cross(Vector((0, 0, 1))); u = u.normalized() if u.length > 1e-3 else Vector((1, 0, 0))
        w = ax.cross(u).normalized()
        ring = [bmc.verts.new(b + u * 0.0042 * math.cos(a) + w * 0.0042 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]
        tv = bmc.verts.new(t)
        for i in range(6):
            bmc.faces.new((ring[i], ring[(i + 1) % 6], tv))
me_c = bpy.data.meshes.new("nyx_claws"); bmc.to_mesh(me_c); bmc.free()
claw = bpy.data.objects.new("nyx_claws", me_c); sc.collection.objects.link(claw); me_c.materials.append(GOLD)

# talons aiguilles verticaux
bmh = bmesh.new()
for side in SIDES:
    ank = J[side + "-ankle"]
    rear = [v.co for v in parts["shoe"].data.vertices if v.co.y > ank.y - 0.01 and abs(v.co.x - ank.x) < 0.05 and v.co.z < ank.z]
    hb = min(rear, key=lambda c: c.z)
    top = Vector((ank.x, hb.y + 0.008, hb.z + 0.003)); L = hb.z + 0.003 - ZMIN
    a = [bmh.verts.new(top + Vector((0.0125 * math.cos(t), 0.0125 * math.sin(t), 0.0))) for t in [i * math.pi / 4 for i in range(8)]]
    b = [bmh.verts.new(top + Vector((0.0042 * math.cos(t), 0.0042 * math.sin(t), -L))) for t in [i * math.pi / 4 for i in range(8)]]
    for i in range(8):
        f = bmh.faces.new((a[i], a[(i + 1) % 8], b[(i + 1) % 8], b[i])); f.smooth = True
me_h = bpy.data.meshes.new("nyx_heels"); bmh.to_mesh(me_h); bmh.free()
heel = bpy.data.objects.new("nyx_heels", me_h); sc.collection.objects.link(heel); me_h.materials.append(CM["shoe"])

# ---------------------------------------------------------------- choker, chaînes, gemmes
def polyline_proj(pts, off):
    return [Vector((p.x, front_y(p.x, p.z, off), p.z)) for p in pts]

chains = []
# choker
ring = []
for i in range(40):
    a = 2 * math.pi * i / 40
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    h = bvh.ray_cast(Vector((0, -0.006, 1.578)) + d * 0.3, -d)
    ring.append((h[0] + h[1] * 0.006) if h[0] else Vector((0, 0, 1.578)) + d * 0.05)
chains.append(ring + [ring[0]])
# sangle centrale
strap = [Vector((0, front_y(0, z, 0.011), z)) for z in [1.565 - 0.0044 * i for i in range(0, 121)]]
chains.append(strap[:110])
# arcs de poitrine et de taille
def arc(a, b, sag, off, n=18):
    pts = []
    for i in range(n + 1):
        t = i / n
        p = a.lerp(b, t)
        p.z -= sag * math.sin(math.pi * t)
        pts.append(Vector((p.x, front_y(p.x, p.z, off), p.z)))
    return pts
for s in (1, -1):
    chains.append(arc(Vector((0, 0, 1.36)), Vector((s * 0.20, 0, 1.40)), 0.05, 0.010))
    chains.append(arc(Vector((0, 0, 1.36)), Vector((s * 0.17, 0, 1.22)), 0.02, 0.012))
    chains.append(arc(Vector((s * 0.04, 0, 1.06)), Vector((s * 0.21, 0, 0.99)), 0.04, 0.014))
    chains.append(arc(Vector((s * 0.02, 0, 1.03)), Vector((s * 0.15, 0, 0.90)), 0.06, 0.014))
    chains.append(arc(Vector((s * 0.18, 0, 1.47)), Vector((s * 0.06, 0, 1.53)), 0.02, 0.010))
# ceinture
belt = []
for i in range(48):
    a = 2 * math.pi * i / 48
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    h = bvh.ray_cast(Vector((0, -0.02, 1.075)) + d * 0.5, -d)
    belt.append((h[0] + h[1] * 0.010) if h[0] else Vector((0, 0, 1.075)))
chains.append(belt + [belt[0]])
chain_obj = C.add_curve_obj(sc, "nyx_chains", chains, GOLD, 0.0018, cyclic=False)

# collier à épines
thorn_lines = []
for i in range(15):
    a = math.radians(-105 + 210 * i / 14)
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    h = bvh.ray_cast(Vector((0, -0.006, 1.578)) + d * 0.3, -d)
    if not h[0]:
        continue
    base = h[0] + h[1] * 0.006
    hh = (0.030 + 0.030 * math.cos(a * 0.9) ** 2) * (0.7 + 0.6 * ((i * 37) % 7) / 6)
    thorn_lines.append([base + d * (0.010 * tt + 0.012 * tt * tt) + Vector((0, 0, hh * tt)) for tt in [k / 5 for k in range(6)]])
C.add_curve_obj(sc, "nyx_collar_thorns", thorn_lines, GOLD, 0.0048, taper=lambda t: 1.0 - 0.94 * t)
ring2 = []
for i in range(40):
    a = 2 * math.pi * i / 40
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    h = bvh.ray_cast(Vector((0, -0.006, 1.552)) + d * 0.3, -d)
    ring2.append((h[0] + h[1] * 0.006) if h[0] else Vector((0, 0, 1.552)) + d * 0.05)
C.add_curve_obj(sc, "nyx_collar_ring2", [ring2 + [ring2[0]]], GOLD, 0.0028)
# pendentifs de ceinture
pend, pend_gems = [], []
for j in range(17):
    a = math.radians(-96 + 192 * j / 16)
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    Lp = 0.05 + 0.05 * ((j * 5) % 4) / 3
    poly = []
    for k in range(6):
        z = 1.075 - Lp * k / 5
        h = bvh.ray_cast(Vector((0, -0.02, z)) + d * 0.5, -d)
        poly.append((h[0] + h[1] * 0.012) if h[0] else Vector((0, 0, z)))
    pend.append(poly)
    pend_gems.append(C.add_gem_mesh(sc, "nyx_pgem_%d" % j, poly[-1] + Vector((0, 0, -0.006)), 0.0075, GEM))
C.add_curve_obj(sc, "nyx_belt_pendants", pend, GOLD, 0.0014)
# manchettes dorées
cuffs = []
for side in SIDES:
    el = J[side + "-elbow"]; ha = J[side + "-hand"]
    axv = (ha - el).normalized()
    uu = axv.cross(Vector((0, 0, 1))).normalized(); ww = axv.cross(uu).normalized()
    for tt in (0.70, 0.78):
        c0 = el + (ha - el) * tt
        rg = []
        for i in range(24):
            a = 2 * math.pi * i / 24
            dd = uu * math.cos(a) + ww * math.sin(a)
            h = bvh.ray_cast(c0 + dd * 0.12, -dd)
            rg.append((h[0] + h[1] * 0.006) if h[0] else c0 + dd * 0.04)
        cuffs.append(rg + [rg[0]])
C.add_curve_obj(sc, "nyx_cuffs", cuffs, GOLD, 0.0034)
# épines d'épaule
sh_lines = []
for side in SIDES:
    sg = 1 if side == "l" else -1
    cl = J[side + "-clavicle"]; shj = J[side + "-shoulder"]
    for k in range(6):
        p = cl.lerp(shj, 0.30 + 0.13 * k)
        h = bvh.ray_cast(Vector((p.x, p.y, 1.80)), Vector((0, 0, -1)))
        if not h[0]:
            continue
        base = h[0] + h[1] * 0.005
        hh = 0.032 + 0.030 * ((k * 3) % 4) / 3
        out = Vector((sg * 0.55, -0.05, 0.25)).normalized()
        sh_lines.append([base + out * (0.010 * tt + 0.022 * tt * tt) + Vector((0, 0, hh * tt)) for tt in [i / 5 for i in range(6)]])
C.add_curve_obj(sc, "nyx_shoulder_thorns", sh_lines, GOLD, 0.0046, taper=lambda t: 1.0 - 0.94 * t)

gems = []
for i, (z, sz) in enumerate([(1.500, 0.0105), (1.400, 0.0085), (1.310, 0.0125), (1.230, 0.0095), (1.140, 0.0110), (1.060, 0.0100)]):
    gems.append(C.add_gem_mesh(sc, "nyx_bgem_%d" % i, Vector((0, front_y(0, z, 0.016), z)), sz, GEM))
for s in (1, -1):
    for i, (x, z, sz) in enumerate([(0.105, 1.36, 0.008), (0.22, 0.99, 0.009), (0.16, 0.93, 0.008), (0.20, 1.40, 0.007)]):
        gems.append(C.add_gem_mesh(sc, "nyx_sgem_%d_%d" % (s, i), Vector((s * x, front_y(s * x, z, 0.014), z)), sz, GEM))
gems.append(C.add_gem_mesh(sc, "nyx_choker_gem", Vector((0, front_y(0, 1.545, 0.014), 1.545)), 0.0115, GEM, 0.6, 1.5))
for k in range(5):
    a = math.radians(-70 + 35 * k)
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    pos = Vector((0, -0.006, 1.578)) + d * 0.058
    gems.append(C.add_gem_mesh(sc, "nyx_drop_%d" % k, pos + Vector((0, -0.004, -0.02)), 0.006, GEM))

# ---------------------------------------------------------------- cape, jupe
def cape_pos(layer):
    def f(u, v, t):
        vv = v * (1 - t * smooth((v - 0.72) / 0.28))
        xt = (u * 2 - 1) * 0.205
        flare = 0.08 + (2.2 + 0.55 * layer) * vv ** 1.35
        x = xt * (1 + flare)
        z = 1.535 - vv * (1.52 - 0.02 * layer)
        y = 0.088 + 0.09 * vv + (0.30 + 0.07 * layer) * vv ** 2.2 + 0.05 * layer * (0.4 + vv)
        fold = 0.055 * math.sin((u * 2 - 1) * 11.0 + 1.3 + layer) * vv + 0.022 * math.sin((u * 2 - 1) * 23.0 + layer * 2) * vv + 0.012 * math.sin(vv * 11 + u * 5)
        return Vector((x, y + fold, z))
    return f

def skirt_pos(seed, spread):
    def f(u, v, t):
        vv = v * (1 - t * smooth((v - 0.70) / 0.30))
        a_s = math.radians(74 - 22 * vv)
        a = a_s + (2 * math.pi - 2 * a_s) * u
        rx = 0.250 + (0.66 + spread) * vv ** 1.25
        ry = 0.158 + (0.48 + spread * 0.7) * vv ** 1.25
        w = 0.022 * math.sin(a * 7 + seed) * vv + 0.012 * math.sin(a * 13 + vv * 6)
        x = (rx + w) * math.sin(a)
        y = -(ry + w) * math.cos(a) - 0.01
        z = 1.045 - vv * 1.02 - 0.05 * (1 - abs(math.sin(a)))
        return Vector((x, y, z))
    return f

cloth_objs = []
cloth_objs.append(C.tattered(sc, "nyx_cape_a", cape_pos(0), 72, 42, 22, 0.42, 3, CM["cloth"], CM["hem"], 0.74, 1.06, 0.20, 0.30))
cloth_objs.append(C.tattered(sc, "nyx_cape_b", cape_pos(1), 64, 40, 18, 0.38, 8, CM["cloth"], CM["hem"], 0.66, 1.00, 0.26, 0.38))
cloth_objs.append(C.tattered(sc, "nyx_skirt_a", skirt_pos(1.0, 0.0), 96, 42, 30, 0.30, 5, CM["cloth"], CM["hem"], 0.72, 1.04, 0.20, 0.30))
cloth_objs.append(C.tattered(sc, "nyx_skirt_b", skirt_pos(4.0, 0.10), 84, 40, 26, 0.26, 11, CM["cloth"], CM["hem"], 0.62, 0.98, 0.28, 0.40))

# ---------------------------------------------------------------- weights cloth & hair
def w_cloth(ob, kind):
    for g in ("spine_03", "spine_02", "pelvis", "thigh_l", "thigh_r"):
        if ob.vertex_groups.get(g) is None:
            ob.vertex_groups.new(name=g)
    for v in ob.data.vertices:
        z = v.co.z
        sp3 = smooth((z - 1.05) / 0.40)
        if kind == "skirt":
            th = smooth((0.95 - z) / 0.55) * 0.55
            side = "thigh_l" if v.co.x > 0 else "thigh_r"
            ob.vertex_groups[side].add([v.index], th * (1 - sp3), "REPLACE")
            ob.vertex_groups["pelvis"].add([v.index], (1 - th) * (1 - sp3), "REPLACE")
            if sp3 > 0:
                ob.vertex_groups["spine_02"].add([v.index], sp3, "REPLACE")
        else:
            ob.vertex_groups["spine_03"].add([v.index], sp3, "REPLACE")
            ob.vertex_groups["pelvis"].add([v.index], 1 - sp3, "REPLACE")

def w_hair(ob):
    for g in ("head", "spine_03", "spine_02", "pelvis"):
        if ob.vertex_groups.get(g) is None:
            ob.vertex_groups.new(name=g)
    for v in ob.data.vertices:
        z = v.co.z
        h = smooth((z - 1.50) / 0.16)
        rest = 1 - h
        sp3 = rest * smooth((z - 1.10) / 0.28)
        sp2 = rest * (1 - smooth((z - 1.10) / 0.28)) * smooth((z - 0.95) / 0.22)
        pel = rest - sp3 - sp2
        for name, w in (("head", h), ("spine_03", sp3), ("spine_02", sp2), ("pelvis", pel)):
            if w > 0.002:
                ob.vertex_groups[name].add([v.index], w, "REPLACE")

# ---------------------------------------------------------------- conversion des courbes -> meshes
for ob in list(sc.objects):
    if ob.type == "CURVE" and ob.name.startswith("nyx_"):
        C.curve_to_mesh(ob, sc)

# ---------------------------------------------------------------- rig
rig = nyx_rig.build_armature(outprefix + "_joints.json", os.path.join(LIB, "rig_map.json"))
rig.location.z = -ZMIN

skinned_by_transfer = list(parts.values()) + [claw, heel, toecap]
skinned_by_transfer += [o for o in sc.objects if o.type == "MESH" and o.name in ("nyx_trim_m", "nyx_lattice_m", "nyx_chains_m", "nyx_collar_thorns_m", "nyx_collar_ring2_m", "nyx_belt_pendants_m", "nyx_cuffs_m", "nyx_shoulder_thorns_m", "nyx_filigree_m", "nyx_dropchains_m", "nyx_hangchains_m")]
skinned_by_transfer += gems + pend_gems + [fgem_obj]
for o in skinned_by_transfer:
    C.transfer_weights(body, o)
for o in cloth_objs:
    w_cloth(o, "skirt" if "skirt" in o.name else "cape")
w_hair(hair)
w_hair(wisps_ob)
HEAD_RIGID = ("nyx_eye_", "nyx_iris_", "nyx_pupil_", "nyx_brow_", "nyx_liner_", "nyx_lash_", "nyx_shadow_", "nyx_lips", "nyx_lipline",
              "nyx_crown", "nyx_spike", "nyx_gem_", "nyx_ear_")
for ob in list(sc.objects):
    if ob.type == "MESH" and ob.name.startswith(HEAD_RIGID):
        C.weight_all(ob, "head")

# ---------------------------------------------------------------- liaison au rig
def is_deformed(o):
    return o.type == "MESH" and o.name.startswith(("nyx_", "Mira_"))
DEF = [o for o in sc.objects if is_deformed(o)]
for o in DEF:
    nyx_rig.bind(o, rig)
bpy.context.view_layer.update()

# ---------------------------------------------------------------- pose héroïque
nyx_rig.hero_pose(rig, J, DEF, keep_root=True)
bpy.context.view_layer.update()

def rest_from_posed(bone, pw):
    pb = rig.pose.bones[bone]
    delta = pb.matrix @ pb.bone.matrix_local.inverted()
    return delta.inverted() @ (rig.matrix_world.inverted() @ pw)

def posed_head(bone):
    return rig.matrix_world @ rig.pose.bones[bone].head

def build_posed(name, fn_build, bone, mats):
    """fn_build(bm) construit la géométrie en coordonnées monde POSÉES ; conversion en repos + poids 100 % os."""
    bm = bmesh.new()
    fn_build(bm)
    for v in bm.verts:
        v.co = rest_from_posed(bone, v.co)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    g = ob.vertex_groups.new(name=bone)
    g.add([v.index for v in me.vertices], 1.0, "REPLACE")
    nyx_rig.bind(ob, rig)
    return ob

def sphere_bm(bm, loc, r, scale=(1, 1, 1), rot=None, seg=20, mat_idx=0):
    from mathutils import Matrix
    m = Matrix.Translation(loc)
    if rot is not None:
        m = m @ rot.to_matrix().to_4x4()
    m = m @ Matrix.Diagonal((*scale, 1.0))
    ret = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r, matrix=m, calc_uvs=True)
    for v in ret["verts"]:
        for f in v.link_faces:
            f.material_index = mat_idx
    return ret["verts"]

# --- corbeau sur l'épaule (côté +x, tourné vers l'orbe)
from mathutils import Euler, Matrix
sh = posed_head("upperarm_l")
raven_c = sh + Vector((-0.005, -0.012, 0.062))
yaw = math.radians(-24)
Rz = Euler((0, 0, yaw)).to_quaternion()
def rv(local):
    return raven_c + Rz @ Vector(local)
def raven_build(bm):
    S_ = 0.95
    def Q(p=0.0, y=0.0):
        return Rz @ Euler((math.radians(p), 0.0, math.radians(y))).to_quaternion()
    sphere_bm(bm, rv((0, 0.012 * S_, 0)), 1.0, (0.050 * S_, 0.108 * S_, 0.054 * S_), Q(-26), 24, 0)
    sphere_bm(bm, rv((0, -0.048 * S_, 0.014 * S_)), 1.0, (0.044 * S_, 0.055 * S_, 0.048 * S_), Q(-10), 20, 0)
    sphere_bm(bm, rv((0, -0.092 * S_, 0.046 * S_)), 1.0, (0.019 * S_, 0.030 * S_, 0.025 * S_), Q(-34), 16, 0)
    sphere_bm(bm, rv((0, -0.120 * S_, 0.070 * S_)), 1.0, (0.023 * S_, 0.034 * S_, 0.023 * S_), Q(-8), 20, 0)
    for sx in (1, -1):
        for i in range(8):
            c = rv((sx * (0.046 - 0.0018 * i) * S_, (0.016 + 0.020 * i) * S_, (0.020 - 0.0055 * i) * S_))
            sphere_bm(bm, c, 1.0, (0.0095 * S_, (0.078 + 0.004 * i) * S_, 0.0034 * S_), Q(-14 - i, -sx * (3 + 1.6 * i)), 10, 0)
        for i in range(6):
            c = rv((sx * 0.050 * S_, (-0.014 + 0.017 * i) * S_, (0.034 - 0.003 * i) * S_))
            sphere_bm(bm, c, 1.0, (0.0115 * S_, 0.046 * S_, 0.0040 * S_), Q(-14, -sx * 4), 10, 0)
    for i in range(7):
        th = (i - 3) * 5.0
        c = rv((math.sin(math.radians(th)) * 0.075 * S_, (0.120 + 0.078 * math.cos(math.radians(th))) * S_, -0.030 * S_ - 0.0015 * i))
        sphere_bm(bm, c, 1.0, (0.0105 * S_, 0.088 * S_, 0.0034 * S_), Q(-9, -th), 10, 0)
    for (zc, r1, dep, pit) in ((0.070, 0.013, 0.088, 84), (0.058, 0.009, 0.072, 88)):
        ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=r1 * S_, radius2=0.0014, depth=dep * S_,
                                    matrix=Matrix.Translation(rv((0, -0.170 * S_, zc * S_))) @ (Rz @ Euler((math.radians(pit), 0, 0)).to_quaternion()).to_matrix().to_4x4())
        for v in ret["verts"]:
            for f in v.link_faces:
                f.material_index = 1
    for sx in (1, -1):
        sphere_bm(bm, rv((sx * 0.017 * S_, -0.134 * S_, 0.078 * S_)), 0.0052, (1, 1, 1), None, 10, 2)
raven = build_posed("nyx_raven", raven_build, "spine_03", [CM["raven"], CM["beak"], CM["raven_eye"]])

# --- orbe du néant au creux de la main levée
_cl = bpy.data.objects["nyx_claws"]
_ev = _cl.evaluated_get(bpy.context.evaluated_depsgraph_get())
_tm = _ev.to_mesh()
tips = [(_cl.matrix_world @ v.co) for v in _tm.vertices if (_cl.matrix_world @ v.co).x < 0]
_ev.to_mesh_clear()
Fc = sum(tips, Vector((0, 0, 0))) / max(1, len(tips))
Hh = posed_head("hand_r")
orb_c = Hh + (Fc - Hh) * 0.95 + Vector((-0.01, -0.02, 0.055))
print("ORB center", tuple(round(c, 3) for c in orb_c))
def orb_build(bm):
    sphere_bm(bm, orb_c, 0.072, (1, 1, 1), None, 28, 0)
    # croissant lumineux : anneau partiel
    for k in range(72):
        a = math.radians(-40 + 250 * k / 71)
        p = orb_c + Vector((0.0, -0.078 * math.cos(a) * 0.35 - 0.02, 0.078 * math.sin(a))) + Vector((0.078 * math.cos(a) * 0.94, 0, 0))
        sphere_bm(bm, p, 0.0105 * math.sin(math.pi * (k + 2) / 76) ** 0.5 + 0.003, (1, 1, 1), None, 8, 1)
    orng = random.Random(9)
    for k in range(24):
        a_ = orng.uniform(0, 6.28); b_ = orng.uniform(-1.2, 1.2); R_ = orng.uniform(0.100, 0.165)
        p = orb_c + Vector((R_ * math.cos(b_) * math.cos(a_), -0.02 + R_ * 0.45 * math.sin(b_), R_ * math.cos(b_) * math.sin(a_) + R_ * 0.25 * math.sin(b_)))
        rot = Euler((orng.uniform(0, 3.14), orng.uniform(0, 3.14), orng.uniform(0, 3.14))).to_quaternion()
        sphere_bm(bm, p, orng.uniform(0.006, 0.013), (orng.uniform(0.3, 0.6), orng.uniform(0.5, 1.0), orng.uniform(1.6, 3.2)), rot, 8, 1 if k % 4 == 0 else 0)
    for k in range(36):
        a_ = orng.uniform(0, 6.28); b_ = orng.uniform(-1.3, 1.3); R_ = orng.uniform(0.09, 0.20)
        p = orb_c + Vector((R_ * math.cos(b_) * math.cos(a_), -0.02 + R_ * 0.5 * math.sin(b_), R_ * math.cos(b_) * math.sin(a_)))
        sphere_bm(bm, p, 0.0022, (1, 1, 1), None, 6, 1)
    sphere_bm(bm, orb_c, 0.108, (1, 1, 1), None, 20, 2)
orb = build_posed("nyx_orb", orb_build, "hand_r", [CM["orb"], CM["orbglow"], CM["orbhalo"]])

# --- manche drapée de l'avant-bras levé
E = posed_head("lowerarm_r"); Wp = posed_head("hand_r")
def sleeve_pos(u, v, t):
    base = E.lerp(Wp, u * 0.92)
    L = max(0.25, base.z - (0.98 - 0.10 * u))
    vv = v * (1 - t * smooth((v - 0.70) / 0.30))
    sway = 0.02 * math.sin(u * 9 + v * 6)
    x = base.x - (0.26 * vv ** 0.85) * (1 - 0.35 * u) + sway
    y = base.y + 0.06 * vv + 0.03 * math.sin(u * 7 + vv * 4)
    z = base.z - vv * L
    return Vector((x, y, z))
def sleeve_build(bm):
    cl = C.cloth(sc, "tmp_sleeve", sleeve_pos, 24, 20, CM["cloth"], CM["hem"], 0.10, 0.16, 21)
    bm.from_mesh(cl.data)
    bpy.data.objects.remove(cl, do_unlink=True)
sleeve = build_posed("nyx_sleeve_r", sleeve_build, "lowerarm_r", [CM["cloth"], CM["hem"]])
bpy.context.view_layer.update()

# ---------------------------------------------------------------- cheveux en mèches fines (rendu uniquement)
if prm("strand_hair", False):
    import numpy as np
    dg_ = bpy.context.evaluated_depsgraph_get()
    hmat = bpy.data.materials.new("nyx_hair_strands")
    hmat.use_nodes = True
    hnt = hmat.node_tree
    for n_ in list(hnt.nodes):
        hnt.nodes.remove(n_)
    hb_ = hnt.nodes.new("ShaderNodeBsdfHairPrincipled")
    try:
        hb_.parametrization = "COLOR"
    except Exception:
        pass
    hb_.inputs["Color"].default_value = prm("hair_rgb", (0.060, 0.022, 0.120, 1.0))
    hb_.inputs["Roughness"].default_value = 0.32
    hb_.inputs["Radial Roughness"].default_value = 0.35
    if "Coat" in hb_.inputs:
        hb_.inputs["Coat"].default_value = 0.08
    if "Random Color" in hb_.inputs:
        hb_.inputs["Random Color"].default_value = 0.25
    if "Random Roughness" in hb_.inputs:
        hb_.inputs["Random Roughness"].default_value = 0.2
    ho_ = hnt.nodes.new("ShaderNodeOutputMaterial")
    hnt.links.new(hb_.outputs[0], ho_.inputs["Surface"])
    srng = random.Random(5)

    def ribbons_from(ob, npts):
        eo = ob.evaluated_get(dg_)
        m_ = eo.to_mesh()
        co_ = np.zeros(len(m_.vertices) * 3, dtype=np.float32)
        m_.vertices.foreach_get("co", co_)
        eo.to_mesh_clear()
        co_ = co_.reshape(-1, 3)
        mw = np.array(ob.matrix_world)
        co_ = co_ @ mw[:3, :3].T + mw[:3, 3]
        per = 2 * npts
        out = []
        for b in range(len(co_) // per):
            blk = co_[b * per:(b + 1) * per]
            Lp, Rp = blk[0::2], blk[1::2]
            out.append((0.5 * (Lp + Rp), Rp - Lp))
        return out

    def add_strands(ribbons, children, radius_root, spread, depth_ratio):
        allp, sizes, rads = [], [], []
        NPS = 20
        for mid, side in ribbons:
            n = len(mid)
            t_ = np.linspace(0, 1, n)
            tang = np.gradient(mid, axis=0)
            tang /= np.maximum(np.linalg.norm(tang, axis=1, keepdims=True), 1e-6)
            sdir = side / np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-6)
            ndir = np.cross(tang, sdir)
            ndir /= np.maximum(np.linalg.norm(ndir, axis=1, keepdims=True), 1e-6)
            width = np.linalg.norm(side, axis=1) * 0.5
            for c in range(children):
                a_ = srng.uniform(-1, 1)
                b_ = srng.uniform(-1, 1) * depth_ratio
                cut = srng.uniform(0.72, 1.0)
                ph = srng.uniform(0, 6.28); fq = srng.uniform(6, 16); fz = srng.uniform(0.0006, 0.0022)
                ts = np.linspace(0, cut, NPS)
                idx = np.clip(ts * (n - 1), 0, n - 1)
                i0 = np.floor(idx).astype(int); i1 = np.minimum(i0 + 1, n - 1); f = (idx - i0)[:, None]
                lerp_ = lambda arr: arr[i0] * (1 - f) + arr[i1] * f
                M_, S_, N_ = lerp_(mid), lerp_(sdir), lerp_(ndir)
                Wd = lerp_(width[:, None])
                clump = (0.35 + 0.65 * np.sin(np.pi * np.clip(ts / 0.85, 0, 1)) ** 0.6)[:, None]
                off = (S_ * a_ + N_ * b_) * Wd * spread * clump
                frizz = (S_ * np.sin(ts * fq + ph)[:, None] + N_ * np.cos(ts * fq * 0.7 + ph)[:, None]) * fz * ts[:, None]
                P_ = M_ + off + frizz
                allp.append(P_)
                sizes.append(NPS)
                rads.append(np.linspace(radius_root, radius_root * 0.25, NPS))
        if not allp:
            return None
        P_all = np.concatenate(allp).astype(np.float32)
        R_all = np.concatenate(rads).astype(np.float32)
        cu = bpy.data.hair_curves.new("nyx_hair_strands")
        cu.add_curves(sizes)
        cu.attributes["position"].data.foreach_set("vector", P_all.ravel())
        ra = cu.attributes.get("radius") or cu.attributes.new("radius", "FLOAT", "POINT")
        ra.data.foreach_set("value", R_all)
        cu.materials.append(hmat)
        ob = bpy.data.objects.new("nyx_hair_strands", cu)
        sc.collection.objects.link(ob)
        return ob, len(sizes)

    rb_main = ribbons_from(hair, NS)
    rb_wisp = ribbons_from(wisps_ob, 16)
    r1 = add_strands(rb_main, prm("hair_children", 30), 0.00030, 1.15, 0.45)
    r2 = add_strands(rb_wisp, 4, 0.00022, 1.0, 0.3)
    print("STRANDS", r1[1] if r1 else 0, r2[1] if r2 else 0)
    hair.hide_render = True
    wisps_ob.hide_render = True
    if "Hair" in [n for n in dir(sc.render)]:
        pass
    try:
        sc.cycles_curves.shape = "THICK"
        sc.cycles_curves.subdivisions = 2
    except Exception as e_:
        print("CURVES", e_)

# ---------------------------------------------------------------- rendu
ENGINE = prm("engine", "BLENDER_WORKBENCH")
sc.render.engine = ENGINE
if ENGINE == "CYCLES":
    try:
        sc.view_settings.view_transform = "AgX"
        try:
            sc.view_settings.look = "AgX - Punchy"
        except Exception:
            sc.view_settings.look = "None"
    except Exception as _e:
        print("VIEW", _e)
    sc.cycles.device = "CPU"; sc.cycles.samples = prm("samples", 64); sc.cycles.use_denoising = False; sc.cycles.max_bounces = 6
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.display.shading.show_cavity = True
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.16, 0.16, 0.17)
if ENGINE == "CYCLES":
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.11, 0.05, 0.17, 1); bg.inputs["Strength"].default_value = 1.0
    def area(name, loc, energy, color, size):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.color = color; ld.size = size
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, -0.02, 1.0)) - Vector(loc)).normalized().to_track_quat("-Z", "Y").to_euler()
    area("key", (-2.8, -2.0, 3.2), 470, (1.0, 0.90, 0.80), 1.8)
    area("fill", (3.0, -2.6, 1.6), 45, (0.78, 0.74, 1.0), 2.5)
    area("rim", (1.8, 2.8, 2.6), 380, (0.70, 0.42, 1.0), 1.8)
    area("rim2", (-2.2, 2.6, 2.4), 260, (0.62, 0.40, 1.0), 1.8)
    area("glowfloor", (0.0, 0.8, -0.4), 160, (0.65, 0.30, 1.0), 2.4)
    if prm("glare", True):
        sc.use_nodes = True
        _ct = sc.node_tree
        for _n in list(_ct.nodes):
            _ct.nodes.remove(_n)
        _rl = _ct.nodes.new("CompositorNodeRLayers")
        _gl = _ct.nodes.new("CompositorNodeGlare")
        _gl.glare_type = "FOG_GLOW"; _gl.quality = "HIGH"; _gl.threshold = 1.3; _gl.size = 8; _gl.mix = -0.25
        _co = _ct.nodes.new("CompositorNodeComposite")
        _ct.links.new(_rl.outputs["Image"], _gl.inputs["Image"])
        _ct.links.new(_gl.outputs["Image"], _co.inputs["Image"])
cam = bpy.data.cameras.new("cam"); cam.type = "ORTHO"
co_ = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co_); sc.camera = co_

def shot(name, center, scale, yaw_deg, res=(840, 1320)):
    sc.render.resolution_x, sc.render.resolution_y = res
    cam.ortho_scale = scale
    y = math.radians(yaw_deg)
    d = Vector((math.sin(y), -math.cos(y), 0))
    co_.location = center + d * 8
    co_.rotation_euler = (center - co_.location).normalized().to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = "%s_%s.png" % (outprefix, name)
    bpy.ops.render.render(write_still=True)

SHOTS = prm("shots", ["full_front", "full_back", "full_34", "head_front"])
FC = Vector((0, -0.05, 1.02 + 0.0))
if "full_front" in SHOTS: shot("full_front", FC, 2.25, 0)
if "full_back" in SHOTS: shot("full_back", FC, 2.25, 180)
if "full_34" in SHOTS: shot("full_34", FC, 2.25, 35)
if "full_side" in SHOTS: shot("full_side", FC, 2.25, 90)
HC = Vector((0, -0.05, 1.86 + 0.0))
if "head_front" in SHOTS: shot("head_front", HC, 0.55, 0, (840, 960))
if "head_34" in SHOTS: shot("head_34", HC, 0.55, 35, (840, 960))
bpy.ops.wm.save_as_mainfile(filepath=outprefix + "_full.blend")
