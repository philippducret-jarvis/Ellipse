"""Check that exported clips actually deform Séraphine's skinned vertices."""

from pathlib import Path
import json
import statistics
import bpy
import sys

ROOT = Path(__file__).resolve().parents[2]
debug = "--debug" in sys.argv
MODEL = ROOT / f"workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-skin-{'debug' if debug else 'pilot'}.glb"
REPORT = ROOT / f"workspaces/shadow-echoes/02_production/lot-10/seraphine-skin-{'debug-' if debug else ''}validation.json"
SOURCE = ROOT / "workspaces/shadow-echoes/02_production/lot-10/seraphine-source-motion.json"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MODEL))
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
mesh = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers))
for track in rig.animation_data.nla_tracks:
    track.mute = True


def samples(name, frame):
    action = bpy.data.actions[name]
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    temporary = evaluated.to_mesh()
    step = max(1, len(temporary.vertices) // 1500)
    points = [evaluated.matrix_world @ temporary.vertices[i].co for i in range(0, len(temporary.vertices), step)]
    evaluated.to_mesh_clear()
    return points


clips = {}
for name in ("idle", "walk", "attack1", "skill1Cast", "ultimateCast", "death"):
    action = bpy.data.actions[name]
    start, end = [int(round(value)) for value in action.frame_range]
    first = samples(name, start)
    middle = samples(name, start + max(1, (end - start) // 2))
    distances = [(a - b).length for a, b in zip(first, middle)]
    clips[name] = {
        "frames": [start, end],
        "median_vertex_displacement_m": round(statistics.median(distances), 4),
        "max_vertex_displacement_m": round(max(distances), 4),
    }

report = {
    "model": str(MODEL),
    "skin_count": len([obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]),
    "mesh_count": len([obj for obj in bpy.context.scene.objects if obj.type == "MESH"]),
    "skinned_vertices": len(mesh.data.vertices),
    "bones": len(rig.data.bones),
    "clips": clips,
    "deforms": all(item["max_vertex_displacement_m"] > .03 for item in clips.values()),
}
source = json.loads(SOURCE.read_text(encoding="utf-8"))
report["plausible_deformation"] = all(
    clips[name]["max_vertex_displacement_m"] <= max(.35, source[name]["max_m"] * 2.5)
    for name in clips
)
REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(report, indent=2, ensure_ascii=False))
if not report["deforms"] or not report["plausible_deformation"]:
    raise RuntimeError("Skin deformation is absent or implausible compared with the source motion")
