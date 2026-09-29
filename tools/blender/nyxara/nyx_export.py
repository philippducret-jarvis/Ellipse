"""Nyxara — export jeu : purge, fusion, animations procédurales, LOD0/1/2 en GLB, rapport QA.

usage: blender -b -P nyx_export.py -- <full.blend> <joints.json> <out_dir>
"""
import bpy, sys, os, json, math, bmesh
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index("--") + 1:]
blend, joints_json, OUT = args[0], args[1], args[2]
LIB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, LIB)
import importlib, nyx_rig as R; importlib.reload(R)
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
rig = bpy.data.objects["nyx_Rig_GameEngine"]
J = {k: Vector(v) for k, v in json.load(open(joints_json)).items()}
bone_names = {b.name for b in rig.data.bones}

# ------------------------------------------------------------------ nettoyage de la scène
for ob in list(sc.objects):
    if ob.type in ("CAMERA", "LIGHT"):
        bpy.data.objects.remove(ob, do_unlink=True)
meshes = [o for o in sc.objects if o.type == "MESH"]
for o in meshes:
    for g in list(o.vertex_groups):
        if g.name not in bone_names:
            o.vertex_groups.remove(g)
    # groupes vides / poids nuls
R.clear_pose(rig)
for pb in rig.pose.bones:
    pb.rotation_mode = "XYZ"

# ------------------------------------------------------------------ fusion en meshes logiques
def pick(names_prefix):
    return [o for o in sc.objects if o.type == "MESH" and o.name.startswith(names_prefix)]

def join(objs, name):
    objs = [o for o in objs if o.name in bpy.data.objects]
    if not objs:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name; ob.data.name = name
    return ob

groups = {
    "nyx_body": ["Mira_MPFB_Basemesh"],
    "nyx_costume": ["nyx_bra", "nyx_brief", "nyx_stockings", "nyx_torso_net", "nyx_gloves", "nyx_shoes", "nyx_toecaps", "nyx_collar", "nyx_heels"],
    "nyx_lattice": ["nyx_lattice_m"],
    "nyx_jewelry": ["nyx_trim_m", "nyx_chains_m", "nyx_claws", "nyx_bgem_", "nyx_sgem_", "nyx_choker_gem", "nyx_drop_", "nyx_crown", "nyx_spike", "nyx_gem_", "nyx_ear_"],
    "nyx_face": ["nyx_eye_", "nyx_iris_", "nyx_pupil_", "nyx_brow_", "nyx_liner_", "nyx_lash_", "nyx_shadow_", "nyx_lips", "nyx_lipline"],
    "nyx_hair": ["nyx_hair", "nyx_scalp"],
    "nyx_cloth": ["nyx_cape_", "nyx_skirt_", "nyx_sleeve_r"],
    "nyx_props": ["nyx_raven", "nyx_orb"],
}
final = {}
used = set()
for gname, prefixes in groups.items():
    objs = []
    for p in prefixes:
        for o in sc.objects:
            if o.type == "MESH" and o.name.startswith(p) and o.name not in used:
                objs.append(o); used.add(o.name)
    final[gname] = join(objs, gname)
left = [o.name for o in sc.objects if o.type == "MESH" and o.name not in used and o.name not in final]
print("UNGROUPED", left)
for _n in left:
    if _n in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[_n], do_unlink=True)
for gname, ob in final.items():
    if ob is None: continue
    for m in [m for m in ob.modifiers if m.type == "ARMATURE"]:
        m.object = rig
    print("MESH", gname, len(ob.data.polygons), "faces", len(ob.data.materials), "mats")

for _n in ("nyx_jewelry", "nyx_lattice", "nyx_props", "nyx_cloth"):
    _o = final.get(_n)
    if _o is not None:
        while _o.data.uv_layers:
            _o.data.uv_layers.remove(_o.data.uv_layers[0])
        for _a in [a for a in _o.data.attributes if a.name not in ("position", ".edge_verts", ".corner_vert", ".corner_edge", "material_index", "sharp_face")]:
            try:
                _o.data.attributes.remove(_a)
            except Exception:
                pass
# ------------------------------------------------------------------ animations procédurales
sc.render.fps = 30
ad = rig.animation_data_create()
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)

def new_clip(name, nframes, fn):
    act = bpy.data.actions.new(name)
    ad.action = act
    for f in range(nframes):
        R.clear_pose(rig) if False else None
        fn(f / nframes, f)
        R.key_all(rig, f + 1)
    tr = ad.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 1, act); st.name = name
    ad.action = None
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    return act

