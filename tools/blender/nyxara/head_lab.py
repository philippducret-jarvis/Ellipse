"""Nyxara — étape 3 : tête (visage, yeux, sourcils), couronne, chevelure.

usage: blender -b -P head_lab.py -- <body.blend> <out_prefix> [params.json]
"""
import bpy, sys, math, json, random, mathutils, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index("--") + 1:]
blend, outprefix = args[0], args[1]
P = json.load(open(args[2])) if len(args) > 2 else {}
def prm(k, d):
    return P.get(k, d)

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
    ((0.006, 0.003, 0.012), 0.34),
    ((0.024, 0.010, 0.048), 0.32),
    ((0.075, 0.026, 0.150), 0.24),
    ((0.190, 0.070, 0.360), 0.10),
]
HM = [mk_mat("nyx_hair_%d" % i, c, 0.0, 0.35) for i, (c, _) in enumerate(HAIR_COLORS)]

# ---------------------------------------------------------------- corps : matériaux visage
for v in me.vertices:
    c = v.co
    if c.y < -0.02 and 1.57 < c.z < 1.78:
        jaw = smooth((c.z - 1.585) / 0.03) * (1 - smooth((c.z - 1.665) / 0.05))
        c.x *= 1 - prm("jaw_slim", 0.13) * jaw
        if abs(c.x) < 0.024 and 1.665 < c.z < 1.765 and c.y < -0.125:
            c.x *= 1 - prm("nose_slim", 0.14) * smooth((0.024 - abs(c.x)) / 0.024)
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

MOUTH_Z, MOUTH_HALF_W = prm("mouth_z", 1.648), 0.026
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

eyes = []
EYE_OBJ = {}
for side, e in (("L", EYE_L), ("R", EYE_R)):
    rad = prm('eye_r', 0.0135)
    cy = e.y + prm("eye_shift", -0.002)
    ez = e.z + prm("eye_dz", 0.001)
    ball = add_sphere("nyx_eye_%s" % side, (e.x, cy, ez), rad, mat=M["sclera"])
    EYE_OBJ[side] = (ball, Vector((e.x, cy, ez)), rad)
    eyes.append(ball)
    iris = add_sphere("nyx_iris_%s" % side, (e.x, cy - rad * 0.965, ez), rad * 0.60, (1, 0.16, 1), M["iris"], 20)
    pup = add_sphere("nyx_pupil_%s" % side, (e.x, cy - rad * 0.985, ez), rad * 0.27, (1, 0.12, 1), M["pupil"], 16)
    eyes += [iris, pup]

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
    p = h[0] + d * 0.004 if h[0] else CC + d * 0.10
    p.z = CC.z + 0.006 * math.cos(a) * -1 + 0.004      # léger tilt : plus haut derrière
    ring.append(p)
add_curve("nyx_crown_band", [(p.x, p.y, p.z) for p in ring], [1.0] * N_RING, M["gold"], 0.0058, cyclic=True, res=2)

def add_cone(name, base, height, r0, tilt_dir, tilt=0.0, mat=None):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r0, radius2=0.0003, depth=height, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    # pivot à la base
    for v in o.data.vertices:
        v.co.z += height / 2
    axis = tilt_dir.cross(Vector((0, 0, 1)))
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = mathutils.Quaternion(axis if axis.length > 1e-6 else Vector((1, 0, 0)), -tilt)
    o.location = base
    bpy.ops.object.shade_flat()
    return o

def add_gem(name, loc, size, tilt_dir=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size * 0.55, size * 0.55, size * 1.2)
    o.data.materials.append(M["gem"])
    bpy.ops.object.shade_flat()
    return o

SPIKES = prm("spikes", 15)
for k in range(SPIKES):
    a = math.radians(-100 + 200 * k / (SPIKES - 1))       # arc frontal ±100°
    prof = math.cos(a * 0.9) ** 2
    h = 0.028 + 0.058 * prof
    if k % 2:
        h *= 0.62
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    idx = int(((a / (2 * math.pi)) % 1.0) * N_RING)
    base = ring[idx].copy()
    add_cone("nyx_spike_%d" % k, base, h, 0.0085, d, math.radians(10 + 6 * (1 - prof)), M["gold"])
    add_gem("nyx_gem_%d" % k, base + Vector((0, 0, 0.011)) + d * 0.004, 0.0085)
# arcs filigranes entre pointes frontales
tips = []
for k in range(SPIKES):
    a = math.radians(-100 + 200 * k / (SPIKES - 1))
    prof = math.cos(a * 0.9) ** 2
    h = (0.028 + 0.058 * prof) * (0.62 if k % 2 else 1.0)
    idx = int(((a / (2 * math.pi)) % 1.0) * N_RING)
    tips.append((ring[idx].copy(), h))
for k in range(SPIKES - 1):
    (b0, h0), (b1, h1) = tips[k], tips[k + 1]
    A = b0 + Vector((0, 0, h0 * 0.55)); B = b1 + Vector((0, 0, h1 * 0.55))
    pts = []
    for i in range(7):
        t = i / 6
        q = A.lerp(B, t)
        q.z -= 0.016 * math.sin(math.pi * t)
        pts.append((q.x, q.y, q.z))
    add_curve("nyx_crown_arc_%d" % k, pts, [1.0] * 7, M["gold"], 0.0026)
