import {CLIPS} from './rig-motion.mjs';
import {LAYER_RIG,LayerActor,swing} from './layer-rig.mjs';

// A rigid shoulder swing and a small whole-body shift, not a full anatomical rig.
export function sampleLayerClip(clip,time){
  const def=CLIPS[clip];if(!def||!Number.isFinite(time))throw new Error('Animation de calques invalide');
  const t=Math.max(0,time),p=def.loop?(t%def.duration)/def.duration:Math.min(1,t/def.duration);
  const result={angle:0,bodyAngle:0,rootX:0,rootY:0};
  if(clip==='neutral')return result;
  if(clip==='idle'){const wave=Math.sin(p*Math.PI*2);result.angle=wave*1.25+Math.sin(p*Math.PI*4)*.25;result.bodyAngle=wave*.18;result.rootX=wave*1.5;result.rootY=-(1-Math.cos(p*Math.PI*2))*2.1;return result;}
  if(clip==='defeat'){const e=p*p*(3-2*p);return {angle:8*e,bodyAngle:7*e,rootX:-4*e,rootY:18*e};}
  const pulse=Math.sin(p*Math.PI)**2;
  const strength={attack:.5,skill:.76,ultimate:1}[clip];
  if(strength){result.angle=swing(p*1.8)*strength;result.bodyAngle=-1.6*strength*pulse;result.rootX=12*strength*pulse;}
  if(clip==='hit'){result.angle=9*pulse;result.bodyAngle=1.8*pulse;result.rootX=-10*pulse;}
  if(clip==='guard'){result.angle=-17*pulse;result.bodyAngle=.7*pulse;}
  return result;
}
export class LayerBattleActor {
  constructor(host,body,arm){
    this.actor=new LayerActor(host,body,arm,LAYER_RIG,{fitCharacter:true});this.canvas=this.actor.canvas;this.canvas.classList.add('layer-battle-actor');this.draw('neutral',0);
  }
  draw(clip,time){this.lastClip=clip;this.lastTime=time;this.actor.draw(sampleLayerClip(clip,time));this.canvas.dataset.clip=clip;}
  destroy(){this.actor.destroy();}
}
export async function loadLayerBattleActor(host){
  const read=async url=>{const image=new Image();image.src=url;await image.decode();return image;};
  const [body,arm]=await Promise.all([read(LAYER_RIG.files.body),read(LAYER_RIG.files.arm)]);
  return new LayerBattleActor(host,body,arm);
}