P = rig.pose.bones
def sin(t, k=1, ph=0): return math.sin(2 * math.pi * (t * k + ph))

def c_idle_neutral(t, f):
    R.relaxed_pose(rig)
    R.rot_world(rig, P["spine_03"], X, 1.4 * sin(t))
    R.rot_world(rig, P["head"], X, -0.8 * sin(t, 1, 0.1))
    R.rot_world(rig, P["head"], Z, 2.0 * sin(t, 1, 0.25))
    R.rot_world(rig, P["upperarm_l"], X, 1.0 * sin(t, 1, 0.2)); R.rot_world(rig, P["upperarm_r"], X, 1.0 * sin(t, 1, 0.2))
    P["Root"].location = (0.004 * sin(t, 1, 0.25), 0, 0)

def c_idle_glamour(t, f):
    R.hero_pose(rig, J, None, keep_root=True)
    R.rot_world(rig, P["spine_02"], X, 1.6 * sin(t))
    R.rot_world(rig, P["head"], Z, 5.0 * sin(t, 1, 0.1))
    R.rot_world(rig, P["head"], X, -1.5 * sin(t, 1, 0.3))
    R.rot_world(rig, P["upperarm_r"], Y, 2.0 * sin(t, 1, 0.2))
    R.rot_world(rig, P["lowerarm_r"], Z, 3.0 * sin(t, 2, 0.1))
    R.rot_world(rig, P["pelvis"], Z, 2.0 * sin(t, 1, 0.5))
    P["Root"].location = (0.006 * sin(t, 1, 0.5), 0, 0.004 * sin(t, 2))

def c_idle_personality(t, f):
    c_idle_glamour(t, f)
    turn = 14 * math.sin(math.pi * min(1, t * 1.6)) ** 2 if t < 0.625 else 0
    R.rot_world(rig, P["head"], Z, turn)
    R.rot_world(rig, P["spine_03"], Z, 0.4 * turn)
    R.rot_world(rig, P["upperarm_r"], X, -8 * (turn / 14))

def gait(t, amp, arm, bob):
    R.relaxed_pose(rig)
    ph = t
    for s, off, sg in (("l", 0.0, 1), ("r", 0.5, -1)):
        sw = sin(ph, 1, off)
        R.rot_world(rig, P["thigh_" + s], X, -amp * sw)
        knee = max(0.0, sin(ph, 1, off + 0.25))
        R.rot_world(rig, P["calf_" + s], X, amp * 1.6 * knee)
        R.rot_world(rig, P["upperarm_" + s], X, arm * sw)
        R.rot_world(rig, P["lowerarm_" + s], X, -arm * 0.6 * max(0.0, -sw) - 8)
    R.rot_world(rig, P["pelvis"], Z, 5.0 * amp / 25 * sin(ph))
    R.rot_world(rig, P["spine_02"], Z, -4.0 * amp / 25 * sin(ph))
    R.rot_world(rig, P["head"], Z, 2.0 * amp / 25 * sin(ph))
    P["Root"].location = (0, 0, bob * abs(sin(ph, 2, 0.25)))

def c_walk(t, f): gait(t, 24, 16, 0.012)
def c_run(t, f):
    gait(t, 42, 38, 0.035)
    R.rot_world(rig, P["spine_01"], X, 9)
    for s in ("l", "r"):
        R.rot_world(rig, P["lowerarm_" + s], X, -55)

def c_hit(amp):
    def fn(t, f):
        e = math.sin(math.pi * min(1.0, t * 1.15)) ** 1.5 if t < 0.87 else 0.0
        R.relaxed_pose(rig)
        R.rot_world(rig, P["spine_01"], X, -5 * amp * e)
        R.rot_world(rig, P["spine_03"], X, -7 * amp * e)
        R.rot_world(rig, P["head"], X, -min(16, 9 * amp) * e)
        R.rot_world(rig, P["head"], Z, min(14, 6 * amp) * e)
        for s in ("l", "r"):
            R.rot_world(rig, P["upperarm_" + s], X, 14 * amp * e)
            R.rot_world(rig, P["thigh_" + s], X, 6 * amp * e)
        P["Root"].location = (0, 0.03 * amp * e, -0.02 * amp * e)
    return fn

