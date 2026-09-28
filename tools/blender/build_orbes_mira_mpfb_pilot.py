"""Build the first production-quality humanoid pilot for Orbes d'Astra.

The character body, face topology and game rig come from MPFB/MakeHuman's CC0
asset base. The Astra costume silhouette, astral accessories, weapon, sockets,
materials, presentation scene and export contract are authored by this script.

The goal of this file is not to mass-produce 24 characters blindly. It is the
visual and technical gate for the catalog v2 pipeline: one complete guardian
must look coherent in Blender and survive a GLB round-trip before the shared
builder is allowed to scale the approach to the full roster.
"""

from __future__ import annotations

import importlib
import json
import math
import os
import sys
from collections.abc import Iterable

import bpy
from mathutils import Matrix, Vector


def dynamic_import(module_suffix: str, symbol: str):
    for module_name in sys.modules:
        if module_name.endswith(module_suffix):
            module = importlib.import_module(module_name)
            return getattr(module, symbol)
    raise RuntimeError(f"MPFB module is not loaded: {module_suffix}")


def cli_arg(name: str, default: str) -> str:
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    if name not in args:
        return default
    index = args.index(name)
    return args[index + 1] if index + 1 < len(args) else default


PROJECT_ROOT = os.path.abspath(cli_arg("--project-root", os.getcwd()))
OUTPUT_DIR = os.path.abspath(
    cli_arg(
        "--output-dir",
        os.path.join(
            PROJECT_ROOT,
            "workspaces",
            "orbes-d-astra",
            "03_assets",
            "3d",
            "catalog_v2",
            "guardians",
            "mira",
        ),
    )
)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def reset_scene() -> None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.shape_keys,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)
    # Animation actions are marked with a fake user for glTF export. They must
    # never leak from one generated guardian into the next.
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def make_material(
    name: str,
    color: tuple[float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.4,
    emission: tuple[float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, alpha)
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.22 if metallic > 0.2 else 0.06
    if emission is not None:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        shader.inputs["Alpha"].default_value = alpha
        material.surface_render_method = "DITHERED"
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def apply_game_skin(
    body: bpy.types.Object,
    diffuse_path: str,
) -> bpy.types.Material:
    """Replace MPFB's multi-image skin graph with a deterministic glTF PBR graph."""
    material = bpy.data.materials.new("Mira_Skin_Godot_PBR")
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    shader = tree.nodes.new("ShaderNodeBsdfPrincipled")
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(diffuse_path, check_existing=True)
    texture.interpolation = "Linear"
    shader.inputs["Roughness"].default_value = 0.48
    shader.inputs["Metallic"].default_value = 0.0
    if "Subsurface Weight" in shader.inputs:
        shader.inputs["Subsurface Weight"].default_value = 0.055
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.04
    tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    assign_material(body, material)
    return material


def shade_smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def mark_export(obj: bpy.types.Object) -> bpy.types.Object:
    obj["orbes_export"] = True
    return obj


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    segments: int = 32,
    rings: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    shade_smooth(obj)
    return mark_export(obj)


def add_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.02,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0:
        modifier = obj.modifiers.new("Edge softness", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    assign_material(obj, material)
    shade_smooth(obj)
    return mark_export(obj)


def add_cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    *,
    vertices: int = 24,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(start_vector + end_vector) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    assign_material(obj, material)
    shade_smooth(obj)
    return mark_export(obj)


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    major_segments: int = 48,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    shade_smooth(obj)
    return mark_export(obj)


def add_fitted_corset(
    name: str,
    body: bpy.types.Object,
    material: bpy.types.Material,
    rig: bpy.types.Object,
    bone: str,
) -> bpy.types.Object:
    """Extract the visible torso surface to obtain a truly fitted armor shell."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = body.evaluated_get(depsgraph)
    source_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    used_vertices: dict[int, int] = {}
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for polygon in source_mesh.polygons:
        center = sum((source_mesh.vertices[index].co for index in polygon.vertices), Vector()) / len(
            polygon.vertices
        )
        if not (1.08 <= center.z <= 1.47):
            continue
        if center.y > 0.075 or abs(center.x) > 0.34:
            continue
        # Open V neckline and two side slits preserve Mira's elegant/sexy design.
        if center.z > 1.355 and abs(center.x) < 0.105:
            continue
        if center.z < 1.17 and abs(center.x) > 0.19:
            continue
        remapped: list[int] = []
        for source_index in polygon.vertices:
            if source_index not in used_vertices:
                source_vertex = source_mesh.vertices[source_index]
                offset_position = source_vertex.co + source_vertex.normal * 0.012
                used_vertices[source_index] = len(vertices)
                vertices.append(tuple(offset_position))
            remapped.append(used_vertices[source_index])
        faces.append(tuple(remapped))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    evaluated.to_mesh_clear()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = body.matrix_world.copy()
    assign_material(obj, material)
    solidify = obj.modifiers.new("Tailored armor thickness", "SOLIDIFY")
    solidify.thickness = 0.012
    solidify.offset = 0.0
    bevel = obj.modifiers.new("Tailored armor bevel", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    shade_smooth(obj)
    mark_export(obj)
    parent_to_bone_keep_transform(obj, rig, bone)
    return obj


def add_fitted_briefs(
    name: str,
    body: bpy.types.Object,
    material: bpy.types.Material,
    rig: bpy.types.Object,
) -> bpy.types.Object:
    """Extract high-waist, high-cut fantasy briefs from the evaluated body."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = body.evaluated_get(depsgraph)
    source_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    used_vertices: dict[int, int] = {}
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for polygon in source_mesh.polygons:
        center = sum((source_mesh.vertices[index].co for index in polygon.vertices), Vector()) / len(
            polygon.vertices
        )
        if not (0.79 <= center.z <= 1.105):
            continue
        if abs(center.x) > 0.36:
            continue
        # High-cut leg openings: lower at center, higher toward the hips.
        opening_height = 0.79 + min(abs(center.x), 0.30) * 0.62
        if center.z < opening_height:
            continue
        remapped: list[int] = []
        for source_index in polygon.vertices:
            if source_index not in used_vertices:
                source_vertex = source_mesh.vertices[source_index]
                offset_position = source_vertex.co + source_vertex.normal * 0.010
                used_vertices[source_index] = len(vertices)
                vertices.append(tuple(offset_position))
            remapped.append(used_vertices[source_index])
        faces.append(tuple(remapped))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    evaluated.to_mesh_clear()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = body.matrix_world.copy()
    assign_material(obj, material)
    solidify = obj.modifiers.new("Tailored fabric thickness", "SOLIDIFY")
    solidify.thickness = 0.010
    solidify.offset = 0.0
    bevel = obj.modifiers.new("Tailored fabric edge", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    shade_smooth(obj)
    mark_export(obj)
    parent_to_bone_keep_transform(obj, rig, "pelvis")
    return obj


def add_fitted_legwear(
    name: str,
    side_sign: float,
    body: bpy.types.Object,
    material: bpy.types.Material,
    rig: bpy.types.Object,
    bone: str,
) -> bpy.types.Object:
    """Create one fitted knee-high armored stocking from the deformed body."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = body.evaluated_get(depsgraph)
    source_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    used_vertices: dict[int, int] = {}
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for polygon in source_mesh.polygons:
        center = sum((source_mesh.vertices[index].co for index in polygon.vertices), Vector()) / len(
            polygon.vertices
        )
        if not (0.065 <= center.z <= 0.62):
            continue
        if center.x * side_sign < 0.035:
            continue
        remapped: list[int] = []
        for source_index in polygon.vertices:
            if source_index not in used_vertices:
                source_vertex = source_mesh.vertices[source_index]
                offset_position = source_vertex.co + source_vertex.normal * 0.009
                used_vertices[source_index] = len(vertices)
                vertices.append(tuple(offset_position))
            remapped.append(used_vertices[source_index])
        faces.append(tuple(remapped))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    evaluated.to_mesh_clear()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = body.matrix_world.copy()
    assign_material(obj, material)
    solidify = obj.modifiers.new("Armored stocking thickness", "SOLIDIFY")
    solidify.thickness = 0.009
    solidify.offset = 0.0
    bevel = obj.modifiers.new("Armored stocking edge", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    shade_smooth(obj)
    mark_export(obj)
    parent_to_bone_keep_transform(obj, rig, bone)
    return obj


def pose_bone_endpoints(
    rig: bpy.types.Object,
    bone_name: str,
) -> tuple[Vector, Vector]:
    bone = rig.pose.bones[bone_name]
    return rig.matrix_world @ bone.head, rig.matrix_world @ bone.tail


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_1: float,
    radius_2: float,
    depth: float,
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 24,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_1,
        radius2=radius_2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    shade_smooth(obj)
    return mark_export(obj)


def parent_to_bone_keep_transform(
    obj: bpy.types.Object,
    rig: bpy.types.Object,
    bone_name: str,
) -> None:
    world_matrix = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world_matrix


def add_socket(
    rig: bpy.types.Object,
    name: str,
    bone: str,
    world_location: tuple[float, float, float],
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    # Plain-axis empties survive glTF as transform nodes. Sphere display empties
    # are converted by some importers into a visible unit icosphere.
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.055
    obj.location = world_location
    mark_export(obj)
    parent_to_bone_keep_transform(obj, rig, bone)
    return obj


def add_robe_panel(
    name: str,
    points: list[tuple[float, float, float]],
    material: bpy.types.Material,
    rig: bpy.types.Object,
    bone: str,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name + "_Mesh")
    # Two triangles per visible quad keep the cloth lightweight and predictable.
    mesh.from_pydata(points, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    solidify = obj.modifiers.new("Astral cloth thickness", "SOLIDIFY")
    solidify.thickness = 0.009
    solidify.offset = 0.0
    bevel = obj.modifiers.new("Tailored border", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    mark_export(obj)
    parent_to_bone_keep_transform(obj, rig, bone)
    return obj


def descendants(root: bpy.types.Object) -> Iterable[bpy.types.Object]:
    yield root
    for child in root.children:
        yield from descendants(child)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_compositor() -> None:
    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    render_layers = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 1.25
    glare.size = 7
    composite = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], composite.inputs["Image"])


def setup_presentation_scene(
    dark: bpy.types.Material,
    gold: bpy.types.Material,
    glow: bpy.types.Material,
) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1120
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.filepath = os.path.join(OUTPUT_DIR, "mira_mpfb_pilot.png")
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.use_file_extension = True
    scene.world.color = (0.002, 0.004, 0.012)
    if scene.world.use_nodes:
        background = scene.world.node_tree.nodes.get("Background")
        background.inputs["Color"].default_value = (0.0015, 0.003, 0.012, 1.0)
        background.inputs["Strength"].default_value = 0.22

    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.22, depth=0.14, location=(0, 0, 0.02))
    platform = bpy.context.object
    platform.name = "Preview_Celestial_Dais"
    assign_material(platform, dark)
    bevel = platform.modifiers.new("Dais bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 4
    add_torus("Preview_Dais_Gold", (0, 0, 0.10), 1.02, 0.018, gold, major_segments=72)
    add_torus("Preview_Dais_Glow", (0, 0, 0.115), 0.83, 0.012, glow, major_segments=72)

    # A small deterministic constellation replaces a flat studio background.
    for index in range(42):
        angle = index * 2.399963
        radius = 2.5 + (index % 7) * 0.27
        z = 0.35 + ((index * 17) % 29) / 29.0 * 2.55
        x = math.cos(angle) * radius
        y = 0.72 + math.sin(angle) * radius * 0.32
        star = add_uv_sphere(
            f"Preview_Star_{index:02d}",
            (x, y, z),
            (0.007 + (index % 3) * 0.003,) * 3,
            glow,
            segments=8,
            rings=6,
        )
        star["orbes_export"] = False

    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (1.72, -3.45, 1.82)
    camera.data.lens = 58
    look_at(camera, (0.0, 0.0, 1.03))
    scene.camera = camera

    def area_light(
        name: str,
        location: tuple[float, float, float],
        color: tuple[float, float, float],
        energy: float,
        size: float,
    ) -> None:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.color = color
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, (0.0, 0.0, 1.05))

    area_light("Key_Moon", (-2.8, -3.5, 3.9), (0.54, 0.88, 1.0), 720.0, 3.2)
    area_light("Fill_Gold", (3.2, -1.5, 2.3), (1.0, 0.58, 0.20), 410.0, 2.7)
    area_light("Rim_Teal", (0.2, 2.4, 3.0), (0.0, 0.75, 0.90), 780.0, 2.4)
    setup_compositor()


def create_mira() -> tuple[bpy.types.Object, bpy.types.Object]:
    HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
    TargetService = dynamic_import("mpfb.services.targetservice", "TargetService")
    AssetService = dynamic_import("mpfb.services.assetservice", "AssetService")

    macro = TargetService.get_default_macro_info_dict()
    macro.update(
        {
            "gender": 1.0,
            "age": 0.42,
            "muscle": 0.48,
            "weight": 0.52,
            "proportions": 0.62,
            "height": 0.56,
            "cupsize": 0.62,
            "firmness": 0.74,
            "race": {"asian": 0.12, "caucasian": 0.26, "african": 0.62},
        }
    )
    body = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    body.name = "Mira_Body_LOD0"
    mark_export(body)
    body["guardian_id"] = "mira"
    body["adult_confirmed"] = True
    body["source_base"] = "MPFB 2.0.17 / MakeHuman CC0 assets"

    skin_path = AssetService.find_asset_absolute_path(
        "young_african_female.mhmat",
        asset_subdir="skins",
    )
    if skin_path is None:
        raise RuntimeError("MakeHuman system skin is missing")
    HumanService.set_character_skin(skin_path, body, skin_type="GAMEENGINE")
    apply_game_skin(
        body,
        os.path.join(os.path.dirname(skin_path), "young_darkskinned_female_diffuse.png"),
    )

    rig = HumanService.add_builtin_rig(body, "game_engine_with_breast")
    rig.name = "Mira_Rig_GameEngine"
    mark_export(rig)
    rig["skeleton_contract"] = "orbes_astra_humanoid_v2"

    return body, rig


def equip_mira_assets(body: bpy.types.Object) -> dict[str, bpy.types.Object]:
    HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
    AssetService = dynamic_import("mpfb.services.assetservice", "AssetService")
    asset_specs = [
        ("eyes", "high-poly.mhclo", "Eyes", "GAMEENGINE"),
        ("eyebrows", "eyebrow006.mhclo", "Eyebrows", "GAMEENGINE"),
        ("eyelashes", "eyelashes01.mhclo", "Eyelashes", "GAMEENGINE"),
        ("teeth", "teeth_base.mhclo", "Teeth", "GAMEENGINE"),
        ("tongue", "tongue01.mhclo", "Tongue", "GAMEENGINE"),
        ("hair", "long01.mhclo", "Hair", "GAMEENGINE"),
        ("clothes", "shoes04.mhclo", "Clothes", "GAMEENGINE"),
    ]
    equipped: dict[str, bpy.types.Object] = {}
    for subdir, filename, asset_type, material_type in asset_specs:
        path = AssetService.find_asset_absolute_path(filename, asset_subdir=subdir)
        if path is None:
            raise RuntimeError(f"Missing MakeHuman system asset: {filename}")
        obj = HumanService.add_mhclo_asset(
            path,
            body,
            asset_type=asset_type,
            subdiv_levels=1 if asset_type in ("Hair", "Clothes") else 0,
            material_type=material_type,
        )
        obj.name = f"Mira_{asset_type}_{os.path.splitext(filename)[0]}"
        mark_export(obj)
        equipped[filename] = obj
    return equipped


def style_mira(
    body: bpy.types.Object,
    rig: bpy.types.Object,
    equipped: dict[str, bpy.types.Object],
) -> dict[str, bpy.types.Material]:
    materials = {
        "midnight": make_material("Mira_Midnight", (0.012, 0.024, 0.060), metallic=0.45, roughness=0.24),
        "teal": make_material("Mira_Tidal_Teal", (0.012, 0.22, 0.255), metallic=0.24, roughness=0.34),
        "deep_teal": make_material("Mira_Deep_Teal", (0.008, 0.070, 0.095), metallic=0.18, roughness=0.42),
        "gold": make_material("Mira_Antique_Gold", (0.68, 0.37, 0.075), metallic=0.92, roughness=0.16),
        "moon": make_material(
            "Mira_Moonlight",
            (0.18, 0.80, 0.92),
            metallic=0.12,
            roughness=0.14,
            emission=(0.12, 0.88, 1.0),
            emission_strength=2.2,
        ),
        "veil": make_material(
            "Mira_Astral_Veil",
            (0.02, 0.24, 0.30),
            metallic=0.08,
            roughness=0.28,
            emission=(0.0, 0.22, 0.30),
            emission_strength=0.30,
            alpha=0.72,
        ),
        "hair": make_material("Mira_Hair_Tint", (0.008, 0.012, 0.018), metallic=0.05, roughness=0.30),
        "ivory": make_material("Mira_Teeth_Ivory", (0.84, 0.76, 0.66), roughness=0.32),
        "rose": make_material("Mira_Mouth_Rose", (0.42, 0.055, 0.065), roughness=0.42),
        "sclera": make_material("Mira_Eye_Sclera", (0.72, 0.78, 0.76), roughness=0.30),
        "iris": make_material(
            "Mira_Eye_Iris",
            (0.01, 0.24, 0.30),
            roughness=0.22,
            emission=(0.0, 0.12, 0.15),
            emission_strength=0.35,
        ),
        "pupil": make_material("Mira_Eye_Pupil", (0.001, 0.003, 0.004), roughness=0.24),
    }
    assign_material(equipped["long01.mhclo"], materials["hair"])
    assign_material(equipped["eyebrow006.mhclo"], materials["hair"])
    assign_material(equipped["eyelashes01.mhclo"], materials["hair"])
    assign_material(equipped["teeth_base.mhclo"], materials["ivory"])
    assign_material(equipped["tongue01.mhclo"], materials["rose"])
    assign_material(equipped["high-poly.mhclo"], materials["sclera"])
    assign_material(equipped["shoes04.mhclo"], materials["midnight"])

    # Tailored breastplate/corset, central moonstone and articulated shoulder armor.
    add_fitted_corset("Mira_Oracle_Cuirass", body, materials["teal"], rig, "spine_03")
    add_fitted_briefs("Mira_Oracle_High_Waist", body, materials["midnight"], rig)
    add_fitted_legwear("Mira_Tide_Boot_L", 1.0, body, materials["midnight"], rig, "calf_l")
    add_fitted_legwear("Mira_Tide_Boot_R", -1.0, body, materials["midnight"], rig, "calf_r")
    collar = add_torus(
        "Mira_Celestial_Collar",
        (0.0, 0.005, 1.485),
        0.155,
        0.012,
        materials["gold"],
        rotation=(0.0, 0.0, 0.0),
    )
    parent_to_bone_keep_transform(collar, rig, "spine_03")
    moonstone = add_uv_sphere(
        "Mira_Cuirass_Moonstone",
        (0.0, -0.225, 1.340),
        (0.044, 0.018, 0.060),
        materials["moon"],
        segments=28,
        rings=18,
    )
    parent_to_bone_keep_transform(moonstone, rig, "spine_03")
    trim_segments = [
        ((-0.105, -0.220, 1.395), (0.0, -0.235, 1.305)),
        ((0.0, -0.235, 1.305), (0.105, -0.220, 1.395)),
        ((-0.215, -0.195, 1.225), (0.215, -0.195, 1.225)),
        ((-0.205, -0.175, 1.125), (-0.220, -0.195, 1.350)),
        ((0.205, -0.175, 1.125), (0.220, -0.195, 1.350)),
    ]
    for index, (start, end) in enumerate(trim_segments):
        trim = add_cylinder_between(
            f"Mira_Corset_Gold_Trim_{index:02d}",
            start,
            end,
            0.006,
            materials["gold"],
            vertices=16,
        )
        parent_to_bone_keep_transform(trim, rig, "spine_03")
    waist = add_torus(
        "Mira_Astrolabe_Belt",
        (0.0, 0.0, 0.965),
        0.235,
        0.016,
        materials["gold"],
        rotation=(0.0, 0.0, 0.0),
    )
    parent_to_bone_keep_transform(waist, rig, "pelvis")
    for side, sign in (("L", 1.0), ("R", -1.0)):
        garter = add_torus(
            f"Mira_Moon_Garter_{side}",
            (0.135 * sign, 0.0, 0.705),
            0.105,
            0.008,
            materials["gold"],
            rotation=(0.0, 0.0, 0.0),
            major_segments=36,
        )
        parent_to_bone_keep_transform(garter, rig, f"thigh_{side.lower()}")
    for side, sign in (("L", 1.0), ("R", -1.0)):
        upper_head, _ = pose_bone_endpoints(rig, f"upperarm_{side.lower()}")
        lower_head, lower_tail = pose_bone_endpoints(rig, f"lowerarm_{side.lower()}")
        pauldron = add_uv_sphere(
            f"Mira_Moon_Pauldron_{side}",
            tuple(upper_head),
            (0.085, 0.105, 0.045),
            materials["teal"],
            segments=28,
            rings=16,
        )
        parent_to_bone_keep_transform(pauldron, rig, f"upperarm_{side.lower()}")
        bracer_start = lower_head.lerp(lower_tail, 0.18)
        bracer_end = lower_head.lerp(lower_tail, 0.70)
        bracer = add_cylinder_between(
            f"Mira_Tidal_Bracer_{side}",
            tuple(bracer_start),
            tuple(bracer_end),
            0.049,
            materials["midnight"],
        )
        parent_to_bone_keep_transform(bracer, rig, f"lowerarm_{side.lower()}")

    for side, sign in (("L", 1.0), ("R", -1.0)):
        earring = add_torus(
            f"Mira_Lunar_Earring_{side}",
            (0.085 * sign, -0.012, 1.635),
            0.027,
            0.004,
            materials["gold"],
            rotation=(math.pi / 2.0, 0.0, 0.0),
            major_segments=28,
        )
        parent_to_bone_keep_transform(earring, rig, "head")
    hair_orbit = add_torus(
        "Mira_Hair_Astrolabe",
        (0.095, -0.065, 1.765),
        0.055,
        0.005,
        materials["gold"],
        rotation=(math.pi / 2.0, 0.0, 0.0),
        major_segments=32,
    )
    parent_to_bone_keep_transform(hair_orbit, rig, "head")

    # Layered open veils create the oracle silhouette without hiding the real anatomy.
    panels = [
        [
            (-0.27, 0.06, 1.00),
            (-0.05, 0.10, 1.00),
            (-0.02, 0.13, 0.17),
            (-0.44, 0.20, 0.22),
        ],
        [
            (0.05, 0.10, 1.00),
            (0.27, 0.06, 1.00),
            (0.44, 0.20, 0.22),
            (0.02, 0.13, 0.17),
        ],
        [
            (-0.25, 0.16, 1.01),
            (0.25, 0.16, 1.01),
            (0.39, 0.42, 0.11),
            (-0.39, 0.42, 0.11),
        ],
        [
            (-0.31, -0.02, 0.98),
            (-0.20, 0.08, 0.98),
            (-0.48, 0.21, 0.28),
            (-0.55, 0.08, 0.42),
        ],
        [
            (0.20, 0.08, 0.98),
            (0.31, -0.02, 0.98),
            (0.55, 0.08, 0.42),
            (0.48, 0.21, 0.28),
        ],
    ]
    for index, points in enumerate(panels):
        add_robe_panel(
            f"Mira_Tidal_Veil_{index:02d}",
            points,
            materials["veil"] if index < 3 else materials["teal"],
            rig,
            "pelvis",
        )

    # Floating astrolabe staff: real separate equipment with a hand socket.
    staff_parts: list[bpy.types.Object] = [
        add_cylinder_between(
            "Mira_Staff_Shaft",
            (-0.47, -0.08, 0.16),
            (-0.47, -0.08, 1.68),
            0.027,
            materials["gold"],
            vertices=28,
        ),
        add_uv_sphere(
            "Mira_Staff_Core",
            (-0.47, -0.08, 1.78),
            (0.095, 0.070, 0.095),
            materials["moon"],
            segments=30,
            rings=18,
        ),
        add_torus(
            "Mira_Staff_Orbit_A",
            (-0.47, -0.08, 1.78),
            0.195,
            0.018,
            materials["gold"],
            rotation=(math.pi / 2.0, 0.0, 0.0),
            major_segments=56,
        ),
        add_torus(
            "Mira_Staff_Orbit_B",
            (-0.47, -0.08, 1.78),
            0.145,
            0.013,
            materials["teal"],
            rotation=(0.8, 0.30, 0.55),
            major_segments=48,
        ),
        add_torus(
            "Mira_Staff_Orbit_C",
            (-0.47, -0.08, 1.78),
            0.245,
            0.010,
            materials["moon"],
            rotation=(0.25, 1.0, -0.35),
            major_segments=64,
        ),
    ]
    for part in staff_parts:
        parent_to_bone_keep_transform(part, rig, "hand_r")
        part["gacha_world_matrix"] = [value for row in part.matrix_world for value in row]

    # Halo is a character piece, not part of the preview scene.
    for index, rotation in enumerate(
        [
            (math.pi / 2.0, 0.0, 0.0),
            (math.pi / 2.0, 0.35, 0.0),
        ]
    ):
        halo = add_torus(
            f"Mira_Oracle_Halo_{index}",
            (0.0, 0.115, 1.68),
            0.255 + index * 0.045,
            0.009 + index * 0.002,
            materials["moon"] if index == 1 else materials["gold"],
            rotation=rotation,
            major_segments=64,
        )
        parent_to_bone_keep_transform(halo, rig, "head")

    add_socket(rig, "socket_weapon_r", "hand_r", (-0.47, -0.08, 1.15))
    add_socket(rig, "socket_artifact_l", "hand_l", (0.47, -0.08, 1.15))
    add_socket(rig, "socket_back", "spine_03", (0.0, 0.18, 1.40))
    add_socket(rig, "socket_head_fx", "head", (0.0, 0.08, 1.91))
    return materials


def apply_glamour_pose(rig: bpy.types.Object) -> None:
    # Two-bone IK keeps the adult anatomy intact and gives a readable gacha pose.
    targets = {
        "l": ((0.34, -0.12, 1.04), (0.72, 0.22, 1.18)),
        "r": ((-0.47, -0.08, 1.14), (-0.82, 0.18, 1.28)),
    }
    for side, (hand_position, pole_position) in targets.items():
        hand_target = bpy.data.objects.new(f"Mira_Hand_IK_{side}", None)
        bpy.context.collection.objects.link(hand_target)
        hand_target.location = hand_position
        pole_target = bpy.data.objects.new(f"Mira_Elbow_Pole_{side}", None)
        bpy.context.collection.objects.link(pole_target)
        pole_target.location = pole_position
        constraint = rig.pose.bones[f"lowerarm_{side}"].constraints.new("IK")
        constraint.name = f"Mira_Arm_IK_{side}"
        constraint.target = hand_target
        constraint.pole_target = pole_target
        constraint.chain_count = 2
        constraint.use_tail = True
        constraint.pole_angle = math.radians(-90.0 if side == "l" else 90.0)

    # A slight contrapposto and head turn avoid the mannequin read.
    rig.pose.bones["pelvis"].rotation_mode = "XYZ"
    rig.pose.bones["pelvis"].rotation_euler = (math.radians(2.0), math.radians(-4.0), math.radians(3.0))
    rig.pose.bones["spine_02"].rotation_mode = "XYZ"
    rig.pose.bones["spine_02"].rotation_euler = (math.radians(-3.0), math.radians(2.5), math.radians(-4.0))
    rig.pose.bones["spine_03"].rotation_mode = "XYZ"
    rig.pose.bones["spine_03"].rotation_euler = (math.radians(2.0), math.radians(-2.0), math.radians(6.0))
    rig.pose.bones["head"].rotation_mode = "XYZ"
    rig.pose.bones["head"].rotation_euler = (math.radians(-2.0), math.radians(1.0), math.radians(-8.0))
    rig.pose.bones["thigh_l"].rotation_mode = "XYZ"
    rig.pose.bones["thigh_l"].rotation_euler = (math.radians(-2.0), 0.0, math.radians(1.5))
    rig.pose.bones["thigh_r"].rotation_mode = "XYZ"
    rig.pose.bones["thigh_r"].rotation_euler = (math.radians(2.0), 0.0, math.radians(-1.5))
    bpy.context.view_layer.update()


def realign_pose_authored_equipment(rig: bpy.types.Object) -> None:
    """Restore equipment art direction after the arm moves into its idle pose."""
    for obj in descendants(rig):
        flat_matrix = obj.get("gacha_world_matrix")
        if not flat_matrix:
            continue
        obj.matrix_world = Matrix(
            [list(flat_matrix[index : index + 4]) for index in range(0, 16, 4)]
        )
    bpy.context.view_layer.update()


def bake_idle_action(rig: bpy.types.Object) -> str:
    """Bake the constrained glamour stance into an exportable animation clip."""
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 60
    rig.animation_data_create()
    action = bpy.data.actions.new("Mira_Idle_Glamour")
    action.use_fake_user = True
    rig.animation_data.action = action
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.visual_transform_apply()
    for pose_bone in rig.pose.bones:
        for constraint in list(pose_bone.constraints):
            pose_bone.constraints.remove(constraint)
        pose_bone.rotation_mode = "QUATERNION"
        for frame in (1, 30, 60):
            pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
            pose_bone.keyframe_insert("rotation_quaternion", frame=frame, group=pose_bone.name)
            pose_bone.keyframe_insert("scale", frame=frame, group=pose_bone.name)
    bpy.ops.object.mode_set(mode="OBJECT")
    for helper_name in list(bpy.data.objects.keys()):
        if helper_name.startswith("Mira_Hand_IK_") or helper_name.startswith("Mira_Elbow_Pole_"):
            bpy.data.objects.remove(bpy.data.objects[helper_name], do_unlink=True)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    return action.name


def add_iris_details(
    eyes: bpy.types.Object,
    rig: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    """Add engine-safe iris and pupil geometry to the CC0 eye mesh."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = eyes.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh()
    original_vertices = eyes.data.vertices
    for side, sign in (("L", 1.0), ("R", -1.0)):
        side_indices = [
            vertex.index
            for vertex in original_vertices
            if vertex.co.x * sign > 0.0
        ]
        if not side_indices:
            continue
        front_y = min(original_vertices[index].co.y for index in side_indices)
        front_indices = [
            index
            for index in side_indices
            if original_vertices[index].co.y <= front_y + 0.0045
        ]
        center = sum(
            (evaluated.matrix_world @ evaluated_mesh.vertices[index].co for index in front_indices),
            Vector(),
        ) / len(front_indices)
        forward = (evaluated.matrix_world.to_3x3() @ Vector((0.0, -1.0, 0.0))).normalized()
        iris = add_uv_sphere(
            f"Mira_Iris_{side}",
            tuple(center + forward * 0.002),
            (0.0090, 0.0030, 0.0090),
            materials["iris"],
            segments=20,
            rings=12,
        )
        pupil = add_uv_sphere(
            f"Mira_Pupil_{side}",
            tuple(center + forward * 0.0042),
            (0.0038, 0.0018, 0.0038),
            materials["pupil"],
            segments=16,
            rings=10,
        )
        for detail in (iris, pupil):
            world_matrix = detail.matrix_world.copy()
            detail.parent = rig
            detail.parent_type = "OBJECT"
            detail.matrix_world = world_matrix
    evaluated.to_mesh_clear()


def freeze_pose_as_rest(rig: bpy.types.Object) -> None:
    """Bake the constrained standing pose into a stable game-export rest pose."""
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.visual_transform_apply()
    for pose_bone in rig.pose.bones:
        for constraint in list(pose_bone.constraints):
            pose_bone.constraints.remove(constraint)
    bpy.context.view_layer.update()
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for helper_name in list(bpy.data.objects.keys()):
        if helper_name.startswith("Mira_Hand_IK_") or helper_name.startswith("Mira_Elbow_Pole_"):
            bpy.data.objects.remove(bpy.data.objects[helper_name], do_unlink=True)
    bpy.context.view_layer.update()


def bake_export_geometry(body: bpy.types.Object) -> None:
    """Remove MakeHuman helper geometry that must never enter a game GLB."""
    ExportService = dynamic_import("mpfb.services.exportservice", "ExportService")
    ExportService.bake_modifiers_remove_helpers(
        body,
        bake_masks=True,
        bake_subdiv=False,
        remove_helpers=True,
        also_proxy=True,
    )
    bpy.context.view_layer.update()


def freeze_head_assets(
    equipped: dict[str, bpy.types.Object],
    rig: bpy.types.Object,
) -> None:
    """Bake facial accessories and hair, then bind them to the rig root.

    glTF skin matrices are not reliable after a generated rig's rest pose is
    rewritten. Root-binding preserves the authored rest placement exactly in
    glTF; a dedicated facial rebind pass can later restore head deformation.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for filename, obj in equipped.items():
        if filename == "shoes04.mhclo":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        baked_mesh = bpy.data.meshes.new_from_object(
            evaluated,
            preserve_all_data_layers=True,
            depsgraph=depsgraph,
        )
        world_matrix = obj.matrix_world.copy()
        old_mesh = obj.data
        obj.data = baked_mesh
        obj.modifiers.clear()
        obj.vertex_groups.clear()
        obj.parent = None
        obj.matrix_world = world_matrix
        obj.parent = rig
        obj.parent_type = "OBJECT"
        obj.matrix_world = world_matrix
        if old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)
    bpy.context.view_layer.update()


def export_character(rig: bpy.types.Object) -> str:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [obj for obj in descendants(rig) if obj.get("orbes_export", False)]
    if rig not in export_objects:
        export_objects.append(rig)
    for obj in export_objects:
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    glb_path = os.path.join(OUTPUT_DIR, "mira_lod0.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_skins=True,
        export_morph=True,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    return glb_path


def build_report(body: bpy.types.Object, rig: bpy.types.Object, glb_path: str) -> None:
    objects = [obj for obj in descendants(rig) if obj.get("orbes_export", False)]
    triangles = 0
    materials = set()
    for obj in objects:
        if obj.type != "MESH":
            continue
        triangles += sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
        materials.update(slot.material.name for slot in obj.material_slots if slot.material)
    report = {
        "schemaVersion": 2,
        "guardian": "mira",
        "status": "visual_and_technical_pilot",
        "adultConfirmed": True,
        "bodySource": "MPFB 2.0.17 / MakeHuman CC0",
        "blender": bpy.app.version_string,
        "dimensionsMeters": [round(value, 4) for value in body.dimensions],
        "meshObjects": sum(obj.type == "MESH" for obj in objects),
        "trianglesBeforeExportModifiers": triangles,
        "deformBones": sum(bone.use_deform for bone in rig.data.bones),
        "materials": sorted(materials),
        "sockets": [
            "socket_weapon_r",
            "socket_artifact_l",
            "socket_back",
            "socket_head_fx",
        ],
        "files": {
            "blend": "mira_source.blend",
            "glb": os.path.basename(glb_path),
            "preview": "mira_mpfb_pilot.png",
        },
        "qualityGate": {
            "realHumanoidTopology": True,
            "gameEngineRig": True,
            "texturedSkin": True,
            "eyesHairTeeth": True,
            "customAstraCostume": True,
            "customSignatureWeapon": True,
            "glbRoundTripPending": True,
            "godotImportPending": True,
            "commercialFinalSculpt": False,
        },
    }
    with open(os.path.join(OUTPUT_DIR, "qa-report.json"), "w", encoding="utf8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)


def main() -> None:
    reset_scene()
    body, rig = create_mira()
    equipped = equip_mira_assets(body)
    materials = style_mira(body, rig, equipped)
    apply_glamour_pose(rig)
    realign_pose_authored_equipment(rig)
    bake_idle_action(rig)
    add_iris_details(equipped["high-poly.mhclo"], rig, materials)
    bake_export_geometry(body)
    glb_path = export_character(rig)
    setup_presentation_scene(materials["midnight"], materials["gold"], materials["moon"])
    bpy.context.scene.render.filepath = os.path.join(OUTPUT_DIR, "mira_mpfb_pilot.png")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUTPUT_DIR, "mira_source.blend"))
    bpy.ops.render.render(write_still=True)
    build_report(body, rig, glb_path)
    print(
        json.dumps(
            {
                "blend": os.path.join(OUTPUT_DIR, "mira_source.blend"),
                "glb": glb_path,
                "preview": os.path.join(OUTPUT_DIR, "mira_mpfb_pilot.png"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
