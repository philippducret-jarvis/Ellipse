"""Extrait la hiérarchie d'os du rig MPFB et l'exprime relativement aux articulations (joint-*) du corps."""
import bpy, sys, json, mathutils
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index("--") + 1])
out = sys.argv[sys.argv.index("--") + 2]
o = bpy.data.objects["Mira_MPFB_Basemesh"]; me = o.data
rig = bpy.data.objects["Mira_GameEngine_Rig"]
# positions mélangées (état stocké du fichier)
o.shape_key_add(name="__mix", from_mix=True)
mix = me.shape_keys.key_blocks["__mix"]
pos = [mix.data[i].co.copy() for i in range(len(me.vertices))]
J = {}
for g in o.vertex_groups:
    if g.name.startswith("joint-"):
        pts = [pos[v.index] for v in me.vertices if any(gg.group == g.index and gg.weight > 0.5 for gg in v.groups)]
        if pts:
            s = Vector((0, 0, 0))
            for p in pts: s += p
            J[g.name[6:]] = s / len(pts)
print("JOINTS", len(J))
M = rig.matrix_world
bones = []
for b in rig.data.bones:
    h = M @ b.head_local; t = M @ b.tail_local
    def near(p):
        n = min(J, key=lambda k: (J[k] - p).length)
        return n, (p - J[n])
    hj, hd = near(h); tj, td = near(t)
    bones.append(dict(name=b.name, parent=b.parent.name if b.parent else None, connect=b.use_connect,
                      head=[round(c, 5) for c in h], tail=[round(c, 5) for c in t],
                      head_joint=hj, head_off=[round(c, 5) for c in hd], tail_joint=tj, tail_off=[round(c, 5) for c in td],
                      roll_axis=[round(c, 5) for c in (M.to_3x3() @ b.matrix_local.to_3x3() @ Vector((0, 0, 1)))],
                      deform=b.use_deform))
    print("BONE %-14s <- %-14s head %-16s off %.4f tail %-16s off %.4f" % (b.name, b.parent.name if b.parent else "-", hj, hd.length, tj, td.length))
json.dump(bones, open(out, "w"), indent=1)
