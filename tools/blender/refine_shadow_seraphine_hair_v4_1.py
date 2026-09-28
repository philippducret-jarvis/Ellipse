"""Shape the V4 groom into separate, sweeping locks without altering its rig.

Run against seraphine-silhouette-v4-optimized.blend; writes a new candidate.
"""

from math import sin
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine/modeling"
BASE = "seraphine-silhouette-v4-1"
HAIR = bpy.data.objects["V4_Hair_Groom_Skinned"].data

# The optimized mesh retains the sculpted scalp followed by 99 discrete
# 33-by-5 ribbon sections. Each ribbon keeps its original UV and bone weights.
SCALP_VERTICES = 1105
STRAND_VERTICES = 33 * 5
assert (len(HAIR.vertices) - SCALP_VERTICES) % STRAND_VERTICES == 0
count = (len(HAIR.vertices) - SCALP_VERTICES) // STRAND_VERTICES
for strand in range(count):
    base = SCALP_VERTICES + strand * STRAND_VERTICES
    roots = [HAIR.vertices[base + i].co for i in range(5)]
    root_x = sum(v.x for v in roots) / 5
    root_y = sum(v.y for v in roots) / 5
    side = -1 if root_x < 0 else 1
    phase = strand * .61
    for row in range(33):
        t = row / 32
        lateral = side * (.06 * t + .18 * t ** 1.7)
        wave = (.045 * sin(11 * t + phase) + .025 * sin(22 * t + phase * .7)) * t ** 1.3
        for col in range(5):
            v = HAIR.vertices[base + row * 5 + col].co
            v.x += lateral + wave
            if root_y < 0:
                v.y += .035 * t
            v.z += .02 * sin(7 * t + phase) * t ** 2

HAIR.update()
bpy.context.scene["art_status"] = "V4.1 sweeping-groom review; target fidelity not approved"
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

full = FOLDER / f"{BASE}.glb"
bpy.ops.export_scene.gltf(
    filepath=str(full), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
bpy.ops.wm.save_as_mainfile(filepath=str(FOLDER / f"{BASE}.blend"), compress=True)
print(f"V4.1 full: {full}; {count} groomed locks")

wanted = {"idle", "run", "attack1", "skill1Cast", "skill2Cast", "skill3Cast", "ultimateCast", "hitLight"}
for action in tuple(bpy.data.actions):
    if action.name not in wanted:
        bpy.data.actions.remove(action)
runtime = FOLDER / f"{BASE}-runtime.glb"
bpy.ops.export_scene.gltf(
    filepath=str(runtime), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
print(f"V4.1 battle runtime: {runtime}; {len(wanted)} clips")
