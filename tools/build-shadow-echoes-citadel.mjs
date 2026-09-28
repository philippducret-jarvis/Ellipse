import {buildVolume} from './build-shadow-echoes-volume.mjs';
import {EQUIPMENT,RITUALS,ENEMIES} from './lib/shadow-echoes/edition-data.mjs';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MODES,RELICS} from './lib/shadow-echoes/citadel-data.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url))),ws=join(root,'workspaces/shadow-echoes'),out=join(ws,'07_exports/web');
await import('./build-shadow-echoes-layers.mjs');
for(const name of ['citadel.html','citadel.css','edition.css','hero-sheet.css','hero-sheet.mjs','progression.mjs','battle-edition.css','citadel-app.mjs','citadel-data.mjs','profile.mjs','ruins-rules.mjs','activities.mjs','activity-view.mjs','edition-data.mjs','cinematic.mjs','stage-effects.mjs','app.mjs'])await copyFile(join(root,'tools/lib/shadow-echoes',name),join(out,name));
await copyFile(join(out,'citadel.html'),join(out,'preview.html'));
const json=async p=>JSON.parse(await readFile(p,'utf8'));const save=async(p,o)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(o,null,2)+'\n');};
const assets=[];for(const path of ['03_assets/environments/citadel-v1.png','03_assets/items/citadel-atlas-v1.png','03_assets/enemies/guardians-v2.png','03_assets/items/equipment-atlas-v1.png']){const bytes=await readFile(join(ws,path));if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`PNG invalide : ${path}`);assets.push({path,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')});}
const manifest=await json(join(ws,'workspace.json'));await save(join(ws,'workspace.json'),{...manifest,updated_at:new Date().toISOString(),active_lot:'citadelle-06',playable_status:'solo_second_lot',play_url:'/workspaces/shadow-echoes/07_exports/web/citadel.html',hub_url:'/workspaces/shadow-echoes/07_exports/web/citadel.html'});
await save(join(ws,'02_production/lot-06/manifest.json'),{id:'citadelle-06',user_lot:2,title:'Les Gardiens — deuxième lot',status:'playable_second_lot',updated_at:new Date().toISOString(),modes:MODES.map(m=>({id:m.id,name:m.name,levels:1})),heroes:4,relics:RELICS.length,equipment:EQUIPMENT.length,enemies:ENEMIES.length,rituals:RITUALS,progression:{maxLevel:30,ascensions:2,talentsPerHero:9,ranksPerTalent:3,equipmentMaxRank:3},features:['Fiches avec navigation latérale','Trois gardiens illustrés et animés','Bases, compétences et supers en campagne et action','Trois scripts d’invocation','Équipement, transfert et amélioration','XP des héros, paliers et ascension','Talents sélectionnables et bonus effectifs','Transitions et gestes d’attente','Migration des anciens carnets'],assets,scope:'Solo local, quatre Mythiques, aucun achat réel',quality_status:'Fonctionnalités jouables ; direction artistique en revue. Animation hybride maillage/calques/effets ; rigs anatomiques complets et fidélité finale aux planches non certifiés.',qa_report:'02_production/lot-06/validation.json'});

console.log(JSON.stringify({hub:join(out,'citadel.html'),activities:MODES.length,relics:RELICS.length,entry:'preview.html'},null,2));

await buildVolume();
