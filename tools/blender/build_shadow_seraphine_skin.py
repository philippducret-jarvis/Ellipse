"""Convert Séraphine's articulated v1 volume into a genuinely deformable skin pilot.

Use the prepared .blend as input. This preserves the v1 GLB and writes a separate
candidate for visual review; it is not an artistic sign-off of the target design.
"""

from pathlib import Path
from mathutils import Matrix, Vector
import bpy
import sys

ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "workspaces/shadow-echoes/03_assets/characters/seraphine"
OUTPUT = HERO / "modeling/seraphine-skin-pilot.glb"
BLEND = HERO / "modeling/seraphine-skin-pilot.blend"
JOINTS = [
    "hips", "spine", "chest", "neck", "head", "upperArmL", "lowerArmL",
    "handL", "upperArmR", "lowerArmR", "handR", "thighL", "shinL",
    "footL", "thighR", "shinR", "footR",
]
clip_arg = next((item.split("=", 1)[1] for item in sys.argv if item.startswith("--clips=")), None)
if clip_arg:
    OUTPUT = HERO / "modeling/seraphine-skin-debug.glb"
    BLEND = HERO / "modeling/seraphine-skin-debug.blend"
source_actions = {action.name: action for action in bpy.data.actions if action.name in (
    "idle", "idleLook", "walk", "run", "stop", "turn", "strafeLeft", "strafeRight",
    "dodgeForward", "dodgeBack", "dodgeLeft", "dodgeRight", "attack1", "attack2",
    "attack3", "windup", "guard", "hitLight", "hitHeavy", "skill1Start", "skill1Cast",
    "skill1End", "skill2Start", "skill2Cast", "skill2End", "skill3Start",
    "skill3Cast", "skill3End", "ultimateStart", "ultimateCast", "ultimateHold",
    "ultimateEnd", "knockdown", "death", "revive", "heal", "buff", "interact",
    "victory", "defeat", "select", "summon",
)}
if clip_arg:
    source_actions = {name: action for name, action in source_actions.items() if name in clip_arg.split(",")}
if not source_actions:
    raise RuntimeError("No source clips found")
for clip_name, clip_action in source_actions.items():
    clip_action.name = "SOURCE_" + clip_name

legacy = bpy.data.collections["02_LEGACY_VOLUME_STUDY_not_HD"]
sculpt = bpy.data.collections["03_HD_SCULPT_create_here"]
rig_collection = bpy.data.collections["04_RIG_AND_WEIGHTS_create_here"]
def depth(obj):
    count = 0
    while obj.parent:
        obj = obj.parent
        count += 1
    return count

BONES = [obj.name for obj in sorted((obj for obj in legacy.objects if obj.type == "EMPTY"), key=depth)]
empties = {name: bpy.data.objects[name] for name in BONES}
source_meshes = [obj for obj in legacy.objects if obj.type == "MESH"]
if len(source_meshes) < 80:
    raise RuntimeError(f"Legacy mesh import incomplete: {len(source_meshes)}")


def activate_source(action):
    for obj in legacy.objects:
        anim = obj.animation_data
        if not anim:
            continue
        for track in anim.nla_tracks:
            track.mute = True
        slot = action.slots.get("OB" + obj.name)
        if slot:
            anim.action = action
            anim.action_slot = slot
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()


activate_source(source_actions.get("idle", next(iter(source_actions.values()))))
bind_matrices = {name: obj.matrix_world.copy() for name, obj in empties.items()}
bind_heads = {name: matrix.translation.copy() for name, matrix in bind_matrices.items()}

arm_data = bpy.data.armatures.new("Seraphine_Deform_Armature")
armature = bpy.data.objects.new("Seraphine_Deform_Rig", arm_data)
rig_collection.objects.link(armature)
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for name in BONES:
    obj = empties[name]
    head = bind_heads[name]
    named_children = [child for child in obj.children if child.name in BONES]
    preferred = next((child for child in named_children if child.name in ("spine", "chest", "neck", "head", "lowerArmL", "lowerArmR", "handL", "handR", "shinL", "shinR", "footL", "footR")), None)
    child = preferred or (named_children[0] if named_children else None)
    tail = bind_heads[child.name].copy() if child else head + Vector((0, 0, -.18 if name.startswith(("hand", "foot")) else .18))
    if (tail - head).length < .08:
        tail = head + Vector((0, 0, .12))
    bone = arm_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
for name in BONES:
    parent = empties[name].parent
    while parent and parent.name not in BONES:
        parent = parent.parent
    if parent:
        arm_data.edit_bones[name].parent = arm_data.edit_bones[parent.name]
bpy.ops.object.mode_set(mode="OBJECT")
for bone in arm_data.bones:
    bone.use_deform = True
for pose in armature.pose.bones:
    pose.rotation_mode = "QUATERNION"


def anchor_for(obj):
    node = obj.parent
    while node and node.name not in BONES:
        node = node.parent
    return node.name if node else "hips"


