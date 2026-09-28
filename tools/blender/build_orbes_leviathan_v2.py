"""Create the Tide Leviathan V3 as a rigged stylized serpent boss.

The output is a production blockout with an intentional silhouette, segmented
armor, emissive core, 30-bone rig and three animation clips. It replaces the
rejected primitive oval used by the first Godot greybox.
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
    values = sys.argv[sys.argv.index("--") + 1 :]
    if name not in values:
        return default
    index = values.index(name)
    return values[index + 1] if index + 1 < len(values) else default


OUTPUT_ROOT = os.path.abspath(argument("--output-root", "."))
for folder in ("source", "exports", "concept", "qa"):
    os.makedirs(os.path.join(OUTPUT_ROOT, folder), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def mat(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = strength
    return value


DARK = mat("Leviathan_ObsidianScales", (0.012, 0.018, 0.055), 0.68, 0.2)
ARMOR = mat("Leviathan_VioletArmor", (0.10, 0.025, 0.18), 0.72, 0.19)
GOLD = mat("Leviathan_AntiqueGold", (0.45, 0.18, 0.025), 0.88, 0.16)
CYAN = mat("Leviathan_TideVeins", (0.0, 0.25, 0.42), 0.15, 0.2, (0.0, 0.65, 1.0), 4.5)
MAGENTA = mat("Leviathan_VoidCore", (0.36, 0.01, 0.24), 0.12, 0.16, (1.0, 0.015, 0.5), 5.5)
EYE = mat("Leviathan_Eyes", (0.6, 0.01, 0.22), 0.0, 0.1, (1.0, 0.02, 0.34), 7.0)

objects = []


def finish(obj, name, material, bone=None):
    obj.name = name
    obj.data.materials.append(material)
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if bone:
        world = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = bone
        obj.matrix_world = world
    objects.append(obj)
    return obj


def sphere(name, location, scale, material, bone=None, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, bone)


def cone(name, location, radius, depth, material, bone=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=radius, radius2=0.025, depth=depth, location=location, rotation=rotation)
    return finish(bpy.context.object, name, material, bone)


def torus(name, location, major, minor, material, bone=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=56,
        minor_segments=12,
        location=location,
        rotation=rotation,
    )
    return finish(bpy.context.object, name, material, bone)


# The body is a single skinned tube. The first rejected pass used a chain of
# spheres: it read as a necklace in the render and was not acceptable even as
# a presentation blockout.
points = []
count = 38
for index in range(count):
    ratio = index / (count - 1)
    angle = math.pi * 0.5 - ratio * math.pi * 1.82
    x = math.cos(angle) * (3.0 - ratio * 0.25)
    z = 2.46 + math.sin(angle) * (1.82 - ratio * 0.12)
    y = 0.42 + math.sin(ratio * math.pi * 3.0) * 0.16
    points.append(Vector((x, y, z)))

armature_data = bpy.data.armatures.new("TideLeviathan_Rig")
rig = bpy.data.objects.new("TideLeviathan_Rig", armature_data)
bpy.context.collection.objects.link(rig)
objects.append(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
root = armature_data.edit_bones.new("root")
root.head = (0, 0, 0)
root.tail = (0, 0, 0.3)
root.use_deform = False
head_bone = armature_data.edit_bones.new("head")
head_bone.head = (0, 0.25, 4.15)
head_bone.tail = (0, -0.9, 4.15)
head_bone.parent = root
core_bone = armature_data.edit_bones.new("core")
core_bone.head = (0, 0.2, 3.0)
core_bone.tail = (0, -0.5, 3.0)
core_bone.parent = root
for index, point in enumerate(points):
    bone = armature_data.edit_bones.new(f"body_{index:02d}")
    tangent = (points[min(index + 1, count - 1)] - points[max(index - 1, 0)]).normalized()
    bone.head = point
    bone.tail = point + tangent * 0.38
    bone.parent = root
bpy.ops.object.mode_set(mode="OBJECT")

# Continuous body mesh, skinned one ring at a time to the body bones.
ring_segments = 18
vertices = []
faces = []
radii = []
for index, point in enumerate(points):
    ratio = index / (count - 1)
    radius = 0.50 * (1.0 - ratio * 0.70)
    radii.append(radius)
    tangent = (points[min(index + 1, count - 1)] - points[max(index - 1, 0)]).normalized()
    side = tangent.cross(Vector((0, 1, 0))).normalized()
    depth = tangent.cross(side).normalized()
    for segment_index in range(ring_segments):
        ring_angle = math.tau * segment_index / ring_segments
        # A slightly flattened aquatic cross-section reads less like beads.
        offset = side * math.cos(ring_angle) * radius
        offset += depth * math.sin(ring_angle) * radius * 0.82
        vertices.append(tuple(point + offset))
for index in range(count - 1):
    for segment_index in range(ring_segments):
        next_segment = (segment_index + 1) % ring_segments
        a = index * ring_segments + segment_index
        b = index * ring_segments + next_segment
        c = (index + 1) * ring_segments + next_segment
        d = (index + 1) * ring_segments + segment_index
        faces.append((a, b, c, d))
mesh = bpy.data.meshes.new("Leviathan_ContinuousBody_Mesh")
mesh.from_pydata(vertices, [], faces)
mesh.update()
body = bpy.data.objects.new("Leviathan_ContinuousBody", mesh)
bpy.context.collection.objects.link(body)
finish(body, "Leviathan_ContinuousBody", DARK)
body.parent = rig
body_modifier = body.modifiers.new("Leviathan_Skin", "ARMATURE")
body_modifier.object = rig
for index in range(count):
    group = body.vertex_groups.new(name=f"body_{index:02d}")
    group.add(
        [index * ring_segments + segment_index for segment_index in range(ring_segments)],
        1.0,
        "REPLACE",
    )

# Armor keels and tide nodes break up the silhouette without fragmenting it.
for index, point in enumerate(points):
    radius = radii[index]
    tangent = (points[min(index + 1, count - 1)] - points[max(index - 1, 0)]).normalized()
    if index % 3 == 1 and index > 1:
        cone(
            f"Leviathan_Dorsal_{index:02d}",
            point + Vector((0, 0.12, radius * 0.92)),
            max(radius * 0.30, 0.055),
            max(radius * 1.8, 0.30),
            GOLD,
            f"body_{index:02d}",
            (math.radians(-12), 0, 0),
        )
    if index % 4 == 0 and index > 0:
        sphere(
            f"Leviathan_TideNode_{index:02d}",
            point + Vector((0, -radius * 0.76, 0)),
            (max(radius * 0.17, 0.035), max(radius * 0.07, 0.02), max(radius * 0.17, 0.035)),
            CYAN,
            f"body_{index:02d}",
            20,
            12,
        )

# Crowned frontal dragon head. The jaw, brow and side fins carry the silhouette;
# the luminous core below it remains the high-value gameplay target.
sphere("Leviathan_Head", (0, -0.30, 4.18), (0.84, 0.94, 0.54), ARMOR, "head", 48, 28)
sphere("Leviathan_Snout", (0, -1.00, 4.02), (0.60, 0.58, 0.28), DARK, "head", 40, 22)
sphere("Leviathan_Jaw", (0, -0.98, 3.78), (0.54, 0.48, 0.13), DARK, "head", 36, 18)
for side in (-1, 1):
    sphere(f"Leviathan_Eye_{side}", (0.34 * side, -1.17, 4.24), (0.10, 0.055, 0.075), EYE, "head", 24, 14)
    cone(
        f"Leviathan_Horn_{side}",
        (0.62 * side, 0.08, 4.66),
        0.22,
        1.5,
        GOLD,
        "head",
        (math.radians(-18), math.radians(20 * side), math.radians(-22 * side)),
    )
    cone(
        f"Leviathan_CheekBlade_{side}",
        (0.74 * side, -0.65, 3.98),
        0.22,
        1.25,
        GOLD,
        "head",
        (math.radians(70), 0, math.radians(36 * side)),
    )
    cone(
        f"Leviathan_TempleFin_{side}",
        (0.95 * side, 0.05, 4.10),
        0.30,
        1.55,
        ARMOR,
        "head",
        (0, math.radians(90), math.radians(90)),
    )
cone("Leviathan_Crown_Center", (0, 0.08, 4.90), 0.24, 1.35, GOLD, "head", (0, 0, 0))
torus("Leviathan_Crown_Halo", (0, 0.15, 4.20), 1.04, 0.035, GOLD, "head", (math.radians(90), 0, 0))

# Vulnerable core and chest armor make the combat target readable.
sphere("Leviathan_Core", (0, -0.55, 3.04), (0.42, 0.22, 0.42), MAGENTA, "core", 40, 24)
torus("Leviathan_CoreFrame", (0, -0.48, 3.04), 0.58, 0.045, GOLD, "core", (math.radians(90), 0, 0))
for side in (-1, 1):
    cone(
        f"Leviathan_CoreBlade_{side}",
        (0.68 * side, -0.28, 3.04),
        0.18,
        1.15,
        ARMOR,
        "core",
        (0, math.radians(90), math.radians(90)),
    )


def action(name, length, pose_frames):
    clip = bpy.data.actions.new(name)
    clip.frame_start = 1
    clip.frame_end = length
    rig.animation_data_create()
    rig.animation_data.action = clip
    for frame, values in pose_frames.items():
        for bone_name, rotation in values.items():
            bone = rig.pose.bones[bone_name]
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = rotation
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone_name)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, clip)
    rig.animation_data.action = None
    return clip


idle_frames = {1: {}, 48: {}, 96: {}}
for index in range(count):
    amount = 0.025 + (index / count) * 0.04
    idle_frames[1][f"body_{index:02d}"] = (0, amount * math.sin(index * 0.55), 0)
    idle_frames[48][f"body_{index:02d}"] = (0, -amount * math.sin(index * 0.55), amount * 0.5)
    idle_frames[96][f"body_{index:02d}"] = idle_frames[1][f"body_{index:02d}"]
idle_frames[1]["head"] = (0.0, 0.0, -0.025)
idle_frames[48]["head"] = (0.035, 0.0, 0.025)
idle_frames[96]["head"] = idle_frames[1]["head"]
action("Leviathan_Idle", 96, idle_frames)
action(
    "Leviathan_TidalBite",
    64,
    {
        1: {"head": (0, 0, 0), "core": (0, 0, 0)},
        24: {"head": (-0.24, 0, 0), "core": (0.12, 0, 0)},
        40: {"head": (0.32, 0, 0.08), "core": (-0.16, 0, 0)},
        64: {"head": (0, 0, 0), "core": (0, 0, 0)},
    },
)
action(
    "Leviathan_Break",
    72,
    {
        1: {"head": (0, 0, 0), "core": (0, 0, 0), "body_04": (0, 0, 0), "body_18": (0, 0, 0)},
        30: {"head": (0.28, 0.12, -0.2), "core": (0.38, 0, 0), "body_04": (0.2, 0.12, 0.25), "body_18": (-0.2, -0.12, -0.25)},
        72: {"head": (0.12, 0, -0.08), "core": (0.18, 0, 0), "body_04": (0.08, 0.04, 0.1), "body_18": (-0.08, -0.04, -0.1)},
    },
)
for track in rig.animation_data.nla_tracks:
    track.mute = track.name != "Leviathan_Idle"

# Presentation lighting and render.
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=4.6, depth=0.12, location=(0, 0, 0))
stage = bpy.context.object
stage.data.materials.append(DARK)
bpy.ops.object.light_add(type="AREA", location=(0, -6, 5.5))
key = bpy.context.object
key.data.energy = 1500
key.data.size = 5
key.data.color = (0.35, 0.65, 1.0)
bpy.ops.object.light_add(type="AREA", location=(4, 1, 4))
rim = bpy.context.object
rim.data.energy = 1100
rim.data.size = 4
rim.data.color = (0.8, 0.2, 1.0)
bpy.ops.object.camera_add(location=(0, -13.5, 3.1))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 2.70)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(OUTPUT_ROOT, "concept", "tide_leviathan_v2_render.png")
scene.world.color = (0.002, 0.004, 0.015)
scene.frame_set(26)

blend_path = os.path.join(OUTPUT_ROOT, "source", "tide_leviathan_v2.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
bpy.ops.render.render(write_still=True)

for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    if obj.name in bpy.data.objects:
        obj.select_set(True)
bpy.context.view_layer.objects.active = rig
glb_path = os.path.join(OUTPUT_ROOT, "exports", "tide_leviathan_v2.glb")
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

triangles = 0
meshes = 0
for obj in objects:
    if obj.type == "MESH":
        meshes += 1
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
report = {
    "schemaVersion": 1,
    "asset": "tide_leviathan",
    "status": "v3_integrated_blockout_exported_not_final",
    "truth": {"commercialReady": False, "finalModel": False, "finalTextures": False},
    "metrics": {
        "meshObjects": meshes,
        "triangles": triangles,
        "bones": len(rig.data.bones),
        "materials": 6,
        "animations": ["Leviathan_Idle", "Leviathan_TidalBite", "Leviathan_Break"],
    },
    "files": {
        "blend": "source/tide_leviathan_v2.blend",
        "glb": "exports/tide_leviathan_v2.glb",
        "render": "concept/tide_leviathan_v2_render.png",
    },
}
with open(os.path.join(OUTPUT_ROOT, "qa", "tide_leviathan_v2_report.json"), "w", encoding="utf8") as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)
print(json.dumps(report, ensure_ascii=False, indent=2))
