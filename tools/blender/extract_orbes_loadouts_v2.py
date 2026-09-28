"""Extract consistent wardrobe, weapon and artifact packages from Guardian V3.

The source of truth is the exported guardian GLB. This guarantees that the
equipment shown in the hub, character sheet and gameplay is built from the
same meshes and materials instead of an unrelated procedural approximation.
"""

from __future__ import annotations

import json
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
GUARDIAN_ID = cli_arg("--guardian-id")
if not GUARDIAN_ID:
    raise RuntimeError("--guardian-id is required")

WORKSPACE = os.path.join(PROJECT_ROOT, "workspaces", "orbes-d-astra")
SOURCE_GLB = os.path.join(
    WORKSPACE,
    "03_assets",
    "3d",
    "catalog_v2",
    "guardians",
    GUARDIAN_ID,
    f"{GUARDIAN_ID}_lod0.glb",
)
OUTPUT_DIR = os.path.join(
    WORKSPACE,
    "03_assets",
    "3d",
    "catalog_v2",
    "loadouts",
    GUARDIAN_ID,
)
RUNTIME_DIR = os.path.join(
    WORKSPACE,
    "04_runtime",
    "godot",
    "assets",
    "3d",
    "loadouts_v2",
    GUARDIAN_ID,
)
CATALOG_PATH = os.path.join(
    WORKSPACE,
    "04_runtime",
    "godot",
    "data",
    "loadouts_3d_v2.json",
)
TEXTURE_DIR = os.path.join(
    WORKSPACE,
    "03_assets",
    "3d",
    "materials",
    "astra_fabrics_v1",
)

WEAPON_TOKENS = (
    "magic_sceptre",
    "kalistick",
    "war_hammer",
    "wooden_bow",
    "dagger",
    "crude_sword",
)
OUTFIT_ACCENT_TOKENS = (
    "astral_back_veil",
    "astral_belt",
    "chest_core",
    "shoulder_orbit",
)
VARIANT_TEXTURES = {
    "nocturne": "fabric_void_cosmic_basecolor.png",
    "solaire": "fabric_solar_ember_basecolor.png",
    "sylvestre": "fabric_nature_wind_basecolor.png",
}


def relative_project(path: str) -> str:
    return os.path.relpath(path, PROJECT_ROOT).replace("\\", "/")


def relative_runtime(path: str) -> str:
    godot_root = os.path.join(WORKSPACE, "04_runtime", "godot")
    return "res://" + os.path.relpath(path, godot_root).replace("\\", "/")


def select_only(objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def export_selected(path: str, objects: list[bpy.types.Object], animations: bool) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    select_only(objects)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_skins=True,
        export_morph=True,
        export_animations=animations,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )


def make_variant_material(variant: str, texture_name: str) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{GUARDIAN_ID}_Outfit_{variant}")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Metallic"].default_value = 0.08
    shader.inputs["Roughness"].default_value = 0.52
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(
        os.path.join(TEXTURE_DIR, texture_name),
        check_existing=True,
    )
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return material


def assign_material(objects: list[bpy.types.Object], material: bpy.types.Material) -> None:
    for obj in objects:
        if obj.type != "MESH":
            continue
        obj.data.materials.clear()
        obj.data.materials.append(material)


def freeze_and_center(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        if obj.type == "MESH":
            bpy.context.view_layer.objects.active = obj
            for modifier in list(obj.modifiers):
                if modifier.type == "ARMATURE":
                    try:
                        bpy.ops.object.modifier_apply(modifier=modifier.name)
                    except RuntimeError:
                        obj.modifiers.remove(modifier)
        matrix = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = matrix
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
    offset = Vector(
        (
            -(minimum.x + maximum.x) * 0.5,
            -(minimum.y + maximum.y) * 0.5,
            -minimum.z,
        )
    )
    for obj in objects:
        obj.location += offset
    bpy.context.view_layer.update()


def copy_runtime(source: str) -> str:
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    destination = os.path.join(RUNTIME_DIR, os.path.basename(source))
    shutil.copy2(source, destination)
    return destination


def upsert_catalog(items: list[dict]) -> None:
    if os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH, "r", encoding="utf8") as handle:
            catalog = json.load(handle)
    else:
        catalog = {
            "schema": "orbes.astra.loadouts.v2",
            "status": "integration_ready",
            "items": [],
        }
    replacing = {item["id"] for item in items}
    catalog["items"] = [
        item for item in catalog.get("items", []) if item.get("id") not in replacing
    ]
    catalog["items"].extend(items)
    catalog["items"].sort(key=lambda item: item["id"])
    catalog["summary"] = {
        "total": len(catalog["items"]),
        "outfits": sum(item["kind"] == "outfit" for item in catalog["items"]),
        "weapons": sum(item["kind"] == "weapon" for item in catalog["items"]),
        "artifacts": sum(item["kind"] == "artifact" for item in catalog["items"]),
        "bytes": sum(item["bytes"] for item in catalog["items"]),
    }
    os.makedirs(os.path.dirname(CATALOG_PATH), exist_ok=True)
    with open(CATALOG_PATH, "w", encoding="utf8") as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)


