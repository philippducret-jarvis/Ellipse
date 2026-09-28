import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PHASES} from './lib/shadow-echoes/battle.mjs';
import {HEROES} from './lib/shadow-echoes/heroes.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ws = join(root, 'workspaces/shadow-echoes'), out = join(ws, '07_exports/web');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, value) => {await mkdir(dirname(path), {recursive:true}); await writeFile(path, JSON.stringify(value, null, 2) + '\n');};
const now = new Date().toISOString();
const manifest = await json(join(ws, 'workspace.json'));
const background = '03_assets/environments/ruins-trial-v1.png';
const data = await readFile(join(ws, background));
if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Décor PNG manquant ou invalide');
for (const hero of HEROES) await readFile(join(ws, `03_assets/characters/${hero.id}/presentation-v1.png`));
await mkdir(out, {recursive:true});
for (const name of ['play.html', 'battle.css', 'battle-app.mjs', 'battle.mjs', 'heroes.mjs', 'hero-lab.mjs','rig-data.mjs','rig-motion.mjs','rig-renderer.mjs','motion.html','motion.css','motion-app.mjs','layers.html','layers.css','layers-app.mjs','layer-rig.mjs','layer-motion.mjs','profile.mjs','citadel-data.mjs','edition-data.mjs','progression.mjs','stage-effects.mjs','battle-edition.css']) {
  await copyFile(join(root, 'tools/lib/shadow-echoes', name), join(out, name));
}
// Ellipse resolves its standard preview button through this entry point.
if(!['citadelle-05','citadelle-06'].includes(manifest.active_lot))await copyFile(join(out, 'play.html'), join(out, 'preview.html'));
const id = '9636da37-a271-4c15-a002-dee5c0673401';
const sourceId = '9636da37-a271-4c15-a002-dee5c0673402';
const catalog = await json(join(ws, '03_assets/registry/studio-asset-catalog.json'));
const sha256 = createHash('sha256').update(data).digest('hex');
const url = `/workspaces/shadow-echoes/${background}`;
catalog.assets = catalog.assets.filter(a => a.id !== id);
catalog.asset_sources = catalog.asset_sources.filter(s => s.id !== sourceId);
catalog.assets.push({id, project_id:manifest.project_id, kind:'environment', role:'background',
  title:'Ruines de l’Aube — décor de l’épreuve v1', status:'review', source_prompt:null, created_at:now,
  spec:{url, production_lot:'mythiques-02', reference_only:false, production_ready:false,
    stage:'playable_trial', width:data.readUInt32BE(16), height:data.readUInt32BE(20), sha256}});
catalog.asset_sources.push({id:sourceId, asset_id:id, source_type:'generated_seed',url,file_path:background,
  metadata:{tool:'image_gen',reference:'01_inputs/references/partie-2/ruines_de_l_aube_sous_la_lune_rouge.png',review_required:true},created_at:now});
await save(join(ws, '03_assets/registry/studio-asset-catalog.json'), catalog);
await save(join(ws, 'workspace.json'), {...manifest, updated_at:now, active_lot:['mythiques-03','mythiques-04','citadelle-05','citadelle-06'].includes(manifest.active_lot) ? manifest.active_lot : 'mythiques-02',playable:true,
  playable_status:['citadelle-05','citadelle-06'].includes(manifest.active_lot)?manifest.playable_status:'combat_trial_prototype',play_url:['citadelle-05','citadelle-06'].includes(manifest.active_lot)?manifest.play_url:'/workspaces/shadow-echoes/07_exports/web/play.html'});
await save(join(ws, '02_production/lot-02/manifest.json'), {id:'mythiques-02',title:'L’Épreuve des Échos',updated_at:now,
  status:'playable_prototype', heroes:HEROES.map(h => h.id), phases:PHASES, backdrop:background,
  delivered:['Combat de quatre Mythiques en trois phases','Attaques annoncées, interruption, garde, soins et boucliers','Victoire, défaite, reprise et bilan','Record local versionné','Décor HD adapté aux références','Entrée preview Ellipse'],
  art_status:'Illustrations HD en revue, déplacements de sprites et effets procéduraux provisoires, aucun rig final',
  missing:['Correction fine et approbation de la fidélité des héros','Découpe et rigs des quatre personnages','Animations articulées et déplacements libres','Boss illustré et animé','Campagne, butin, équipement et progression persistante complète','Musiques et audio définitif']});
console.log(JSON.stringify({playable:'trial_prototype',heroes:HEROES.length,phases:PHASES.length,entry:join(out,'play.html'),artistic_review:'pending'},null,2));
