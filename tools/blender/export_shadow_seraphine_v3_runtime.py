"""Export the V3 surface candidate with only the clips used in a battle."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/modeling"
OUT = HERO / "seraphine-surface-v3-runtime.glb"
WANTED = {"idle", "run", "attack1", "skill1Cast", "skill2Cast", "skill3Cast", "ultimateCast", "hitLight"}

for action in tuple(bpy.data.actions):
    if action.name not in WANTED:
        bpy.data.actions.remove(action)

rig = bpy.data.objects["Seraphine_Deform_Rig"]
rig.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
for name in ("Seraphine_Deformable_Body_Costume", "Face_retopped_UV_V3", "Bodice_retopped_UV_V3", "Seraphine_Deform_Rig"):
    bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=str(OUT), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
print(f"V3 battle review runtime: {OUT}, {len(WANTED)} clips")
