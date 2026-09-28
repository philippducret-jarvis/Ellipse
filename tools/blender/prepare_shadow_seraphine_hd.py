"""Openable Blender workbench for the first production-quality Shadow Echoes hero.

The imported v1 GLB is a comparison object, never a final HD deliverable.
Run: blender --background --factory-startup --python tools/blender/prepare_shadow_seraphine_hd.py
"""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine"
SOURCE = HERO / "volume-v1/hero.glb"
TURNAROUND = HERO / "turnaround-v1.png"
OUTPUT = HERO / "modeling/seraphine-hd-workbench.blend"


def collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to(obj, target):
    for current in tuple(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for child in tuple(bpy.context.scene.collection.children):
    bpy.context.scene.collection.children.unlink(child)

references = collection("01_REFERENCES_authoritative_art")
legacy = collection("02_LEGACY_VOLUME_STUDY_not_HD")
sculpt = collection("03_HD_SCULPT_create_here")
rig = collection("04_RIG_AND_WEIGHTS_create_here")
export = collection("05_EXPORT_approved_only")

bpy.ops.import_scene.gltf(filepath=str(SOURCE))
for obj in tuple(bpy.context.scene.objects):
    move_to(obj, legacy)
legacy.hide_render = True

image = bpy.data.images.load(str(TURNAROUND), check_existing=True)
board = bpy.data.objects.new("Séraphine · quatre vues · référence 2D", None)
references.objects.link(board)
board.empty_display_type = "IMAGE"
board.data = image
board.empty_display_size = 3.5
board.location = (-3.3, 0, 1.4)
board.rotation_euler = (1.57079632679, 0, 0)
board.show_in_front = True

notes = bpy.data.texts.new("START_HERE_Production_HD")
notes.write(
    "SHADOW ECHOES / SÉRAPHINE / TRANCHE HD\n\n"
    "Le GLB dans 02_LEGACY_VOLUME_STUDY est une étude procédurale de proportions. "
    "Il contient 42 clips mais aucune peau pondérée ; ne pas l'exporter comme personnage final.\n\n"
    "La planche dans 01_REFERENCES est une référence de face, profil, dos et trois quarts. "
    "Vérifier chaque détail contre le portrait presentation-v1.png avant validation.\n\n"
    "Créer une géométrie continue du corps et des vêtements dans 03_HD_SCULPT, "
    "puis armature, poids et animations dans 04_RIG_AND_WEIGHTS. "
    "L'épée et les pièces rigides peuvent être attachées aux os ; cheveux et tissus doivent vivre.\n\n"
    "Ne déplacer dans 05_EXPORT que les objets approuvés. Exporter un GLB avec peaux, "
    "poids vérifiables, 17 articulations au moins et clips réels. "
    "Contrôle : node tools/audit-shadow-echoes-hero-assets.mjs --enforce <glb>.\n"
)

scene = bpy.context.scene
scene["project"] = "Shadow Echoes"
scene["hero"] = "seraphine"
scene["stage"] = "HD workbench / no final mesh"
scene["source_glb"] = str(SOURCE)
scene["authoritative_reference"] = str(TURNAROUND)
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.engine = "CYCLES"
scene.render.resolution_x = 1600
scene.render.resolution_y = 1600
scene.render.resolution_percentage = 100

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT), compress=True)
print(f"Shadow Echoes HD workbench saved: {OUTPUT}")
