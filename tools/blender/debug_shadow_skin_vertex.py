"""Find which weighted vertex causes excessive deformation."""
import bpy
from mathutils import Vector

rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
for track in rig.animation_data.nla_tracks:track.mute=True
def positions(action,frame):
 rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 obj=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());tmp=obj.to_mesh()
 result=[obj.matrix_world@vertex.co for vertex in tmp.vertices]
 obj.to_mesh_clear();return result
for name in ('walk','attack1','skill1Cast','ultimateCast'):
 action=bpy.data.actions[name]
 first=positions(action,0);middle=positions(action,int(action.frame_range[1])//2)
 worst=sorted(range(len(first)),key=lambda index:(first[index]-middle[index]).length,reverse=True)[:3]
 print('CLIP',name)
 for index in worst:
  v=mesh.data.vertices[index]
  weights=[(mesh.vertex_groups[g.group].name,round(g.weight,3)) for g in v.groups]
  print(index,'delta',round((first[index]-middle[index]).length,3),'first',tuple(round(x,2) for x in first[index]),'middle',tuple(round(x,2) for x in middle[index]),weights)
