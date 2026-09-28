"""Add weighted hair and layered cloth to the animated Séraphine rig.

The previous candidate remains untouched. This is an editable geometry study,
not a replacement for sculpting production anatomy and texturing the costume.
"""

from pathlib import Path
from math import cos, pi, sin
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine"
OUTPUT = HERO / "modeling/seraphine-atelier-v2.glb"
BLEND = HERO / "modeling/seraphine-atelier-v2.blend"

skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
armature = bpy.data.objects["Seraphine_Deform_Rig"]
sculpt = bpy.data.collections["03_HD_SCULPT_create_here"]
def make_material(name, color, metallic, roughness, double_sided=True):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    material.use_backface_culling = not double_sided
    return material


hair_light = make_material("Atelier_Hair_Silver", (.75, .74, .79), .04, .49)
hair_highlight = make_material("Atelier_Hair_Highlight", (.92, .87, .86), .02, .43)
silk_crimson = make_material("Atelier_Rose_Silk", (.14, .014, .032), .04, .69)
silk_black = make_material("Atelier_Charcoal_Silk", (.021, .018, .026), .02, .78)


def make_mesh(name, vertices, faces, weights, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    sculpt.objects.link(obj)
    obj.data.materials.append(material)
    groups = {}
    for index, influences in enumerate(weights):
        for bone, weight in influences:
            group = groups.get(bone)
            if group is None:
                group = obj.vertex_groups.new(name=bone)
                groups[bone] = group
            group.add([index], weight, "REPLACE")
    return obj


parts = []
# Soft asymmetric strands add the large silver hair mass visible in the target.
# Each strip is true 3D geometry and follows a secondary head pivot.
for strand in range(60):
    theta = 2 * pi * strand / 60
    front = sin(theta) < -.1
    if front and abs(cos(theta)) < .58:
        continue  # Keep the face visible.
    length = (.83 if front else 1.13) + .06 * sin(strand * 2.4)
    width = .012 + .004 * (1 + sin(strand * 3.1))
    pivot = f"seraphine_secondary_{18 + int(strand / 60 * 26)}"
    verts, faces, weights = [], [], []
    for step in range(13):
        t = step / 12
        root_x = .105 * cos(theta)
        root_y = .095 * sin(theta)
        fan = (.12 if front else .21) * t * cos(theta)
        sway = .025 * sin(t * 8 + theta * 3) * t
        x = root_x + fan + sway
        y = root_y + (.06 if front else .12) * t * sin(theta)
        z = 1.91 - length * t
        half = width * (1 - t ** 2) + .001
        for side in (-1, 1):
            verts.append((x + side * half, y + side * .002 * sin(t * 10), z))
            weights.append([("head", 1 - .80 * t), (pivot, .80 * t)] if t else [("head", 1)])
        if step:
            i = step * 2
            faces.append((i - 2, i - 1, i + 1, i))
    parts.append(make_mesh(f"Silver_hair_lock_{strand:02d}", verts, faces, weights, hair_light if strand % 3 else hair_highlight))

# Layered cloth panels replace the straight skirt outline with a tiered,
# irregular silhouette. Their hems remain weighted to cloth pivot bones.
for panel in range(26):
    theta = 2 * pi * panel / 26
    pivot = f"seraphine_secondary_{44 + panel % 13}"
    verts, faces, weights = [], [], []
    for step in range(12):
        t = step / 11
        hem = .08 + .08 * sin(panel * 2.3) ** 2
        z = 1.10 * (1 - t) + hem * t
        radius = .19 + .36 * t + .018 * sin(t * 14 + panel)
        for across in range(3):
            angle = theta + (across - 1) * (.17 + .045 * t)
            fold = .024 * sin(t * 19 + panel * .7 + across)
            verts.append(((radius + fold) * cos(angle), (radius + fold) * sin(angle), z + (across - 1) ** 2 * .025 * t))
            weights.append([("hips", 1 - .86 * t), (pivot, .86 * t)] if t else [("hips", 1)])
        if step:
            i = step * 3
            faces.extend(((i - 3, i - 2, i + 1, i), (i - 2, i - 1, i + 2, i + 1)))
    parts.append(make_mesh(f"Layered_skirt_panel_{panel:02d}", verts, faces, weights, silk_crimson if panel % 3 else silk_black))

bpy.ops.object.select_all(action="DESELECT")
skin.select_set(True)
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = skin
bpy.ops.object.join()

skin["status"] = "Weighted hair and layered cloth study; remodel face and garments for final quality"
armature["status"] = "Skinned pilot plus weighted hair and cloth study; 42 animation actions retained"
armature.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
skin.select_set(True)
armature.select_set(True)
bpy.context.view_layer.objects.active = armature
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", use_selection=True,
                          export_animations=True, export_animation_mode="ACTIONS",
                          export_force_sampling=True, export_bake_animation=True,
                          export_optimize_animation_size=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
print(f"Weighted geometry study: {OUTPUT} · {len(parts)} new parts")
