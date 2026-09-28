import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const path=resolve('workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-atelier-v2.glb');
const source=await readFile(path);
if(source.toString('ascii',0,4)!=='glTF'||source.readUInt32LE(4)!==2)throw Error('GLB version 2 attendu');
const jsonLength=source.readUInt32LE(12),json=JSON.parse(source.toString('utf8',20,20+jsonLength));
if(!json.meshes?.[0]?.primitives?.[0]?.attributes?.TEXCOORD_1)throw Error('UV de projection absents');
for(const material of json.materials.slice(0,10)){
 const texture=material.pbrMetallicRoughness?.baseColorTexture;
 if(!texture)throw Error(`Texture absente : ${material.name}`);
 texture.texCoord=1;
}
const raw=Buffer.from(JSON.stringify(json),'utf8'),padding=(4-raw.length%4)%4,body=Buffer.concat([raw,Buffer.alloc(padding,32)]);
const suffix=source.subarray(20+jsonLength),target=Buffer.alloc(20+body.length+suffix.length);
source.copy(target,0,0,12);target.writeUInt32LE(target.length,8);target.writeUInt32LE(body.length,12);target.write('JSON',16,'ascii');body.copy(target,20);suffix.copy(target,20+body.length);
await writeFile(path,target);
console.log(`Projection UV restaurée sur dix matériaux : ${path}`);
