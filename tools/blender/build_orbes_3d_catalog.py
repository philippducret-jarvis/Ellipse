"""Build the Orbes d'Astra procedural 3D production catalog.

This generator creates deterministic, distinct and fully exportable stylized
production blockouts for every canonical guardian and for the modular assets
that belong to them:

- 24 rigged guardians with LOD0/LOD1/LOD2;
- 4 modular outfits per guardian;
- 1 signature armor set, weapon and artifact per guardian;
- 8 living Orbes and 12 summon familiars;
- 20 shared observatory and activity props.

The assets are intentionally honest production blockouts. They establish the
complete Blender -> glTF -> Godot contract, silhouettes, sockets, materials,
animation clips and runtime paths. They are not represented as final sculpted
commercial characters.

Run:
  blender --background --python tools/blender/build_orbes_3d_catalog.py -- \
    --project-root "C:/path/to/Projet Ellipse" --family all
"""

from __future__ import annotations

import bpy
import json
import math
import os
import sys
from mathutils import Vector


def arg(name: str, default: str | None = None) -> str | None:
    if "--" not in sys.argv:
        return default
    values = sys.argv[sys.argv.index("--") + 1 :]
    if name not in values:
        return default
    index = values.index(name)
    return values[index + 1] if index + 1 < len(values) else default


PROJECT_ROOT = os.path.abspath(arg("--project-root", os.getcwd()))
FAMILY = arg("--family", "all")
LIMIT = int(arg("--limit", "0") or "0")
MANIFEST_PATH = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "01_preproduction",
    "manifests",
    "characters-3d.json",
)
INVENTORY_PATH = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "01_preproduction",
    "manifests",
    "asset-inventory-3d.json",
)
ASSET_ROOT = os.path.join(
    PROJECT_ROOT, "workspaces", "orbes-d-astra", "03_assets", "3d", "catalog_v1"
)
RUNTIME_ROOT = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "04_runtime",
    "godot",
    "assets",
    "3d",
)
RUNTIME_DATA = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "04_runtime",
    "godot",
    "data",
    "assets_3d_catalog.json",
)
REPORT_PATH = os.path.join(ASSET_ROOT, "catalog-report.json")

with open(MANIFEST_PATH, "r", encoding="utf8") as handle:
    CHARACTER_MANIFEST = json.load(handle)
with open(INVENTORY_PATH, "r", encoding="utf8") as handle:
    INVENTORY = json.load(handle)

GUARDIANS = CHARACTER_MANIFEST["guardians"]
if LIMIT > 0:
    GUARDIANS = GUARDIANS[:LIMIT]

OUTFITS = ["combat", "awakened", "celestial_evening", "seasonal"]
LOD_DETAILS = {
    "lod0": {"segments": 24, "rings": 16, "curve": 0.035},
    "lod1": {"segments": 16, "rings": 10, "curve": 0.055},
    "lod2": {"segments": 10, "rings": 6, "curve": 0.085},
}

ELEMENT_PALETTES = {
    "Lune": ((0.05, 0.13, 0.36), (0.16, 0.72, 0.96), (0.82, 0.88, 1.0)),
    "Feu": ((0.30, 0.025, 0.012), (1.0, 0.19, 0.035), (1.0, 0.65, 0.08)),
    "Vent": ((0.04, 0.24, 0.15), (0.18, 0.92, 0.55), (0.73, 1.0, 0.76)),
    "Eau": ((0.01, 0.17, 0.30), (0.0, 0.68, 0.94), (0.55, 0.94, 1.0)),
    "Nature": ((0.05, 0.22, 0.07), (0.25, 0.83, 0.18), (0.88, 0.76, 0.12)),
    "Solaire": ((0.28, 0.12, 0.015), (1.0, 0.52, 0.05), (1.0, 0.91, 0.52)),
    "Temps": ((0.10, 0.08, 0.30), (0.26, 0.55, 1.0), (0.80, 0.90, 1.0)),
    "Ombre": ((0.018, 0.012, 0.06), (0.32, 0.16, 0.62), (0.70, 0.45, 0.92)),
    "Cristal": ((0.04, 0.22, 0.30), (0.17, 0.88, 0.95), (0.80, 0.98, 1.0)),
    "Vide": ((0.055, 0.012, 0.10), (0.50, 0.08, 0.72), (0.92, 0.28, 0.92)),
    "Son": ((0.20, 0.03, 0.18), (0.95, 0.18, 0.58), (1.0, 0.73, 0.90)),
    "Foudre": ((0.05, 0.09, 0.28), (0.25, 0.65, 1.0), (0.95, 0.86, 0.16)),
    "Métal": ((0.07, 0.08, 0.11), (0.42, 0.55, 0.68), (0.90, 0.70, 0.18)),
    "Cosmos": ((0.09, 0.025, 0.18), (0.48, 0.16, 0.86), (0.95, 0.48, 0.76)),
    "Nexus": ((0.08, 0.07, 0.22), (0.43, 0.28, 0.95), (0.96, 0.75, 0.20)),
    "Aurore": ((0.10, 0.18, 0.29), (0.20, 0.92, 0.86), (1.0, 0.56, 0.64)),
}

SKIN_TONES = [
    (0.78, 0.47, 0.32),
    (0.92, 0.68, 0.53),
    (0.48, 0.25, 0.17),
    (0.73, 0.52, 0.40),
    (0.96, 0.78, 0.66),
    (0.35, 0.17, 0.11),
]

HAIR_COLORS = [
    (0.015, 0.02, 0.035),
    (0.32, 0.16, 0.08),
    (0.72, 0.72, 0.76),
    (0.82, 0.56, 0.22),
    (0.12, 0.05, 0.20),
    (0.50, 0.08, 0.06),
]

CATALOG = {
    "schemaVersion": 1,
    "generator": "tools/blender/build_orbes_3d_catalog.py",
    "status": "procedural_production_blockout",
    "truth": {
        "commercialReady": False,
        "finalSculpts": False,
        "finalRetopology": False,
        "finalTextures": False,
        "purpose": "complete integration-ready 3D catalog and art-direction blockout",
    },
    "standards": {
        "format": "glTF 2.0 GLB",
        "units": "meters",
        "upAxis": "+Y in Godot / +Z in Blender",
        "guardianHeight": "1.72–2.08 m",
        "lods": ["lod0", "lod1", "lod2"],
        "outfits": OUTFITS,
        "guardianSockets": [
            "socket_weapon_r",
            "socket_artifact_l",
            "socket_back",
            "socket_head_fx",
        ],
        "animationClips": [
            "Idle",
            "Walk",
            "SkillCast",
            "Ultimate",
            "Victory",
        ],
    },
    "assets": [],
}


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


for folder in (
    ASSET_ROOT,
    RUNTIME_ROOT,
    os.path.dirname(RUNTIME_DATA),
):
    ensure_dir(folder)


