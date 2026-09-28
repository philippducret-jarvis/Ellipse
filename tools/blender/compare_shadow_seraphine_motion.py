"""Measure the original rigid-part motion before evaluating the skinned pilot."""
import bpy
import statistics
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'workspaces/shadow-echoes/02_production/lot-10/seraphine-source-motion.json'
objects=[o for o in bpy.data.collections['02_LEGACY_VOLUME_STUDY_not_HD'].objects if o.type=='MESH']
animated=[o for o in bpy.data.collections['02_LEGACY_VOLUME_STUDY_not_HD'].objects if o.animation_data]
def points(action,frame):
 for obj in animated:
  data=obj.animation_data
  for track in data.nla_tracks:track.mute=True
  slot=action.slots.get('OB'+obj.name)
  if slot:data.action=action;data.action_slot=slot
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 out=[]
 for obj in objects:
  count=len(obj.data.vertices)
  for i in range(0,count,max(1,count//20)):
   out.append(obj.matrix_world @ obj.data.vertices[i].co)
 return out
clips={}
for name in ('idle','walk','attack1','skill1Cast','ultimateCast','death'):
 action=bpy.data.actions[name]
 start,end=[int(round(n)) for n in action.frame_range]
 a=points(action,start);b=points(action,start+max(1,(end-start)//2))
 d=[(x-y).length for x,y in zip(a,b)]
 clips[name]={'median_m':round(statistics.median(d),4),'max_m':round(max(d),4)}
REPORT.parent.mkdir(parents=True,exist_ok=True);REPORT.write_text(json.dumps(clips,indent=2),encoding='utf-8')
print(json.dumps(clips,indent=2))
