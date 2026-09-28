"""Print source mesh structure before the focused face/costume rebuild."""

import json
import bpy

skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
mesh = skin.data
slots = []
for index, material in enumerate(mesh.materials):
    polys = [polygon for polygon in mesh.polygons if polygon.material_index == index]
    indices = {vertex for polygon in polys for vertex in polygon.vertices}
    coords = [mesh.vertices[vertex].co for vertex in indices]
    slots.append({
        "index": index,
        "material": material.name if material else None,
        "polygons": len(polys),
        "vertices": len(indices),
        "min": [round(min(point[axis] for point in coords), 4) for axis in range(3)] if coords else None,
        "max": [round(max(point[axis] for point in coords), 4) for axis in range(3)] if coords else None,
    })
print("SERAPHINE_MESH_INSPECTION=" + json.dumps({
    "vertices": len(mesh.vertices),
    "polygons": len(mesh.polygons),
    "uv_layers": [layer.name for layer in mesh.uv_layers],
    "materials": slots,
}, ensure_ascii=False))
for obj in bpy.data.collections["02_LEGACY_VOLUME_STUDY_not_HD"].objects:
    if obj.type != "MESH":
        continue
    if obj.name.startswith("Mesh_"):
        vertices = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        print("SOURCE_PART=" + json.dumps({
            "name": obj.name,
            "vertices": len(vertices),
            "material": [slot.material.name for slot in obj.material_slots if slot.material],
            "min": [round(min(point[axis] for point in vertices), 4) for axis in range(3)],
            "max": [round(max(point[axis] for point in vertices), 4) for axis in range(3)],
        }))
print("LEGACY_NAMES=" + json.dumps([obj.name for obj in bpy.data.collections["02_LEGACY_VOLUME_STUDY_not_HD"].objects][:140]))
print("MATERIAL_COLORS=" + json.dumps([(mat.name, tuple(round(c, 3) for c in mat.diffuse_color)) for mat in mesh.materials]))
