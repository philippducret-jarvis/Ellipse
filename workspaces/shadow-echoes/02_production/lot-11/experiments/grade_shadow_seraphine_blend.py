"""Keep the editable art-study blend consistent with its reviewed GLB."""
import bpy

skin = bpy.data.objects["Seraphine_Deformable_Body_Costume"]
source_colors = [
    (.485, .016, .063), (.008, .006, .011), (.880, .807, .716),
    (.665, .597, .644), (.847, .644, .571), (.485, .352, .162),
    (1.0, .060, .133), (.407, .138, .168), (.127, .013, .036),
    (.019, .015, .027),
]
for index, material in enumerate(list(skin.data.materials)[:10]):
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    for link in list(bsdf.inputs["Base Color"].links):
        material.node_tree.links.remove(link)
    bsdf.inputs["Base Color"].default_value = (*source_colors[index], 1)
    material.diffuse_color = (*source_colors[index], 1)
for name, color in {"Atelier_Rose_Silk": (.14, .014, .032), "Atelier_Charcoal_Silk": (.021, .018, .026)}.items():
    material = bpy.data.materials.get(name)
    material.diffuse_color = (*color, 1)
    material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*color, 1)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
print("Editable V2 blend graded to the reviewed PBR palette")
