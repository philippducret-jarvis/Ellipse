"""Generate the complete Orbes d'Astra humanoid guardian roster.

This catalog builder scales the validated Mira MPFB pipeline to the 24 adult
guardians. Every guardian receives a distinct morph profile, skin, hair,
palette, fitted outfit, armor accents, signature equipment, sockets and an
exported idle clip. It writes editable Blender sources, GLB runtime assets,
previews and QA metadata.

The resulting catalog is a strong integration-ready 3D base. It is not falsely
labelled as hand-sculpted final commercial art: bespoke sculpt polish,
production retopology, final texture painting and the full animation list
remain separate art-production gates.
"""

from __future__ import annotations

import importlib.util
import json
import math
import os
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def cli_arg(name: str, default: str) -> str:
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    if name not in args:
        return default
    index = args.index(name)
    return args[index + 1] if index + 1 < len(args) else default


PROJECT_ROOT = os.path.abspath(cli_arg("--project-root", os.getcwd()))
ONLY_GUARDIAN = cli_arg("--guardian-id", "")
LIMIT = int(cli_arg("--limit", "0"))
RENDER_PREVIEWS = cli_arg("--render", "1") != "0"
MANIFEST_PATH = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "01_preproduction",
    "manifests",
    "characters-3d.json",
)
OUTPUT_ROOT = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "03_assets",
    "3d",
    "catalog_v2",
    "guardians",
)
RUNTIME_ROOT = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "04_runtime",
    "godot",
    "assets",
    "3d",
    "guardians_v2",
)
CATALOG_PATH = os.path.join(
    PROJECT_ROOT,
    "workspaces",
    "orbes-d-astra",
    "04_runtime",
    "godot",
    "data",
    "guardians_3d_v2.json",
)


