import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYER_RIG,alignThreePoints,swing} from './layer-rig.mjs';
import {sampleLayerClip} from './layer-motion.mjs';
import {CLIPS} from './rig-motion.mjs';
test('Le recalage projette les trois repères source sur le maître',()=>{
  const [a,b,c,d,e,f]=alignThreePoints(LAYER_RIG.sourceAnchors,LAYER_RIG.targetAnchors);
  LAYER_RIG.sourceAnchors.forEach(([x,y],i)=>{const [u,v]=LAYER_RIG.targetAnchors[i];assert.ok(Math.hypot(a*x+c*y+e-u,b*x+d*y+f-v)<1e-8);});
  assert.ok(a*d-b*c>0,'Aucun miroir');
});
test('Le recalage refuse les repères dégénérés',()=>{
  assert.throws(()=>alignThreePoints([[0,0],[1,1],[2,2]],LAYER_RIG.targetAnchors));
  assert.throws(()=>alignThreePoints([[0,0],[1,NaN],[2,2]],LAYER_RIG.targetAnchors));
});
test('La boucle d’attaque reste bornée et revient sans saut au repos',()=>{
  let previous=swing(0);
  for(let i=1;i<=540;i++){const angle=swing(i/100);assert.ok(angle>=-72&&angle<=10);assert.ok(Math.abs(angle-previous)<2.4);previous=angle;}
  assert.ok(Math.abs(swing(1.8))<1e-8);assert.equal(swing(-1),0);
});
test('Les gestes reviennent au repos et respectent les limites du bras',()=>{
  for(const [name,def]of Object.entries(CLIPS)){
    for(let i=0;i<=100;i++){const pose=sampleLayerClip(name,def.duration*i/100);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.angle>=LAYER_RIG.limits.angleMin&&pose.angle<=LAYER_RIG.limits.angleMax);}
    if(!def.hold){const end=sampleLayerClip(name,def.duration);assert.ok(Object.values(end).every(v=>Math.abs(v)<1e-9),name);}
  }
  assert.deepEqual(sampleLayerClip('defeat',99),sampleLayerClip('defeat',CLIPS.defeat.duration));
  assert.ok(Math.abs(sampleLayerClip('ultimate',CLIPS.ultimate.duration*.52).angle)>Math.abs(sampleLayerClip('attack',CLIPS.attack.duration*.52).angle));
  assert.throws(()=>sampleLayerClip('unknown',0));assert.throws(()=>sampleLayerClip('attack',NaN));
});
