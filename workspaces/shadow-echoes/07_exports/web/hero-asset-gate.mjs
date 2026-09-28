import {MOTIONS} from './hero-motion-3d.mjs';

const textDecoder=new TextDecoder();
const previewClips=['idle','idleLook','walk','run','dodgeForward','attack1','hitLight','death','summon'];
const releaseClips=Object.keys(MOTIONS);

export function parseGlb(data){
 const bytes=data instanceof Uint8Array?data:new Uint8Array(data),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw Error('GLB 2.0 invalide');
 let offset=12,json=null,binary=null;
 while(offset+8<=bytes.byteLength){const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;if(offset+length>bytes.byteLength)throw Error('Chunk GLB tronqué');const chunk=bytes.subarray(offset,offset+length);if(type===0x4e4f534a)json=JSON.parse(textDecoder.decode(chunk));if(type===0x004e4942)binary=chunk;offset+=length;}
 if(offset!==bytes.byteLength||!json||json.asset?.version!=='2.0')throw Error('Structure glTF 2.0 invalide');
 return {json,binary};
}

function weightedStats(gltf,binary){
 let vertices=0,multiInfluence=0,unreadable=0;
 const readAccessor=index=>{
  const a=gltf.accessors?.[index],bv=gltf.bufferViews?.[a?.bufferView];if(!a||!bv||!binary||a.sparse||a.type!=='VEC4')return null;
  const size={5121:1,5123:2,5126:4}[a.componentType];if(!size)return null;
  const stride=bv.byteStride??size*4,start=(bv.byteOffset??0)+(a.byteOffset??0),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  if(start+(a.count-1)*stride+size*4>binary.byteLength)return null;
  return {count:a.count,componentType:a.componentType,normalized:a.normalized===true,size,stride,start,view};
 };
 for(const node of gltf.nodes??[]){if(node.skin===undefined||node.mesh===undefined)continue;const mesh=gltf.meshes?.[node.mesh];for(const primitive of mesh?.primitives??[]){const attrs=primitive.attributes??{},position=gltf.accessors?.[attrs.POSITION];if(!position)continue;vertices+=position.count;const w=readAccessor(attrs.WEIGHTS_0);if(!w){unreadable+=position.count;continue;}
   for(let i=0;i<w.count;i++){let nonzero=0;for(let k=0;k<4;k++){const at=w.start+i*w.stride+k*w.size;let value=w.componentType===5126?w.view.getFloat32(at,true):w.componentType===5123?w.view.getUint16(at,true):w.view.getUint8(at);if(w.normalized)value/=w.componentType===5123?65535:255;if(value>.01)nonzero++;}if(nonzero>1)multiInfluence++;}
  }}
 return {vertices,multiInfluence,ratio:vertices?multiInfluence/vertices:0,unreadable};
}

export function inspectHeroGlb(data,{stage='release',hero=''}={}){
 const required=stage==='preview'?previewClips:releaseClips,errors=[],warnings=[];
 let gltf,binary;try{({json:gltf,binary}=parseGlb(data));}catch(error){return {hero,stage,pass:false,errors:[error.message],warnings:[]};}
 const skinNodes=(gltf.nodes??[]).filter(node=>node.skin!==undefined&&node.mesh!==undefined),skins=gltf.skins??[],animations=gltf.animations??[],clipNames=new Set(animations.map(a=>a.name)),missingClips=required.filter(name=>!clipNames.has(name));
 if(!skins.length)errors.push('Aucune peau pondérée (skin) : les pièces articulées ne sont pas un personnage déformable.');
 if(!skinNodes.length)errors.push('Aucun maillage associé à une peau.');
 if(skins.length&&!skins.some(s=>(s.joints?.length??0)>=17))errors.push('Squelette incomplet : moins de 17 articulations dans chaque peau.');
 for(const node of skinNodes){const mesh=gltf.meshes?.[node.mesh];for(const primitive of mesh?.primitives??[]){if(primitive.attributes?.JOINTS_0===undefined||primitive.attributes?.WEIGHTS_0===undefined)errors.push('Un maillage skinné manque JOINTS_0 ou WEIGHTS_0.');}}
 if(missingClips.length)errors.push(`${missingClips.length} clip(s) requis manquants : ${missingClips.join(', ')}.`);
 const jointIndices=new Set(skins.flatMap(s=>s.joints??[]));if(jointIndices.size)for(const name of required){const animation=animations.find(a=>a.name===name);if(animation&&!animation.channels?.some(c=>jointIndices.has(c.target?.node)))errors.push(`Le clip ${name} n'anime aucune articulation de la peau.`);}
 const weights=weightedStats(gltf,binary);if(skins.length&&(!weights.vertices||weights.unreadable===weights.vertices))errors.push('Aucun sommet skinné avec poids vérifiables.');
 if(weights.vertices&&weights.ratio<.2)warnings.push('Moins de 20 % des sommets skinnés ont plusieurs influences ; vérifier les déformations des articulations.');
 if(weights.vertices&&weights.vertices<8000)warnings.push('Moins de 8 000 sommets skinnés : contrôler le détail du visage et du costume à la taille de jeu.');
 if(weights.unreadable)warnings.push(`${weights.unreadable} sommets : poids non lisibles dans ce contrôle.`);
 if(!animations.length)warnings.push('Aucune animation embarquée.');
 return {hero,stage,pass:errors.length===0,errors,warnings,metrics:{bytes:data.byteLength,meshes:gltf.meshes?.length??0,skins:skins.length,skinnedMeshes:skinNodes.length,joints:Math.max(0,...skins.map(s=>s.joints?.length??0)),animations:animations.length,missingClips,skinnedVertices:weights.vertices,multiInfluenceRatio:Number(weights.ratio.toFixed(3)),materials:gltf.materials?.length??0}};
}
