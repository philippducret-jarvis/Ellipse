import test from 'node:test';
import assert from 'node:assert/strict';
import {createRig,RIG_IDS} from './rig-data.mjs';
import {CLIPS,createMesh,samplePose,boneMatrices,deform,meshQuality} from './rig-motion.mjs';
import {MotionPlayer} from './rig-renderer.mjs';
for(const id of RIG_IDS){
  test(`${id} : pondération, pose neutre et limites des huit clips`,()=>{
    const rig=createRig(id),mesh=createMesh(rig),original=mesh.positions.slice();
    assert.equal(rig.bones.length,8);assert.equal(mesh.positions.length/2,2501);
    for(let i=0;i<mesh.weights.length;i+=mesh.bones){const weights=mesh.weights.slice(i,i+mesh.bones);assert.ok(weights.every(w=>w>=0&&w<=1));assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-6);}
    const neutral=deform(mesh,boneMatrices(rig,samplePose(rig,'neutral',0)));
    assert.ok(neutral.every((p,i)=>Math.abs(p-original[i])<.005));
    for(const [clip,def] of Object.entries(CLIPS))for(let t=0;t<=20;t++){
      const positions=deform(mesh,boneMatrices(rig,samplePose(rig,clip,t/20*def.duration)));
      const q=meshQuality(mesh,positions);assert.equal(q.inverted,0,`${clip} : triangle retourné`);assert.ok(q.minAreaRatio>=.6,clip);assert.ok(q.maxStretch<=1.35,clip);
    }
    assert.deepEqual(mesh.positions,original);
  });
}
test('les clips ponctuels reviennent à leur pose neutre, la chute reste en place',()=>{
  const rig=createRig('seraphine');
  for(const [id,clip] of Object.entries(CLIPS))if(!clip.loop&&!clip.hold){const pose=samplePose(rig,id,clip.duration);assert.ok(Object.values(pose).every(b=>Math.abs(b.angle)+Math.abs(b.x)+Math.abs(b.y)<1e-8));}
  assert.notEqual(samplePose(rig,'defeat',5).root.angle,0);
  assert.deepEqual(samplePose(rig,'idle',4),samplePose(rig,'idle',0));
});
test('priorités, fin de clip et pause fondée sur le temps de simulation',()=>{
  const player=new MotionPlayer();player.trigger('ultimate',3);
  assert.equal(player.trigger('attack',3.2),false);assert.deepEqual(player.sample(3.2),player.sample(3.2));
  assert.equal(player.sample(5).clip,'idle');player.trigger('attack',5);assert.equal(player.sample(5.2).clip,'attack');
  player.trigger('defeat',5.3);assert.equal(player.trigger('hit',6),false);assert.equal(player.sample(30).clip,'defeat');
  player.reset();assert.equal(player.sample(0).clip,'idle');
});
test('amplitude nulle conserve la pose, entrées non finies rejetées',()=>{
  const rig=createRig('voren');assert.deepEqual(samplePose(rig,'attack',.3,0),samplePose(rig,'neutral',0));
  assert.throws(()=>samplePose(rig,'attack',NaN));assert.throws(()=>samplePose(rig,'unknown',0));
});
