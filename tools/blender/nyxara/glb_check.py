import bpy, sys, os
for path in sys.argv[sys.argv.index("--") + 1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    tris = 0
    for o in meshes:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    skinned = sum(1 for o in meshes if any(m.type == "ARMATURE" for m in o.modifiers))
    print("CHECK", os.path.basename(path), "meshes", len(meshes), "skinned", skinned, "armatures", len(arms),
          "bones", sum(len(a.data.bones) for a in arms), "actions", len(bpy.data.actions), "tris", tris,
          "mats", len(bpy.data.materials), "size", os.path.getsize(path))
    zs = [ (o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
    if zs: print("   zrange", round(min(zs), 3), round(max(zs), 3))
