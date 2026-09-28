import bpy
from mathutils import Vector

for obj in bpy.data.objects:
    if obj.type == "MESH" and obj.name not in ("Seraphine_Deformable_Body_Costume",):
        verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
        low = tuple(round(min(p[i] for p in verts), 3) for i in range(3)) if verts else ()
        high = tuple(round(max(p[i] for p in verts), 3) for i in range(3)) if verts else ()
        print("PART", obj.name, len(verts), low, high)
    if obj.type == "ARMATURE" and obj.name.startswith("Seraphine_Deform_Rig"):
        print("ARMATURE", obj.name)
        for bone in obj.data.bones:
            print("BONE", bone.name, tuple(round(v, 3) for v in bone.head_local), tuple(round(v, 3) for v in bone.tail_local))
    if obj.type == "MESH" and obj.name.startswith("Seraphine_Deformable"):
        print("MESH", obj.name, len(obj.data.vertices))
        for material in obj.data.materials:
            print("MATERIAL", material.name, tuple(round(v, 3) for v in material.diffuse_color))