def rel_runtime(path: str) -> str:
    relative = os.path.relpath(path, os.path.join(PROJECT_ROOT, "workspaces", "orbes-d-astra", "04_runtime", "godot"))
    return "res://" + relative.replace("\\", "/")


def reset_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data_collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(data_collection):
            if block.users == 0:
                data_collection.remove(block)


def material(
    name: str,
    color: tuple[float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.42,
    emission: tuple[float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, alpha)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Emission Color" in shader.inputs and emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        shader.inputs["Alpha"].default_value = alpha
        value.surface_render_method = "DITHERED"
    return value


def smooth(obj: bpy.types.Object) -> None:
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def apply_scale(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def add_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    segments: int = 20,
    rings: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=max(8, segments),
        ring_count=max(6, rings),
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_scale(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_cylinder(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    vertices: int = 16,
) -> bpy.types.Object:
    a = Vector(start)
    b = Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=max(8, vertices),
        radius=radius,
        depth=delta.length,
        location=(a + b) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = delta.to_track_quat("Z", "Y")
    obj.rotation_mode = "XYZ"
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    mat: bpy.types.Material,
    vertices: int = 16,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=max(8, vertices),
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major: float,
    minor: float,
    mat: bpy.types.Material,
    segments: int = 32,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=max(12, segments),
        minor_segments=max(6, segments // 4),
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float = 0.04,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_scale(obj)
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("EdgeSoftening", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def parent_bone(obj: bpy.types.Object, rig: bpy.types.Object, bone: str) -> None:
    matrix = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = matrix


def palette_for(guardian: dict) -> tuple:
    return ELEMENT_PALETTES.get(guardian["element"], ELEMENT_PALETTES["Nexus"])


def body_dimensions(guardian: dict) -> dict:
    text = guardian["silhouette"].lower()
    female = guardian["presentation"] == "femme"
    height = 1.76 if female else 1.88
    shoulder = 0.38 if female else 0.47
    waist = 0.25 if female else 0.34
    hip = 0.38 if female else 0.35
    chest = 0.34 if female else 0.42
    if "petite" in text:
        height = 1.68
    if "grande" in text or "très grand" in text:
        height += 0.10
    if "colosse" in text or "très musclé" in text or "large" in text or "imposant" in text:
        shoulder += 0.08
        chest += 0.07
        waist += 0.04
        height += 0.05
    if "pulpeuse" in text or "voluptueuse" in text or "courbes" in text:
        chest += 0.055
        hip += 0.07
    if "fin" in text or "longiligne" in text or "élancée" in text:
        shoulder -= 0.035
        waist -= 0.025
    return {
        "height": height,
        "shoulder": shoulder,
        "waist": waist,
        "hip": hip,
        "chest": chest,
        "female": female,
    }


def build_humanoid_rig(name: str, height: float) -> bpy.types.Object:
    scale = height / 1.82
    armature_data = bpy.data.armatures.new(name + "_Armature")
    rig = bpy.data.objects.new(name + "_Rig", armature_data)
    bpy.context.collection.objects.link(rig)
    rig.show_in_front = True
    rig["asset_standard"] = "orbes_astra_humanoid_v1"
    rig["units"] = "meters"
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(bone_name, head, tail, parent=None, deform=True):
        item = armature_data.edit_bones.new(bone_name)
        item.head = Vector(head) * scale
        item.tail = Vector(tail) * scale
        item.use_deform = deform
        if parent:
            item.parent = armature_data.edit_bones[parent]
        return item

    bone("root", (0, 0, 0), (0, 0, 0.16), None, False)
    bone("hips", (0, 0, 0.83), (0, 0, 1.00), "root")
    bone("spine", (0, 0, 1.00), (0, 0, 1.22), "hips")
    bone("chest", (0, 0, 1.22), (0, 0, 1.48), "spine")
    bone("neck", (0, 0, 1.48), (0, 0, 1.59), "chest")
    bone("head", (0, 0, 1.59), (0, 0, 1.82), "neck")
    for side, sign in (("L", 1), ("R", -1)):
        bone(f"upper_arm.{side}", (0.02 * sign, 0, 1.43), (0.43 * sign, 0, 1.40), "chest")
        bone(f"lower_arm.{side}", (0.43 * sign, 0, 1.40), (0.73 * sign, 0, 1.22), f"upper_arm.{side}")
        bone(f"hand.{side}", (0.73 * sign, 0, 1.22), (0.86 * sign, 0, 1.17), f"lower_arm.{side}")
        bone(f"upper_leg.{side}", (0.14 * sign, 0, 0.88), (0.15 * sign, 0, 0.47), "hips")
        bone(f"lower_leg.{side}", (0.15 * sign, 0, 0.47), (0.14 * sign, 0, 0.10), f"upper_leg.{side}")
        bone(f"foot.{side}", (0.14 * sign, 0, 0.10), (0.14 * sign, -0.20, 0.04), f"lower_leg.{side}")
    bone("socket_weapon_r", (-0.86, 0, 1.17), (-0.96, 0, 1.12), "hand.R", False)
    bone("socket_artifact_l", (0.86, 0, 1.17), (0.96, 0, 1.12), "hand.L", False)
    bone("socket_back", (0, 0.08, 1.42), (0, 0.26, 1.42), "chest", False)
    bone("socket_head_fx", (0, 0, 1.84), (0, 0, 1.98), "head", False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def add_guardian_actions(rig: bpy.types.Object, guardian: dict) -> list[str]:
    rig.animation_data_create()

    def action(name: str, length: int, poses: dict[int, dict[str, dict]]) -> None:
        clip = bpy.data.actions.new(f"{guardian['name']}_{name}")
        clip.frame_start = 1
        clip.frame_end = length
        rig.animation_data.action = clip
        for frame, values in poses.items():
            for bone_name, transform in values.items():
                pose_bone = rig.pose.bones[bone_name]
                pose_bone.rotation_mode = "XYZ"
                if "rotation" in transform:
                    pose_bone.rotation_euler = transform["rotation"]
                    pose_bone.keyframe_insert("rotation_euler", frame=frame, group=bone_name)
                if "location" in transform:
                    pose_bone.location = transform["location"]
                    pose_bone.keyframe_insert("location", frame=frame, group=bone_name)
        track = rig.animation_data.nla_tracks.new()
        track.name = f"{guardian['name']}_{name}"
        track.strips.new(track.name, 1, clip)
        rig.animation_data.action = None

    neutral = {
        "upper_arm.L": {"rotation": (0.0, -0.05, -1.35)},
        "upper_arm.R": {"rotation": (0.0, 0.05, 1.35)},
    }
    action(
        "Idle",
        96,
        {
            1: {**neutral, "chest": {"rotation": (0, 0, -0.015)}},
            48: {**neutral, "chest": {"rotation": (0.02, 0, 0.018)}, "head": {"rotation": (0, 0, 0.025)}},
            96: {**neutral, "chest": {"rotation": (0, 0, -0.015)}},
        },
    )
    action(
        "Walk",
        32,
        {
            1: {
                "upper_leg.L": {"rotation": (0.45, 0, 0)},
                "upper_leg.R": {"rotation": (-0.45, 0, 0)},
                "upper_arm.L": {"rotation": (-0.18, 0, -1.35)},
                "upper_arm.R": {"rotation": (0.18, 0, 1.35)},
            },
            16: {
                "upper_leg.L": {"rotation": (-0.45, 0, 0)},
                "upper_leg.R": {"rotation": (0.45, 0, 0)},
                "upper_arm.L": {"rotation": (0.18, 0, -1.35)},
                "upper_arm.R": {"rotation": (-0.18, 0, 1.35)},
            },
            32: {
                "upper_leg.L": {"rotation": (0.45, 0, 0)},
                "upper_leg.R": {"rotation": (-0.45, 0, 0)},
                "upper_arm.L": {"rotation": (-0.18, 0, -1.35)},
                "upper_arm.R": {"rotation": (0.18, 0, 1.35)},
            },
        },
    )
    action(
        "SkillCast",
        52,
        {
            1: neutral,
            26: {
                "upper_arm.L": {"rotation": (-0.45, -0.30, -2.0)},
                "upper_arm.R": {"rotation": (-0.25, 0.18, 1.95)},
                "chest": {"rotation": (-0.08, 0, 0.12)},
            },
            52: neutral,
        },
    )
    action(
        "Ultimate",
        80,
        {
            1: neutral,
            38: {
                "root": {"location": (0, 0, 0.16)},
                "upper_arm.L": {"rotation": (-0.55, -0.2, -2.35)},
                "upper_arm.R": {"rotation": (-0.55, 0.2, 2.35)},
                "head": {"rotation": (-0.14, 0, 0)},
            },
            80: neutral,
        },
    )
    action(
        "Victory",
        72,
        {
            1: neutral,
            36: {
                "upper_arm.L": {"rotation": (-0.1, -0.2, -1.8)},
                "upper_arm.R": {"rotation": (-0.55, 0.1, 2.1)},
                "head": {"rotation": (0, 0, -0.12)},
            },
            72: neutral,
        },
    )
    for track in rig.animation_data.nla_tracks:
        track.mute = False
    return [f"{guardian['name']}_{name}" for name in ("Idle", "Walk", "SkillCast", "Ultimate", "Victory")]


def build_body(
    guardian: dict,
    rig: bpy.types.Object,
    detail: dict,
    materials: dict,
) -> list[bpy.types.Object]:
    dims = body_dimensions(guardian)
    scale = dims["height"] / 1.82
    segments = detail["segments"]
    rings = detail["rings"]
    skin = materials["skin"]
    hair = materials["hair"]
    primary = materials["primary"]
    secondary = materials["secondary"]
    gold = materials["gold"]
    objects = []

    def bone_sphere(name, location, size, mat, bone):
        obj = add_sphere(name, tuple(Vector(location) * scale), tuple(Vector(size) * scale), mat, segments, rings)
        parent_bone(obj, rig, bone)
        objects.append(obj)
        return obj

    def bone_limb(name, a, b, radius, mat, bone):
        obj = add_cylinder(name, tuple(Vector(a) * scale), tuple(Vector(b) * scale), radius * scale, mat, max(8, segments // 2))
        parent_bone(obj, rig, bone)
        objects.append(obj)
        return obj

    # Anatomical base with readable adult proportions.
    bone_sphere("Body_Hips", (0, 0, 0.91), (dims["hip"], 0.22, 0.22), skin, "hips")
    bone_sphere("Body_Waist", (0, 0, 1.12), (dims["waist"], 0.18, 0.23), skin, "spine")
    bone_sphere("Body_Chest", (0, 0, 1.34), (dims["chest"], 0.22, 0.28), skin, "chest")
    bone_sphere("Body_Head", (0, -0.015, 1.69), (0.16, 0.135, 0.205), skin, "head")
    bone_sphere("Body_Nose", (0, -0.145, 1.68), (0.033, 0.045, 0.052), skin, "head")
    for side, sign in (("L", 1), ("R", -1)):
        bone_limb(f"Body_UpperArm_{side}", (0.12 * sign, 0, 1.42), (0.48 * sign, 0, 1.36), 0.085 if dims["female"] else 0.10, skin, f"upper_arm.{side}")
        bone_limb(f"Body_LowerArm_{side}", (0.48 * sign, 0, 1.36), (0.74 * sign, -0.01, 1.20), 0.070, skin, f"lower_arm.{side}")
        bone_sphere(f"Body_Hand_{side}", (0.79 * sign, -0.01, 1.17), (0.072, 0.045, 0.10), skin, f"hand.{side}")
        bone_limb(f"Body_Thigh_{side}", (0.13 * sign, 0, 0.87), (0.15 * sign, 0, 0.48), 0.115 if dims["female"] else 0.13, skin, f"upper_leg.{side}")
        bone_limb(f"Body_Calf_{side}", (0.15 * sign, 0, 0.48), (0.14 * sign, -0.01, 0.12), 0.088, skin, f"lower_leg.{side}")
        foot = add_cube(
            f"Body_Foot_{side}",
            tuple(Vector((0.14 * sign, -0.10, 0.065)) * scale),
            tuple(Vector((0.085, 0.16, 0.06)) * scale),
            primary,
            0.025,
        )
        parent_bone(foot, rig, f"foot.{side}")
        objects.append(foot)
        eye = add_sphere(
            f"Face_Eye_{side}",
            tuple(Vector((0.058 * sign, -0.135, 1.72)) * scale),
            tuple(Vector((0.026, 0.018, 0.018)) * scale),
            secondary,
            12,
            8,
        )
        parent_bone(eye, rig, "head")
        objects.append(eye)

    # Hair cap, crown and strands keep every silhouette distinct.
    hair_cap = add_sphere(
        "Hair_Cap",
        tuple(Vector((0, 0.02, 1.755)) * scale),
        tuple(Vector((0.175, 0.145, 0.16)) * scale),
        hair,
        segments,
        rings,
    )
    parent_bone(hair_cap, rig, "head")
    objects.append(hair_cap)
    strand_count = 7 if dims["female"] else 4
    long_hair = dims["female"] or guardian["id"] in ("kael", "ciro", "vesper", "seraphiel")
    strand_depth = 0.58 if long_hair else 0.25
    for index in range(strand_count):
        angle = math.tau * index / strand_count
        x = math.cos(angle) * 0.13
        y = 0.035 + math.sin(angle) * 0.10
        strand = add_cone(
            f"Hair_Strand_{index:02d}",
            tuple(Vector((x, y, 1.61 - strand_depth * 0.33)) * scale),
            0.055 * scale,
            0.012 * scale,
            strand_depth * scale,
            hair,
            max(8, segments // 2),
            (0.04 * math.sin(angle), 0.16 * math.cos(angle), 0),
        )
        parent_bone(strand, rig, "head")
        objects.append(strand)

    # Signature combat attire: corset/plastron, belt, pauldrons and leg armor.
    chest = add_sphere(
        "Combat_ChestArmor",
        tuple(Vector((0, -0.015, 1.34)) * scale),
        tuple(Vector((dims["chest"] + 0.025, 0.235, 0.29)) * scale),
        primary,
        segments,
        rings,
    )
    parent_bone(chest, rig, "chest")
    objects.append(chest)
    waist = add_sphere(
        "Combat_WaistArmor",
        tuple(Vector((0, -0.005, 1.10)) * scale),
        tuple(Vector((dims["waist"] + 0.03, 0.19, 0.24)) * scale),
        primary,
        segments,
        rings,
    )
    parent_bone(waist, rig, "spine")
    objects.append(waist)
    belt = add_torus(
        "Combat_AstralBelt",
        tuple(Vector((0, 0, 0.98)) * scale),
        (dims["hip"] + 0.03) * scale,
        0.028 * scale,
        gold,
        max(16, segments),
    )
    parent_bone(belt, rig, "hips")
    objects.append(belt)
    for side, sign in (("L", 1), ("R", -1)):
        pauldron = add_sphere(
            f"Combat_Pauldron_{side}",
            tuple(Vector((dims["shoulder"] * sign, 0, 1.43)) * scale),
            tuple(Vector((0.15, 0.18, 0.11)) * scale),
            secondary,
            segments,
            rings,
        )
        parent_bone(pauldron, rig, f"upper_arm.{side}")
        objects.append(pauldron)
        bracer = add_cylinder(
            f"Combat_Bracer_{side}",
            tuple(Vector((0.54 * sign, 0, 1.32)) * scale),
            tuple(Vector((0.70 * sign, 0, 1.22)) * scale),
            0.088 * scale,
            primary,
            max(8, segments // 2),
        )
        parent_bone(bracer, rig, f"lower_arm.{side}")
        objects.append(bracer)
        greave = add_cylinder(
            f"Combat_Greave_{side}",
            tuple(Vector((0.15 * sign, 0, 0.43)) * scale),
            tuple(Vector((0.14 * sign, 0, 0.14)) * scale),
            0.105 * scale,
            primary,
            max(8, segments // 2),
        )
        parent_bone(greave, rig, f"lower_leg.{side}")
        objects.append(greave)

    # Back silhouette: cape/wing panels.
    fantasy = guardian["outfitFantasy"].lower()
    panel_count = 4 if any(word in fantasy for word in ("ailes", "plumes", "voile", "cape", "robe")) else 2
    for index in range(panel_count):
        sign = -1 if index % 2 else 1
        layer = index // 2
        panel = add_cone(
            f"Combat_BackPanel_{index:02d}",
            tuple(Vector((0.18 * sign + layer * 0.07 * sign, 0.13, 1.04 - layer * 0.08)) * scale),
            (0.20 - layer * 0.025) * scale,
            0.035 * scale,
            (0.92 - layer * 0.10) * scale,
            secondary if index % 2 else primary,
            max(8, segments // 2),
            (0.08, 0.28 * sign, 0.05 * sign),
        )
        parent_bone(panel, rig, "socket_back")
        objects.append(panel)

    # Elemental crown and chest core.
    crown_points = 3 + (GUARDIANS.index(guardian) % 4)
    for index in range(crown_points):
        angle = math.pi * (index / max(1, crown_points - 1) - 0.5)
        spike = add_cone(
            f"Signature_Crown_{index:02d}",
            tuple(Vector((math.sin(angle) * 0.15, 0.015, 1.91 + math.cos(angle) * 0.04)) * scale),
            0.036 * scale,
            0.0,
            (0.18 + 0.05 * math.cos(angle)) * scale,
            gold if index % 2 == 0 else secondary,
            max(8, segments // 2),
            (0.0, angle * 0.4, -angle * 0.3),
        )
        parent_bone(spike, rig, "head")
        objects.append(spike)
    core = add_sphere(
        "Signature_ChestCore",
        tuple(Vector((0, -0.235, 1.36)) * scale),
        tuple(Vector((0.075, 0.035, 0.10)) * scale),
        materials["emissive"],
        16,
        10,
    )
    parent_bone(core, rig, "chest")
    objects.append(core)
    return objects


def build_materials(guardian: dict, variant: str = "combat") -> dict:
    primary_color, secondary_color, glow_color = palette_for(guardian)
    index = CHARACTER_MANIFEST["guardians"].index(guardian)
    skin_color = SKIN_TONES[index % len(SKIN_TONES)]
    hair_color = HAIR_COLORS[(index * 3 + 1) % len(HAIR_COLORS)]
    if variant == "awakened":
        primary_color = tuple(min(1.0, c * 1.35 + 0.05) for c in primary_color)
        glow_color = (1.0, 0.86, 0.42)
    elif variant == "celestial_evening":
        primary_color = (0.035, 0.025, 0.075)
        secondary_color = tuple(min(1.0, c * 0.75 + 0.15) for c in secondary_color)
    elif variant == "seasonal":
        primary_color = tuple(min(1.0, c * 0.55 + 0.30) for c in primary_color)
        secondary_color = tuple(min(1.0, c * 0.60 + 0.28) for c in secondary_color)
    prefix = f"{guardian['id']}_{variant}"
    return {
        "skin": material(prefix + "_Skin", skin_color, 0.0, 0.48),
        "hair": material(prefix + "_Hair", hair_color, 0.05, 0.32),
        "primary": material(prefix + "_Primary", primary_color, 0.62, 0.22),
        "secondary": material(prefix + "_Secondary", secondary_color, 0.42, 0.26),
        "gold": material(prefix + "_AntiqueGold", (0.63, 0.34, 0.06), 0.88, 0.16),
        "emissive": material(prefix + "_Glow", glow_color, 0.15, 0.16, glow_color, 4.5),
        "cloth": material(prefix + "_Cloth", tuple(c * 0.6 for c in primary_color), 0.08, 0.55),
        "glass": material(prefix + "_Glass", glow_color, 0.05, 0.12, glow_color, 1.8, 0.55),
    }


def weapon_kind(guardian: dict) -> str:
    ability = guardian["ability"]
    fantasy = guardian["outfitFantasy"].lower()
    if "arc" in fantasy:
        return "bow"
    if "lancier" in fantasy or "valkyrie" in fantasy:
        return "spear"
    if ability == "forge_next":
        return "hammer"
    if ability == "aegis":
        return "sword_shield"
    if ability == "echo_merge":
        return "twin_blades"
    if ability == "shatter_top":
        return "rapier"
    if ability in ("constellation", "time_bloom"):
        return "orbital_staff"
    if ability in ("gravity_well", "void_swap", "ascension", "supernova"):
        return "astrolabe_staff"
    return "spear"


def build_weapon(
    guardian: dict,
    materials: dict,
    at_origin: bool = True,
) -> list[bpy.types.Object]:
    kind = weapon_kind(guardian)
    gold = materials["gold"]
    primary = materials["primary"]
    glow = materials["emissive"]
    offset = Vector((0, 0, 0)) if at_origin else Vector((-0.86, -0.02, 1.05))
    objects = []

    def cylinder(name, a, b, radius, mat):
        obj = add_cylinder(name, tuple(Vector(a) + offset), tuple(Vector(b) + offset), radius, mat, 16)
        objects.append(obj)
        return obj

    def sphere(name, p, scale, mat):
        obj = add_sphere(name, tuple(Vector(p) + offset), scale, mat, 20, 12)
        objects.append(obj)
        return obj

    if kind in ("astrolabe_staff", "orbital_staff"):
        cylinder("Weapon_StaffShaft", (0, 0, 0), (0, 0, 1.75), 0.035, gold)
        sphere("Weapon_StaffCore", (0, 0, 1.78), (0.13, 0.09, 0.13), glow)
        objects.append(add_torus("Weapon_OrbitA", tuple(Vector((0, 0, 1.78)) + offset), 0.30, 0.025, gold, 28, (math.pi / 2, 0, 0)))
        objects.append(add_torus("Weapon_OrbitB", tuple(Vector((0, 0, 1.78)) + offset), 0.22, 0.018, primary, 24, (math.pi / 2, 0.5, 0)))
        if kind == "orbital_staff":
            objects.append(add_torus("Weapon_OrbitC", tuple(Vector((0, 0, 1.78)) + offset), 0.38, 0.014, glow, 30, (0.9, 0.2, 0.5)))
    elif kind == "hammer":
        cylinder("Weapon_HammerShaft", (0, 0, 0), (0, 0, 1.25), 0.055, gold)
        objects.append(add_cube("Weapon_HammerHead", tuple(Vector((0, 0, 1.35)) + offset), (0.38, 0.18, 0.20), primary, 0.06))
        sphere("Weapon_HammerCore", (0, -0.20, 1.35), (0.12, 0.055, 0.12), glow)
    elif kind == "bow":
        cylinder("Weapon_BowGrip", (0, 0, 0.62), (0, 0, 1.03), 0.04, gold)
        for sign in (-1, 1):
            objects.append(add_torus(f"Weapon_BowLimb_{sign}", tuple(Vector((0, 0, 0.82 + sign * 0.38)) + offset), 0.43, 0.026, primary, 28, (math.pi / 2, 0, 0)))
        cylinder("Weapon_BowString", (0, 0, 0.05), (0, 0, 1.60), 0.009, glow)
    elif kind == "spear":
        cylinder("Weapon_SpearShaft", (0, 0, 0), (0, 0, 1.75), 0.035, gold)
        objects.append(add_cone("Weapon_SpearBlade", tuple(Vector((0, 0, 1.98)) + offset), 0.18, 0.0, 0.55, primary, 18))
        sphere("Weapon_SpearCore", (0, 0, 1.72), (0.10, 0.07, 0.10), glow)
    elif kind == "rapier":
        cylinder("Weapon_RapierBlade", (0, 0, 0.35), (0, 0, 1.65), 0.022, glow)
        cylinder("Weapon_RapierGrip", (0, 0, 0), (0, 0, 0.36), 0.045, gold)
        objects.append(add_torus("Weapon_RapierGuard", tuple(Vector((0, 0, 0.37)) + offset), 0.18, 0.022, primary, 24, (math.pi / 2, 0, 0)))
        objects.append(add_cone("Weapon_RapierTip", tuple(Vector((0, 0, 1.74)) + offset), 0.055, 0.0, 0.22, glow, 12))
    elif kind == "twin_blades":
        for sign in (-1, 1):
            local = Vector((0.13 * sign, 0, 0))
            obj = add_cylinder(f"Weapon_TwinGrip_{sign}", tuple(local + offset), tuple(local + offset + Vector((0, 0, 0.38))), 0.035, gold, 12)
            objects.append(obj)
            obj = add_cone(f"Weapon_TwinBlade_{sign}", tuple(local + offset + Vector((0, 0, 0.92))), 0.11, 0.0, 1.10, primary, 16)
            objects.append(obj)
    else:
        cylinder("Weapon_SwordGrip", (0, 0, 0), (0, 0, 0.34), 0.045, gold)
        objects.append(add_cube("Weapon_SwordBlade", tuple(Vector((0, 0, 0.95)) + offset), (0.075, 0.025, 0.62), primary, 0.02))
        objects.append(add_cube("Weapon_Shield", tuple(Vector((0.38, 0, 0.83)) + offset), (0.30, 0.06, 0.43), primary, 0.08))
        sphere("Weapon_ShieldCore", (0.38, -0.07, 0.83), (0.10, 0.04, 0.10), glow)
    return objects


def build_artifact(guardian: dict, materials: dict) -> list[bpy.types.Object]:
    primary = materials["primary"]
    gold = materials["gold"]
    glow = materials["emissive"]
    index = CHARACTER_MANIFEST["guardians"].index(guardian)
    sides = 5 + index % 4
    objects = [
        add_sphere("Artifact_Core", (0, 0, 0.62), (0.16, 0.12, 0.20), glow, 20, 12),
        add_torus("Artifact_OrbitA", (0, 0, 0.62), 0.34, 0.025, gold, 32, (math.pi / 2, 0, 0)),
        add_torus("Artifact_OrbitB", (0, 0, 0.62), 0.27, 0.018, primary, 28, (0.55, 0.25, 0.45)),
    ]
    for point in range(sides):
        angle = math.tau * point / sides
        objects.append(
            add_cone(
                f"Artifact_Ray_{point:02d}",
                (math.cos(angle) * 0.42, math.sin(angle) * 0.42, 0.62),
                0.055,
                0.0,
                0.30,
                gold if point % 2 == 0 else primary,
                10,
                (0, math.pi / 2, angle),
            )
        )
    return objects


def build_outfit_module(guardian: dict, variant: str, materials: dict) -> list[bpy.types.Object]:
    dims = body_dimensions(guardian)
    height_scale = dims["height"] / 1.82
    primary = materials["primary"]
    secondary = materials["secondary"]
    gold = materials["gold"]
    glow = materials["emissive"]
    cloth = materials["cloth"]
    objects = []
    chest_scale = (dims["chest"] + 0.035, 0.24, 0.30)
    objects.append(add_sphere(f"Outfit_{variant}_Chest", (0, 0, 1.34 * height_scale), tuple(Vector(chest_scale) * height_scale), primary, 20, 12))
    objects.append(add_sphere(f"Outfit_{variant}_Waist", (0, 0, 1.10 * height_scale), tuple(Vector((dims["waist"] + 0.035, 0.19, 0.25)) * height_scale), cloth, 20, 12))
    objects.append(add_torus(f"Outfit_{variant}_Belt", (0, 0, 0.98 * height_scale), (dims["hip"] + 0.04) * height_scale, 0.028 * height_scale, gold, 28))
    if variant in ("combat", "awakened"):
        for sign in (-1, 1):
            objects.append(add_sphere(f"Outfit_{variant}_Pauldron_{sign}", (dims["shoulder"] * sign * height_scale, 0, 1.43 * height_scale), (0.16, 0.18, 0.12), secondary, 18, 10))
            objects.append(add_cylinder(f"Outfit_{variant}_Greave_{sign}", (0.15 * sign * height_scale, 0, 0.43 * height_scale), (0.14 * sign * height_scale, 0, 0.14 * height_scale), 0.105 * height_scale, primary, 12))
    if variant == "awakened":
        objects.append(add_torus("Outfit_awakened_BackHalo", (0, 0.16, 1.45 * height_scale), 0.56 * height_scale, 0.025, glow, 40, (math.pi / 2, 0, 0)))
        for index in range(6):
            angle = math.tau * index / 6
            objects.append(add_cone(f"Outfit_awakened_Ray_{index}", (math.cos(angle) * 0.62, 0.18, 1.45 * height_scale + math.sin(angle) * 0.62), 0.07, 0.0, 0.38, gold, 12, (0, math.pi / 2, angle)))
    elif variant == "celestial_evening":
        panel_count = 8 if dims["female"] else 4
        for index in range(panel_count):
            angle = math.tau * index / panel_count
            objects.append(add_cone(f"Outfit_evening_Panel_{index}", (math.cos(angle) * 0.18, math.sin(angle) * 0.10, 0.61 * height_scale), 0.18, 0.05, 1.0 * height_scale, cloth, 14, (0.03 * math.sin(angle), 0.12 * math.cos(angle), 0)))
        objects.append(add_torus("Outfit_evening_Collar", (0, 0, 1.50 * height_scale), 0.20, 0.035, gold, 28))
    elif variant == "seasonal":
        for side in (-1, 1):
            objects.append(add_cone(f"Outfit_seasonal_Ribbon_{side}", (0.18 * side, 0.10, 0.93 * height_scale), 0.12, 0.025, 0.75, secondary, 12, (0.05, 0.22 * side, 0)))
        objects.append(add_torus("Outfit_seasonal_FlowerHalo", (0, 0.04, 1.90 * height_scale), 0.22, 0.025, glow, 28, (math.pi / 2, 0, 0)))
    return objects


def build_armor_set(guardian: dict, materials: dict) -> list[bpy.types.Object]:
    dims = body_dimensions(guardian)
    scale = dims["height"] / 1.82
    primary = materials["primary"]
    secondary = materials["secondary"]
    gold = materials["gold"]
    objects = [
        add_sphere("Armor_Chest", (0, 0, 1.34 * scale), tuple(Vector((dims["chest"] + 0.04, 0.25, 0.30)) * scale), primary, 20, 12),
        add_sphere("Armor_Waist", (0, 0, 1.10 * scale), tuple(Vector((dims["waist"] + 0.04, 0.20, 0.25)) * scale), primary, 20, 12),
        add_torus("Armor_Belt", (0, 0, 0.98 * scale), (dims["hip"] + 0.045) * scale, 0.03 * scale, gold, 28),
    ]
    for side in (-1, 1):
        objects.append(add_sphere(f"Armor_Pauldron_{side}", (dims["shoulder"] * side * scale, 0, 1.43 * scale), (0.17, 0.19, 0.12), secondary, 18, 10))
        objects.append(add_cylinder(f"Armor_Greave_{side}", (0.15 * side * scale, 0, 0.43 * scale), (0.14 * side * scale, 0, 0.14 * scale), 0.11 * scale, primary, 12))
    for index in range(5):
        objects.append(add_cone(f"Armor_Crown_{index}", ((index - 2) * 0.065, 0.0, 1.92 * scale), 0.035, 0.0, 0.20 + 0.04 * (2 - abs(index - 2)), gold if index % 2 == 0 else secondary, 10))
    return objects


def select_and_export(
    objects: list[bpy.types.Object],
    filepath: str,
    armature: bpy.types.Object | None = None,
    animations: bool = False,
) -> dict:
    ensure_dir(os.path.dirname(filepath))
    bpy.ops.object.select_all(action="DESELECT")
    valid = []
    for obj in objects:
        if obj and obj.name in bpy.data.objects:
            obj.select_set(True)
            valid.append(obj)
    if armature and armature.name in bpy.data.objects:
        armature.select_set(True)
        bpy.context.view_layer.objects.active = armature
        if armature not in valid:
            valid.append(armature)
    elif valid:
        bpy.context.view_layer.objects.active = valid[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_animations=animations,
        export_nla_strips=animations,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )
    triangles = 0
    meshes = 0
    for obj in valid:
        if obj.type == "MESH":
            meshes += 1
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
    return {
        "meshes": meshes,
        "triangles": triangles,
        "bytes": os.path.getsize(filepath),
    }


def runtime_copy(source: str, category: str, filename: str) -> str:
    target_dir = os.path.join(RUNTIME_ROOT, category)
    ensure_dir(target_dir)
    target = os.path.join(target_dir, filename)
    with open(source, "rb") as input_handle:
        payload = input_handle.read()
    with open(target, "wb") as output_handle:
        output_handle.write(payload)
    return target


def register_asset(asset_id: str, kind: str, source: str, runtime: str, metrics: dict, **extra) -> None:
    CATALOG["assets"].append(
        {
            "id": asset_id,
            "kind": kind,
            "source": os.path.relpath(source, ASSET_ROOT).replace("\\", "/"),
            "runtime": rel_runtime(runtime),
            "metrics": metrics,
            **extra,
        }
    )


def build_guardian_catalog() -> None:
    for guardian_index, guardian in enumerate(GUARDIANS):
        print(f"[guardian {guardian_index + 1}/{len(GUARDIANS)}] {guardian['id']}")
        guardian_source_dir = os.path.join(ASSET_ROOT, "guardians", guardian["id"])
        ensure_dir(guardian_source_dir)
        for lod_name, detail in LOD_DETAILS.items():
            reset_scene()
            materials = build_materials(guardian, "combat")
            dims = body_dimensions(guardian)
            rig = build_humanoid_rig(guardian["name"], dims["height"])
            character_objects = [rig]
            character_objects += build_body(guardian, rig, detail, materials)
            held_weapon = build_weapon(guardian, materials, at_origin=False)
            for obj in held_weapon:
                parent_bone(obj, rig, "socket_weapon_r")
            character_objects += held_weapon
            clips = add_guardian_actions(rig, guardian)
            rig["guardian_id"] = guardian["id"]
            rig["adult_age"] = guardian["age"]
            rig["outfit"] = "combat"
            rig["element"] = guardian["element"]
            source_glb = os.path.join(guardian_source_dir, f"{guardian['id']}_{lod_name}.glb")
            metrics = select_and_export(character_objects, source_glb, rig, True)
            runtime = runtime_copy(source_glb, "guardians", os.path.basename(source_glb))
            register_asset(
                f"guardian_{guardian['id']}_{lod_name}",
                "rigged_guardian",
                source_glb,
                runtime,
                metrics,
                guardian=guardian["id"],
                lod=lod_name,
                outfit="combat",
                animations=clips,
            )
            if lod_name == "lod0":
                blend_path = os.path.join(guardian_source_dir, f"{guardian['id']}_source.blend")
                bpy.ops.wm.save_as_mainfile(filepath=blend_path)


def build_guardian_equipment() -> None:
    for guardian_index, guardian in enumerate(GUARDIANS):
        print(f"[equipment {guardian_index + 1}/{len(GUARDIANS)}] {guardian['id']}")
        materials = None
        for variant in OUTFITS:
            reset_scene()
            materials = build_materials(guardian, variant)
            objects = build_outfit_module(guardian, variant, materials)
            source = os.path.join(ASSET_ROOT, "outfits", guardian["id"], f"{guardian['id']}_{variant}.glb")
            metrics = select_and_export(objects, source)
            runtime = runtime_copy(source, "outfits", os.path.basename(source))
            register_asset(
                f"outfit_{guardian['id']}_{variant}",
                "modular_outfit",
                source,
                runtime,
                metrics,
                guardian=guardian["id"],
                variant=variant,
                socketStandard="orbes_astra_humanoid_v1",
            )

        reset_scene()
        materials = build_materials(guardian, "combat")
        objects = build_weapon(guardian, materials, True)
        source = os.path.join(ASSET_ROOT, "weapons", f"weapon_{guardian['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "weapons", os.path.basename(source))
        register_asset(
            f"weapon_{guardian['id']}",
            "signature_weapon",
            source,
            runtime,
            metrics,
            guardian=guardian["id"],
            weaponType=weapon_kind(guardian),
            attachSocket="socket_weapon_r",
        )

        reset_scene()
        materials = build_materials(guardian, "combat")
        objects = build_artifact(guardian, materials)
        source = os.path.join(ASSET_ROOT, "artifacts", f"artifact_{guardian['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "artifacts", os.path.basename(source))
        register_asset(
            f"artifact_{guardian['id']}",
            "signature_artifact",
            source,
            runtime,
            metrics,
            guardian=guardian["id"],
            attachSocket="socket_artifact_l",
        )

        reset_scene()
        materials = build_materials(guardian, "combat")
        objects = build_armor_set(guardian, materials)
        source = os.path.join(ASSET_ROOT, "armor", f"armor_{guardian['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "armor", os.path.basename(source))
        register_asset(
            f"armor_{guardian['id']}",
            "signature_armor_set",
            source,
            runtime,
            metrics,
            guardian=guardian["id"],
            parts=["chest", "waist", "belt", "pauldrons", "greaves", "crown"],
        )


def build_orb(orb: dict, index: int) -> tuple[list[bpy.types.Object], list[str]]:
    guardian = CHARACTER_MANIFEST["guardians"][index % len(CHARACTER_MANIFEST["guardians"])]
    materials = build_materials(guardian, "awakened")
    glow = materials["emissive"]
    primary = materials["primary"]
    gold = materials["gold"]
    radius = 0.28 + index * 0.025
    objects = [
        add_sphere("Orb_Body", (0, 0, radius), (radius, radius, radius), primary, 24, 16),
        add_sphere("Orb_Core", (0, -radius * 0.88, radius), (radius * 0.42, radius * 0.12, radius * 0.42), glow, 18, 10),
        add_torus("Orb_Halo", (0, 0, radius), radius * 1.28, radius * 0.065, gold, 28, (math.pi / 2, 0, 0)),
    ]
    for side in (-1, 1):
        objects.append(add_sphere(f"Orb_Eye_{side}", (radius * 0.34 * side, -radius * 0.93, radius * 1.10), (radius * 0.09, radius * 0.045, radius * 0.13), glow, 12, 8))
    ornament_count = 2 + index
    for ornament in range(ornament_count):
        angle = math.tau * ornament / ornament_count
        objects.append(add_cone(f"Orb_Ornament_{ornament:02d}", (math.cos(angle) * radius * 0.95, math.sin(angle) * radius * 0.95, radius * 1.42), radius * 0.10, 0, radius * 0.42, gold if ornament % 2 == 0 else glow, 10))
    return objects, ["Idle", "Fall", "Bounce", "Merge", "Happy", "Danger"]


def build_familiar(familiar: dict, index: int) -> list[bpy.types.Object]:
    guardian = CHARACTER_MANIFEST["guardians"][(index * 2) % len(CHARACTER_MANIFEST["guardians"])]
    materials = build_materials(guardian, "seasonal")
    primary = materials["primary"]
    secondary = materials["secondary"]
    glow = materials["emissive"]
    gold = materials["gold"]
    family = familiar["id"]
    objects = []
    if "moth" in family or "bird" in family:
        objects.append(add_sphere("Familiar_Body", (0, 0, 0.48), (0.18, 0.28, 0.20), primary, 20, 12))
        objects.append(add_sphere("Familiar_Head", (0, -0.23, 0.62), (0.15, 0.14, 0.15), secondary, 18, 10))
        for side in (-1, 1):
            objects.append(add_cone(f"Familiar_Wing_{side}", (0.35 * side, 0.05, 0.56), 0.28, 0.05, 0.75, glow, 14, (0, math.pi / 2, 0.5 * side)))
    elif "whale" in family or "otter" in family or "drake" in family:
        objects.append(add_sphere("Familiar_Body", (0, 0, 0.40), (0.22, 0.46, 0.22), primary, 22, 14))
        objects.append(add_sphere("Familiar_Head", (0, -0.42, 0.48), (0.20, 0.22, 0.18), secondary, 20, 12))
        objects.append(add_cone("Familiar_Tail", (0, 0.52, 0.43), 0.22, 0.03, 0.62, primary, 14, (math.pi / 2, 0, 0)))
    else:
        objects.append(add_sphere("Familiar_Body", (0, 0, 0.42), (0.22, 0.30, 0.24), primary, 20, 12))
        objects.append(add_sphere("Familiar_Head", (0, -0.27, 0.64), (0.20, 0.18, 0.18), secondary, 20, 12))
        for side in (-1, 1):
            objects.append(add_cylinder(f"Familiar_Leg_{side}", (0.11 * side, -0.06, 0.31), (0.15 * side, -0.10, 0.06), 0.065, primary, 10))
            objects.append(add_cone(f"Familiar_Ear_{side}", (0.12 * side, -0.26, 0.87), 0.09, 0.015, 0.34, secondary, 10, (0.08, 0.22 * side, 0)))
    for side in (-1, 1):
        objects.append(add_sphere(f"Familiar_Eye_{side}", (0.07 * side, -0.43, 0.68), (0.04, 0.025, 0.05), glow, 12, 8))
    objects.append(add_torus("Familiar_Collar", (0, -0.18, 0.53), 0.19, 0.025, gold, 24, (math.pi / 2, 0, 0)))
    return objects


def build_summons() -> None:
    orbs = INVENTORY["categories"]["livingOrbs"]
    familiars = INVENTORY["categories"]["familiars"]
    for index, orb in enumerate(orbs):
        reset_scene()
        objects, animations = build_orb(orb, index)
        source = os.path.join(ASSET_ROOT, "summons", "orbs", f"{orb['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "summons", os.path.basename(source))
        register_asset(
            orb["id"],
            "living_orb",
            source,
            runtime,
            metrics,
            displayName=orb["displayName"],
            animations=animations,
        )
    for index, familiar in enumerate(familiars):
        reset_scene()
        objects = build_familiar(familiar, index)
        source = os.path.join(ASSET_ROOT, "summons", "familiars", f"{familiar['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "summons", os.path.basename(source))
        register_asset(
            familiar["id"],
            "summon_familiar",
            source,
            runtime,
            metrics,
            animations=["Idle", "Appear", "Celebrate", "Dismiss"],
        )


def build_prop(prop: dict, index: int) -> list[bpy.types.Object]:
    guardian = CHARACTER_MANIFEST["guardians"][index % len(CHARACTER_MANIFEST["guardians"])]
    materials = build_materials(guardian, "combat")
    primary = materials["primary"]
    secondary = materials["secondary"]
    gold = materials["gold"]
    glow = materials["emissive"]
    prop_id = prop["id"]
    objects = []
    if any(word in prop_id for word in ("orrery", "altar", "forge", "table", "podium", "stage")):
        objects.append(add_cylinder("Prop_Base", (0, 0, 0), (0, 0, 0.18), 0.72, primary, 32))
        objects.append(add_torus("Prop_BaseRing", (0, 0, 0.20), 0.60, 0.04, gold, 32))
        objects.append(add_sphere("Prop_Core", (0, 0, 0.80), (0.20, 0.16, 0.20), glow, 20, 12))
        for orbit in range(3):
            objects.append(add_torus(f"Prop_Orbit_{orbit}", (0, 0, 0.80), 0.32 + orbit * 0.13, 0.018, gold if orbit % 2 == 0 else secondary, 30, (0.35 * orbit, 0.55 * orbit, 0.20 * orbit)))
    elif any(word in prop_id for word in ("door", "gate", "elevator", "mirror", "frame")):
        objects.append(add_cube("Prop_LeftPillar", (-0.62, 0, 1.05), (0.12, 0.20, 1.05), primary, 0.05))
        objects.append(add_cube("Prop_RightPillar", (0.62, 0, 1.05), (0.12, 0.20, 1.05), primary, 0.05))
        objects.append(add_cube("Prop_Top", (0, 0, 2.05), (0.74, 0.20, 0.12), gold, 0.05))
        objects.append(add_torus("Prop_PortalRing", (0, 0.05, 1.05), 0.56, 0.045, glow, 36, (math.pi / 2, 0, 0)))
    elif any(word in prop_id for word in ("shelf", "board", "chest")):
        objects.append(add_cube("Prop_Cabinet", (0, 0, 0.70), (0.68, 0.26, 0.70), primary, 0.06))
        for row in range(3):
            objects.append(add_cube(f"Prop_Shelf_{row}", (0, -0.28, 0.25 + row * 0.44), (0.62, 0.035, 0.035), gold, 0.01))
        objects.append(add_sphere("Prop_LockCore", (0, -0.32, 0.70), (0.10, 0.04, 0.10), glow, 16, 10))
    else:
        objects.append(add_cylinder("Prop_Stand", (0, 0, 0), (0, 0, 1.25), 0.12, primary, 18))
        objects.append(add_torus("Prop_AimRing", (0, 0, 1.45), 0.38, 0.04, gold, 32, (math.pi / 2, 0, 0)))
        objects.append(add_sphere("Prop_Energy", (0, 0, 1.45), (0.16, 0.10, 0.16), glow, 18, 10))
        for blade in range(4):
            angle = math.tau * blade / 4
            objects.append(add_cone(f"Prop_Blade_{blade}", (math.cos(angle) * 0.50, 0, 1.45 + math.sin(angle) * 0.50), 0.09, 0, 0.48, secondary, 12, (0, math.pi / 2, angle)))
    return objects


def build_props() -> None:
    props = INVENTORY["categories"]["commonProps"]
    for index, prop in enumerate(props):
        reset_scene()
        objects = build_prop(prop, index)
        source = os.path.join(ASSET_ROOT, "props", f"{prop['id']}.glb")
        metrics = select_and_export(objects, source)
        runtime = runtime_copy(source, "props", os.path.basename(source))
        register_asset(prop["id"], "shared_prop", source, runtime, metrics)


def load_existing_catalog() -> None:
    if not os.path.exists(RUNTIME_DATA):
        return
    try:
        with open(RUNTIME_DATA, "r", encoding="utf8") as handle:
            previous = json.load(handle)
        existing = previous.get("assets", [])
        family_prefixes = {
            "guardians": ("rigged_guardian",),
            "equipment": ("modular_outfit", "signature_weapon", "signature_artifact", "signature_armor_set"),
            "summons": ("living_orb", "summon_familiar"),
            "props": ("shared_prop",),
        }
        replacing = set(family_prefixes.get(FAMILY, ()))
        if FAMILY != "all":
            CATALOG["assets"].extend(asset for asset in existing if asset.get("kind") not in replacing)
    except (OSError, ValueError):
        return


load_existing_catalog()
if FAMILY in ("all", "guardians"):
    build_guardian_catalog()
if FAMILY in ("all", "equipment"):
    build_guardian_equipment()
if FAMILY in ("all", "summons"):
    build_summons()
if FAMILY in ("all", "props"):
    build_props()

CATALOG["assets"] = sorted(CATALOG["assets"], key=lambda asset: asset["id"])
CATALOG["summary"] = {
    "total": len(CATALOG["assets"]),
    "byKind": {},
    "bytes": sum(asset["metrics"]["bytes"] for asset in CATALOG["assets"]),
    "triangles": sum(asset["metrics"]["triangles"] for asset in CATALOG["assets"]),
}
for asset in CATALOG["assets"]:
    kind = asset["kind"]
    CATALOG["summary"]["byKind"][kind] = CATALOG["summary"]["byKind"].get(kind, 0) + 1

with open(RUNTIME_DATA, "w", encoding="utf8") as handle:
    json.dump(CATALOG, handle, ensure_ascii=False, indent=2)
with open(REPORT_PATH, "w", encoding="utf8") as handle:
    json.dump(CATALOG, handle, ensure_ascii=False, indent=2)

print(json.dumps(CATALOG["summary"], ensure_ascii=False, indent=2))

