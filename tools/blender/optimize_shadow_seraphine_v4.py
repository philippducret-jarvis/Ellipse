"""Batch V4 skinned hair, cloth and crown by material for browser review."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/modeling"
OUT = FOLDER / "seraphine-silhouette-v4-optimized.glb"
BLEND = FOLDER / "seraphine-silhouette-v4-optimized.blend"
rig = bpy.data.objects["Seraphine_Deform_Rig"]
source = bpy.data.collections["07_V4_SILHOUETTE_STUDY"]


def join(name, objects):
    if not objects:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = name
    result["batched_from"] = len(objects)
    print(f"{name}: {len(objects)} pieces -> {len(result.data.vertices)} vertices")
    return result


objects = list(source.objects)
hair = [obj for obj in objects if obj.name.startswith(("V4_Hair_Lock_", "V4_Sculpted_Scalp"))]
gold = [obj for obj in objects if obj.name.startswith(("V4_Crown_Thorn_", "V4_Thorn_Circlet"))]
roses = [obj for obj in objects if obj.name.startswith("V4_Crown_Rose_")]
silk_red = [obj for obj in objects if obj.name.startswith("V4_Silk_Layer_") and obj.data.materials[0].name == "V4_PBR_Crimson_Silk"]
silk_dark = [obj for obj in objects if obj.name.startswith("V4_Silk_Layer_") and obj.data.materials[0].name == "V4_PBR_Charcoal_Silk"]
batched = [join("V4_Hair_Groom_Skinned", hair), join("V4_Thorn_Crown_Skinned", gold),
           join("V4_Rose_Crown_Skinned", roses), join("V4_Crimson_Silk_Skinned", silk_red),
           join("V4_Charcoal_Silk_Skinned", silk_dark)]

rig.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
for obj in [bpy.data.objects["Seraphine_Deformable_Body_Costume"],
            bpy.data.objects["Face_retopped_UV_V3"],
            bpy.data.objects["Bodice_retopped_UV_V3"], *batched, rig]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=str(OUT), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
print(f"Optimized V4: {OUT}")
