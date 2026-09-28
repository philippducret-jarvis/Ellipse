"""Make the editable V2 blend use the projected UVs also used by its GLB."""
import bpy

skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
if "Reference_Three_View" not in skin.data.uv_layers:
    raise RuntimeError("Projected UV layer missing")
for material in list(skin.data.materials)[:10]:
    nodes = material.node_tree.nodes
    image = nodes.get("Reference projected albedo")
    if image is None:
        raise RuntimeError(f"Missing reference texture on {material.name}")
    uv_map = nodes.new("ShaderNodeUVMap")
    uv_map.uv_map = "Reference_Three_View"
    material.node_tree.links.new(uv_map.outputs["UV"], image.inputs["Vector"])
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
print("Editable V2 blend now uses Reference_Three_View")
