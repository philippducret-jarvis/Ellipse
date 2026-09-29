import bpy, sys, math, mathutils

argv = sys.argv[sys.argv.index("--") + 1:]
glb, out = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)

objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
mins = mathutils.Vector((1e9,) * 3)
maxs = mathutils.Vector((-1e9,) * 3)
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        for i in range(3):
            mins[i] = min(mins[i], w[i])
            maxs[i] = max(maxs[i], w[i])
size = maxs - mins
center = (mins + maxs) / 2
print("BBOX size", tuple(round(v, 3) for v in size), "meshes", len(objs))

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x, sc.render.resolution_y = 768, 1152
sc.render.film_transparent = False
sc.world = bpy.data.worlds.new("w")
sc.world.color = (0.12, 0.12, 0.13)

cam = bpy.data.cameras.new("cam")
cam.type = "ORTHO"
cam.ortho_scale = max(size.z * 1.15, size.x * 1.15)
co = bpy.data.objects.new("cam", cam)
sc.collection.objects.link(co)
co.location = (center.x, center.y - 10, center.z)
co.rotation_euler = (math.radians(90), 0, 0)
sc.camera = co

sc.render.filepath = out
bpy.ops.render.render(write_still=True)
