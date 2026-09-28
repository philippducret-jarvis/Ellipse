"""Build the 12 canonical Orbes d'Astra familiars from rigged CC0 sources."""

from __future__ import annotations

import json
import math
import os
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def cli_arg(name: str, default: str = "") -> str:
    if "--" not in sys.argv:
        return default
    values = sys.argv[sys.argv.index("--") + 1 :]
    if name not in values:
        return default
    index = values.index(name)
    return values[index + 1] if index + 1 < len(values) else default


PROJECT_ROOT = os.path.abspath(cli_arg("--project-root", os.getcwd()))
SOURCE_ROOT = os.path.abspath(
    cli_arg(
        "--source-root",
        os.path.join(
            os.environ.get("LOCALAPPDATA", ""),
            "EllipseFactory",
            "vendor",
            "quaternius-cute-monsters",
            "Blends",
        ),
    )
)
ONLY_ID = cli_arg("--summon-id")
WORKSPACE = os.path.join(PROJECT_ROOT, "workspaces", "orbes-d-astra")
OUTPUT_ROOT = os.path.join(
    WORKSPACE,
    "03_assets",
    "3d",
    "catalog_v2",
    "summons",
)
RUNTIME_ROOT = os.path.join(
    WORKSPACE,
    "04_runtime",
    "godot",
    "assets",
    "3d",
    "summons_v2",
)
CATALOG_PATH = os.path.join(
    WORKSPACE,
    "04_runtime",
    "godot",
    "data",
    "summons_3d_v2.json",
)
V1_CATALOG = os.path.join(
    WORKSPACE,
    "04_runtime",
    "godot",
    "data",
    "assets_3d_catalog.json",
)

SUMMONS = [
    ("luma", "Bee.blend", "Luma", "Solaire", 0.62),
    ("nebulin", "Alien.blend", "Nebulin", "Nexus", 0.82),
    ("forge_sprite", "Demon.blend", "Sprite de forge", "Feu", 0.84),
    ("moon_hare", "Deer.blend", "Lièvre lunaire", "Lune", 0.78),
    ("crystal_fox", "Panda.blend", "Renard de cristal", "Cristal", 0.74),
    ("tide_otter", "Penguin.blend", "Loutre des marées", "Eau", 0.68),
    ("ember_moth", "Bat.blend", "Phalène braise", "Feu", 0.66),
    ("nexus_whale", "Cthulhu.blend", "Baleine du Nexus", "Nexus", 1.05),
    ("clock_drake", "YellowDragon.blend", "Drake horloge", "Temps", 0.92),
    ("solar_bird", "Chicken.blend", "Oiseau solaire", "Solaire", 0.64),
    ("void_cat", "GreenDemon.blend", "Chat du vide", "Vide", 0.72),
    ("astral_koi", "Ghost.blend", "Koï astral", "Cosmos", 0.78),
]
if ONLY_ID:
    SUMMONS = [summon for summon in SUMMONS if summon[0] == ONLY_ID]
if not SUMMONS:
    raise RuntimeError("No summon matched --summon-id")

PALETTES = {
    "Solaire": ((1.0, 0.42, 0.05), (1.0, 0.76, 0.18)),
    "Feu": ((0.92, 0.07, 0.015), (1.0, 0.34, 0.03)),
    "Lune": ((0.12, 0.58, 0.92), (0.58, 0.88, 1.0)),
    "Eau": ((0.02, 0.42, 0.62), (0.12, 0.86, 1.0)),
    "Cristal": ((0.36, 0.18, 0.72), (0.78, 0.52, 1.0)),
    "Vide": ((0.22, 0.02, 0.34), (0.68, 0.16, 0.92)),
    "Temps": ((0.08, 0.58, 0.58), (0.82, 0.68, 0.16)),
    "Nexus": ((0.22, 0.08, 0.62), (0.28, 0.78, 1.0)),
    "Cosmos": ((0.12, 0.05, 0.32), (0.62, 0.32, 1.0)),
}


