import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve('workspaces/shadow-echoes/03_assets/characters/seraphine');
function parse(buffer){if(buffer.toString('ascii',0,4)!=='glTF')throw Error('GLB attendu');const length=buffer.readUInt32LE(12);return {json:JSON.parse(buffer.toString('utf8',20,20+length)),suffix:buffer.subarray(20+length),header:buffer.subarray(0,12)};}
const source=parse(await readFile(resolve(root,'modeling/seraphine-skin-pilot.glb'))).json;
const path=resolve(root,'modeling/seraphine-atelier-v2.glb'),current=parse(await readFile(path));
for(let index=0;index<10;index++){
 const material=current.json.materials[index],original=source.materials.find(item=>item.name===material.name);
 if(!original)throw Error(`Matière source absente : ${material.name}`);
 delete material.pbrMetallicRoughness.baseColorTexture;
 material.pbrMetallicRoughness.baseColorFactor=original.pbrMetallicRoughness.baseColorFactor;
 material.pbrMetallicRoughness.metallicFactor=original.pbrMetallicRoughness.metallicFactor;
 material.pbrMetallicRoughness.roughnessFactor=original.pbrMetallicRoughness.roughnessFactor;
}
for(const material of current.json.materials){
 if(material.name==='Atelier_Rose_Silk')material.pbrMetallicRoughness.baseColorFactor=[.14,.014,.032,1];
 if(material.name==='Atelier_Charcoal_Silk')material.pbrMetallicRoughness.baseColorFactor=[.021,.018,.026,1];
}
const raw=Buffer.from(JSON.stringify(current.json),'utf8'),pad=Buffer.alloc((4-raw.length%4)%4,32),body=Buffer.concat([raw,pad]);
const result=Buffer.alloc(20+body.length+current.suffix.length);current.header.copy(result,0);result.writeUInt32LE(result.length,8);result.writeUInt32LE(body.length,12);result.write('JSON',16,'ascii');body.copy(result,20);current.suffix.copy(result,20+body.length);
await writeFile(path,result);console.log('Matières source rétablies et soies V2 tempérées.');