def register_item(
    item_id: str,
    kind: str,
    source: str,
    runtime: str,
    variant: str,
) -> dict:
    return {
        "id": item_id,
        "guardianId": GUARDIAN_ID,
        "kind": kind,
        "variant": variant,
        "sourceGuardian": relative_project(SOURCE_GLB),
        "source": relative_project(source),
        "runtime": relative_runtime(runtime),
        "bytes": os.path.getsize(source),
        "sameAsGuardianMesh": True,
        "quality": "integration_ready",
    }


if not os.path.exists(SOURCE_GLB):
    raise RuntimeError(f"Missing guardian source GLB: {SOURCE_GLB}")
os.makedirs(OUTPUT_DIR, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for stale in list(bpy.data.objects):
    bpy.data.objects.remove(stale, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=SOURCE_GLB)
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()

rig = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE"), None)
if rig is None:
    raise RuntimeError(f"No armature found in {SOURCE_GLB}")
rig.data.pose_position = "REST"
bpy.context.view_layer.update()

meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
weapon_objects = [
    obj
    for obj in meshes
    if any(token in obj.name.lower() for token in WEAPON_TOKENS)
    or "weapon_astra_" in obj.name.lower()
]
artifact_objects = [obj for obj in meshes if "_artifact_" in obj.name.lower()]
outfit_objects = [
    obj
    for obj in meshes
    if (
        ("_clothes_" in obj.name.lower() and obj not in weapon_objects)
        or any(token in obj.name.lower() for token in OUTFIT_ACCENT_TOKENS)
    )
]
if not weapon_objects or not artifact_objects or not outfit_objects:
    raise RuntimeError(
        f"Loadout selection failed for {GUARDIAN_ID}: "
        f"outfit={len(outfit_objects)} weapon={len(weapon_objects)} "
        f"artifact={len(artifact_objects)}"
    )

items: list[dict] = []
signature_path = os.path.join(OUTPUT_DIR, f"{GUARDIAN_ID}_outfit_signature.glb")
export_selected(signature_path, [rig, *outfit_objects], animations=False)
signature_runtime = copy_runtime(signature_path)
items.append(
    register_item(
        f"outfit_{GUARDIAN_ID}_signature",
        "outfit",
        signature_path,
        signature_runtime,
        "signature",
    )
)

for variant, texture_name in VARIANT_TEXTURES.items():
    material = make_variant_material(variant, texture_name)
    assign_material(outfit_objects, material)
    variant_path = os.path.join(OUTPUT_DIR, f"{GUARDIAN_ID}_outfit_{variant}.glb")
    export_selected(variant_path, [rig, *outfit_objects], animations=False)
    variant_runtime = copy_runtime(variant_path)
    items.append(
        register_item(
            f"outfit_{GUARDIAN_ID}_{variant}",
            "outfit",
            variant_path,
            variant_runtime,
            variant,
        )
    )

rig.data.pose_position = "POSE"
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
freeze_and_center(weapon_objects)
weapon_path = os.path.join(OUTPUT_DIR, f"{GUARDIAN_ID}_weapon_signature.glb")
export_selected(weapon_path, weapon_objects, animations=False)
weapon_runtime = copy_runtime(weapon_path)
items.append(
    register_item(
        f"weapon_{GUARDIAN_ID}_signature",
        "weapon",
        weapon_path,
        weapon_runtime,
        "signature",
    )
)

freeze_and_center(artifact_objects)
artifact_path = os.path.join(OUTPUT_DIR, f"{GUARDIAN_ID}_artifact_signature.glb")
export_selected(artifact_path, artifact_objects, animations=False)
artifact_runtime = copy_runtime(artifact_path)
items.append(
    register_item(
        f"artifact_{GUARDIAN_ID}_signature",
        "artifact",
        artifact_path,
        artifact_runtime,
        "signature",
    )
)

upsert_catalog(items)
print(
    json.dumps(
        {
            "guardian": GUARDIAN_ID,
            "outfitObjects": [obj.name for obj in outfit_objects],
            "weaponObjects": [obj.name for obj in weapon_objects],
            "artifactObjects": [obj.name for obj in artifact_objects],
            "items": len(items),
        },
        ensure_ascii=False,
        indent=2,
    )
)