def make_material(
    name: str,
    color: tuple[float, float, float],
    emission: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = 0.58 if emission == 0.0 else 0.12
    shader.inputs["Roughness"].default_value = 0.28
    if emission > 0.0:
        shader.inputs["Emission Color"].default_value = (*color, 1.0)
        shader.inputs["Emission Strength"].default_value = emission
    return material


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    bpy.context.view_layer.update()
    minimum = Vector((1e9, 1e9, 1e9))
    maximum = Vector((-1e9, -1e9, -1e9))
    for obj in objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def set_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def add_astra_fx(
    root: bpy.types.Object,
    center: Vector,
    height: float,
    affinity: str,
) -> list[bpy.types.Object]:
    primary, glow = PALETTES[affinity]
    gold_material = make_material(f"{root.name}_AntiqueGold", (0.54, 0.28, 0.055))
    glow_material = make_material(f"{root.name}_Glow", glow, emission=0.75)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=height * 0.34,
        minor_radius=height * 0.010,
        major_segments=48,
        minor_segments=10,
        location=(center.x, center.y + height * 0.08, center.z + height * 0.62),
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    halo = bpy.context.object
    halo.name = f"{root.name}_Astra_Halo"
    set_material(halo, gold_material)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24,
        ring_count=14,
        location=(center.x, center.y - height * 0.25, center.z + height * 0.50),
        scale=(height * 0.055, height * 0.035, height * 0.055),
    )
    core = bpy.context.object
    core.name = f"{root.name}_Astra_Core"
    set_material(core, glow_material)
    for obj in (halo, core):
        obj.parent = root
        obj.matrix_parent_inverse = root.matrix_world.inverted()
        obj["orbes_export"] = True
    root["affinity"] = affinity
    return [halo, core]


