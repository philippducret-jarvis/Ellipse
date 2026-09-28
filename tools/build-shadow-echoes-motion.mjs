import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RIG_IDS,createRig} from './lib/shadow-echoes/rig-data.mjs';
import {CLIPS,createMesh,deform,boneMatrices,samplePose,meshQuality} from './lib/shadow-echoes/rig-motion.mjs';
await import('./build-shadow-echoes-trial.mjs');
const root=dirname(dirname(fileURLToPath(import.meta.url))),ws=join(root,'workspaces/shadow-echoes');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,value)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(value,null,2)+'\n');};
const now=new Date().toISOString(),reports=[];
const catalog=await json(join(ws,'03_assets/registry/studio-asset-catalog.json'));
for(const id of RIG_IDS){
  const rig=createRig(id),mesh=createMesh(rig),folder=join(ws,'03_assets/characters',id);
  const source=await readFile(join(folder,'presentation-v1.png')),sha256=createHash('sha256').update(source).digest('hex');
  const previous=await json(join(folder,'qa-v1.json'));
  if(previous.sha256!==sha256)throw new Error(`La texture source de ${id} a changé : nouvelle revue nécessaire.`);
  let minAreaRatio=Infinity,maxStretch=0,inverted=0,maxNeutralError=0;
  const clips=[];
  for(const [clip,definition] of Object.entries(CLIPS)){
    for(let i=0;i<=30;i++){
      const positions=deform(mesh,boneMatrices(rig,samplePose(rig,clip,definition.duration*i/30)));
      const quality=meshQuality(mesh,positions);minAreaRatio=Math.min(minAreaRatio,quality.minAreaRatio);maxStretch=Math.max(maxStretch,quality.maxStretch);inverted+=quality.inverted;
      if(clip==='neutral')for(let j=0;j<positions.length;j++)maxNeutralError=Math.max(maxNeutralError,Math.abs(positions[j]-mesh.positions[j]));
    }
    clips.push({id:clip,...definition});
  }
  if(inverted>0||minAreaRatio<.6||maxStretch>1.35||maxNeutralError>.005)throw new Error(`Déformation hors limites : ${id}`);
  const report={hero_id:id,checked_at:now,source_sha256:sha256,source_unchanged:true,
    bones:rig.bones.length,vertices:mesh.positions.length/2,triangles:mesh.indices.length/3,
    sampled_poses:clips.length*31,geometry:{inverted_triangles:inverted,min_area_ratio:minAreaRatio,max_edge_stretch:maxStretch,max_neutral_error_px:maxNeutralError},
    technical_passed:true,artistic_status:'review',fidelity_approved:false,anatomical_layers:false,
    limitations:['Maillage de déformation sur une illustration entière','Pas de faces cachées ni de rotation en profondeur','Ornements et rigidité des armes à examiner en mouvement','Rigs articulés sur calques séparés et animations finales à produire']};
  await save(join(folder,'mesh-rig-v1.json'),{...rig,source_sha256:sha256,clips,qa:'mesh-qa-v1.json'});
  await save(join(folder,'mesh-qa-v1.json'),report);reports.push(report);
  const study={stage:'deformation_study_review',rig:`03_assets/characters/${id}/mesh-rig-v1.json`,qa:`03_assets/characters/${id}/mesh-qa-v1.json`,fidelity_approved:false};
  const definition=await json(join(folder,'hero.json'));await save(join(folder,'hero.json'),{...definition,motion_study:study});
  const asset=catalog.assets.find(a=>a.spec?.hero_id===id);if(asset)asset.spec.motion_study=study;
}
await save(join(ws,'03_assets/registry/studio-asset-catalog.json'),catalog);
const manifest=await json(join(ws,'workspace.json'));
await save(join(ws,'workspace.json'),{...manifest,updated_at:now,active_lot:['mythiques-04','citadelle-05','citadelle-06'].includes(manifest.active_lot)?manifest.active_lot:'mythiques-03',motion_lab_url:'/workspaces/shadow-echoes/07_exports/web/motion.html'});
await save(join(ws,'02_production/lot-03/manifest.json'),{id:'mythiques-03',title:'Atelier du mouvement',updated_at:now,status:'motion_study_review',
  delivery:'4 rigs par maillage, 8 articulations chacun, 7 études de mouvement et pose neutre, atelier et raccord au combat',
  animation_scope:'Amplitudes limitées, angle de vue conservé, aucune découpe anatomique',reports});
console.log(JSON.stringify({rigs:reports.length,bones_per_hero:8,clips:Object.keys(CLIPS),source_textures:'unchanged',geometry:'passed',artistic_review:'pending'},null,2));