def influences(point, anchor):
    # Region constraints matter more than nearest-bone distance. A breastplate,
    # hair lock or full skirt must never follow a nearby swinging hand.
    regions = {
        "hips": ("spine",), "spine": ("hips", "chest"),
        "chest": ("spine", "neck"), "neck": ("chest", "head"),
        "head": ("neck",),
        "upperArmL": ("chest", "lowerArmL"),
        "lowerArmL": ("upperArmL", "handL"), "handL": ("lowerArmL",),
        "upperArmR": ("chest", "lowerArmR"),
        "lowerArmR": ("upperArmR", "handR"), "handR": ("lowerArmR",),
        "thighL": ("hips", "shinL"), "shinL": ("thighL", "footL"),
        "footL": ("shinL",), "thighR": ("hips", "shinR"),
        "shinR": ("thighR", "footR"), "footR": ("shinR",),
    }
    if anchor not in JOINTS:
        parent = arm_data.bones[anchor].parent
        if anchor == "weapon" or not parent:
            return [(anchor, 1.0)]
        return [(anchor, .97), (parent.name, .03)]
    neighbors = regions[anchor]
    anchor_share = .94 if anchor in ("hips", "head", "handL", "handR", "footL", "footR") else .82 if anchor in ("spine", "chest", "neck") else .68
    scores = [(name, 1 / (.14 + (point - bind_heads[name]).length) ** 2) for name in neighbors]
    total = sum(score for _, score in scores)
    return [(anchor, anchor_share)] + [(name, (1 - anchor_share) * score / total) for name, score in scores]


copies = []
for index, source in enumerate(source_meshes):
    copy = source.copy()
    copy.data = source.data.copy()
    sculpt.objects.link(copy)
    matrix = source.matrix_world.copy()
    copy.parent = None
    copy.matrix_world = Matrix.Identity(4)
    copy.data.transform(matrix)
    anchor = anchor_for(source)
    groups = {}
    for vertex in copy.data.vertices:
        for name, weight in influences(vertex.co, anchor):
            if weight >= .005:
                if name not in groups:
                    groups[name] = copy.vertex_groups.new(name=name)
                groups[name].add([vertex.index], weight, "REPLACE")
    copies.append(copy)
    if index % 25 == 0:
        print(f"Weighted {index + 1}/{len(source_meshes)} parts")

bpy.ops.object.select_all(action="DESELECT")
for obj in copies:
    obj.select_set(True)
bpy.context.view_layer.objects.active = copies[0]
bpy.ops.object.join()
skin = copies[0]
skin.name = "Seraphine_Deformable_Body_Costume"
modifier = skin.modifiers.new(f"{len(BONES)}-bone deform", "ARMATURE")
modifier.object = armature
skin.parent = armature
skin.matrix_parent_inverse = Matrix.Identity(4)
skin["status"] = "Skinned pilot; likeness and topology require artistic review"
armature["status"] = f"{len(BONES)} deform bones including hair, cloth and weapon; 42 sampled clips if full build"

armature.animation_data_create()
source_order = list(source_actions.items())
source_order.sort(key=lambda item: item[0])
for clip_index, (name, source_action) in enumerate(source_order):
    activate_source(source_action)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    slot = action.slots.new("OBJECT", "Seraphine_Deform_Rig")
    armature.animation_data.action = action
    armature.animation_data.action_slot = slot
    start, end = (int(round(v)) for v in source_action.frame_range)
    samples = range(start, max(start + 1, end) + 1)
    for frame in samples:
        bpy.context.scene.frame_set(frame)
        targets = {joint: empties[joint].matrix_world @ bind_matrices[joint].inverted() @ arm_data.bones[joint].matrix_local for joint in BONES}
        for joint in BONES:
            pose = armature.pose.bones[joint]
            bone = arm_data.bones[joint]
            if bone.parent:
                rest_local = bone.parent.matrix_local.inverted() @ bone.matrix_local
                target_local = targets[bone.parent.name].inverted() @ targets[joint]
                pose.matrix_basis = rest_local.inverted() @ target_local
            else:
                pose.matrix_basis = bone.matrix_local.inverted() @ targets[joint]
        bpy.context.view_layer.update()
        for joint in BONES:
            pose = armature.pose.bones[joint]
            pose.keyframe_insert(data_path="location", frame=frame, group=joint)
            pose.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=joint)
            pose.keyframe_insert(data_path="scale", frame=frame, group=joint)
    print(f"Baked skin clip {clip_index + 1}/{len(source_order)}: {name}, frames {start}-{end}")

# Export only the deformable mesh and its armature. Source empties and comparison
# volume remain in the .blend, never in the pilot GLB.
armature.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
skin.select_set(True)
armature.select_set(True)
bpy.context.view_layer.objects.active = armature
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_bake_animation=True,
    export_optimize_animation_size=True,
)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
print(f"Seraphine skin candidate: {OUTPUT}")
