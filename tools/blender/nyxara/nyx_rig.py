"""Nyxara — armature de jeu (55 os, nommage UE) rattachée aux articulations du corps + poses par visée."""
import bpy, json, math, mathutils
from mathutils import Vector, Quaternion, Matrix


def build_armature(joints_path, bonemap_path, name="nyx_Rig_GameEngine"):
    J = {k: Vector(v) for k, v in json.load(open(joints_path)).items()}
    bones = json.load(open(bonemap_path))
    arm = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for b in bones:
        e = arm.edit_bones.new(b["name"])
        h = J[b["head_joint"]] + Vector(b["head_off"])
        t = J[b["tail_joint"]] + Vector(b["tail_off"])
        if (t - h).length < 1e-4:
            t = h + Vector((0, 0, 0.02))
        e.head, e.tail = h, t
        e.align_roll(Vector(b["roll_axis"]))
        e.use_deform = b["deform"]
        eb[b["name"]] = e
    for b in bones:
        if b["parent"]:
            eb[b["name"]].parent = eb[b["parent"]]
            eb[b["name"]].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind(mesh_obj, rig):
    """Le mesh a déjà des groupes de sommets nommés comme les os : simple modificateur Armature."""
    for m in [m for m in mesh_obj.modifiers if m.type == "ARMATURE"]:
        mesh_obj.modifiers.remove(m)
    mod = mesh_obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    mesh_obj.parent = rig
    return mod


def pbone_world_dir(rig, pb):
    return ((rig.matrix_world @ pb.tail) - (rig.matrix_world @ pb.head)).normalized()


def aim_bone(rig, pb, direction):
    """Tourne l'os (pose) pour que sa direction monde devienne `direction`."""
    cur = pbone_world_dir(rig, pb)
    q = cur.rotation_difference(Vector(direction).normalized())
    # rotation exprimée dans l'espace armature -> appliquée autour de la tête de l'os
    R = q.to_matrix().to_4x4()
    head = pb.head.copy()
    T = Matrix.Translation(head)
    M = T @ R @ T.inverted()
    pb.matrix = M @ pb.matrix
    bpy.context.view_layer.update()


def rot_local(pb, axis, deg):
    pb.rotation_mode = "XYZ"
    e = list(pb.rotation_euler)
    e["XYZ".index(axis)] += math.radians(deg)
    pb.rotation_euler = e


def clear_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def hero_pose(rig, J, mesh_objs=None, keep_root=True):
    """Pose de la planche : bras droit (côté -x) levé vers l'orbe, bras gauche relâché, talons, déhanché."""
    clear_pose(rig)
    P = rig.pose.bones
    sh_r = J["r-shoulder"]

    def chain(side, dir_u, dir_f, dir_h):
        aim_bone(rig, P["upperarm_" + side], dir_u)
        aim_bone(rig, P["lowerarm_" + side], dir_f)
        aim_bone(rig, P["hand_" + side], dir_h)

    chain("r", (-0.62, -0.30, -0.72), (-0.35, -0.42, 0.84), (-0.30, -0.45, 0.84))     # bras levé
    chain("l", (0.28, -0.10, -0.95), (0.16, -0.32, -0.93), (0.14, -0.30, -0.94))      # bras relâché
    # doigts de la main levée : légère courbure en griffe
    for f in ("index", "middle", "ring", "pinky"):
        for i, d in ((1, 18), (2, 24), (3, 20)):
            rot_local(P["%s_%02d_r" % (f, i)], "X", d)
    for i, d in ((1, 10), (2, 14), (3, 12)):
        rot_local(P["thumb_%02d_r" % i], "X", d)
    # tête et buste
    aim_bone(rig, P["head"], (-0.05, 0.13, 0.99))
    rot_local(P["spine_02"], "Z", -4)
    rot_local(P["pelvis"], "Z", 5)
    # jambes : appui sur la jambe gauche, jambe droite croisée devant
    aim_bone(rig, P["thigh_l"], (0.02, -0.05, -1.0))
    aim_bone(rig, P["calf_l"], (0.0, 0.04, -1.0))
    aim_bone(rig, P["thigh_r"], (0.06, -0.20, -0.98))
    aim_bone(rig, P["calf_r"], (-0.02, 0.05, -1.0))
    bpy.context.view_layer.update()
    # poser au sol
    if mesh_objs:
        dg = bpy.context.evaluated_depsgraph_get()
        zmin = 1e9
        for o in mesh_objs:
            eo = o.evaluated_get(dg)
            me = eo.to_mesh()
            for v in me.vertices:
                zmin = min(zmin, (o.matrix_world @ v.co).z)
            eo.to_mesh_clear()
        if abs(zmin) > 1e-4 and not keep_root:
            P["Root"].location = (0, 0, -zmin)
        bpy.context.view_layer.update()
    return P


def apply_heels(body, J, deg=38.0):
    """Cambre les pieds (plantarflexion) : sommets pondérés + articulations. Modifie J en place, retourne z_min des orteils."""
    gi = {g.name: g.index for g in body.vertex_groups}
    for side in ("l", "r"):
        ank = J[side + "-ankle"].copy()
        gids = [gi["foot_" + side], gi["ball_" + side]]
        for v in body.data.vertices:
            w = min(1.0, sum(g.weight for g in v.groups if g.group in gids))
            if w <= 0.0:
                continue
            a = math.radians(deg) * w
            d = v.co - ank
            v.co = ank + Vector((d.x, d.y * math.cos(a) - d.z * math.sin(a), d.y * math.sin(a) + d.z * math.cos(a)))
        a = math.radians(deg)
        for k in list(J):
            if k.startswith(side + "-foot") or k.startswith(side + "-toe"):
                d = J[k] - ank
                J[k] = ank + Vector((d.x, d.y * math.cos(a) - d.z * math.sin(a), d.y * math.sin(a) + d.z * math.cos(a)))
    body.data.update()
    return min(v.co.z for v in body.data.vertices)


def rot_world(rig, pb, axis, deg):
    """Rotation de l'os autour de sa tête, axe exprimé dans l'espace armature."""
    R = Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized())
    T = Matrix.Translation(pb.head.copy())
    pb.matrix = T @ R @ T.inverted() @ pb.matrix
    bpy.context.view_layer.update()


def relaxed_pose(rig):
    """Bras le long du corps, tête droite (base des animations sans orbe levé)."""
    clear_pose(rig)
    P = rig.pose.bones
    for s, sg in (("l", 1), ("r", -1)):
        aim_bone(rig, P["upperarm_" + s], (sg * 0.22, -0.06, -0.97))
        aim_bone(rig, P["lowerarm_" + s], (sg * 0.14, -0.22, -0.96))
        aim_bone(rig, P["hand_" + s], (sg * 0.12, -0.22, -0.96))
    return P


def key_all(rig, frame):
    for pb in rig.pose.bones:
        pb.keyframe_insert("rotation_euler", frame=frame)
        if pb.name in ("Root", "pelvis"):
            pb.keyframe_insert("location", frame=frame)


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)