def c_skill(t, f):
    a = R.smoothstep(t / 0.3) - R.smoothstep((t - 0.75) / 0.25)
    R.relaxed_pose(rig)
    R.aim_bone(rig, P["upperarm_r"], Vector((-0.62, -0.30, -0.72)).lerp(Vector((-0.22, -0.95, 0.20)), a))
    R.aim_bone(rig, P["lowerarm_r"], Vector((-0.14, -0.22, -0.96)).lerp(Vector((-0.10, -0.98, 0.15)), a))
    R.aim_bone(rig, P["hand_r"], Vector((-0.12, -0.22, -0.96)).lerp(Vector((-0.08, -0.97, 0.20)), a))
    R.rot_world(rig, P["spine_02"], Z, 12 * a)
    R.rot_world(rig, P["head"], Z, -8 * a)
    P["Root"].location = (0, -0.03 * a, 0)

def c_ultimate(t, f):
    a = R.smoothstep(t / 0.35) - R.smoothstep((t - 0.8) / 0.2)
    R.relaxed_pose(rig)
    for s, sg in (("l", 1), ("r", -1)):
        R.aim_bone(rig, P["upperarm_" + s], Vector((sg * 0.22, -0.06, -0.97)).lerp(Vector((sg * 0.40, -0.25, 0.88)), a))
        R.aim_bone(rig, P["lowerarm_" + s], Vector((sg * 0.14, -0.22, -0.96)).lerp(Vector((sg * 0.30, -0.28, 0.91)), a))
    R.rot_world(rig, P["spine_03"], X, -8 * a)
    R.rot_world(rig, P["head"], X, -14 * a)
    P["Root"].location = (0, 0, 0.02 * a * (1 + 0.3 * sin(t, 4)))

def c_victory(t, f):
    c_idle_glamour(t, f)
    p = 0.5 - 0.5 * math.cos(2 * math.pi * t * 2)
    R.rot_world(rig, P["upperarm_r"], X, -14 * p)
    R.rot_world(rig, P["spine_03"], X, -5 * p)
    P["Root"].location = (0, 0, 0.025 * p)

def c_defeat(t, f):
    a = R.smoothstep(t / 0.7)
    R.relaxed_pose(rig)
    R.rot_world(rig, P["thigh_l"], X, -75 * a); R.rot_world(rig, P["thigh_r"], X, -60 * a)
    R.rot_world(rig, P["calf_l"], X, 95 * a); R.rot_world(rig, P["calf_r"], X, 85 * a)
    R.rot_world(rig, P["spine_01"], X, 28 * a); R.rot_world(rig, P["spine_03"], X, 20 * a)
    R.rot_world(rig, P["head"], X, 24 * a)
    P["Root"].location = (0, -0.18 * a, -0.40 * a)

def c_greeting(t, f):
    R.relaxed_pose(rig)
    up = R.smoothstep(t / 0.2) - R.smoothstep((t - 0.85) / 0.15)
    R.aim_bone(rig, P["upperarm_r"], Vector((-0.22, -0.06, -0.97)).lerp(Vector((-0.55, -0.15, 0.82)), up))
    R.aim_bone(rig, P["lowerarm_r"], Vector((-0.14, -0.22, -0.96)).lerp(Vector((-0.30, -0.25, 0.92)), up))
    R.rot_world(rig, P["lowerarm_r"], Y, 24 * sin(t, 3) * up)
    R.rot_world(rig, P["head"], Z, 6 * up)
    R.rot_world(rig, P["spine_03"], X, 1.4 * sin(t))

CLIPS = [("idle_neutral", 60, c_idle_neutral), ("idle_glamour", 72, c_idle_glamour), ("idle_personality", 96, c_idle_personality),
         ("walk", 32, c_walk), ("run", 24, c_run), ("hit_light", 20, c_hit(1.0)), ("hit_heavy", 30, c_hit(1.7)),
         ("skill_cast", 40, c_skill), ("ultimate_cast", 60, c_ultimate), ("victory", 60, c_victory),
         ("defeat", 60, c_defeat), ("hub_greeting", 60, c_greeting)]
for name, n, fn in CLIPS:
    new_clip(name, n, fn)
    print("CLIP", name, n)
R.clear_pose(rig)
sc.frame_end = 96

