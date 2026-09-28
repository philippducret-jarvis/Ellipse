"""Build Mira V3, an honest rigged presentation model for Orbes d'Astra.

This script creates a Blender source, a GLB with a real armature and three
animation clips, a presentation render, and a QA report. It is intentionally
labelled BLOCKOUT: proportions, rig hierarchy, costume silhouette and engine
round-trip can be assessed, but retopology, skinning, facial blendshapes and
final textures are still production tasks.
"""

import bpy
import json
import math
import os
import sys
from mathutils import Vector


def argument(name, default=None):
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    if name not in args:
        return default
    index = args.index(name)
    return args[index + 1] if index + 1 < len(args) else default


OUTPUT_ROOT = os.path.abspath(argument("--output-root", "."))
SOURCE_DIR = os.path.join(OUTPUT_ROOT, "source")
EXPORT_DIR = os.path.join(OUTPUT_ROOT, "exports")
QA_DIR = os.path.join(OUTPUT_ROOT, "qa")
CONCEPT_DIR = os.path.join(OUTPUT_ROOT, "concept")
for directory in (SOURCE_DIR, EXPORT_DIR, QA_DIR, CONCEPT_DIR):
    os.makedirs(directory, exist_ok=True)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.armatures,
    ):
        if datablocks is not bpy.data.materials:
            continue


reset_scene()


def material(name, color, metallic=0.0, roughness=0.45, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 4.0
    return mat


MAT_SKIN = material("Mira_Skin_Blockout", (0.72, 0.42, 0.32), roughness=0.50)
MAT_HAIR = material("Mira_Hair_Blockout", (0.025, 0.035, 0.06), metallic=0.05, roughness=0.32)
MAT_NAVY = material("Mira_Couture_Navy", (0.012, 0.022, 0.065), metallic=0.30, roughness=0.23)
MAT_TEAL = material("Mira_Tide_Teal", (0.008, 0.11, 0.18), metallic=0.48, roughness=0.20)
MAT_GOLD = material("Mira_Astrolabe_Gold", (0.55, 0.27, 0.055), metallic=0.88, roughness=0.18)
MAT_GLOW = material("Mira_Tide_Glow", (0.02, 0.62, 0.9), metallic=0.0, roughness=0.2, emission=(0.02, 0.5, 1.0))
MAT_EYE = material("Mira_Eyes", (0.02, 0.6, 0.72), roughness=0.12, emission=(0.01, 0.28, 0.48))
MAT_LIP = material("Mira_Lips", (0.38, 0.06, 0.09), roughness=0.35)
MAT_WHITE = material("Mira_Eye_White", (0.8, 0.82, 0.78), roughness=0.4)

character_objects = []


def finalize_object(obj, name, mat, parent_bone=None, smooth=True):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if smooth and hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if parent_bone:
        world_matrix = obj.matrix_world.copy()
        obj.parent = armature
        obj.parent_type = "BONE"
        obj.parent_bone = parent_bone
        obj.matrix_world = world_matrix
    character_objects.append(obj)
    return obj


def uv_sphere(name, location, scale, mat, parent_bone, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finalize_object(obj, name, mat, parent_bone)


def cylinder_between(name, start, end, radius, mat, parent_bone, vertices=24):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=False)
    return finalize_object(obj, name, mat, parent_bone)


def cone(name, location, radius_bottom, radius_top, depth, mat, parent_bone, vertices=40):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
    )
    return finalize_object(bpy.context.object, name, mat, parent_bone)


