"""Render a deterministic QA preview for an exported Orbes d'Astra GLB."""

import bpy
import math
import os
import sys
from mathutils import Vector


def arg(name, default=None):
    if "--" not in sys.argv:
        return default
    values = sys.argv[sys.argv.index("--") + 1 :]
    if name not in values:
        return default
    index = values.index(name)
    return values[index + 1] if index + 1 < len(values) else default


input_path = os.path.abspath(arg("--input"))
output_path = os.path.abspath(arg("--output"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
# MPFB may register hidden rig-shape helpers in the startup scene. Hidden
# objects are not guaranteed to be selected by the operator above.
for startup_object in list(bpy.data.objects):
    bpy.data.objects.remove(startup_object, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=input_path)
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
# Blender may synthesize an unmaterialed unit icosphere to display imported
# transform-only helper nodes. It is not a mesh present in the GLB.
for imported_object in list(bpy.data.objects):
    if (
        imported_object.type == "MESH"
        and imported_object.parent is None
        and imported_object.name.startswith("Icosphere")
        and len(imported_object.material_slots) == 0
    ):
        bpy.data.objects.remove(imported_object, do_unlink=True)

renderables = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
depsgraph = bpy.context.evaluated_depsgraph_get()
minimum = Vector((1e9, 1e9, 1e9))
maximum = Vector((-1e9, -1e9, -1e9))
for obj in renderables:
    evaluated = obj.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh()
    object_minimum = Vector((1e9, 1e9, 1e9))
    object_maximum = Vector((-1e9, -1e9, -1e9))
    for vertex in evaluated_mesh.vertices:
        world = evaluated.matrix_world @ vertex.co
        object_minimum.x = min(object_minimum.x, world.x)
        object_minimum.y = min(object_minimum.y, world.y)
        object_minimum.z = min(object_minimum.z, world.z)
        object_maximum.x = max(object_maximum.x, world.x)
        object_maximum.y = max(object_maximum.y, world.y)
        object_maximum.z = max(object_maximum.z, world.z)
        minimum.x = min(minimum.x, world.x)
        minimum.y = min(minimum.y, world.y)
        minimum.z = min(minimum.z, world.z)
        maximum.x = max(maximum.x, world.x)
        maximum.y = max(maximum.y, world.y)
        maximum.z = max(maximum.z, world.z)
    evaluated.to_mesh_clear()
    if (
        object_minimum.z < -0.05
        or object_maximum.x - object_minimum.x > 1.5
        or object_maximum.y - object_minimum.y > 1.5
    ):
        print(
            "QA suspicious object",
            obj.name,
            tuple(round(value, 4) for value in object_minimum),
            tuple(round(value, 4) for value in object_maximum),
        )

center = (minimum + maximum) * 0.5
extent = maximum - minimum
print("QA bounds", tuple(round(value, 4) for value in minimum), tuple(round(value, 4) for value in maximum))
height = max(0.8, extent.z)
radius = max(extent.x, extent.y, extent.z) * 0.58

floor_mat = bpy.data.materials.new("PreviewFloor")
floor_mat.diffuse_color = (0.008, 0.012, 0.035, 1)
floor_mat.use_nodes = True
floor_shader = floor_mat.node_tree.nodes.get("Principled BSDF")
floor_shader.inputs["Base Color"].default_value = (0.008, 0.012, 0.035, 1)
floor_shader.inputs["Metallic"].default_value = 0.72
floor_shader.inputs["Roughness"].default_value = 0.22

bpy.ops.mesh.primitive_cylinder_add(
    vertices=96,
    radius=max(0.8, extent.x * 0.75),
    depth=0.055,
    location=(center.x, center.y, minimum.z - 0.04),
)
stage = bpy.context.object
stage.data.materials.append(floor_mat)

bpy.ops.object.light_add(type="AREA", location=(center.x + radius * 1.2, center.y - radius * 2.1, center.z + height * 0.85))
key = bpy.context.object
key.data.energy = 1250
key.data.shape = "DISK"
key.data.size = max(2.0, radius * 1.3)
key.data.color = (0.52, 0.76, 1.0)
key.rotation_euler = (Vector(center) - key.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.object.light_add(type="AREA", location=(center.x - radius * 1.4, center.y + radius * 0.8, center.z + height * 0.55))
rim = bpy.context.object
rim.data.energy = 1100
rim.data.size = max(1.6, radius)
rim.data.color = (0.72, 0.22, 1.0)
rim.rotation_euler = (Vector(center) - rim.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.object.light_add(type="POINT", location=(center.x, center.y - radius * 0.8, center.z + height * 0.15))
fill = bpy.context.object
fill.data.energy = 240
fill.data.color = (1.0, 0.56, 0.22)

distance = max(3.4, height * 2.25, radius * 3.2)
bpy.ops.object.camera_add(location=(center.x + height * 0.20, center.y - distance, center.z + height * 0.04))
camera = bpy.context.object
camera.data.lens = 58
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera

world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.004, 0.018, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.14

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 768
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = output_path
scene.render.film_transparent = False
scene.render.image_settings.color_depth = "8"
bpy.ops.render.render(write_still=True)

print(output_path)