# ------------------------------------------------------------------ aperçu des clips (contrôle visuel)
if os.environ.get("NYX_PREVIEW", "1") == "1":
    ad.use_nla = False
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.16, 0.16, 0.17)
    cam = bpy.data.cameras.new("pcam"); cam.type = "ORTHO"; cam.ortho_scale = 2.3
    co_ = bpy.data.objects.new("pcam", cam); sc.collection.objects.link(co_); sc.camera = co_
    co_.location = (0, -8, 1.0); co_.rotation_euler = (math.radians(90), 0, 0)
    sc.render.resolution_x, sc.render.resolution_y = 300, 480
    specs = [("idle_neutral", 0.25), ("idle_glamour", 0.25), ("walk", 0.15), ("walk", 0.65), ("run", 0.15), ("hit_light", 0.35),
             ("hit_heavy", 0.35), ("skill_cast", 0.55), ("ultimate_cast", 0.55), ("victory", 0.25), ("defeat", 0.95), ("hub_greeting", 0.4)]
    fns = {c[0]: (c[1], c[2]) for c in CLIPS}
    for i, (nm, tt) in enumerate(specs):
        n, fn = fns[nm]
        fn(tt, int(tt * n))
        sc.render.filepath = os.path.join(OUT, "preview_%02d_%s.png" % (i, nm))
        bpy.ops.render.render(write_still=True)
    R.clear_pose(rig)
    ad.use_nla = True
    bpy.data.objects.remove(co_, do_unlink=True)

# ------------------------------------------------------------------ export LOD
report = {"character": "nyxara", "clips": [c[0] for c in CLIPS], "bones": len(rig.data.bones), "lods": {}}
def stats():
    tris = 0; verts = 0; mats = set()
    for o in sc.objects:
        if o.type == "MESH":
            me = o.data
            me.calc_loop_triangles()
            tris += len(me.loop_triangles); verts += len(me.vertices)
            for m in me.materials:
                if m: mats.add(m.name)
    return tris, verts, len(mats)

def export(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False, export_animations=True,
                              export_animation_mode="NLA_TRACKS", export_skins=True, export_apply=False,
                              export_yup=True, export_image_format="AUTO", export_texcoords=True, export_normals=True,
                              export_materials="EXPORT", export_extras=False, export_cameras=False, export_lights=False)
    return os.path.getsize(path)

def retex(tag, max_side):
    from PIL import Image
    d = os.path.join(OUT, "tex_" + tag); os.makedirs(d, exist_ok=True)
    for img in list(bpy.data.images):
        fp = bpy.path.abspath(img.filepath)
        if not fp or not os.path.exists(fp):
            continue
        im = Image.open(fp)
        w, h = im.size
        k = min(1.0, max_side / max(w, h))
        if k >= 0.999:
            continue
        im = im.resize((max(64, int(w * k)), max(64, int(h * k))), Image.LANCZOS)
        newp = os.path.join(d, os.path.basename(fp))
        im.save(newp)
        img.filepath = newp
        img.reload()

def lod_stage(tag, ratio_map, drop=()):
    for o in list(sc.objects):
        if o.type == "MESH" and o.name in drop:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in sc.objects:
        if o.type != "MESH":
            continue
        r = ratio_map.get(o.name, 1.0)
        if r >= 0.999:
            continue
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
        bpy.context.view_layer.objects.active = o
        md = o.modifiers.new("dec", "DECIMATE"); md.ratio = r
        while o.modifiers.find("dec") > 0:
            bpy.ops.object.modifier_move_up(modifier="dec")
        bpy.ops.object.modifier_apply(modifier="dec")
        o.data.validate(clean_customdata=True)

t, v, m = stats(); s = export(os.path.join(OUT, "nyxara_lod0.glb"))
report["lods"]["lod0"] = dict(triangles=t, vertices=v, materials=m, bytes=s); print("LOD0", t, v, m, s)
retex("lod1", 1024)
lod_stage("lod1", {"nyx_body": 0.34, "nyx_costume": 0.30, "nyx_jewelry": 0.28, "nyx_lattice": 0.22, "nyx_hair": 0.33, "nyx_cloth": 0.26, "nyx_props": 0.40, "nyx_face": 0.45})
t, v, m = stats(); s = export(os.path.join(OUT, "nyxara_lod1.glb"))
report["lods"]["lod1"] = dict(triangles=t, vertices=v, materials=m, bytes=s); print("LOD1", t, v, m, s)
retex("lod2", 512)
lod_stage("lod2", {"nyx_body": 0.30, "nyx_costume": 0.30, "nyx_jewelry": 0.30, "nyx_hair": 0.30, "nyx_cloth": 0.30, "nyx_props": 0.45, "nyx_face": 0.40}, drop=("nyx_lattice",))
t, v, m = stats(); s = export(os.path.join(OUT, "nyxara_lod2.glb"))
report["lods"]["lod2"] = dict(triangles=t, vertices=v, materials=m, bytes=s); print("LOD2", t, v, m, s)
json.dump(report, open(os.path.join(OUT, "export-report.json"), "w"), indent=2)