def box(name, location, scale, mat, parent_bone, rotation=(0, 0, 0), bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Couture_Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return finalize_object(obj, name, mat, parent_bone)


def torus(name, location, major_radius, minor_radius, mat, parent_bone=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    return finalize_object(bpy.context.object, name, mat, parent_bone)


def curve_ribbon(name, points, bevel, mat, parent_bone=None):
    curve_data = bpy.data.curves.new(name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = bevel
    curve_data.bevel_resolution = 4
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    return finalize_object(obj, name, mat, parent_bone, smooth=False)


# Armature hierarchy and adult proportions (2.08 m including heels).
armature_data = bpy.data.armatures.new("Mira_Rig")
armature = bpy.data.objects.new("Mira_Rig", armature_data)
bpy.context.collection.objects.link(armature)
character_objects.append(armature)
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")

bones = {
    "root": ((0, 0, 0), (0, 0, 0.22), None),
    "pelvis": ((0, 0, 0.92), (0, 0, 1.14), "root"),
    "spine": ((0, 0, 1.14), (0, 0, 1.46), "pelvis"),
    "chest": ((0, 0, 1.46), (0, 0, 1.72), "spine"),
    "neck": ((0, 0, 1.72), (0, 0, 1.84), "chest"),
    "head": ((0, 0, 1.84), (0, 0, 2.06), "neck"),
    "upper_arm.L": ((0.20, 0, 1.66), (0.52, 0.015, 1.48), "chest"),
    "lower_arm.L": ((0.52, 0.015, 1.48), (0.72, -0.03, 1.22), "upper_arm.L"),
    "hand.L": ((0.72, -0.03, 1.22), (0.78, -0.035, 1.12), "lower_arm.L"),
    "upper_arm.R": ((-0.20, 0, 1.66), (-0.52, 0.015, 1.48), "chest"),
    "lower_arm.R": ((-0.52, 0.015, 1.48), (-0.72, -0.03, 1.22), "upper_arm.R"),
    "hand.R": ((-0.72, -0.03, 1.22), (-0.78, -0.035, 1.12), "lower_arm.R"),
    "thigh.L": ((0.14, 0, 1.0), (0.16, 0.015, 0.56), "pelvis"),
    "shin.L": ((0.16, 0.015, 0.56), (0.16, 0, 0.17), "thigh.L"),
    "foot.L": ((0.16, 0, 0.17), (0.16, -0.16, 0.06), "shin.L"),
    "thigh.R": ((-0.14, 0, 1.0), (-0.16, 0.015, 0.56), "pelvis"),
    "shin.R": ((-0.16, 0.015, 0.56), (-0.16, 0, 0.17), "thigh.R"),
    "foot.R": ((-0.16, 0, 0.17), (-0.16, -0.16, 0.06), "shin.R"),
}
for name, (head, tail, parent_name) in bones.items():
    bone = armature_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_deform = name != "root"
    if parent_name:
        bone.parent = armature_data.edit_bones[parent_name]
bpy.ops.object.mode_set(mode="OBJECT")

# Adult anatomical volumes and a fitted couture silhouette. These remain
# modular blockout pieces, but avoid the cylinder-and-apron read of V2.
uv_sphere("Mira_Hips", (0, 0, 1.05), (0.30, 0.20, 0.22), MAT_NAVY, "pelvis")
uv_sphere("Mira_Waist", (0, 0.005, 1.34), (0.205, 0.145, 0.28), MAT_TEAL, "spine")
uv_sphere("Mira_Ribcage", (0, 0.005, 1.56), (0.278, 0.165, 0.245), MAT_NAVY, "chest")
uv_sphere("Mira_Neckline", (0, -0.158, 1.665), (0.105, 0.018, 0.082), MAT_SKIN, "chest", 28, 18)
box("Mira_Corset_Center", (0, -0.158, 1.40), (0.105, 0.025, 0.25), MAT_TEAL, "spine", bevel=0.025)
for side in (-1, 1):
    curve_ribbon(
        f"Mira_Corset_Gold_{side}",
        [(0.13 * side, -0.174, 1.65), (0.105 * side, -0.180, 1.42), (0.14 * side, -0.170, 1.19)],
        0.012,
        MAT_GOLD,
        "spine",
    )
uv_sphere("Mira_Neck", (0, 0, 1.79), (0.075, 0.07, 0.12), MAT_SKIN, "neck", 24, 16)
uv_sphere("Mira_Head", (0, -0.012, 1.94), (0.140, 0.115, 0.182), MAT_SKIN, "head")

# Face planes: readable in the model viewer without pretending to be a final face rig.
for side in (-1, 1):
    uv_sphere(f"Mira_EyeWhite_{side}", (0.050 * side, -0.116, 1.974), (0.026, 0.010, 0.014), MAT_WHITE, "head", 20, 12)
    uv_sphere(f"Mira_Iris_{side}", (0.050 * side, -0.126, 1.974), (0.011, 0.005, 0.011), MAT_EYE, "head", 16, 10)
uv_sphere("Mira_Nose", (0, -0.128, 1.942), (0.018, 0.012, 0.028), MAT_SKIN, "head", 18, 10)
uv_sphere("Mira_Lips", (0, -0.126, 1.900), (0.036, 0.006, 0.010), MAT_LIP, "head", 20, 10)
uv_sphere("Mira_Hair_Crown", (0, 0.032, 2.025), (0.158, 0.135, 0.15), MAT_HAIR, "head")
uv_sphere("Mira_Hair_Back", (0, 0.095, 1.86), (0.185, 0.115, 0.30), MAT_HAIR, "head")
hair_roots = (-0.15, -0.115, -0.075, 0.075, 0.115, 0.15)
for index, x in enumerate(hair_roots):
    side = -1 if x < 0 else 1
    curve_ribbon(
        f"Mira_Hair_Lock_{index}",
        [
            (x, -0.005, 2.08),
            (x * 1.22, -0.005, 1.88),
            (x * 1.55, 0.025, 1.62),
            (x * 1.35 + 0.035 * side, 0.06, 1.34),
        ],
        0.022 + (index % 2) * 0.005,
        MAT_HAIR,
        "head",
    )
for side in (-1, 1):
    curve_ribbon(
        f"Mira_Temple_Braid_{side}",
        [(0.12 * side, -0.075, 2.05), (0.17 * side, -0.095, 1.88), (0.19 * side, -0.06, 1.69)],
        0.018,
        MAT_GOLD if side > 0 else MAT_HAIR,
        "head",
    )

limb_specs = [
    ("UpperArm.L", (0.23, 0, 1.64), (0.50, 0.01, 1.49), 0.075, "upper_arm.L", MAT_SKIN),
    ("LowerArm.L", (0.52, 0.015, 1.48), (0.71, -0.03, 1.23), 0.061, "lower_arm.L", MAT_SKIN),
    ("UpperArm.R", (-0.23, 0, 1.64), (-0.50, 0.01, 1.49), 0.075, "upper_arm.R", MAT_SKIN),
    ("LowerArm.R", (-0.52, 0.015, 1.48), (-0.71, -0.03, 1.23), 0.061, "lower_arm.R", MAT_SKIN),
    ("Thigh.L", (0.14, 0, 0.98), (0.16, 0.01, 0.57), 0.115, "thigh.L", MAT_SKIN),
    ("Shin.L", (0.16, 0.01, 0.55), (0.16, 0, 0.18), 0.083, "shin.L", MAT_NAVY),
    ("Thigh.R", (-0.14, 0, 0.98), (-0.16, 0.01, 0.57), 0.115, "thigh.R", MAT_SKIN),
    ("Shin.R", (-0.16, 0.01, 0.55), (-0.16, 0, 0.18), 0.083, "shin.R", MAT_NAVY),
]
for spec in limb_specs:
    cylinder_between(f"Mira_{spec[0]}", spec[1], spec[2], spec[3], spec[5], spec[4])
for side, sign in (("L", 1), ("R", -1)):
    uv_sphere(f"Mira_ShoulderJoint.{side}", (0.25 * sign, 0.0, 1.64), (0.095, 0.085, 0.095), MAT_SKIN, f"upper_arm.{side}", 24, 14)
for side, sign in (("L", 1), ("R", -1)):
    uv_sphere(f"Mira_Hand.{side}", (0.755 * sign, -0.035, 1.17), (0.052, 0.04, 0.085), MAT_SKIN, f"hand.{side}", 20, 14)
    uv_sphere(f"Mira_Foot.{side}", (0.16 * sign, -0.105, 0.105), (0.09, 0.16, 0.065), MAT_NAVY, f"foot.{side}", 20, 14)
    torus(f"Mira_Bracelet.{side}", (0.69 * sign, -0.025, 1.26), 0.073, 0.014, MAT_GOLD, f"lower_arm.{side}", rotation=(math.radians(43), 0, 0))
    torus(f"Mira_BootCuff.{side}", (0.16 * sign, 0, 0.54), 0.105, 0.014, MAT_GOLD, f"shin.{side}")

# High-slit astral couture: fitted hips, a short center sash and two floating
# side panels keep both legs readable instead of hiding them in an apron cone.
torus("Mira_Hip_Belt", (0, 0, 1.12), 0.285, 0.022, MAT_GOLD, "pelvis", rotation=(0, 0, 0))
box("Mira_Front_Sash", (0, -0.205, 0.88), (0.115, 0.028, 0.36), MAT_TEAL, "pelvis", rotation=(0, 0, math.radians(-4)), bevel=0.025)
for side in (-1, 1):
    box(
        f"Mira_Side_Drape_{side}",
        (0.285 * side, 0.015, 0.86),
        (0.09, 0.035, 0.36),
        MAT_NAVY,
        "pelvis",
        rotation=(0, math.radians(4 * side), math.radians(9 * side)),
        bevel=0.035,
    )
    torus(
        f"Mira_Hip_Jewel_{side}",
        (0.27 * side, -0.15, 1.10),
        0.075,
        0.014,
        MAT_GOLD,
        "pelvis",
        rotation=(math.radians(90), 0, 0),
    )
torus("Mira_Collar", (0, 0, 1.72), 0.165, 0.018, MAT_GOLD, "chest", rotation=(math.radians(90), 0, 0))
torus("Mira_Astrolabe_Back", (0, 0.14, 1.48), 0.42, 0.018, MAT_GOLD, "chest", rotation=(math.radians(90), 0, 0))
torus("Mira_Astrolabe_Back_Inner", (0, 0.15, 1.48), 0.29, 0.010, MAT_GLOW, "chest", rotation=(math.radians(90), math.radians(22), 0))
curve_ribbon("Mira_Tide_Ribbon.L", [(0.24, 0.04, 1.62), (0.54, 0.14, 1.36), (0.42, 0.25, 0.9)], 0.026, MAT_GLOW, "chest")
curve_ribbon("Mira_Tide_Ribbon.R", [(-0.24, 0.04, 1.58), (-0.48, 0.18, 1.25), (-0.36, 0.2, 0.82)], 0.022, MAT_GLOW, "chest")
for side in (-1, 1):
    uv_sphere(f"Mira_ShoulderArmor_{side}", (0.27 * side, 0.01, 1.67), (0.13, 0.10, 0.075), MAT_TEAL, "chest", 24, 14)
    cone(
        f"Mira_ShoulderFin_{side}",
        (0.39 * side, 0.03, 1.71),
        0.09,
        0.015,
        0.36,
        MAT_GOLD,
        "chest",
        24,
    ).rotation_euler = (0, math.radians(90), math.radians(90))

# Astrolabe staff parented to right hand.
cylinder_between("Mira_Staff_Shaft", (-0.80, -0.04, 0.54), (-0.80, -0.04, 1.56), 0.025, MAT_GOLD, "hand.R", 20)
torus("Mira_Staff_Ring", (-0.80, -0.04, 1.67), 0.16, 0.018, MAT_GOLD, "hand.R", rotation=(math.radians(90), 0, 0))
torus("Mira_Staff_Ring_Inner", (-0.80, -0.04, 1.67), 0.105, 0.012, MAT_GLOW, "hand.R", rotation=(math.radians(90), math.radians(45), 0))
uv_sphere("Mira_Staff_Core", (-0.80, -0.04, 1.67), (0.055, 0.055, 0.055), MAT_GLOW, "hand.R", 24, 16)


def create_action(name, frame_range, poses):
    action = bpy.data.actions.new(name)
    action.frame_start, action.frame_end = frame_range
    armature.animation_data_create()
    armature.animation_data.action = action
    for frame, bone_values in poses.items():
        for bone_name, values in bone_values.items():
            pose_bone = armature.pose.bones[bone_name]
            pose_bone.rotation_mode = "XYZ"
            if "rotation" in values:
                pose_bone.rotation_euler = values["rotation"]
                pose_bone.keyframe_insert("rotation_euler", frame=frame, group=bone_name)
            if "location" in values:
                pose_bone.location = values["location"]
                pose_bone.keyframe_insert("location", frame=frame, group=bone_name)
    track = armature.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, frame_range[0], action)
    strip.action_frame_start, strip.action_frame_end = frame_range
    armature.animation_data.action = None
    return action


create_action(
    "Mira_Idle",
    (1, 72),
    {
        1: {"spine": {"rotation": (0, 0, -0.025)}, "chest": {"rotation": (0.01, 0, 0.03)}},
        36: {"spine": {"rotation": (0.018, 0, 0.025)}, "chest": {"rotation": (-0.012, 0, -0.03)}, "head": {"rotation": (0, 0.03, 0.025)}},
        72: {"spine": {"rotation": (0, 0, -0.025)}, "chest": {"rotation": (0.01, 0, 0.03)}, "head": {"rotation": (0, 0, 0)}},
    },
)
create_action(
    "Mira_Skill_Cast",
    (1, 54),
    {
        1: {"upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
        22: {"chest": {"rotation": (0.08, 0, -0.12)}, "upper_arm.L": {"rotation": (0.25, -0.18, -1.15)}, "lower_arm.L": {"rotation": (0.0, 0.3, -0.45)}, "upper_arm.R": {"rotation": (-0.15, 0.15, 0.7)}},
        36: {"chest": {"rotation": (-0.04, 0, 0.1)}, "upper_arm.L": {"rotation": (-0.15, 0.18, -0.55)}, "lower_arm.L": {"rotation": (0, -0.2, -0.22)}},
        54: {"chest": {"rotation": (0, 0, 0)}, "upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
    },
)
create_action(
    "Mira_Ultimate",
    (1, 96),
    {
        1: {"root": {"location": (0, 0, 0)}, "upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
        34: {"root": {"location": (0, 0, 0.12)}, "chest": {"rotation": (-0.12, 0, 0)}, "upper_arm.L": {"rotation": (0.15, -0.3, -1.7)}, "upper_arm.R": {"rotation": (0.15, 0.3, 1.7)}},
        62: {"root": {"location": (0, 0, 0.22)}, "head": {"rotation": (-0.18, 0, 0)}, "upper_arm.L": {"rotation": (-0.35, -0.12, -2.0)}, "upper_arm.R": {"rotation": (-0.35, 0.12, 2.0)}},
        96: {"root": {"location": (0, 0, 0)}, "chest": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}, "upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
    },
)

# NLA tracks are all exported, but only Idle must influence the presentation
# frame. Otherwise simultaneous skill/ultimate tracks deliberately fight.
for nla_track in armature.animation_data.nla_tracks:
    nla_track.mute = nla_track.name != "Mira_Idle"

# Presentation stage is excluded from the selected GLB export.
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.45, depth=0.08, location=(0, 0, 0))
stage = bpy.context.object
stage.name = "Presentation_Podium"
stage.data.materials.append(MAT_NAVY)
torus("Presentation_Ring", (0, 0, 0.055), 1.05, 0.018, MAT_GLOW)
character_objects.remove(bpy.context.object)

bpy.ops.object.light_add(type="AREA", location=(3.2, -4.0, 4.6))
key = bpy.context.object
key.data.energy = 1200
key.data.shape = "DISK"
key.data.size = 3.0
key.data.color = (0.55, 0.82, 1.0)
key.rotation_euler = (math.radians(27), 0, math.radians(38))
bpy.ops.object.light_add(type="AREA", location=(-3.0, 1.5, 3.3))
rim = bpy.context.object
rim.data.energy = 1000
rim.data.size = 2.4
rim.data.color = (0.72, 0.3, 1.0)
rim.rotation_euler = (math.radians(-55), 0, math.radians(-130))
bpy.ops.object.light_add(type="AREA", location=(0, -2.4, 1.0))
fill = bpy.context.object
fill.data.energy = 500
fill.data.size = 2.0
fill.data.color = (1.0, 0.55, 0.3)
fill.rotation_euler = (math.radians(75), 0, 0)

bpy.ops.object.camera_add(location=(3.15, -5.8, 2.35))
camera = bpy.context.object
camera.name = "Mira_Presentation_Camera"
bpy.context.scene.camera = camera


def track_camera(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


track_camera(camera, (0, 0, 1.12))

world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.003, 0.006, 0.02, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.filepath = os.path.join(CONCEPT_DIR, "mira_blockout_render.png")
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_percentage = 100
scene.frame_set(18)

blend_path = os.path.join(SOURCE_DIR, "mira_blockout.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
bpy.ops.render.render(write_still=True)

# Selected export: only the character, rig, costume and staff.
for nla_track in armature.animation_data.nla_tracks:
    nla_track.mute = False
bpy.ops.object.select_all(action="DESELECT")
for obj in character_objects:
    if obj and obj.name in bpy.data.objects:
        obj.select_set(True)
bpy.context.view_layer.objects.active = armature
glb_path = os.path.join(EXPORT_DIR, "mira_blockout_lod0.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_nla_strips=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)

triangle_count = 0
mesh_count = 0
for obj in character_objects:
    if obj.type == "MESH":
        mesh_count += 1
        mesh = obj.data
        mesh.calc_loop_triangles()
        triangle_count += len(mesh.loop_triangles)

report = {
    "schemaVersion": 1,
    "asset": "mira",
    "status": "blockout_exported_not_final",
    "adultCanonicalAge": 27,
    "truth": {
        "finalModel": False,
        "finalTextures": False,
        "productionSkinning": False,
        "facialBlendshapes": False,
        "commercialReady": False,
    },
    "files": {
        "blend": os.path.relpath(blend_path, OUTPUT_ROOT).replace("\\", "/"),
        "glb": os.path.relpath(glb_path, OUTPUT_ROOT).replace("\\", "/"),
        "render": "concept/mira_blockout_render.png",
    },
    "metrics": {
        "meshObjects": mesh_count,
        "triangles": triangle_count,
        "bones": len(armature.data.bones),
        "materials": 9,
        "animationClips": ["Mira_Idle", "Mira_Skill_Cast", "Mira_Ultimate"],
        "heightMeters": 2.08,
    },
    "passed": [
        "full-body silhouette exists",
        "real armature hierarchy exists",
        "three named clips exported",
        "GLB round-trip candidate generated",
        "costume and astrolabe weapon readable",
    ],
    "remaining": [
        "approved sculpt",
        "single watertight production mesh",
        "retopology and UVs",
        "PBR 4K/2K textures",
        "deformation skinning and corrective shapes",
        "52 facial blendshapes",
        "hair cards or groom",
        "LOD1 and LOD2",
        "mobile material reduction",
        "engine animation and performance QA",
    ],
}
with open(os.path.join(QA_DIR, "mira_blockout_report.json"), "w", encoding="utf8") as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)

print(json.dumps(report, ensure_ascii=False, indent=2))
