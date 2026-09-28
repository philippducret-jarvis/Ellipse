import {LAYER_RIG,LEGACY_LAYER_RIG,LayerActor,alignThreePoints} from './layer-rig.mjs';
import {sampleLayerClip} from './layer-motion.mjs';
import {CLIPS} from './rig-motion.mjs';
const $=id=>document.getElementById(id),readImage=async url=>{const img=new Image();img.src=url;await img.decode();return img;};
let actor,playing=false,time=0,last=performance.now(),clipPose={};
function draw(){
  const angle=Number($('angle').value);$('angle-label').textContent=`${angle.toFixed(1)}°`;
  actor?.draw({...clipPose,angle,body:$('body').checked,arm:$('arm').checked,pivots:$('pivots').checked,separate:Number($('separate').value),reference:Number($('reference-opacity').value)});
}
function pause(){playing=false;$('play').textContent='Lire le geste';}
for(const id of ['angle','body','arm','pivots','separate','reference-opacity'])$(id).addEventListener('input',()=>{pause();if(id==='angle'){clipPose={};time=0;}draw();});
$('checker').addEventListener('change',()=>$('layer-stage').classList.toggle('checker',$('checker').checked));
$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pause':'Lire le geste';});
$('rest').addEventListener('click',()=>{pause();time=0;clipPose={};$('angle').value='0';$('separate').value='0';draw();});
$('clip').addEventListener('change',()=>{time=0;clipPose={};$('angle').value='0';draw();});
$('export').addEventListener('click',()=>{
  const rig=actor?.rig??LAYER_RIG;
  const blob=new Blob([JSON.stringify({...rig,alignment:alignThreePoints(rig.sourceAnchors,rig.targetAnchors),preview_angle:Number($('angle').value)},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='seraphine-layer-rig-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
try{
  const [body,arm,legacyArm,reference]=await Promise.all([readImage(LAYER_RIG.files.body),readImage(LAYER_RIG.files.arm),readImage(LEGACY_LAYER_RIG.files.arm),readImage('../../03_assets/characters/seraphine/presentation-v1.png')]);
  actor=new LayerActor($('layer-stage'),body,arm);actor.reference=reference;draw();
  const status=()=>{$('layer-status').textContent=$('variant').value==='v2'?'V2 · épaulière mobile retirée · gestes raccordés au combat · fidélité en revue.':'V1 · épaulière mobile d’origine · comparaison du raccord.';};status();
  $('variant').addEventListener('change',()=>{const old=$('variant').value==='v1';actor.destroy();actor=new LayerActor($('layer-stage'),body,old?legacyArm:arm,old?LEGACY_LAYER_RIG:LAYER_RIG);actor.reference=reference;draw();status();});
}catch(error){$('layer-status').textContent=`Impossible de charger les calques : ${error.message}`;$('play').disabled=true;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',e=>{if(!e.persisted)actor?.destroy();});
function frame(now){const delta=Math.max(0,Math.min(.1,(now-last)/1000));last=now;if(playing){time+=delta*Number($('speed').value);const clip=$('clip').value;clipPose=sampleLayerClip(clip,time%CLIPS[clip].duration);$('angle').value=String(clipPose.angle);draw();}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
