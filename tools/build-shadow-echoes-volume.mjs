import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MOTIONS} from './lib/shadow-echoes/hero-motion-3d.mjs';
import {buildSeraphineRuntime} from './build-shadow-seraphine-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),src=resolve(root,'tools/lib/shadow-echoes'),ws=resolve(root,'workspaces/shadow-echoes'),out=resolve(ws,'07_exports/web');
export async function buildVolume(){
 await buildSeraphineRuntime();
 await mkdir(out,{recursive:true});
 for(const name of ['hero-motion-3d.mjs','hero-model-3d.mjs','hero-actor-3d.mjs','hero-material-tuning.mjs','volume-3d.css','motion-3d.html','motion-3d.css','motion-3d-app.mjs','target-references.mjs','targets.html','targets.css','targets-app.mjs','asset-lab.html','asset-lab.css','asset-lab.mjs','hero-asset-gate.mjs','seraphine-lookdev.html','seraphine-lookdev.css','seraphine-lookdev.mjs','ruins.html','ruins.css','ruins-app.mjs','ruins-rules.mjs','ruins-profile.mjs','ruins-scene.mjs','tactics.html','tactics.css','tactics-app.mjs','tactics-rules.mjs','tactics-scene-3d.mjs','tactics-environment-3d.mjs'])await copyFile(resolve(src,name),resolve(out,name));
 await cp(resolve(src,'vendor'),resolve(out,'vendor'),{recursive:true});
 const folder=resolve(ws,'02_production/lot-07');await mkdir(folder,{recursive:true});
 await writeFile(resolve(folder,'animation-manifest.json'),JSON.stringify({id:'mythiques-volume-07',heroes:['seraphine','nyxara','lysael','voren'],clipsPerHero:Object.keys(MOTIONS).length,totalHeroClips:Object.keys(MOTIONS).length*4,clips:MOTIONS,representation:'Native 3D geometry with named skeleton, hinged hair and cloth; no portrait projection',artStatus:'First procedural volume study. Final character likeness and production-quality materials remain to be produced.',integration:['hero sheets','hub','summoning','campaign','survival','caravan','motion library'],updatedAt:new Date().toISOString()},null,2));
 const workspacePath=resolve(ws,'workspace.json'),workspace=JSON.parse(await readFile(workspacePath,'utf8'));await writeFile(workspacePath,JSON.stringify({...workspace,camera_mode:'side_view',camera_description:'Combat latéral surélevé, quatre rangs opposés par camp ; vue d’action trois quarts conservée séparément',active_lot:'reference-lookdev-14',playable_status:'tactical_four_rank_review',artistic_status:'seraphine_reference_25d_lookdev_animation_pending',environment_status:'modeled_bridge_and_columns_with_distant_panorama',animation_url:'/workspaces/shadow-echoes/07_exports/web/motion-3d.html',asset_lab_url:'/workspaces/shadow-echoes/07_exports/web/asset-lab.html',seraphine_lookdev_url:'/workspaces/shadow-echoes/07_exports/web/seraphine-lookdev.html',level_url:'/workspaces/shadow-echoes/07_exports/web/ruins.html',tactical_preview_url:'/workspaces/shadow-echoes/07_exports/web/tactics.html',updated_at:new Date().toISOString()},null,2));
 console.log(`Volume 3D : 4 héros, ${Object.keys(MOTIONS).length} mouvements chacun.`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildVolume();