# quelques petites pointes arrière
for k in range(6):
    a = math.radians(115 + 130 * k / 5)
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    idx = int(((a / (2 * math.pi)) % 1.0) * N_RING)
    add_cone("nyx_spike_b%d" % k, ring[idx].copy(), 0.028 + 0.016 * (k % 2), 0.0055, d, math.radians(12), M["gold"])


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
    project_grid("nyx_shadow_" + key, shade, 24, 5, M["shadow"], 0.0008)
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
    pts = [(xs, st.y, st.z), (xs + sgn * 0.004, st.y + 0.004, st.z - 0.030), (xs + sgn * 0.002, st.y + 0.002, st.z - 0.062), (xs + sgn * 0.004, st.y + 0.004, st.z - 0.095)]
    add_curve("nyx_ear_chain_%d" % sgn, pts, [1.0, 0.9, 0.9, 0.9], M["gold"], 0.0013)
    for zz, sz in ((0.035, 0.0038), (0.068, 0.0045)):
        add_gem("nyx_ear_gem_%d_%d" % (sgn, int(zz * 1000)), (xs + sgn * 0.003, st.y + 0.003, st.z - zz), sz)
    g = add_gem("nyx_ear_drop_%d" % sgn, (xs + sgn * 0.004, st.y + 0.004, st.z - 0.112), 0.0075)
    g.scale = (0.0060, 0.0060, 0.017)

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
while len(roots) < prm("strands", 1800) and tries < 60000:
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

hair_curves = bpy.data.curves.new("nyx_hair", "CURVE")
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

for (p0, n0) in roots:
    L = rng.uniform(LEN_MIN, LEN_MAX)
    sx = 1.0 if p0.x > 0 else -1.0
    if abs(p0.x) < 0.012:
        sx = rng.choice((-1.0, 1.0))
    front = p0.y < -0.03
    pos = p0 + n0 * 0.005
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
        pos = push_out(pos, 0.006)
        base_pts.append(pos.copy())
    pts = []
    for i, bp in enumerate(base_pts):
        u = i / (NPTS - 1)
        s = u * L
        lat = sx * spread * (u ** 1.25)
        wx = am * (0.020 + 0.085 * u) * math.sin(2 * math.pi * fr * s * 2.2 + ph)
        wy = am * (0.012 + 0.045 * u) * math.sin(2 * math.pi * fr * s * 1.6 + ph * 1.7)
        q = Vector((bp.x + lat + wx, bp.y + wy + (0.02 * u if not front else 0), bp.z))
        q = push_out(q, 0.006) if u < 0.98 else q
        pts.append(q)
    sp = hair_curves.splines.new("NURBS")
    sp.order_u = 4
    sp.use_endpoint_u = True
    sp.resolution_u = 2
    sp.points.add(len(pts) - 1)
    for i, q in enumerate(pts):
        u = i / (len(pts) - 1)
        sp.points[i].co = (q.x, q.y, q.z, 1)
        sp.points[i].radius = 1.0 - 0.85 * u ** 1.4
    sp.material_index = rng.choice(pool)
hair = bpy.data.objects.new("nyx_hair", hair_curves)
sc.collection.objects.link(hair)

# ---------------------------------------------------------------- rendu
ENGINE = prm("engine", "BLENDER_WORKBENCH")
sc.render.engine = ENGINE
if ENGINE == "CYCLES":
    sc.cycles.device = "CPU"
    sc.cycles.samples = prm("samples", 48)
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 6
    sc.render.film_transparent = False
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.display.shading.show_cavity = True
sc.display.shading.cavity_ridge_factor = 0.5
sc.display.shading.cavity_valley_factor = 0.8
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.16, 0.16, 0.17)
if ENGINE == "CYCLES":
    sc.world.use_nodes = True
    bgn = sc.world.node_tree.nodes["Background"]
    bgn.inputs["Color"].default_value = (0.05, 0.035, 0.07, 1)
    bgn.inputs["Strength"].default_value = 1.0
    def area(name, loc, energy, color, size=1.2):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.color = color; ld.size = size
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        d_ = (Vector((0, -0.02, 1.4)) - Vector(loc)).normalized()
        lo.rotation_euler = d_.to_track_quat("-Z", "Y").to_euler()
    area("key", (-1.6, -2.4, 2.4), 260, (1.0, 0.92, 0.85), 1.6)
    area("fill", (2.2, -2.0, 1.4), 90, (0.75, 0.8, 1.0), 2.0)
    area("rim", (1.2, 2.2, 2.2), 260, (0.65, 0.3, 1.0), 1.4)
    area("rim2", (-1.6, 2.0, 2.0), 160, (0.5, 0.4, 1.0), 1.4)

cam = bpy.data.cameras.new("cam"); cam.type = "ORTHO"
co_ = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co_); sc.camera = co_

def shot(name, center, scale, yaw_deg, res=(600, 700), pitch_deg=0):
    sc.render.resolution_x, sc.render.resolution_y = res
    cam.ortho_scale = scale
    yaw = math.radians(yaw_deg); pitch = math.radians(pitch_deg)
    dirv = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    co_.location = center + dirv * 8
    look = (center - co_.location).normalized()
    co_.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = "%s_%s.png" % (outprefix, name)
    bpy.ops.render.render(write_still=True)

HC = Vector((0.0, -0.02, 1.76))
SHOTS = prm("shots", ["head_front", "head_34", "head_side", "eyes", "full_front", "full_back"])
if "head_front" in SHOTS: shot("head_front", HC, 0.46, 0)
if "head_34" in SHOTS: shot("head_34", HC, 0.46, 38)
if "head_side" in SHOTS: shot("head_side", HC, 0.46, 90)
if "eyes" in SHOTS: shot("eyes", Vector((0.0, -0.02, 1.72)), 0.17, 0, (900, 500))
FC = Vector((0, 0, 0.95))
if "full_front" in SHOTS: shot("full_front", FC, 2.05, 0, (600, 1100))
if "full_back" in SHOTS: shot("full_back", FC, 2.05, 180, (600, 1100))
bpy.ops.wm.save_as_mainfile(filepath=outprefix + "_head.blend")
