"""Diagnostic for source-empty to deform-bone pose transfer."""
import bpy
from mathutils import Vector

rig=bpy.data.objects['Seraphine_Deform_Rig']
legacy=bpy.data.collections['02_LEGACY_VOLUME_STUDY_not_HD']
for clip,frame in [('idle',48),('walk',13),('attack1',8),('skill1Cast',12),('ultimateCast',20)]:
 source=bpy.data.actions['SOURCE_'+clip]
 for obj in legacy.objects:
  ad=obj.animation_data
  if not ad:continue
  for track in ad.nla_tracks:track.mute=True
  slot=source.slots.get('OB'+obj.name)
  if slot:ad.action=source;ad.action_slot=slot
 action=bpy.data.actions[clip]
 rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 print('\nPOSE',clip,frame)
 for name in ['hips','spine','chest','neck','head','upperArmL','lowerArmL','handL','upperArmR','lowerArmR','handR','weapon','thighL','shinL']:
  source_pos=bpy.data.objects[name].matrix_world.translation
  bone_pos=rig.matrix_world@rig.pose.bones[name].matrix.translation
  print(name,'source',tuple(round(v,3) for v in source_pos),'rig',tuple(round(v,3) for v in bone_pos),'delta',round((source_pos-bone_pos).length,3))
