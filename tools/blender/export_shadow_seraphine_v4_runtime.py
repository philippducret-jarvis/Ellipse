"""Export the optimized Séraphine V4 review asset with battle clips only."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/modeling"
OUT = HERO / "seraphine-silhouette-v4-runtime.glb"
WANTED = {"idle", "run", "attack1", "skill1Cast", "skill2Cast", "skill3Cast", "ultimateCast", "hitLight"}

for action in tuple(bpy.data.actions):
    if action.name not in WANTED:
        bpy.data.actions.remove(action)

rig = bpy.data.objects["Seraphine_Deform_Rig"]
rig.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
for name in (
    "Seraphine_Deformable_Body_Costume", "Face_retopped_UV_V3", "Bodice_retopped_UV_V3",
    "V4_Hair_Groom_Skinned", "V4_Thorn_Crown_Skinned", "V4_Rose_Crown_Skinned",
    "V4_Crimson_Silk_Skinned", "V4_Charcoal_Silk_Skinned", "Seraphine_Deform_Rig",
):
    bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=str(OUT), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
print(f"V4 battle review runtime: {OUT}, {len(WANTED)} clips")
