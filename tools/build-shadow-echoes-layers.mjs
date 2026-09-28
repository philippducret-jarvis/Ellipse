import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from './lib/forge/sharp.mjs';
import {LAYER_RIG,alignThreePoints} from './lib/shadow-echoes/layer-rig.mjs';
await import('./build-shadow-echoes-trial.mjs');
const root=dirname(dirname(fileURLToPath(import.meta.url))),ws=join(root,'workspaces/shadow-echoes'),folder=join(ws,'03_assets/characters/seraphine/layers-v1');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,value)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(value,null,2)+'\n');};
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(join(folder,'../presentation-v1.png')),prior=await json(join(folder,'../qa-v1.json'));
if(hash(original)!==prior.sha256)throw new Error('Le maître HD a changé');
const layers=[];
for(const name of ['body.png','arm-sword-v2.png']){
  const bytes=await readFile(join(folder,name)),meta=await sharp(bytes).metadata();
  if(meta.width!==1024||meta.height!==1536||!meta.hasAlpha)throw new Error(`Format RGBA incorrect : ${name}`);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0,opaque=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]<10)clear++;if(data[i]>245)opaque++;}
  const pixels=info.width*info.height;
  if(clear/pixels<.2||opaque/pixels<.03)throw new Error(`Transparence incorrecte : ${name}`);
  layers.push({file:name,sha256:hash(bytes),width:meta.width,height:meta.height,clear_ratio:clear/pixels,opaque_ratio:opaque/pixels});
}
const now=new Date().toISOString(),rig={...LAYER_RIG,alignment:alignThreePoints(LAYER_RIG.sourceAnchors,LAYER_RIG.targetAnchors),source_sha256:hash(original)};
await save(join(folder,'layer-rig-review.json'),rig);
await save(join(folder,'qa-review.json'),{checked_at:now,technical_passed:true,source_unchanged:true,fidelity_approved:false,layers,
  limitations:['Calques régénérés, pas une découpe pixel à pixel','Calage affine initial conservant la pose, proportions du bras à revoir','Raccord d’épaule visible aux grands angles','Bras et épée solidaires, coude et poignet non articulés','Étude intégrée au combat avec retour possible au maillage']});
for(const name of ['layers.html','layers.css','layers-app.mjs','layer-rig.mjs','layer-motion.mjs','rig-motion.mjs','motion.css'])await copyFile(join(root,'tools/lib/shadow-echoes',name),join(ws,'07_exports/web',name));
const manifest=await json(join(ws,'workspace.json'));
const study={stage:'combat_layer_study_review',revision:2,fidelity_approved:false,integrated_in_combat:true,rig:'03_assets/characters/seraphine/layers-v1/layer-rig-review.json',qa:'03_assets/characters/seraphine/layers-v1/qa-review.json'};
const definition=await json(join(folder,'../hero.json'));await save(join(folder,'../hero.json'),{...definition,layer_study:study});
const catalog=await json(join(ws,'03_assets/registry/studio-asset-catalog.json'));const asset=catalog.assets.find(a=>a.spec?.hero_id==='seraphine');if(asset)asset.spec.layer_study=study;await save(join(ws,'03_assets/registry/studio-asset-catalog.json'),catalog);
await save(join(ws,'workspace.json'),{...manifest,updated_at:now,active_lot:['citadelle-05','citadelle-06'].includes(manifest.active_lot)?manifest.active_lot:'mythiques-04',layer_lab_url:'/workspaces/shadow-echoes/07_exports/web/layers.html'});
await save(join(ws,'02_production/lot-04/manifest.json'),{id:'mythiques-04',updated_at:now,status:'partial_layer_study_review',hero_id:'seraphine',fidelity_approved:false,integrated_in_combat:true,combat_option:'layers-mode',layers,
  rig:'03_assets/characters/seraphine/layers-v1/layer-rig-review.json',entry:'07_exports/web/layers.html',remaining:['Correction du raccord d’épaule et fidélité des détails','Séparation coude, poignet, cheveux et cape','Autres Mythiques','Animations finales et coordination du corps']});
console.log(JSON.stringify({hero:'seraphine',layers:layers.length,alpha:'passed',source:'unchanged',artistic_review:'pending'},null,2));
