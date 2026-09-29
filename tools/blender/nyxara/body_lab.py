"""Corps Nyxara : base MPFB + réglage des macros + proportions par sections.

usage: blender -b -P body_lab.py -- <diagnostic.blend> <params.json> <out_prefix>
"""
import bpy, sys, math, json, mathutils, bmesh

blend, params_path, outprefix = sys.argv[sys.argv.index("--") + 1:][:3]
P = json.load(open(params_path))

bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
o = bpy.data.objects["Mira_MPFB_Basemesh"]
me = o.data
for m in list(o.modifiers):
    o.modifiers.remove(m)
o.parent = None

# --- 1. macros : valeurs choisies pour les cibles MakeHuman ---------------
kbs = me.shape_keys.key_blocks
for kb in kbs:
    if kb.name == "Basis":
        continue
    kb.value = 0.0
for name, v in P["keys"].items():
    matches = [kb for kb in kbs if kb.name == name]
    assert matches, "cle inconnue " + name
    matches[0].value = v
o.shape_key_add(name="__mix", from_mix=True)
mix = me.shape_keys.key_blocks["__mix"]
coords = [v.co.copy() for v in mix.data]
o.shape_key_clear()
for v, c in zip(me.vertices, coords):
    v.co = c

# --- 2. isoler le corps ------------------------------------------------------
gid = {g.index: g.name for g in o.vertex_groups}

# positions d'articulations (centroïde des cubes d'aide MakeHuman)
def joint_pos(name):
    idx = o.vertex_groups[name].index
    pts = [v.co.copy() for v in me.vertices if any(g.group == idx and g.weight > 0.5 for g in v.groups)]
    assert pts, name
    s = mathutils.Vector((0, 0, 0))
    for p in pts:
        s += p
    return s / len(pts)

JOINTS = {}
for side in ("l", "r"):
    for j in ("shoulder", "elbow", "hand", "upper-leg", "knee", "ankle"):
        JOINTS[(side, j)] = joint_pos("joint-%s-%s" % (side, j))
LANDMARKS = {}
for j in ("head", "head-2", "neck", "jaw", "mouth", "l-eye", "r-eye", "l-eye-target", "r-eye-target", "l-upperlid", "l-lowerlid", "r-upperlid", "r-lowerlid", "spine-4"):
    LANDMARKS[j] = joint_pos("joint-" + j)
print("JOINTS", {("%s-%s" % k): tuple(round(c, 3) for c in v) for k, v in JOINTS.items()})
keep_v = set()
for v in me.vertices:
    if any(gid[g.group] == "body" and g.weight > 0.01 for g in v.groups):
        keep_v.add(v.index)
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in keep_v for v in f.verts)], context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")

