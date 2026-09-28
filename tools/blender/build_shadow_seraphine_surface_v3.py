"""Produce an editable, UV-authored face and bodice candidate from V2.

Run with seraphine-atelier-v2.blend open in background Blender. This deliberately
keeps the old source and animation rig, and exports a separate review candidate.
The sculpt meshes and their lower-density quad cages remain in the .blend.
"""

from math import exp, pi, sin, sqrt
from pathlib import Path
import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine"
TEX = HERO / "textures/v3"
OUT = HERO / "modeling/seraphine-surface-v3.glb"
BLEND = HERO / "modeling/seraphine-surface-v3.blend"

skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
rig = bpy.data.objects["Seraphine_Deform_Rig"]
study = bpy.data.collections.get("06_V3_SURFACE_STUDY")
if study is None:
    study = bpy.data.collections.new("06_V3_SURFACE_STUDY")
    bpy.context.scene.collection.children.link(study)


def material(name, prefix, normal_strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    mat.diffuse_color = (.78, .62, .58, 1) if prefix == "face" else (.12, .025, .04, 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    for suffix, color_space, input_name in (
        ("albedo", "sRGB", "Base Color"),
        ("roughness", "Non-Color", "Roughness"),
        ("metallic", "Non-Color", "Metallic"),
    ):
        tex = nodes.new("ShaderNodeTexImage")
        tex.label = f"{prefix} {suffix}"
        tex.image = bpy.data.images.load(str(TEX / f"{prefix}-{suffix}.png"), check_existing=True)
        tex.image.colorspace_settings.name = color_space
        links.new(tex.outputs["Color"], bsdf.inputs[input_name])
        if suffix == "albedo":
            links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    tex = nodes.new("ShaderNodeTexImage")
    tex.label = f"{prefix} tangent normal"
    tex.image = bpy.data.images.load(str(TEX / f"{prefix}-normal.png"), check_existing=True)
    tex.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength
    links.new(tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    return mat


face_mat = material("V3_PBR_Porcelain_Face", "face", .28)
bodice_mat = material("V3_PBR_Brocade_Thorns", "bodice", .55)


def face_point(u, t):
    p = 2 * u - 1
    width = .063 + .050 * max(0, sin(pi * t)) ** .8 + .015 * t
    x = p * width
    z = 1.635 + .285 * t
    y = -.105 + .078 * abs(p) ** 1.65
    y -= .032 * exp(-((p / .18) ** 2 + ((t - .48) / .13) ** 2))  # sculpted nose
    y -= .009 * exp(-(((abs(p) - .48) / .25) ** 2 + ((t - .40) / .19) ** 2))  # cheeks
    y += .009 * exp(-(((abs(p) - .42) / .20) ** 2 + ((t - .62) / .095) ** 2))  # eye sockets
    y -= .006 * exp(-((p / .30) ** 2 + ((t - .25) / .055) ** 2))  # lip volume
    return (x, y, z)


def bodice_point(u, t):
    p = 2 * u - 1
    width = .175 + .064 * abs(t - .45) + .010 * t
    x = p * width
    z = 1.21 + .42 * t
    z -= .067 * exp(-(p / .35) ** 2) * t ** 12  # neckline, low at centre
    z -= .033 * (1 - abs(p)) * (1 - t) ** 12  # pointed lower hem
    y = -.150 + .026 * p * p
    y -= .044 * exp(-(((abs(p) - .47) / .28) ** 2 + ((t - .79) / .17) ** 2))  # fitted cups
    y -= .008 * exp(-((p / .25) ** 2 + ((t - .38) / .27) ** 2))
    return (x, y, z)


def quad_surface(name, cols, rows, point, mat, sculpt=False):
    vertices, faces = [], []
    for row in range(rows + 1):
        for col in range(cols + 1):
            vertices.append(point(col / cols, row / rows))
            if row and col:
                i = row * (cols + 1) + col
                faces.append((i - cols - 2, i - cols - 1, i, i - 1))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    study.objects.link(obj)
    obj.data.materials.append(mat)
    uv = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            vertex_index = data.loops[loop_index].vertex_index
            col = vertex_index % (cols + 1)
            row = vertex_index // (cols + 1)
            uv.data[loop_index].uv = (.035 + .93 * col / cols, .025 + .95 * row / rows)
    if sculpt:
        obj.hide_render = True
        obj.hide_set(True)
        obj["role"] = "high-density sculpt reference, not exported"
    else:
        obj["role"] = "UV-authored quad retopology for game export"
        groups = {name: obj.vertex_groups.new(name=name) for name in ("head", "neck", "chest", "spine", "hips")}
        for vertex in data.vertices:
            t = (vertex.index // (cols + 1)) / rows
            if name.startswith("Face"):
                head = .90 + .10 * t
                weights = (("head", head), ("neck", 1 - head))
            else:
                chest = max(0, min(1, (t - .25) / .50))
                hips = max(0, min(1, (.42 - t) / .42)) * (1 - chest)
                weights = (("chest", chest), ("spine", 1 - chest - hips), ("hips", hips))
            for bone, weight in weights:
                if weight > .0001:
                    groups[bone].add([vertex.index], weight, "REPLACE")
        modifier = obj.modifiers.new("Seraphine skin", "ARMATURE")
        modifier.object = rig
        obj.parent = rig
    return obj


face_sculpt = quad_surface("Face_sculpt_V3", 128, 96, face_point, face_mat, sculpt=True)
bodice_sculpt = quad_surface("Bodice_sculpt_V3", 128, 96, bodice_point, bodice_mat, sculpt=True)
face = quad_surface("Face_retopped_UV_V3", 64, 48, face_point, face_mat)
bodice = quad_surface("Bodice_retopped_UV_V3", 64, 48, bodice_point, bodice_mat)

# Remove only old frontal face/eye/corset polygons. Back of head, arms, animated
# hair and skirt remain in the source skin to preserve their existing motion.
bm = bmesh.new()
bm.from_mesh(skin.data)
remove = []
for poly in bm.faces:
    center = poly.calc_center_median()
    mat = poly.material_index
    if mat in (0, 1, 2, 7):
        remove.append(poly)
    elif mat == 4 and center.z > 1.635 and abs(center.x) < .13 and center.y < .035:
        remove.append(poly)
    elif mat == 9 and 1.25 < center.z < 1.63 and abs(center.x) < .23 and center.y < -.005:
        remove.append(poly)
bmesh.ops.delete(bm, geom=remove, context="FACES")
bm.to_mesh(skin.data)
bm.free()
skin.data.update()

skin["status"] = "V2 animated base with frontal head and bodice replaced by V3 quad surfaces"
rig["status"] = "72-bone animated rig retained; V3 face and bodice have authored UVs and PBR textures"
bpy.context.scene["art_status"] = "V3 face and bodice review candidate; full likeness still requires artist sign-off"
bpy.context.scene["v3_reference"] = str(HERO / "turnaround-v1.png")
bpy.context.scene["v3_texture_license"] = "Project concept-derived candidate, generated with built-in imagegen"

rig.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
for obj in (skin, face, bodice, rig):
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
print(f"V3 surfaces: {OUT}; face {len(face.data.vertices)} verts, bodice {len(bodice.data.vertices)} verts, removed {len(remove)} old polygons")