def load_pilot_module():
    path = os.path.join(PROJECT_ROOT, "tools", "blender", "build_orbes_mira_mpfb_pilot.py")
    spec = importlib.util.spec_from_file_location("orbes_mpfb_pilot", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load pilot utilities: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pilot = load_pilot_module()
with open(MANIFEST_PATH, "r", encoding="utf8") as handle:
    MANIFEST = json.load(handle)

GUARDIANS = MANIFEST["guardians"]
if ONLY_GUARDIAN:
    GUARDIANS = [guardian for guardian in GUARDIANS if guardian["id"] == ONLY_GUARDIAN]
if LIMIT > 0:
    GUARDIANS = GUARDIANS[:LIMIT]
if not GUARDIANS:
    raise RuntimeError("No guardian matched the requested filter")

os.makedirs(OUTPUT_ROOT, exist_ok=True)
os.makedirs(RUNTIME_ROOT, exist_ok=True)
os.makedirs(os.path.dirname(CATALOG_PATH), exist_ok=True)


PALETTES = [
    ((0.010, 0.095, 0.130), (0.015, 0.30, 0.34), (0.16, 0.85, 0.95)),
    ((0.16, 0.018, 0.010), (0.62, 0.08, 0.025), (1.0, 0.28, 0.035)),
    ((0.018, 0.13, 0.075), (0.07, 0.38, 0.18), (0.24, 0.95, 0.52)),
    ((0.008, 0.085, 0.18), (0.02, 0.32, 0.58), (0.12, 0.76, 1.0)),
    ((0.08, 0.018, 0.15), (0.34, 0.06, 0.53), (0.76, 0.24, 0.92)),
    ((0.19, 0.075, 0.008), (0.65, 0.26, 0.015), (1.0, 0.69, 0.10)),
    ((0.09, 0.10, 0.15), (0.34, 0.42, 0.55), (0.70, 0.88, 1.0)),
    ((0.12, 0.015, 0.08), (0.55, 0.06, 0.30), (1.0, 0.28, 0.62)),
]
HAIR_FEMALE = [
    "elvs_island_princess_hair.mhclo",
    "elvs_katherine_hair.mhclo",
    "elvs_lady_hippy_hair.mhclo",
    "elvs_braid_bun.mhclo",
    "elvs_inverted_curly_bob.mhclo",
    "punkduck_alpha7_long2.mhclo",
]
HAIR_MALE = [
    "elvs_maxwell_hair.mhclo",
    "elvs_grump_hair.mhclo",
    "elvs_short_side_do.mhclo",
    "culturalibre_hair_11.mhclo",
    "punkduck_alpha7_curly.mhclo",
    "elvs_keylth_hair.mhclo",
]
OUTFITS_FEMALE = [
    "toigo_cut_out_dress.mhclo",
    "culturalibre_heroine_suit_2.mhclo",
    "toigo_keyhole_neck_dress.mhclo",
    "toigo_strapless_ruffle_top_dress.mhclo",
    "matcreator_mc-bodysuit-2021.mhclo",
    "toigo_halter_dress_with_fluted_skirt.mhclo",
    "mindfront_kimono.mhclo",
    "matcreator_mc-skinsuit_2022.mhclo",
    "toigo_bodice_dress_with_lace_ruffle_skirt.mhclo",
    "toigo_halter_dress_midi.mhclo",
    "toigo_camisole_dress_with_full_skirt.mhclo",
    "wdg_mycenaean_tunic.mhclo",
]
OUTFITS_MALE = [
    "culturalibre_hero_suit_1.mhclo",
    "rehmanpolanski_viking_tunic.mhclo",
    "culturalibre_hero_suit_2.mhclo",
    "donitz_monk_robe.mhclo",
    "matcreator_mc-scifi-armor_guardian.mhclo",
    "thegreatengineer_galactic_warrior_uniform.mhclo",
    "matcreator_mc-bodysuit-2021.mhclo",
    "matcreator_mc-scifi-armor_helios.mhclo",
    "culturalibre_hero_suit_3.mhclo",
    "matcreator_mc-scifi-armor_jupiter7.mhclo",
    "matcreator_mc-skinsuit_2022.mhclo",
    "wdg_mycenaean_tunic.mhclo",
]
GLOVES = [
    "culturalibre_hero-heroine_gloves_1.mhclo",
    "culturalibre_hero-heroine_gloves_2.mhclo",
    "culturalibre_hero-heroine_gloves_3.mhclo",
    "culturalibre_hero-heroine_gloves_4.mhclo",
    "culturalibre_hero-heroine_gloves_5.mhclo",
    "toigo_gloves_long.mhclo",
]
WEAPON_ASSETS = {
    "staff": "culturalibre_magic_sceptre.mhclo",
    "spear": "culturalibre_hero_kalistick.mhclo",
    "hammer": "culturalibre_war_hammer.mhclo",
    "bow": "culturalibre_wooden_bow.mhclo",
    "blades": "o4saken_dagger.mhclo",
    "sword": "joepal_crude_sword.mhclo",
}
OUTFIT_BY_GUARDIAN = {
    "mira": "toigo_halter_dress_with_fluted_skirt.mhclo",
    "brann": "rehmanpolanski_viking_tunic.mhclo",
    "kael": "culturalibre_hero_suit_2.mhclo",
    "orin": "culturalibre_hero_suit_3.mhclo",
    "talia": "culturalibre_heroine_suit_2.mhclo",
    "joren": "matcreator_mc-scifi-armor_guardian.mhclo",
    "phae": "mindfront_kimono.mhclo",
    "ciro": "donitz_monk_robe.mhclo",
    "lys": "toigo_dress_with_tiered_skirt.mhclo",
    "noor": "toigo_camisole_dress_with_full_skirt.mhclo",
    "vesper": "matcreator_mc-scifi-armor_helios.mhclo",
    "saphira": "matcreator_mc-skinsuit_2022.mhclo",
    "nyx": "toigo_bodice_dress_with_lace_ruffle_skirt.mhclo",
    "ilyra": "toigo_keyhole_neck_dress.mhclo",
    "caelum": "matcreator_mc-scifi-armor_jupiter7.mhclo",
    "rhea": "toigo_halter_dress_midi.mhclo",
    "talos": "matcreator_mc-scifi-armor_guardian.mhclo",
    "maelys": "toigo_cut_out_dress.mhclo",
    "aster": "culturalibre_heroine_suit_2.mhclo",
    "elya": "toigo_strapless_ruffle_top_dress.mhclo",
    "solveig": "matcreator_mc-scifi-armor_helios.mhclo",
    "seraphiel": "thegreatengineer_galactic_warrior_uniform.mhclo",
    "vaelora": "toigo_halter_dress_with_fluted_skirt.mhclo",
    "orion": "matcreator_mc-bodysuit-2021.mhclo",
}
SHOES_BY_GUARDIAN = {
    "brann": "rehmanpolanski_viking_boots.mhclo",
}
EXTRA_WARDROBE_BY_GUARDIAN = {
    "brann": ["rehmanpolanski_viking_pants.mhclo"],
}
SKIN_BY_GUARDIAN = {
    "mira": "callharvey3d_midtoned_female.mhmat",
    "brann": "rehmanpolanski_skin_viking_tattoos.mhmat",
    "kael": "toigo_light_skin_male_freckles.mhmat",
    "orin": "toigo_light_skin_male_bronze.mhmat",
    "talia": "darthfurby_caucasian_female.mhmat",
    "joren": "mindfront_aksel_skin.mhmat",
    "phae": "cutoff3d_indian_female_enhanced.mhmat",
    "ciro": "toigo_light_skin_male_with_eyeliner.mhmat",
    "lys": "onlytheghosts_young_eurasian_female.mhmat",
    "noor": "toigo_light_skin_female_bronze_with_makeup.mhmat",
    "vesper": "toigo_light_skin_male_with_goth_makeup.mhmat",
    "saphira": "nyloseth_zoeyskin.mhmat",
    "nyx": "toigo_light_skin_female_with_violet_makeup.mhmat",
    "ilyra": "toigo_light_skin_with_natural_makeup.mhmat",
    "caelum": "toigo_light_skin_male_ginger.mhmat",
    "rhea": "onlytheghosts_middle_aged_eurasian_female.mhmat",
    "talos": "mindfront_skin_male_african_middleage.mhmat",
    "maelys": "skalldyrssuppe_creamy_female.mhmat",
    "aster": "blindsaypatten_uniform_skin_texture.mhmat",
    "elya": "toigo_light_skin_female_ginger_with_makeup.mhmat",
    "solveig": "flower-angel_red_head_skin.mhmat",
    "seraphiel": "toigo_light_skin_male_bronze.mhmat",
    "vaelora": "cutoff3d_indian_female_skin.mhmat",
    "orion": "onlytheghosts_old_eurasian_male.mhmat",
}
RACE_PROFILES = [
    ("african", {"asian": 0.08, "caucasian": 0.18, "african": 0.74}),
    ("caucasian", {"asian": 0.12, "caucasian": 0.76, "african": 0.12}),
    ("asian", {"asian": 0.76, "caucasian": 0.16, "african": 0.08}),
    ("mixed", {"asian": 0.28, "caucasian": 0.34, "african": 0.38}),
]


def is_female(guardian: dict) -> bool:
    return guardian.get("presentation", "").lower() == "femme"


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def body_macro(guardian: dict, index: int, target_service) -> tuple[dict, str]:
    female = is_female(guardian)
    silhouette = guardian.get("silhouette", "").lower()
    macro = target_service.get_default_macro_info_dict()
    muscle = 0.44 if female else 0.62
    weight = 0.50
    height = 0.51 + ((index % 5) - 2) * 0.035
    proportions = 0.60 if female else 0.56
    if any(word in silhouette for word in ("muscl", "colosse", "large", "impos")):
        muscle += 0.22
        weight += 0.08
        height += 0.07
    if any(word in silhouette for word in ("fin", "longiligne", "élanc", "Ã©lanc")):
        muscle -= 0.10
        weight -= 0.08
        proportions += 0.08
    if any(word in silhouette for word in ("pulpeuse", "volupt", "courbes")):
        weight += 0.14
    if "petite" in silhouette:
        height -= 0.12
    if any(word in silhouette for word in ("grand", "haute")):
        height += 0.10
    race_name, race = RACE_PROFILES[index % len(RACE_PROFILES)]
    macro.update(
        {
            "gender": 1.0 if female else 0.0,
            # MakeHuman's neutral adult sits near the middle of the macro
            # range. The former 0.36 baseline made the roster read too young.
            "age": clamp(0.44 + (guardian.get("age", 27) - 24) * 0.006, 0.42, 0.68),
            "muscle": clamp(muscle, 0.28, 0.90),
            "weight": clamp(weight, 0.32, 0.78),
            "proportions": clamp(proportions, 0.40, 0.78),
            "height": clamp(height, 0.32, 0.78),
            "cupsize": 0.60 + (index % 4) * 0.055 if female else 0.50,
            "firmness": 0.70 if female else 0.50,
            "race": race,
        }
    )
    return macro, race_name


def skin_filename(guardian: dict, race_name: str) -> tuple[str, str]:
    female = is_female(guardian)
    age_prefix = "middleage" if guardian.get("age", 27) >= 40 else "young"
    gender = "female" if female else "male"
    race = "caucasian" if race_name == "mixed" else race_name
    filename = f"{age_prefix}_{race}_{gender}.mhmat"
    diffuse_prefix = {
        "african": "darkskinned",
        "asian": "lightskinned",
        "caucasian": "lightskinned",
    }[race]
    suffix = ""
    if race == "asian":
        suffix = "3" if female and age_prefix == "young" else "2"
    diffuse = f"{age_prefix}_{diffuse_prefix}_{gender}_diffuse{suffix}.png"
    return filename, diffuse


def mhmat_texture_path(material_path: str, key: str) -> str | None:
    with open(material_path, "r", encoding="utf8", errors="ignore") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line.startswith(key + " "):
                continue
            relative = line[len(key) + 1 :].strip()
            candidate = os.path.join(os.path.dirname(material_path), relative)
            if os.path.exists(candidate):
                return candidate
    return None


def create_guardian(guardian: dict, index: int):
    HumanService = pilot.dynamic_import("mpfb.services.humanservice", "HumanService")
    TargetService = pilot.dynamic_import("mpfb.services.targetservice", "TargetService")
    AssetService = pilot.dynamic_import("mpfb.services.assetservice", "AssetService")
    macro, race_name = body_macro(guardian, index, TargetService)
    body = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    prefix = guardian["id"]
    body.name = f"{prefix}_Body_LOD0"
    pilot.mark_export(body)
    body["guardian_id"] = prefix
    body["adult_confirmed"] = bool(guardian.get("adultConfirmed", True))
    body["source_base"] = "MPFB 2.0.17 / MakeHuman CC0 assets"
    authored_skin = SKIN_BY_GUARDIAN.get(guardian["id"])
    skin_file, diffuse_file = skin_filename(guardian, race_name)
    if authored_skin:
        skin_file = authored_skin
    skin_path = AssetService.find_asset_absolute_path(skin_file, asset_subdir="skins")
    if skin_path is None:
        # The mixed/less common fallback is guaranteed to exist in the system pack.
        gender = "female" if is_female(guardian) else "male"
        skin_path = AssetService.find_asset_absolute_path(
            f"young_caucasian_{gender}.mhmat",
            asset_subdir="skins",
        )
        diffuse_file = f"young_lightskinned_{gender}_diffuse.png"
    HumanService.set_character_skin(skin_path, body, skin_type="GAMEENGINE")
    diffuse_path = mhmat_texture_path(skin_path, "diffuseTexture")
    if diffuse_path is None:
        diffuse_path = os.path.join(os.path.dirname(skin_path), diffuse_file)
    if not os.path.exists(diffuse_path):
        diffuse_candidates = list(Path(os.path.dirname(skin_path)).glob("*diffuse*.png"))
        if not diffuse_candidates:
            raise RuntimeError(f"Skin diffuse texture missing for {guardian['id']}")
        diffuse_path = str(diffuse_candidates[0])
    skin_material = pilot.apply_game_skin(body, diffuse_path)
    skin_material.name = f"{prefix}_Skin_Godot_PBR"
    rig = HumanService.add_builtin_rig(body, "game_engine_with_breast")
    rig.name = f"{prefix}_Rig_GameEngine"
    pilot.mark_export(rig)
    rig["skeleton_contract"] = "orbes_astra_humanoid_v2"
    return body, rig


def equip_assets(guardian: dict, index: int, body: bpy.types.Object) -> dict[str, bpy.types.Object]:
    HumanService = pilot.dynamic_import("mpfb.services.humanservice", "HumanService")
    AssetService = pilot.dynamic_import("mpfb.services.assetservice", "AssetService")
    female = is_female(guardian)
    hair_file = (HAIR_FEMALE if female else HAIR_MALE)[index % 6]
    eyebrow_file = f"mindfront_eyebrows_{(index % 14) + 1:02d}.mhclo"
    shoe_file = SHOES_BY_GUARDIAN.get(
        guardian["id"],
        f"shoes{(index % 6) + 1:02d}.mhclo",
    )
    outfit_pool = OUTFITS_FEMALE if female else OUTFITS_MALE
    outfit_file = OUTFIT_BY_GUARDIAN.get(
        guardian["id"],
        outfit_pool[index % len(outfit_pool)],
    )
    glove_file = GLOVES[index % len(GLOVES)]
    weapon_file = WEAPON_ASSETS[weapon_kind(guardian)]
    specs = [
        ("eyes", "high-poly.mhclo", "Eyes", "GAMEENGINE"),
        ("eyebrows", eyebrow_file, "Eyebrows", "GAMEENGINE"),
        ("eyelashes", "eyelashes01.mhclo", "Eyelashes", "GAMEENGINE"),
        ("teeth", "teeth_base.mhclo", "Teeth", "GAMEENGINE"),
        ("tongue", "tongue01.mhclo", "Tongue", "GAMEENGINE"),
        ("hair", hair_file, "Hair", "GAMEENGINE"),
        ("clothes", shoe_file, "Clothes", "GAMEENGINE"),
        ("clothes", outfit_file, "Clothes", "GAMEENGINE"),
        ("clothes", glove_file, "Clothes", "GAMEENGINE"),
        ("clothes", weapon_file, "Clothes", "GAMEENGINE"),
    ]
    for extra_file in EXTRA_WARDROBE_BY_GUARDIAN.get(guardian["id"], []):
        specs.append(("clothes", extra_file, "Clothes", "GAMEENGINE"))
    equipped: dict[str, bpy.types.Object] = {}
    for subdir, filename, asset_type, material_type in specs:
        path = AssetService.find_asset_absolute_path(filename, asset_subdir=subdir)
        if path is None:
            raise RuntimeError(f"Missing system asset {filename} for {guardian['id']}")
        obj = HumanService.add_mhclo_asset(
            path,
            body,
            asset_type=asset_type,
            subdiv_levels=1 if asset_type in ("Hair", "Clothes") else 0,
            material_type=material_type,
        )
        obj.name = f"{guardian['id']}_{asset_type}_{Path(filename).stem}"
        pilot.mark_export(obj)
        equipped[filename] = obj
    equipped["_hair"] = equipped[hair_file]
    equipped["_eyebrow"] = equipped[eyebrow_file]
    equipped["_shoes"] = equipped[shoe_file]
    equipped["_outfit"] = equipped[outfit_file]
    equipped["_gloves"] = equipped[glove_file]
    equipped["_weapon"] = equipped[weapon_file]
    equipped["_extras"] = [
        equipped[filename]
        for filename in EXTRA_WARDROBE_BY_GUARDIAN.get(guardian["id"], [])
    ]
    return equipped


def make_fabric_material(
    guardian: dict,
    accent: tuple[float, float, float],
) -> bpy.types.Material:
    prefix = guardian["id"]
    element = guardian.get("element", "").lower()
    if element in ("feu", "solaire", "foudre", "aurore", "métal", "metal"):
        texture_name = "fabric_solar_ember_basecolor.png"
    elif element in ("vide", "cosmos", "nexus", "ombre", "cristal"):
        texture_name = "fabric_void_cosmic_basecolor.png"
    elif element in ("nature", "vent"):
        texture_name = "fabric_nature_wind_basecolor.png"
    else:
        texture_name = "fabric_lunar_tide_basecolor.png"
    texture_path = os.path.join(
        PROJECT_ROOT,
        "workspaces",
        "orbes-d-astra",
        "03_assets",
        "3d",
        "materials",
        "astra_fabrics_v1",
        texture_name,
    )
    material = pilot.make_material(
        f"{prefix}_Signature_Fabric",
        tuple(min(1.0, channel * 0.78 + 0.025) for channel in accent),
        metallic=0.02,
        roughness=0.58,
    )
    if os.path.exists(texture_path):
        shader = material.node_tree.nodes.get("Principled BSDF")
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.name = f"{prefix}_Fabric_BaseColor"
        texture.image = bpy.data.images.load(texture_path, check_existing=True)
        texture.interpolation = "Linear"
        material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return material


def create_materials(guardian: dict, index: int) -> dict[str, bpy.types.Material]:
    prefix = guardian["id"]
    base, accent, glow = PALETTES[index % len(PALETTES)]
    return {
        "midnight": pilot.make_material(f"{prefix}_Midnight", base, metallic=0.12, roughness=0.50),
        "primary": pilot.make_material(f"{prefix}_Primary", accent, metallic=0.18, roughness=0.42),
        "fabric": make_fabric_material(guardian, accent),
        "armor": pilot.make_material(
            f"{prefix}_Signature_Armor",
            tuple(min(1.0, channel * 0.72 + 0.045) for channel in accent),
            metallic=0.38,
            roughness=0.34,
        ),
        "weapon": pilot.make_material(
            f"{prefix}_Signature_Weapon",
            tuple(min(1.0, channel * 0.62 + 0.08) for channel in accent),
            metallic=0.76,
            roughness=0.22,
        ),
        "gold": pilot.make_material(f"{prefix}_Gold", (0.54, 0.28, 0.055), metallic=0.82, roughness=0.27),
        "glow": pilot.make_material(
            f"{prefix}_Glow",
            glow,
            metallic=0.05,
            roughness=0.24,
            emission=glow,
            emission_strength=0.85,
        ),
        "veil": pilot.make_material(
            f"{prefix}_Veil",
            accent,
            metallic=0.05,
            roughness=0.38,
            emission=tuple(channel * 0.35 for channel in glow),
            emission_strength=0.10,
            alpha=0.58,
        ),
        "hair": pilot.make_material(
            f"{prefix}_Hair",
            (
                0.008 + (index % 3) * 0.025,
                0.010 + ((index + 1) % 3) * 0.018,
                0.014 + ((index + 2) % 3) * 0.025,
            ),
            metallic=0.04,
            roughness=0.30,
        ),
        "ivory": pilot.make_material(f"{prefix}_Ivory", (0.84, 0.77, 0.67), roughness=0.33),
        "rose": pilot.make_material(f"{prefix}_Mouth", (0.39, 0.045, 0.060), roughness=0.43),
        "sclera": pilot.make_material(f"{prefix}_Sclera", (0.50, 0.54, 0.53), roughness=0.36),
        "iris": pilot.make_material(
            f"{prefix}_Iris",
            glow,
            roughness=0.22,
            emission=glow,
            emission_strength=0.05,
        ),
        "pupil": pilot.make_material(f"{prefix}_Pupil", (0.001, 0.003, 0.004), roughness=0.24),
    }


def add_outfit_accents(
    guardian: dict,
    rig: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    prefix = guardian["id"]
    # The fitted MPFB wardrobe supplies the silhouette and deformation. These
    # authored Astra accents provide a shared faction language without covering
    # the garments in primitive shells.
    belt = pilot.add_torus(
        f"{prefix}_Astral_Belt",
        (0.0, 0.0, 0.965),
        0.235,
        0.014,
        materials["gold"],
        major_segments=44,
    )
    pilot.parent_to_bone_keep_transform(belt, rig, "pelvis")
    core = pilot.add_uv_sphere(
        f"{prefix}_Chest_Core",
        (0.0, -0.205, 1.335),
        (0.027, 0.012, 0.035),
        materials["glow"],
        segments=24,
        rings=14,
    )
    pilot.parent_to_bone_keep_transform(core, rig, "spine_03")
    for side, sign in (("L", 1.0), ("R", -1.0)):
        shoulder = pilot.add_torus(
            f"{prefix}_Shoulder_Orbit_{side}",
            (0.315 * sign, 0.015, 1.42),
            0.072,
            0.006,
            materials["gold"],
            rotation=(math.pi / 2, 0.18 * sign, 0.0),
            major_segments=28,
        )
        pilot.parent_to_bone_keep_transform(shoulder, rig, f"upperarm_{side.lower()}")
    fantasy = guardian.get("outfitFantasy", "").lower()
    if any(word in fantasy for word in ("voile", "cape", "ailes", "plumes", "drap")):
        panel = [
            (-0.22, 0.14, 1.34),
            (0.22, 0.14, 1.34),
            (0.42, 0.36, 0.20),
            (-0.42, 0.36, 0.20),
        ]
        pilot.add_robe_panel(
            f"{prefix}_Astral_Back_Veil",
            panel,
            materials["veil"],
            rig,
            "spine_03",
        )


def weapon_kind(guardian: dict) -> str:
    fantasy = guardian.get("outfitFantasy", "").lower()
    ability = guardian.get("ability", "")
    if "arc" in fantasy:
        return "bow"
    if any(word in fantasy for word in ("lancier", "valkyrie")):
        return "spear"
    if ability == "forge_next":
        return "hammer"
    if ability == "aegis":
        return "sword"
    if ability in ("echo_merge", "shatter_top"):
        return "blades"
    return "staff"


def add_weapon(
    guardian: dict,
    rig: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
    equipped_weapon: bpy.types.Object | None = None,
) -> None:
    prefix = guardian["id"]
    x = -0.47
    parts: list[bpy.types.Object] = []
    kind = weapon_kind(guardian)
    if equipped_weapon is not None:
        equipped_weapon["signature_weapon_kind"] = kind
        equipped_weapon["gacha_world_matrix"] = [
            value for row in equipped_weapon.matrix_world for value in row
        ]
        # Add only the Astra energy signature; the fitted CC0 mesh supplies the
        # actual weapon silhouette and hand deformation.
        core = pilot.add_uv_sphere(
            f"{prefix}_Weapon_Astra_Core",
            (-0.47, -0.08, 1.30),
            (0.045, 0.032, 0.045),
            materials["glow"],
            segments=20,
            rings=12,
        )
        orbit = pilot.add_torus(
            f"{prefix}_Weapon_Astra_Orbit",
            (-0.47, -0.08, 1.30),
            0.085,
            0.006,
            materials["gold"],
            rotation=(math.pi / 2, 0.0, 0.0),
            major_segments=30,
        )
        for part in (core, orbit):
            pilot.parent_to_bone_keep_transform(part, rig, "hand_r")
            part["gacha_world_matrix"] = [
                value for row in part.matrix_world for value in row
            ]
        return
    if kind == "staff":
        parts.extend(
            [
                pilot.add_cylinder_between(f"{prefix}_Staff_Shaft", (x, -0.08, 0.16), (x, -0.08, 1.68), 0.025, materials["gold"]),
                pilot.add_uv_sphere(f"{prefix}_Staff_Core", (x, -0.08, 1.78), (0.09, 0.068, 0.09), materials["glow"]),
                pilot.add_torus(f"{prefix}_Staff_Orbit_A", (x, -0.08, 1.78), 0.19, 0.015, materials["gold"], rotation=(math.pi / 2, 0, 0)),
                pilot.add_torus(f"{prefix}_Staff_Orbit_B", (x, -0.08, 1.78), 0.14, 0.011, materials["glow"], rotation=(0.75, 0.3, 0.5)),
            ]
        )
    elif kind == "spear":
        parts.append(pilot.add_cylinder_between(f"{prefix}_Spear_Shaft", (x, -0.08, 0.08), (x, -0.08, 1.72), 0.025, materials["gold"]))
        parts.append(pilot.add_cone(f"{prefix}_Spear_Blade", (x, -0.08, 1.94), 0.12, 0.0, 0.44, materials["primary"], vertices=20))
        parts.append(pilot.add_uv_sphere(f"{prefix}_Spear_Core", (x, -0.08, 1.70), (0.07, 0.05, 0.07), materials["glow"]))
    elif kind == "hammer":
        parts.append(pilot.add_cylinder_between(f"{prefix}_Hammer_Shaft", (x, -0.08, 0.20), (x, -0.08, 1.48), 0.035, materials["gold"]))
        parts.append(pilot.add_cube(f"{prefix}_Hammer_Head", (x, -0.08, 1.58), (0.20, 0.105, 0.125), materials["primary"], bevel=0.045))
        parts.append(pilot.add_uv_sphere(f"{prefix}_Hammer_Core", (x, -0.20, 1.58), (0.08, 0.035, 0.08), materials["glow"]))
    elif kind == "bow":
        parts.append(pilot.add_cylinder_between(f"{prefix}_Bow_Grip", (x, -0.08, 0.78), (x, -0.08, 1.12), 0.030, materials["gold"]))
        parts.append(pilot.add_torus(f"{prefix}_Bow_Limbs", (x, -0.08, 0.96), 0.44, 0.020, materials["primary"], rotation=(math.pi / 2, 0, 0)))
        parts.append(pilot.add_cylinder_between(f"{prefix}_Bow_String", (x, -0.08, 0.48), (x, -0.08, 1.44), 0.006, materials["glow"]))
    elif kind == "blades":
        for blade_index, offset in enumerate((-0.06, 0.06)):
            parts.append(pilot.add_cylinder_between(f"{prefix}_Blade_Grip_{blade_index}", (x + offset, -0.08, 0.72), (x + offset, -0.08, 1.00), 0.026, materials["gold"]))
            parts.append(pilot.add_cone(f"{prefix}_Blade_{blade_index}", (x + offset, -0.08, 1.28), 0.065, 0.0, 0.60, materials["primary"], vertices=16))
    else:
        parts.append(pilot.add_cylinder_between(f"{prefix}_Sword_Grip", (x, -0.08, 0.72), (x, -0.08, 1.02), 0.030, materials["gold"]))
        parts.append(pilot.add_cube(f"{prefix}_Sword_Blade", (x, -0.08, 1.39), (0.052, 0.018, 0.38), materials["primary"], bevel=0.015))
    for part in parts:
        pilot.parent_to_bone_keep_transform(part, rig, "hand_r")
        part["gacha_world_matrix"] = [value for row in part.matrix_world for value in row]


def add_art_direction(
    guardian: dict,
    index: int,
    rig: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    prefix = guardian["id"]
    halo_count = 1 + index % 3
    for halo_index in range(halo_count):
        halo = pilot.add_torus(
            f"{prefix}_Element_Halo_{halo_index}",
            (0.0, 0.115, 1.68),
            0.245 + halo_index * 0.045,
            0.008 + halo_index * 0.0015,
            materials["glow"] if halo_index % 2 else materials["gold"],
            rotation=(math.pi / 2, halo_index * 0.26, halo_index * 0.13),
            major_segments=52,
        )
        pilot.parent_to_bone_keep_transform(halo, rig, "head")
    artifact = pilot.add_uv_sphere(
        f"{prefix}_Artifact_Core",
        (0.48, -0.08, 1.14),
        (0.065, 0.050, 0.065),
        materials["glow"],
        segments=22,
        rings=14,
    )
    pilot.parent_to_bone_keep_transform(artifact, rig, "hand_l")
    artifact["gacha_world_matrix"] = [value for row in artifact.matrix_world for value in row]
    orbit = pilot.add_torus(
        f"{prefix}_Artifact_Orbit",
        (0.48, -0.08, 1.14),
        0.115,
        0.007,
        materials["gold"],
        rotation=(math.pi / 2, 0.0, 0.0),
        major_segments=36,
    )
    pilot.parent_to_bone_keep_transform(orbit, rig, "hand_l")
    orbit["gacha_world_matrix"] = [value for row in orbit.matrix_world for value in row]
    pilot.add_socket(rig, "socket_weapon_r", "hand_r", (-0.47, -0.08, 1.15))
    pilot.add_socket(rig, "socket_artifact_l", "hand_l", (0.47, -0.08, 1.15))
    pilot.add_socket(rig, "socket_back", "spine_03", (0.0, 0.18, 1.40))
    pilot.add_socket(rig, "socket_head_fx", "head", (0.0, 0.08, 1.91))


def style_guardian(
    guardian: dict,
    index: int,
    body: bpy.types.Object,
    rig: bpy.types.Object,
    equipped: dict[str, bpy.types.Object],
) -> dict[str, bpy.types.Material]:
    materials = create_materials(guardian, index)
    # The high-detail mesh supplies the silhouette; the shared PBR tint keeps
    # character identity stable across differently colored source packs.
    pilot.assign_material(equipped["_hair"], materials["hair"])
    pilot.assign_material(equipped["_eyebrow"], materials["hair"])
    pilot.assign_material(equipped["eyelashes01.mhclo"], materials["hair"])
    pilot.assign_material(equipped["teeth_base.mhclo"], materials["ivory"])
    pilot.assign_material(equipped["tongue01.mhclo"], materials["rose"])
    pilot.assign_material(equipped["high-poly.mhclo"], materials["sclera"])
    pilot.assign_material(equipped["_shoes"], materials["midnight"])
    fantasy = guardian.get("outfitFantasy", "").lower()
    armored = any(
        token in fantasy
        for token in ("armure", "cuirass", "plastron", "valkyrie", "lancier", "chevalier", "sentinelle")
    )
    pilot.assign_material(
        equipped["_outfit"],
        materials["armor"] if armored else materials["fabric"],
    )
    pilot.assign_material(equipped["_gloves"], materials["midnight"])
    pilot.assign_material(equipped["_weapon"], materials["weapon"])
    for extra in equipped["_extras"]:
        pilot.assign_material(extra, materials["fabric"])
    add_outfit_accents(guardian, rig, materials)
    add_weapon(guardian, rig, materials, equipped["_weapon"])
    add_art_direction(guardian, index, rig, materials)
    return materials


def apply_guardian_pose(guardian: dict, rig: bpy.types.Object) -> None:
    pilot.apply_glamour_pose(rig)
    # Small roster-specific offsets keep the lineup from looking cloned.
    direction = -1.0 if sum(ord(character) for character in guardian["id"]) % 2 else 1.0
    rig.pose.bones["head"].rotation_euler.z += math.radians(2.5) * direction
    rig.pose.bones["spine_03"].rotation_euler.z += math.radians(1.8) * direction
    bpy.context.view_layer.update()
    pilot.realign_pose_authored_equipment(rig)


def bake_guardian_idle(guardian: dict, rig: bpy.types.Object) -> str:
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 60
    rig.animation_data_create()
    action = bpy.data.actions.new(f"{guardian['id']}_Idle_Glamour")
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


def export_guardian(
    guardian: dict,
    rig: bpy.types.Object,
    output_dir: str,
) -> str:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [obj for obj in pilot.descendants(rig) if obj.get("orbes_export", False)]
    if rig not in export_objects:
        export_objects.append(rig)
    for obj in export_objects:
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    glb_path = os.path.join(output_dir, f"{guardian['id']}_lod0.glb")
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


def write_report(
    guardian: dict,
    body: bpy.types.Object,
    rig: bpy.types.Object,
    output_dir: str,
    glb_path: str,
    animation: str,
) -> dict:
    objects = [obj for obj in pilot.descendants(rig) if obj.get("orbes_export", False)]
    triangles = sum(
        sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
        for obj in objects
        if obj.type == "MESH"
    )
    report = {
        "guardian": guardian["id"],
        "displayName": guardian["name"],
        "adultConfirmed": guardian.get("adultConfirmed", True),
        "presentation": guardian.get("presentation"),
        "element": guardian.get("element"),
        "role": guardian.get("role"),
        "status": "integration_ready_humanoid_base",
        "bodySource": "MPFB 2.0.17 / MakeHuman CC0",
        "blender": bpy.app.version_string,
        "dimensionsMeters": [round(value, 4) for value in body.dimensions],
        "meshObjects": sum(obj.type == "MESH" for obj in objects),
        "trianglesBeforeExportModifiers": triangles,
        "deformBones": sum(bone.use_deform for bone in rig.data.bones),
        "animationClips": [animation],
        "sockets": ["socket_weapon_r", "socket_artifact_l", "socket_back", "socket_head_fx"],
        "glbBytes": os.path.getsize(glb_path),
        "qualityGate": {
            "realHumanoidTopology": True,
            "gameEngineRig": True,
            "texturedSkin": True,
            "eyesHairTeeth": True,
            "customAstraCostume": True,
            "signatureWeapon": True,
            "roundTripPending": True,
            "commercialFinalSculpt": False,
            "fullAnimationSet": False,
            "finalLods": False,
        },
    }
    with open(os.path.join(output_dir, "qa-report.json"), "w", encoding="utf8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    return report


def build_one(guardian: dict, index: int) -> dict:
    output_dir = os.path.join(OUTPUT_ROOT, guardian["id"])
    runtime_dir = os.path.join(RUNTIME_ROOT, guardian["id"])
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(runtime_dir, exist_ok=True)
    pilot.OUTPUT_DIR = output_dir
    pilot.reset_scene()
    body, rig = create_guardian(guardian, index)
    equipped = equip_assets(guardian, index, body)
    materials = style_guardian(guardian, index, body, rig, equipped)
    apply_guardian_pose(guardian, rig)
    animation = bake_guardian_idle(guardian, rig)
    pilot.add_iris_details(equipped["high-poly.mhclo"], rig, materials)
    for eye_name in ("Mira_Iris_L", "Mira_Iris_R", "Mira_Pupil_L", "Mira_Pupil_R"):
        if eye_name in bpy.data.objects:
            bpy.data.objects[eye_name].name = eye_name.replace("Mira", guardian["id"])
    pilot.bake_export_geometry(body)
    glb_path = export_guardian(guardian, rig, output_dir)
    runtime_path = os.path.join(runtime_dir, os.path.basename(glb_path))
    shutil.copy2(glb_path, runtime_path)
    source_path = os.path.join(output_dir, f"{guardian['id']}_source.blend")
    if RENDER_PREVIEWS:
        pilot.setup_presentation_scene(materials["midnight"], materials["gold"], materials["glow"])
        bpy.context.scene.render.filepath = os.path.join(output_dir, f"{guardian['id']}_preview.png")
    bpy.ops.wm.save_as_mainfile(filepath=source_path)
    if RENDER_PREVIEWS:
        bpy.ops.render.render(write_still=True)
    report = write_report(guardian, body, rig, output_dir, glb_path, animation)
    return {
        "id": guardian["id"],
        "displayName": guardian["name"],
        "presentation": guardian.get("presentation"),
        "element": guardian.get("element"),
        "role": guardian.get("role"),
        "sourceBlend": os.path.relpath(source_path, PROJECT_ROOT).replace("\\", "/"),
        "sourceGlb": os.path.relpath(glb_path, PROJECT_ROOT).replace("\\", "/"),
        "runtime": "res://" + os.path.relpath(
            runtime_path,
            os.path.join(PROJECT_ROOT, "workspaces", "orbes-d-astra", "04_runtime", "godot"),
        ).replace("\\", "/"),
        "preview": os.path.relpath(
            os.path.join(output_dir, f"{guardian['id']}_preview.png"),
            PROJECT_ROOT,
        ).replace("\\", "/")
        if RENDER_PREVIEWS
        else None,
        "metrics": {
            "triangles": report["trianglesBeforeExportModifiers"],
            "bytes": report["glbBytes"],
            "deformBones": report["deformBones"],
        },
        "animationClips": report["animationClips"],
        "sockets": report["sockets"],
        "status": report["status"],
    }


existing_assets = {}
if os.path.exists(CATALOG_PATH):
    try:
        with open(CATALOG_PATH, "r", encoding="utf8") as handle:
            existing_assets = {
                asset["id"]: asset for asset in json.load(handle).get("guardians", [])
            }
    except (OSError, ValueError, KeyError):
        existing_assets = {}

for index, guardian in enumerate(MANIFEST["guardians"]):
    if guardian not in GUARDIANS:
        continue
    print(f"BUILD_GUARDIAN {guardian['id']} {index + 1}/24")
    existing_assets[guardian["id"]] = build_one(guardian, index)

catalog = {
    "schemaVersion": 2,
    "generator": "tools/blender/build_orbes_guardians_v2.py",
    "bodySource": "MPFB 2.0.17 / MakeHuman CC0",
    "truth": {
        "integrationReady": True,
        "commercialFinalSculpts": False,
        "finalRetopology": False,
        "fullAnimations": False,
        "finalLods": False,
    },
    "standards": {
        "format": "glTF 2.0 GLB",
        "units": "meters",
        "skeleton": "orbes_astra_humanoid_v2",
        "idleClip": "<guardian_id>_Idle_Glamour",
        "sockets": ["socket_weapon_r", "socket_artifact_l", "socket_back", "socket_head_fx"],
    },
    "guardians": [existing_assets[key] for key in sorted(existing_assets)],
}
catalog["summary"] = {
    "guardians": len(catalog["guardians"]),
    "bytes": sum(asset["metrics"]["bytes"] for asset in catalog["guardians"]),
    "triangles": sum(asset["metrics"]["triangles"] for asset in catalog["guardians"]),
}
with open(CATALOG_PATH, "w", encoding="utf8") as handle:
    json.dump(catalog, handle, ensure_ascii=False, indent=2)
with open(os.path.join(os.path.dirname(OUTPUT_ROOT), "guardians-v2-report.json"), "w", encoding="utf8") as handle:
    json.dump(catalog, handle, ensure_ascii=False, indent=2)
print(json.dumps(catalog["summary"], ensure_ascii=False, indent=2))
