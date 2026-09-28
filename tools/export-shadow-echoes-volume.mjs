import {mkdir,writeFile} from 'node:fs/promises';
import {AnimationClip,QuaternionKeyframeTrack,VectorKeyframeTrack} from './lib/shadow-echoes/vendor/three.module.js';
import {GLTFExporter} from './lib/shadow-echoes/vendor/GLTFExporter.js';
import {createHeroModel,MODEL_STYLE} from './lib/shadow-echoes/hero-model-3d.mjs';
import {MOTIONS,sampleHeroPose} from './lib/shadow-echoes/hero-motion-3d.mjs';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result='data:'+blob.type+';base64,'+Buffer.from(buffer).toString('base64');this.onloadend?.();});}};
const reports=[];
for(const id of Object.keys(MODEL_STYLE)){
 const model=createHeroModel(id),nodes=model.animatedNodes,animations=[];nodes.forEach((n,i)=>{if(!n.name)n.name=`${id}_secondary_${i}`;});
 // VFX remain gameplay-driven; export body, hair, cloth, weapons and eyelids.
 const effect=model.root.getObjectByName('magic');model.root.remove(effect);
 for(const [name,def]of Object.entries(MOTIONS)){
  const samples=Math.ceil(def.duration*30),times=[],values=nodes.map(()=>({q:[],p:[],s:[]}));
  for(let f=0;f<=samples;f++){const t=f/samples*def.duration;times.push(t);model.apply(sampleHeroPose(id,name,t),t);nodes.forEach((n,i)=>{values[i].q.push(...n.quaternion.toArray());values[i].p.push(...n.position.toArray());values[i].s.push(...n.scale.toArray());});}
  const tracks=[];nodes.forEach((n,i)=>{for(const [key,property,size,Type]of [['q','quaternion',4,QuaternionKeyframeTrack],['p','position',3,VectorKeyframeTrack],['s','scale',3,VectorKeyframeTrack]]){const v=values[i][key];tracks.push(new Type(`${n.name}.${property}`,times,v));}});
  animations.push(new AnimationClip(name,def.duration,tracks).optimize());
 }
 model.apply(sampleHeroPose(id,'neutral',0),0);model.root.updateMatrixWorld(true);
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(model.root,{binary:true,animations,onlyVisible:false,trs:true}));
 const folder=`workspaces/shadow-echoes/03_assets/characters/${id}/volume-v1`;await mkdir(folder,{recursive:true});await writeFile(`${folder}/hero.glb`,bytes);
 const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString());if(json.animations?.length!==42)throw Error('Clips manquants '+id);
 const report={hero:id,path:`03_assets/characters/${id}/volume-v1/hero.glb`,bytes:bytes.length,nodes:json.nodes.length,meshes:json.meshes.length,clips:json.animations.length,representation:'Hierarchical articulated meshes; rigid attachment at joints, no continuous skin weights',quality:'Procedural volume study; not final reference-quality art'};reports.push(report);await writeFile(`${folder}/manifest.json`,JSON.stringify(report,null,2));model.dispose();console.log(JSON.stringify(report));
}
await writeFile('workspaces/shadow-echoes/02_production/lot-07/model-exports.json',JSON.stringify(reports,null,2));