def select_only(objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def action_names() -> list[str]:
    return sorted(action.name for action in bpy.data.actions)


def detach_missing_external_images() -> list[str]:
    """Prevent legacy source paths from making Blender's auto-pack fail."""
    bpy.data.use_autopack = False
    detached = []
    for image in list(bpy.data.images):
        if image.source != "FILE" or image.packed_file is not None:
            continue
        absolute_path = bpy.path.abspath(image.filepath)
        if absolute_path and os.path.exists(absolute_path):
            continue
        detached.append(image.name)
        for material in bpy.data.materials:
            if not material.use_nodes or material.node_tree is None:
                continue
            for node in material.node_tree.nodes:
                if getattr(node, "image", None) == image:
                    node.image = None
        bpy.data.images.remove(image)
    return detached


def build_one(
    summon_id: str,
    source_name: str,
    display_name: str,
    affinity: str,
    target_height: float,
) -> dict:
    source_path = os.path.join(SOURCE_ROOT, source_name)
    if not os.path.exists(source_path):
        raise RuntimeError(f"Missing CC0 source: {source_path}")
    bpy.ops.wm.open_mainfile(filepath=source_path)
    scene = bpy.context.scene
    scene.frame_set(scene.frame_start)
    rig = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE"), None)
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if rig is None or not meshes:
        raise RuntimeError(f"Invalid rigged source: {source_path}")

    rig.name = f"{summon_id}_Rig"
    for index, mesh in enumerate(meshes):
        mesh.name = f"{summon_id}_Body_{index:02d}"
        mesh["orbes_export"] = True
    root = bpy.data.objects.new(f"{summon_id}_Root", None)
    scene.collection.objects.link(root)
    root["orbes_export"] = True
    root["source"] = "Quaternius Cute Animated Monsters Pack"
    root["license"] = "CC0"
    root["canonical_summon_id"] = summon_id
    rig.parent = root
    rig["orbes_export"] = True

    minimum, maximum = bounds(meshes)
    source_height = max(0.001, maximum.z - minimum.z)
    scale = target_height / source_height
    root.scale = (scale, scale, scale)
    root.location.z = -minimum.z * scale
    bpy.context.view_layer.update()
    scaled_minimum, scaled_maximum = bounds(meshes)
    center = (scaled_minimum + scaled_maximum) * 0.5
    fx = add_astra_fx(root, center, target_height, affinity)

    for action in bpy.data.actions:
        action.use_fake_user = True
    missing_images = detach_missing_external_images()
    export_objects = [root, rig, *meshes, *fx]
    output_dir = os.path.join(OUTPUT_ROOT, summon_id)
    runtime_dir = os.path.join(RUNTIME_ROOT, summon_id)
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(runtime_dir, exist_ok=True)
    source_copy = os.path.join(output_dir, f"{summon_id}_source.blend")
    glb_path = os.path.join(output_dir, f"{summon_id}_lod0.glb")
    bpy.ops.wm.save_as_mainfile(filepath=source_copy)
    select_only(export_objects)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    runtime_path = os.path.join(runtime_dir, os.path.basename(glb_path))
    shutil.copy2(glb_path, runtime_path)
    triangles = sum(
        sum(max(1, len(polygon.vertices) - 2) for polygon in mesh.data.polygons)
        for mesh in meshes
    )
    report = {
        "id": summon_id,
        "displayName": display_name,
        "affinity": affinity,
        "kind": "rigged_familiar",
        "status": "integration_ready_animated_source",
        "sourceLicense": "CC0",
        "sourcePack": "Quaternius Cute Animated Monsters Pack",
        "sourceBlend": os.path.relpath(source_copy, PROJECT_ROOT).replace("\\", "/"),
        "sourceGlb": os.path.relpath(glb_path, PROJECT_ROOT).replace("\\", "/"),
        "runtime": "res://"
        + os.path.relpath(
            runtime_path,
            os.path.join(WORKSPACE, "04_runtime", "godot"),
        ).replace("\\", "/"),
        "animations": action_names(),
        "detachedMissingImages": missing_images,
        "deformBones": sum(bone.use_deform for bone in rig.data.bones),
        "triangles": triangles,
        "bytes": os.path.getsize(glb_path),
        "commercialFinal": False,
    }
    with open(os.path.join(output_dir, "qa-report.json"), "w", encoding="utf8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    return report


os.makedirs(OUTPUT_ROOT, exist_ok=True)
os.makedirs(RUNTIME_ROOT, exist_ok=True)
items = []
for index, summon in enumerate(SUMMONS, start=1):
    print(f"BUILD_SUMMON {summon[0]} {index}/{len(SUMMONS)}")
    items.append(build_one(*summon))

if os.path.exists(CATALOG_PATH):
    with open(CATALOG_PATH, "r", encoding="utf8") as handle:
        catalog = json.load(handle)
else:
    catalog = {
        "schema": "orbes.astra.summons.v2",
        "status": "integration_ready",
        "items": [],
    }
replacing = {item["id"] for item in items}
catalog["items"] = [
    item for item in catalog.get("items", []) if item.get("id") not in replacing
]
catalog["items"].extend(items)
catalog["items"].sort(key=lambda item: item["id"])

# The eight Living Orbs are already valid purpose-built spherical assets.
# Register them in the V2 catalog without misrepresenting them as creature rigs.
if os.path.exists(V1_CATALOG):
    with open(V1_CATALOG, "r", encoding="utf8") as handle:
        v1 = json.load(handle)
    catalog["livingOrbs"] = [
        {
            "id": asset["id"],
            "kind": "living_orb",
            "source": "workspaces/orbes-d-astra/03_assets/3d/catalog_v1/"
            + asset["source"],
            "runtime": asset["runtime"],
            "metrics": asset["metrics"],
            "status": "stylized_orb_validated",
        }
        for asset in v1["assets"]
        if asset["kind"] == "living_orb"
    ]
catalog["summary"] = {
    "familiars": len(catalog["items"]),
    "livingOrbs": len(catalog.get("livingOrbs", [])),
    "animations": sum(len(item["animations"]) for item in catalog["items"]),
    "bytes": sum(item["bytes"] for item in catalog["items"])
    + sum(
        orb["metrics"]["bytes"] for orb in catalog.get("livingOrbs", [])
    ),
}
os.makedirs(os.path.dirname(CATALOG_PATH), exist_ok=True)
with open(CATALOG_PATH, "w", encoding="utf8") as handle:
    json.dump(catalog, handle, ensure_ascii=False, indent=2)
print(json.dumps(catalog["summary"], ensure_ascii=False, indent=2))
