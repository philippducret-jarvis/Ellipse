import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function buildSeraphineRuntime(){
const folder=resolve(import.meta.dirname,'../workspaces/shadow-echoes/03_assets/characters/seraphine/modeling');
const source=await readFile(resolve(folder,'seraphine-atelier-v2.glb'));
if(source.toString('ascii',0,4)!=='glTF'||source.readUInt32LE(4)!==2)throw Error('GLB version 2 attendu');
const jsonLength=source.readUInt32LE(12),json=JSON.parse(source.toString('utf8',20,20+jsonLength));
const wanted=new Set(['idle','run','attack1','skill1Cast','skill2Cast','skill3Cast','ultimateCast','hitLight']);
json.animations=json.animations.filter(animation=>wanted.has(animation.name));
if(json.animations.length!==wanted.size)throw Error(`Clips d'exécution incomplets : ${json.animations.map(animation=>animation.name).join(', ')}`);
const raw=Buffer.from(JSON.stringify(json),'utf8'),pad=Buffer.alloc((4-raw.length%4)%4,32),body=Buffer.concat([raw,pad]),suffix=source.subarray(20+jsonLength),result=Buffer.alloc(20+body.length+suffix.length);
source.copy(result,0,0,12);result.writeUInt32LE(result.length,8);result.writeUInt32LE(body.length,12);result.write('JSON',16,'ascii');body.copy(result,20);suffix.copy(result,20+body.length);
const output=resolve(folder,'seraphine-atelier-v2-runtime.glb');await writeFile(output,result);
console.log(`Séraphine V2 pour le combat : ${json.animations.length} clips sur ${wanted.size}, ${result.length} octets.`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildSeraphineRuntime();
