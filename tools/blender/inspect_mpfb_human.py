"""Create and inspect one MPFB human for the Orbes d'Astra 3D pipeline.

This small diagnostic is intentionally separate from the production builder.
It verifies that the pinned MPFB extension, macro targets and game-engine rig
work in Blender background mode before the catalog generator consumes them.
"""

from __future__ import annotations

import importlib
import json
import os
import sys

import bpy


def dynamic_import(module_suffix: str, symbol: str):
    for module_name in sys.modules:
        if module_name.endswith(module_suffix):
            module = importlib.import_module(module_name)
            return getattr(module, symbol)
    raise RuntimeError(f"MPFB module is not loaded: {module_suffix}")


def cli_arg(name: str, default: str) -> str:
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    if name not in args:
        return default
    index = args.index(name)
    return args[index + 1] if index + 1 < len(args) else default


def reset_scene() -> None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def main() -> None:
    output_dir = os.path.abspath(cli_arg("--output-dir", os.getcwd()))
    os.makedirs(output_dir, exist_ok=True)
    reset_scene()

    HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
    TargetService = dynamic_import("mpfb.services.targetservice", "TargetService")

    macro = TargetService.get_default_macro_info_dict()
    macro.update(
        {
            "gender": 1.0,
            "age": 0.42,
            "muscle": 0.46,
            "weight": 0.52,
            "proportions": 0.62,
            "height": 0.56,
            "cupsize": 0.62,
            "firmness": 0.72,
            "race": {"asian": 0.16, "caucasian": 0.28, "african": 0.56},
        }
    )
    body = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    body.name = "Mira_MPFB_Basemesh"

    rig = HumanService.add_builtin_rig(body, "game_engine_with_breast")
    rig.name = "Mira_GameEngine_Rig"

    dimensions = [round(value, 5) for value in body.dimensions]
    report = {
        "body": body.name,
        "dimensions": dimensions,
        "vertices": len(body.data.vertices),
        "edges": len(body.data.edges),
        "polygons": len(body.data.polygons),
        "shapeKeys": list(body.data.shape_keys.key_blocks.keys()) if body.data.shape_keys else [],
        "vertexGroups": [group.name for group in body.vertex_groups],
        "modifiers": [
            {"name": modifier.name, "type": modifier.type, "showViewport": modifier.show_viewport}
            for modifier in body.modifiers
        ],
        "rig": rig.name,
        "bones": [bone.name for bone in rig.data.bones],
    }
    with open(os.path.join(output_dir, "mpfb-inspection.json"), "w", encoding="utf8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output_dir, "mpfb-mira-diagnostic.blend"))
    print(json.dumps({key: report[key] for key in ("dimensions", "vertices", "polygons", "modifiers")}, indent=2))


main()