lm_verts = {k: bm.verts.new(p) for k, p in LANDMARKS.items()}
# --- 3. proportions par sections (hauteur z) ---------------------------------
def interp(table, z):
    """table: [(z, value)] triés, interpolation lissée."""
    if z <= table[0][0]:
        return table[0][1]
    if z >= table[-1][0]:
        return table[-1][1]
    for (z0, v0), (z1, v1) in zip(table, table[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            t = t * t * (3 - 2 * t)
            return v0 + (v1 - v0) * t

def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)

def limb_pass(segs):
    """segs: liste de dicts a,b,fa,fb,reach,fade_in,fade_out,side. Chaque vertex n'est traité que par le segment le plus proche."""
    for v in bm.verts:
        best = None
        for sg in segs:
            if (v.co.x * sg["side"]) < 0:
                continue
            ab = sg["b"] - sg["a"]
            t = max(0.0, min(1.0, (v.co - sg["a"]).dot(ab) / ab.dot(ab)))
            cp = sg["a"] + ab * t
            d = (v.co - cp).length
            if d <= sg["reach"] and (best is None or d < best[0]):
                best = (d, sg, t, cp)
        if best is None:
            continue
        d, sg, t, cp = best
        s_ = sg["fa"] + (sg["fb"] - sg["fa"]) * t
        if sg["fade_in"] > 0 and t < sg["fade_in"]:
            s_ = 1.0 + (s_ - 1.0) * smooth(t / sg["fade_in"])
        if sg["fade_out"] > 0 and t > 1.0 - sg["fade_out"]:
            s_ = 1.0 + (s_ - 1.0) * smooth((1.0 - t) / sg["fade_out"])
        fall = 1.0 - smooth((d - 0.6 * sg["reach"]) / (0.4 * sg["reach"]))
        v.co = cp + (v.co - cp) * (1.0 + (s_ - 1.0) * fall)

segs = []
for side in ("l", "r"):
    sgn = 1.0 if JOINTS[(side, "shoulder")].x > 0 else -1.0
    sh, el, ha = JOINTS[(side, "shoulder")], JOINTS[(side, "elbow")], JOINTS[(side, "hand")]
    ul, kn, an = JOINTS[(side, "upper-leg")], JOINTS[(side, "knee")], JOINTS[(side, "ankle")]
    segs += [
        dict(a=sh, b=el, fa=P["upper_arm"][0], fb=P["upper_arm"][1], reach=0.13, fade_in=0.4, fade_out=0.0, side=sgn),
        dict(a=el, b=ha, fa=P["forearm"][0], fb=P["forearm"][1], reach=0.13, fade_in=0.0, fade_out=0.3, side=sgn),
        dict(a=ul, b=kn, fa=P["thigh"][0], fb=P["thigh"][1], reach=0.20, fade_in=0.45, fade_out=0.0, side=sgn),
        dict(a=kn, b=an, fa=P["calf"][0], fb=P["calf"][1], reach=0.16, fade_in=0.0, fade_out=0.3, side=sgn),
    ]
limb_pass(segs)

H0 = max(v.co.z for v in bm.verts)
# normalisation de hauteur relative
for v in bm.verts:
    z = v.co.z / H0
    sx = interp(P["scale_x"], z)     # largeur
    sy = interp(P["scale_y"], z)     # profondeur
    # sections centrales : on garde l'axe du corps mais on ne touche pas aux bras (|x| grand)
    arm = max(0.0, min(1.0, (abs(v.co.x) - P["torso_half_width"]) / 0.12))
    fx = 1.0 + (sx - 1.0) * (1.0 - arm)
    fy = 1.0 + (sy - 1.0) * (1.0 - arm)
    v.co.x *= fx
    v.co.y *= fy
# remap vertical : jambes plus longues, pente lissée (pas d'arête au bassin)
A_Z = P["leg_split_z"] - 0.09
B_Z = P["leg_split_z"] + 0.09
K = P["leg_stretch"]
H_TARGET = P["height"]
def slope(z):
    if z <= A_Z:
        return K
    if z >= B_Z:
        return 1.0
    t = (z - A_Z) / (B_Z - A_Z)
    t = t * t * (3 - 2 * t)
    return K + (1.0 - K) * t
N = 600
tab = [0.0]
for i in range(1, N + 1):
    z = i / N * 1.05
    tab.append(tab[-1] + slope(z) * 1.05 / N)
def remap(z):
    x = max(0.0, min(z / 1.05 * N, N - 1e-6))
    i = int(x); f = x - i
    return tab[i] * (1 - f) + tab[i + 1] * f
for v in bm.verts:
    v.co.z = remap(v.co.z / H0) * H0
H1 = max(v.co.z for v in bm.verts)
f = H_TARGET / H1
for v in bm.verts:
    v.co *= f
lm_out = {k: [round(c, 5) for c in v.co] for k, v in lm_verts.items()}
json.dump(lm_out, open(outprefix + "_landmarks.json", "w"), indent=1)
bmesh.ops.delete(bm, geom=list(lm_verts.values()), context="VERTS")
bm.to_mesh(me); bm.free()
for p in me.polygons:
    p.use_smooth = True

mat = bpy.data.materials.new("clay"); mat.diffuse_color = (0.72, 0.62, 0.56, 1)
me.materials.clear(); me.materials.append(mat)

for ob in list(sc.objects):
    if ob is not o and ob.type in ("MESH", "ARMATURE", "LIGHT", "CAMERA"):
        bpy.data.objects.remove(ob, do_unlink=True)

bpy.ops.wm.save_as_mainfile(filepath=outprefix + "_body.blend")

ws = [o.matrix_world @ v.co for v in me.vertices]
mins = mathutils.Vector((min(w[i] for w in ws) for i in range(3)))
maxs = mathutils.Vector((max(w[i] for w in ws) for i in range(3)))
size = maxs - mins; center = (mins + maxs) / 2
print("BBOX", tuple(round(v, 3) for v in size), "height", round(maxs.z - mins.z, 3))

sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x, sc.render.resolution_y = 512, 1024
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.16, 0.16, 0.17)
cam = bpy.data.cameras.new("cam"); cam.type = "ORTHO"; cam.ortho_scale = size.z * 1.08
co_ = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co_); sc.camera = co_
views = {"front": ((0, -10), (90, 0, 0)), "side": ((10, 0), (90, 0, 90)), "back": ((0, 10), (90, 0, 180))}
for name, (loc, rot) in views.items():
    co_.location = (center.x + loc[0], center.y + loc[1], center.z)
    co_.rotation_euler = tuple(math.radians(a) for a in rot)
    sc.render.filepath = "%s_%s.png" % (outprefix, name)
    bpy.ops.render.render(write_still=True)
