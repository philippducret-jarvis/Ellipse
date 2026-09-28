"""V4 silhouette candidate: flowing weighted hair, thorn circlet and silk layers.

Run with seraphine-surface-v3.blend. V3, V2 and the source artwork are untouched.
This is a production-shape review candidate, not an artistic sign-off.
"""

from math import cos, exp, pi, sin
from pathlib import Path
import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine"
TEX = HERO / "textures/v4"
OUT = HERO / "modeling/seraphine-silhouette-v4.glb"
BLEND = HERO / "modeling/seraphine-silhouette-v4.blend"
rig = bpy.data.objects["Seraphine_Deform_Rig"]
skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
collection = bpy.data.collections.new("07_V4_SILHOUETTE_STUDY")
bpy.context.scene.collection.children.link(collection)


def pbr(name, prefix, two_sided=True):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = not two_sided
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    for suffix, slot, space in (
        ("albedo", "Base Color", "sRGB"),
        ("roughness", "Roughness", "Non-Color"),
        ("metallic", "Metallic", "Non-Color"),
    ):
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(TEX / f"{prefix}-{suffix}.png"), check_existing=True)
        tex.image.colorspace_settings.name = space
        links.new(tex.outputs["Color"], bsdf.inputs[slot])
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(TEX / f"{prefix}-normal.png"), check_existing=True)
    tex.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = .45
    links.new(tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


hair_mat = pbr("V4_PBR_Silver_Hair", "hair")
red_silk = pbr("V4_PBR_Crimson_Silk", "silk-crimson")
black_silk = pbr("V4_PBR_Charcoal_Silk", "silk-charcoal")


def solid_material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    mat.use_backface_culling = False
    return mat


gold = solid_material("V4_Burnished_Thorn_Gold", (.42, .28, .10), .82, .31)
rose = solid_material("V4_Velvet_Roses", (.19, .012, .038), .02, .75)


def mesh_object(name, vertices, faces, uvs, bones, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    layer = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            layer.data[loop_index].uv = uvs[data.loops[loop_index].vertex_index]
    groups = {}
    for index, influences in enumerate(bones):
        for bone, weight in influences:
            if weight <= .0001:
                continue
            group = groups.get(bone)
            if group is None:
                group = obj.vertex_groups.new(name=bone)
                groups[bone] = group
            group.add([index], weight, "REPLACE")
    modifier = obj.modifiers.new("Seraphine 72-bone deformation", "ARMATURE")
    modifier.object = rig
    obj.parent = rig
    return obj


bm = bmesh.new()
bm.from_mesh(skin.data)
remove = []
for face in bm.faces:
    c = face.calc_center_median()
    m = face.material_index
    if m == 3 or m in (12, 13):
        remove.append(face)  # rigid locks and V2 rectangular skirt strips
    elif m == 5 and c.z > 1.82 and abs(c.x) < .21:
        remove.append(face)  # old spike crown
    elif m == 8 and c.z > 1.86 and abs(c.x) < .22:
        remove.append(face)  # old crown roses
bmesh.ops.delete(bm, geom=remove, context="FACES")
bm.to_mesh(skin.data)
bm.free()
skin.data.update()

# Rounded scalp: the face remains unobscured, while the back has real volume.
verts, faces, uvs, weights = [], [], [], []
segments, rows = 64, 16
for row in range(rows + 1):
    t = row / rows
    polar = .01 + t * (pi / 2 - .01)
    for col in range(segments + 1):
        u = col / segments
        a = 2 * pi * u
        radial = sin(polar)
        x = .119 * radial * cos(a)
        y = .103 * radial * sin(a) + .01
        z = 1.79 + .192 * cos(polar) + .075 * max(0, -sin(a)) * t
        verts.append((x, y, z))
        uvs.append((u, 1 - t))
        weights.append([("head", 1)])
        if row and col:
            i = row * (segments + 1) + col
            faces.append((i - segments - 2, i - segments - 1, i, i - 1))
parts = [mesh_object("V4_Sculpted_Scalp", verts, faces, uvs, weights, hair_mat)]

# Hair ribbons: curved cross-sections, taper, anisotropic fiber texture and
# graded weights from the head to the existing secondary hair joints.
for strand in range(112):
    a = 2 * pi * (strand + .21 * sin(strand * 11.3)) / 112
    front = sin(a) < -.25
    if front and abs(cos(a)) < .36:
        continue
    seed = strand * .73
    length = (1.00 if front else 1.28) + .20 * sin(seed * 1.4) ** 2
    width = .010 + .008 * (1 + sin(seed * 2.7)) / 2
    root_x, root_y = .095 * cos(a), .083 * sin(a) + .005
    radial_x, radial_y = cos(a), sin(a)
    tang_x, tang_y = -radial_y, radial_x
    pivot = f"seraphine_secondary_{18 + strand % 26}"
    verts, faces, uvs, weights = [], [], [], []
    for row in range(33):
        t = row / 32
        fan = (.15 if front else .31) * t ** 1.2
        sweep = .018 * sin(t * 14 + seed) * t + .012 * sin(t * 26 + seed * .6) * t ** 2
        cx = root_x + radial_x * fan + tang_x * sweep
        cy = root_y + radial_y * fan * .47 + .020 * sin(t * 10 + seed * .8) * t
        cz = 1.90 - length * t + .025 * sin(t * 8 + seed) * t ** 2
        span = width * (1 + .55 * sin(pi * t)) * (1 - t ** 2.5) + .0008
        for col in range(5):
            s = col / 4 * 2 - 1
            # Convex strand surface; overlaps read as locks rather than cards.
            verts.append((cx + tang_x * span * s + radial_x * .002 * (1 - s * s),
                          cy + tang_y * span * s + radial_y * .005 * (1 - s * s), cz + .004 * (1 - s * s)))
            uvs.append((col / 4, t * 2.7))
            tip = min(.86, .86 * t ** 1.1)
            weights.append([("head", 1 - tip), (pivot, tip)])
            if row and col:
                i = row * 5 + col
                faces.append((i - 6, i - 5, i, i - 1))
    parts.append(mesh_object(f"V4_Hair_Lock_{strand:03d}", verts, faces, uvs, weights, hair_mat))


def swept_thorn(name, path, radii, material):
    vertices, faces, uvs, weights = [], [], [], []
    for row, center in enumerate(path):
        for col in range(8):
            a = 2 * pi * col / 8
            r = radii[row]
            vertices.append((center[0] + r * cos(a), center[1] + r * sin(a), center[2]))
            uvs.append((col / 8, row / (len(path) - 1)))
            weights.append([("head", 1)])
            if row:
                nxt = (col + 1) % 8
                faces.append(((row - 1) * 8 + col, (row - 1) * 8 + nxt,
                              row * 8 + nxt, row * 8 + col))
    return mesh_object(name, vertices, faces, uvs, weights, material)


# Sculpted circlet ring and long, irregular gothic thorns.
vertices, faces, uvs, weights = [], [], [], []
for row in range(65):
    a = 2 * pi * row / 64
    for col in range(8):
        c = 2 * pi * col / 8
        r = .006
        vertices.append((.133 * cos(a) + r * cos(c) * cos(a),
                         .114 * sin(a) + r * cos(c) * sin(a), 1.955 + r * sin(c)))
        uvs.append((row / 64, col / 8))
        weights.append([("head", 1)])
        if row:
            nxt = (col + 1) % 8
            faces.append(((row - 1) * 8 + col, (row - 1) * 8 + nxt,
                          row * 8 + nxt, row * 8 + col))
parts.append(mesh_object("V4_Thorn_Circlet", vertices, faces, uvs, weights, gold))
for index in range(22):
    a = 2 * pi * index / 22
    x, y = .132 * cos(a), .114 * sin(a)
    height = .055 + .07 * (1 + sin(index * 2.1)) / 2
    path = [(x, y, 1.955), (x * 1.15, y * 1.14, 1.98 + height * .3),
            (x * 1.27, y * 1.21, 1.985 + height * .72),
            (x * 1.22, y * 1.15, 1.99 + height)]
    parts.append(swept_thorn(f"V4_Crown_Thorn_{index:02d}", path, [.007, .006, .003, .0005], gold))

# Rose petal geometry sits on four circlet positions instead of the V2 spheres.
for index, a in enumerate((-.22, .30, 2.65, 3.42)):
    cx, cy, cz = .136 * cos(a), .116 * sin(a), 1.958
    vertices, faces, uvs, weights = [], [], [], []
    for layer in range(3):
        count = 6 + layer * 2
        for petal in range(count):
            angle = 2 * pi * petal / count + layer * .27
            start = len(vertices)
            for row in range(5):
                t = row / 4
                spread = (.010 + layer * .006) * sin(pi * t) + .002
                radial = (.008 + layer * .009) * t
                for col in range(3):
                    s = col - 1
                    vertices.append((cx + radial * cos(angle) - s * spread * sin(angle),
                                     cy + radial * sin(angle) + s * spread * cos(angle),
                                     cz + .018 * sin(pi * t) - layer * .006 + .006 * s * s))
                    uvs.append(((s + 1) / 2, t))
                    weights.append([("head", 1)])
                    if row and col:
                        i = start + row * 3 + col
                        faces.append((i - 4, i - 3, i, i - 1))
    parts.append(mesh_object(f"V4_Crown_Rose_{index}", vertices, faces, uvs, weights, rose))

# Long overlapping silk leaves open the central front for legs and sword.
for panel in range(22):
    angle = 2 * pi * panel / 22
    front = sin(angle) < -.6 and abs(cos(angle)) < .27
    if front:
        continue
    crimson = panel % 4 != 0
    width = .16 + .035 * sin(panel * 1.8) ** 2
    hem = .06 + .06 * sin(panel * 2.9) ** 2
    pivot = f"seraphine_secondary_{44 + panel % 13}"
    verts, faces, uvs, weights = [], [], [], []
    for row in range(29):
        t = row / 28
        z = 1.10 * (1 - t) + hem * t
        r = .18 + (.35 + .11 * sin(panel * .8) ** 2) * t ** 1.25
        for col in range(7):
            s = col / 3 - 1
            a = angle + s * width * (1 + .35 * t)
            fold = .018 * sin(t * 20 + s * 5 + panel) * t
            edge_lift = .045 * abs(s) ** 2 * t ** 2
            vertices_x = (r + fold) * cos(a)
            vertices_y = (r + fold) * sin(a)
            verts.append((vertices_x, vertices_y, z + edge_lift + .013 * sin(t * 9 + panel) * t))
            uvs.append((col / 6, t))
            tip = .86 * t
            weights.append([("hips", 1 - tip), (pivot, tip)])
            if row and col:
                i = row * 7 + col
                faces.append((i - 8, i - 7, i, i - 1))
    parts.append(mesh_object(f"V4_Silk_Layer_{panel:02d}", verts, faces, uvs, weights, red_silk if crimson else black_silk))

skin["status"] = "V3 animated body with rigid hair and rectangular V2 skirt strips removed"
rig["status"] = "72-bone rig; V4 hair, circlet and silk are UV mapped and skinned"
bpy.context.scene["art_status"] = "V4 silhouette review candidate; target fidelity not approved"
bpy.context.scene["v4_reference"] = str(HERO / "turnaround-v1.png")

rig.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
for obj in [skin, bpy.data.objects["Face_retopped_UV_V3"], bpy.data.objects["Bodice_retopped_UV_V3"], *parts, rig]:
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
print(f"V4 silhouette: {OUT}; {len(parts)} new skinned parts; {len(remove)} source faces removed")
