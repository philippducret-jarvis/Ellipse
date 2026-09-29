import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createHeroModel} from './hero-model-3d.mjs';
import {sampleHeroPose,MOTIONS} from './hero-motion-3d.mjs';
import {HEROES,WIDTH,LANES,reachableTiles} from './tactics-rules.mjs';
import {tuneHeroMaterials} from './hero-material-tuning.mjs';
import {createTacticsEnvironment} from './tactics-environment-3d.mjs';

const stonePath='../../03_assets/environments/campaign-tactical/bridge-stone-albedo-v1.webp';
const stoneNormalPath='../../03_assets/environments/campaign-tactical/bridge-stone-normal-v2.webp';
const stoneRoughnessPath='../../03_assets/environments/campaign-tactical/bridge-stone-roughness-v2.webp';
const guardianSheetPath='../../03_assets/enemies/guardians-v2.png';
const sentinelPortraitPaths={armored:'../../03_assets/enemies/sentinels-lookdev/armored-sentinel-idle-v1.png',void:'../../03_assets/enemies/sentinels-lookdev/void-sentinel-idle-v1.png',boss:guardianSheetPath};
const lookdevBase='../../03_assets/characters/seraphine/lookdev/';
const seraphineLookdevSets={
 'lookdev-v1':{idle:'seraphine-front-cutout-v1.png',windup:'seraphine-basic-windup-key-v1.png',attack:'seraphine-basic-attack-key-v2.png'},
 'lookdev-v2':{idle:'seraphine-front-cutout-v2.png',windup:'seraphine-basic-windup-key-v2.png',attack:'seraphine-basic-attack-key-v3.png'},
 'lookdev-v3':{idle:'seraphine-front-cutout-v2.png',windup:'seraphine-basic-windup-key-v2.png',attack:'seraphine-basic-attack-key-v3.png',mattes:['seraphine-idle-matte-v3.png','seraphine-windup-matte-v3.png','seraphine-attack-matte-v3.png']},
 'lookdev-v4':{idle:'../turnaround-v1.png',windup:'seraphine-basic-windup-key-v2.png',attack:'seraphine-basic-attack-key-v3.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-windup-matte-v3.png','seraphine-attack-matte-v3.png'],idleWidth:1.02,frontCrop:422/1536},
 'lookdev-v5':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-basic-attack-key-v3.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png','seraphine-attack-matte-v3.png'],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63]},
 'lookdev-v6':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-reference-attack-key-v6.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png','seraphine-reference-attack-matte-v6.png'],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63]},
 'lookdev-v7':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-reference-attack-key-v6.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png','seraphine-reference-attack-matte-v6.png'],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63],hairRegion:'seraphine-reference-hair-region-v7.png'},
 'lookdev-v8':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-reference-attack-key-v6.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png','seraphine-reference-attack-matte-v6.png'],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63],hairRegion:'seraphine-reference-hair-region-v7.png',clothRegion:'seraphine-reference-cloth-region-v8.png'},
 'lookdev-v9':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-reference-attack-key-v6.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png','seraphine-reference-attack-matte-v6.png'],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63],depthMap:'seraphine-reference-depth-v9.png'},
 'lookdev-v10':{idle:'../turnaround-v1.png',windup:'../turnaround-v1.png',attack:'seraphine-reference-attack-alpha-v10.png',mattes:['seraphine-reference-front-matte-v4.png','seraphine-reference-quarter-matte-v5.png',null],idleWidth:1.02,frontCrop:422/1536,keyCrops:[{offset:1147/1536,repeat:389/1536},null],keyWidths:[1.02,1.63]}
};
const tilePosition=(x,lane)=>new T.Vector3(x-(WIDTH-1)/2,0,(lane-(LANES-1)/2)*.75);
const actorPosition=(x,lane)=>tilePosition(x,lane);
const alive=unit=>unit.hp>0;

/** One renderer for the entire encounter. The HTML grid remains the accessible input layer. */
export function createTacticsScene3D(host,{reduced=false}={}){
 const params=new URLSearchParams(location.search),cameraMode=params.get('camera'),useReferenceEnemies=['lookdev-v2','lookdev-v3','lookdev-v4','lookdev-v5','lookdev-v6','lookdev-v7','lookdev-v8','lookdev-v9','lookdev-v10'].includes(params.get('seraphine')??'lookdev-v6'),portraitReview=cameraMode==='portrait',heroReview=portraitReview||cameraMode==='seraphine',cinematicReview=cameraMode==='cinematic'||(!cameraMode&&window.innerWidth>=900),yawParam=Number(params.get('reviewYaw')),reviewYaw=Number.isFinite(yawParam)?Math.max(-.25,Math.min(.25,yawParam)):0;
 host.closest('.scene')?.classList.toggle('camera-cinematic',cinematicReview);
 const renderer=new T.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.domElement.dataset.renderer='tactics-volume-3d';renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-4.68,4.68,2.1,-2.1,.1,80);
 camera.position.set(heroReview?-1.5:0,cinematicReview?4.65:5.3,14);camera.lookAt(heroReview?-1.5:0,portraitReview?1.43:cinematicReview?.8:1.45,0);host.dataset.camera=portraitReview?'seraphine-portrait':heroReview?'seraphine-review':cinematicReview?'formation-cinematic':'formation';
 scene.add(new T.HemisphereLight('#c7d4ec','#3b2633',2.2));
 const key=new T.DirectionalLight('#ffe3c1',3.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;scene.add(key);
 const rim=new T.DirectionalLight('#ec485d',1.9);rim.position.set(4,4,-5);scene.add(rim);
 const stone=new T.MeshStandardMaterial({color:'#95939a',roughness:.98}),mortar=new T.MeshStandardMaterial({color:'#2c2933',roughness:1}),edge=new T.MeshStandardMaterial({color:'#5a555d',roughness:.94}),gold=new T.MeshStandardMaterial({color:'#aa8460',metalness:.5,roughness:.5}),red=new T.MeshStandardMaterial({color:'#8f283e',roughness:.85,side:T.DoubleSide});
 const cellGeo=new T.BoxGeometry(.96,.17,.7),boxGeo=new T.BoxGeometry(1,1,1),actors=new Map(),cells=[];
 const mesh=(geo,material,x,y,z,sx=1,sy=1,sz=1,parent=scene)=>{const object=new T.Mesh(geo,material);object.position.set(x,y,z);object.scale.set(sx,sy,sz);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;};
 const arcadeReview=params.get('environment')==='arcade-v3'||(!params.has('environment')&&cinematicReview),environment=createTacticsEnvironment(scene,{reduced,arcade:arcadeReview});
 host.dataset.environment=arcadeReview?'modeled-arcade-v3':'modeled-v2';host.dataset.environmentDepth=arcadeReview?'4':'3';host.dataset.environmentParts=String(Object.values(environment.parts).reduce((a,b)=>a+b,0));host.dataset.environmentArcadeParts=String(environment.parts.arcade);
 for(let lane=0;lane<LANES;lane++)for(let x=0;x<WIDTH;x++){
  const at=tilePosition(x,lane),material=stone.clone();material.color.offsetHSL(0,0,((x*7+lane*11)%9-4)*.012);
  const block=mesh(cellGeo,material,at.x,-.025,at.z);block.rotation.y=((x+lane)%3-1)*.011;cells.push({x,lane,block,material});
  if((x+lane)%4===0)mesh(boxGeo,edge,at.x-.37,-.115,at.z-.23,.19,.15,.12);
 }
 const textured=[...environment.stoneMaterials,...cells.map(cell=>cell.material)],loadedTextures=[];
 const loader=new T.TextureLoader();
 for(const [path,property,color] of [[stonePath,'map',true],[stoneNormalPath,'normalMap',false],[stoneRoughnessPath,'roughnessMap',false]])loader.load(path,texture=>{if(disposed){texture.dispose();return;}if(color)texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());loadedTextures.push(texture);for(const material of textured){material[property]=texture;if(property==='normalMap')material.normalScale.set(.35,.35);material.needsUpdate=true;}},undefined,()=>{host.dataset.environmentTexture='fallback';});
 function sentinel(unit){
  const root=new T.Group(),body=new T.Group(),arms=[],legs=[];root.add(body);
  const armor=new T.MeshStandardMaterial({color:unit.boss?'#3f263d':'#34303c',metalness:.72,roughness:.34}),iron=new T.MeshStandardMaterial({color:'#1a1720',metalness:.75,roughness:.35}),crimson=new T.MeshStandardMaterial({color:'#ba324c',emissive:'#86182c',emissiveIntensity:.8,metalness:.35,roughness:.4}),bone=new T.MeshStandardMaterial({color:'#b39779',metalness:.4,roughness:.55});
  mesh(new T.CylinderGeometry(.17,.25,.65,10),armor,0,.92,0,1,1,1,body);
  mesh(new T.SphereGeometry(.22,12,8),iron,0,1.42,0,1,.95,.85,body);
  mesh(new T.ConeGeometry(.24,.39,8),armor,0,1.68,0,1,1,1,body);
  mesh(new T.BoxGeometry(.3,.07,.04),crimson,0,1.43,.19,1,1,1,body);
  mesh(new T.BoxGeometry(.1,.37,.05),crimson,0,1.08,.22,1,1,1,body);
  for(const s of [-1,1]){
   const arm=new T.Group();arm.position.set(s*.25,1.25,0);body.add(arm);mesh(new T.CylinderGeometry(.065,.085,.53,7),armor,s*.06,-.28,0,1,1,1,arm);mesh(new T.SphereGeometry(.12,8,6),bone,0,0,0,1,1,1,arm);arms.push(arm);
   const leg=new T.Group();leg.position.set(s*.14,.63,0);body.add(leg);mesh(new T.CylinderGeometry(.08,.1,.57,7),iron,0,-.28,0,1,1,1,leg);mesh(boxGeo,armor,0,-.55,.07,.17,.12,.27,leg);legs.push(leg);
  }
  mesh(new T.CylinderGeometry(.024,.03,.36,7),bone,-.06,-.53,.08,1,1,1,arms[0]);
  mesh(new T.BoxGeometry(.23,.035,.06),bone,-.06,-.31,.08,1,1,1,arms[0]);
  mesh(new T.ConeGeometry(.075,.64,5),crimson,-.06,.02,.08,1,1,1,arms[0]);
  mesh(new T.PlaneGeometry(.85,.85),red,0,.9,-.17,1,1,1,body);
  if(unit.boss){root.scale.setScalar(1.27);for(const s of [-1,1])mesh(new T.ConeGeometry(.12,.5,6),bone,s*.24,1.86,0,1,1,1,body);}
  return {root,body,arms,legs,materials:[armor,iron,crimson,bone]};
 }
 let state=null,raf=0,last=0,visible=false,disposed=false;
 const enemyTexturePromises=new Map(),enemySourceTextures=[];
 function enemyTexture(kind){if(!enemyTexturePromises.has(kind))enemyTexturePromises.set(kind,new T.TextureLoader().loadAsync(sentinelPortraitPaths[kind]).then(texture=>{if(disposed){texture.dispose();return null;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());enemySourceTextures.push(texture);return texture;}));return enemyTexturePromises.get(kind);}
 const slashEffects=[];
 function discardSlash(effect){scene.remove(effect.group);effect.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}
 function slashRibbon(radius,width,start,sweep,material){const vertices=[],segments=32;
  for(let i=0;i<segments;i++)for(const k of [i/segments,(i+1)/segments]){const angle=start+sweep*k,taper=Math.pow(Math.sin(Math.PI*k),1.35)*width,cs=Math.cos(angle),sn=Math.sin(angle);vertices.push((radius-taper)*cs,(radius-taper)*sn,0,(radius+taper)*cs,(radius+taper)*sn,0);}
  const geometry=new T.BufferGeometry(),indices=[];for(let i=0;i<segments;i++){const a=i*4;indices.push(a,a+1,a+2,a+1,a+3,a+2);}geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);return new T.Mesh(geometry,material);
 }
 function makeSlash(entry,targetId){const target=actors.get(targetId),group=new T.Group(),at=target?.goal??entry.goal.clone().add(new T.Vector3(.9,0,0));group.position.set(at.x,1.17,at.z+.32);
  const edgeMaterial=new T.MeshBasicMaterial({color:'#ffe7d8',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending});
  const glowMaterial=new T.MeshBasicMaterial({color:'#e42453',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending});
  const arc=slashRibbon(.4,.019,-1.75,Math.PI*1.05,edgeMaterial),halo=slashRibbon(.4,.075,-1.75,Math.PI*1.05,glowMaterial);
  arc.renderOrder=9;halo.renderOrder=8;group.add(halo,arc);scene.add(group);
  const effect={group,arc,halo,entry};slashEffects.push(effect);return effect;
 }
 function deformReference(mesh,now,amount){const positions=mesh.geometry.attributes.position,rest=mesh.userData.rest;if(!rest)return;
  for(let i=0;i<positions.count;i++){const x=rest[i*3],y=rest[i*3+1],u=x/.815,v=y/1.225,side=Math.abs(u);
   const hair=Math.max(0,Math.min(1,(v-.04)/.76))*Math.max(0,Math.min(1,(side-.2)/.65));
   const outerCloth=Math.max(0,Math.min(1,(.24-v)/1.13))*Math.max(0,Math.min(1,(side-.25)/.6));
   const lowerCloth=Math.max(0,Math.min(1,(-v-.1)/.9));
   const breath=Math.max(0,1-Math.abs(v-.35)*3)*Math.max(0,1-side*2);
   const hairWave=Math.sin(now*1.85+y*4.2+x*2.1),clothWave=Math.sin(now*1.28+x*4.6-y*1.7);
   positions.setXYZ(i,x+amount*(hair*.027*hairWave+outerCloth*.038*clothWave+lowerCloth*.012*Math.sin(now*.9+x*3)),y+amount*(breath*.012*Math.sin(now*1.45)+outerCloth*.013*Math.sin(now*1.28+x*2)),rest[i*3+2]+amount*(hair*.038*Math.cos(now*1.2+x*2)+outerCloth*.052*Math.sin(now*.8+x*3)));
  }
  positions.needsUpdate=true;
 }
 function setRegionMask(material,region,overlay){
  material.userData.regionMap=region;
  material.onBeforeCompile=shader=>{
   shader.uniforms.regionMap={value:region};
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D regionMap;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>\nfloat regionX=vAlphaMapUv.x/0.2747396;\nfloat regionSide=step(0.18,abs(regionX-0.5));\nfloat regionHead=step(0.76,vAlphaMapUv.y);\nfloat cutRegion=step(0.967,texture2D(regionMap,vAlphaMapUv).g)*max(regionSide,regionHead);\ndiffuseColor.a*=${overlay?'cutRegion':'1.0-cutRegion'};`);
  };
  material.customProgramCacheKey=()=>`seraphine-region-${overlay?'overlay':'base'}`;
  material.needsUpdate=true;
 }
 function setTwoRegionMask(material,hair,cloth,layer){
  material.userData.regionMap=hair;material.userData.clothMap=cloth;
  material.onBeforeCompile=shader=>{
   shader.uniforms.hairMap={value:hair};shader.uniforms.clothMap={value:cloth};
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D hairMap;\nuniform sampler2D clothMap;');
   const weight=layer==='hair'?'hairCut':layer==='cloth'?'clothCut':'(1.0-hairCut)*(1.0-clothCut)';
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>\nfloat regionX=vAlphaMapUv.x/0.2747396;\nfloat regionSide=step(0.18,abs(regionX-0.5));\nfloat regionHead=step(0.76,vAlphaMapUv.y);\nfloat hairCut=step(0.967,texture2D(hairMap,vAlphaMapUv).g)*max(regionSide,regionHead);\nfloat clothCut=step(0.967,texture2D(clothMap,vAlphaMapUv).g)*regionSide*(1.0-hairCut);\ndiffuseColor.a*=${weight};`);
  };
  material.customProgramCacheKey=()=>`seraphine-regions-${layer}`;
  material.needsUpdate=true;
 }
 function displaceReference(mesh,image,crop){
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,positions=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  let minimum=Infinity,maximum=-Infinity;
  for(let i=0;i<positions.count;i++){
   const px=Math.max(0,Math.min(canvas.width-1,Math.round(uv.getX(i)*crop*(canvas.width-1)))),py=Math.max(0,Math.min(canvas.height-1,Math.round((1-uv.getY(i))*(canvas.height-1))));
   let total=0;for(const dx of [-4,0,4])for(const dy of [-4,0,4]){const x=Math.max(0,Math.min(canvas.width-1,px+dx)),y=Math.max(0,Math.min(canvas.height-1,py+dy));total+=pixels[(y*canvas.width+x)*4];}
   const depth=(total/(9*255)-.3)*.18;positions.setZ(i,depth);minimum=Math.min(minimum,depth);maximum=Math.max(maximum,depth);
  }
  positions.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.userData.rest=Float32Array.from(positions.array);
  return maximum-minimum;
 }
 const neutralColor=new T.Color('#95939a'),reachColor=new T.Color('#cbb06e'),intentColor=new T.Color('#d75568'),selectedColor=new T.Color('#f1d68f');
 function disposeScene(root){const geometries=new Set(),materials=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>{for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();});}
 function disposeActor(entry){entry.contact.geometry.dispose();entry.contact.material.dispose();if(entry.referenceSprite){const regions=new Set();for(const sprite of [entry.referenceSprite,entry.hairSprite,entry.clothSprite,entry.windupSprite,entry.attackSprite].filter(Boolean)){sprite.geometry.dispose();sprite.material.map?.dispose();sprite.material.alphaMap?.dispose();if(sprite.material.userData.regionMap)regions.add(sprite.material.userData.regionMap);if(sprite.material.userData.clothMap)regions.add(sprite.material.userData.clothMap);sprite.material.dispose();}regions.forEach(texture=>texture.dispose());return;}if(entry.enemySprite){entry.enemySprite.geometry.dispose();entry.enemySprite.material.map?.dispose();entry.enemySprite.material.dispose();return;}if(entry.gltf){entry.gltf.mixer.stopAllAction();disposeScene(entry.gltf.scene);return;}if(entry.model){entry.model.dispose();return;}disposeScene(entry.pivot);}
 async function loadEnemySkin(entry){try{const kind=entry.unit?.boss?'boss':entry.id==='sentry-b'?'void':'armored',source=await enemyTexture(kind);if(!source||disposed||actors.get(entry.id)!==entry)return;
  const texture=source.clone();if(kind==='boss'){texture.repeat.set(1/3,1);texture.offset.set(2/3,0);}texture.needsUpdate=true;
  const sprite=new T.Mesh(new T.PlaneGeometry(kind==='boss'?1.87:1.63,kind==='boss'?1.87:2.45,10,16),new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.045,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  sprite.userData.baseY=kind==='boss'?.97:1.0;sprite.position.y=sprite.userData.baseY;sprite.renderOrder=2;sprite.name=`Guardian reference-derived 2.5D ${kind}`;
  const geometries=new Set();entry.enemy.root.traverse(object=>{if(object.geometry&&object.geometry!==boxGeo)geometries.add(object.geometry);});
  entry.pivot.remove(entry.enemy.root);geometries.forEach(geometry=>geometry.dispose());entry.enemy.materials.forEach(material=>material.dispose());entry.enemy=null;entry.enemySprite=sprite;entry.pivot.add(sprite);
  host.dataset.enemyVisuals='guardian-portraits-v1';host.dataset.enemySprites=String([...actors.values()].filter(actor=>actor.enemySprite).length);
 }catch(error){console.warn('Planche des gardiens indisponible ; sentinelles en volume conservées.',error);}}
 async function loadSeraphineSkin(entry){try{const requested=new URLSearchParams(location.search).get('seraphine')??'lookdev-v6',lookdev=seraphineLookdevSets[requested];if(lookdev){
  const texture=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.idle);
  if(disposed||actors.get(entry.id)!==entry){texture.dispose();return;}
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if(lookdev.frontCrop){texture.repeat.set(lookdev.frontCrop,1);texture.needsUpdate=true;}
  const geometry=new T.PlaneGeometry(lookdev.idleWidth??1.63,2.45,lookdev.depthMap?64:12,lookdev.depthMap?128:24);
  const sprite=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.045,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  sprite.userData.rest=Float32Array.from(geometry.attributes.position.array);
  sprite.position.y=1.22;sprite.renderOrder=2;sprite.name='Seraphine reference-derived 2.5D lookdev';
  entry.pivot.remove(entry.model.root);entry.model.dispose();entry.model=null;entry.referenceSprite=sprite;entry.pivot.add(sprite);
  host.dataset.seraphineModel=requested;host.dataset.seraphineMaterials='reference-cutout';host.dataset.seraphineKeyposes='1';
  if(lookdev.mattes){
   const matte=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.mattes[0]);
   if(disposed||actors.get(entry.id)!==entry){matte.dispose();return;}
   if(lookdev.frontCrop){matte.repeat.set(lookdev.frontCrop,1);matte.needsUpdate=true;}
   sprite.material.alphaMap=matte;sprite.material.alphaTest=.965;sprite.material.needsUpdate=true;
   host.dataset.seraphineMaterials='reference-with-silhouette-matte';
  }
  if(lookdev.depthMap){
   const depthTexture=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.depthMap);
   if(disposed||actors.get(entry.id)!==entry){depthTexture.dispose();return;}
   const depthRange=displaceReference(sprite,depthTexture.image,lookdev.frontCrop);depthTexture.dispose();entry.referenceDepth=true;
   host.dataset.seraphineDepth='reference-heightfield-v1';
   host.dataset.seraphineDepthRange=depthRange.toFixed(3);
  }
  if(lookdev.hairRegion){
   const region=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.hairRegion);
   if(disposed||actors.get(entry.id)!==entry){region.dispose();return;}
   region.repeat.set(lookdev.frontCrop,1);region.needsUpdate=true;
   setRegionMask(sprite.material,region,false);
   const hairMap=texture.clone(),hairMatte=sprite.material.alphaMap.clone();hairMap.needsUpdate=true;hairMatte.needsUpdate=true;
   const hairGeometry=new T.PlaneGeometry(lookdev.idleWidth,2.45,12,24);
   const hair=new T.Mesh(hairGeometry,new T.MeshBasicMaterial({map:hairMap,alphaMap:hairMatte,transparent:true,alphaTest:.965,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
   setRegionMask(hair.material,region,true);hair.userData.rest=Float32Array.from(hairGeometry.attributes.position.array);
   hair.position.y=1.22;hair.renderOrder=3;hair.name='Seraphine independently animated reference hair';entry.hairSprite=hair;entry.pivot.add(hair);
   host.dataset.seraphineMotion='reference-hair-region-and-keyposes';
  }
  if(lookdev.clothRegion&&entry.hairSprite){
   const clothRegion=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.clothRegion);
   if(disposed||actors.get(entry.id)!==entry){clothRegion.dispose();return;}
   clothRegion.repeat.set(lookdev.frontCrop,1);clothRegion.needsUpdate=true;
   const hairRegion=entry.referenceSprite.material.userData.regionMap;
   setTwoRegionMask(sprite.material,hairRegion,clothRegion,'base');
   setTwoRegionMask(entry.hairSprite.material,hairRegion,clothRegion,'hair');
   const clothMap=texture.clone(),clothMatte=sprite.material.alphaMap.clone();clothMap.needsUpdate=true;clothMatte.needsUpdate=true;
   const clothGeometry=new T.PlaneGeometry(lookdev.idleWidth,2.45,12,24);
   const cloth=new T.Mesh(clothGeometry,new T.MeshBasicMaterial({map:clothMap,alphaMap:clothMatte,transparent:true,alphaTest:.965,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
   setTwoRegionMask(cloth.material,hairRegion,clothRegion,'cloth');cloth.userData.rest=Float32Array.from(clothGeometry.attributes.position.array);
   cloth.position.y=1.22;cloth.renderOrder=3;cloth.name='Seraphine independently animated reference cloth';entry.clothSprite=cloth;entry.pivot.add(cloth);
   host.dataset.seraphineMotion='reference-hair-cloth-and-keyposes';
  }
  const results=await Promise.allSettled([lookdev.windup,lookdev.attack].map(path=>new T.TextureLoader().loadAsync(lookdevBase+path)));
  if(disposed||actors.get(entry.id)!==entry){for(const result of results)if(result.status==='fulfilled')result.value.dispose();return;}
  for(let i=0;i<results.length;i++){const result=results[i];if(result.status!=='fulfilled'){console.warn('Pose clé de Séraphine indisponible.',result.reason);continue;}
   const keyTexture=result.value;keyTexture.colorSpace=T.SRGBColorSpace;keyTexture.anisotropy=texture.anisotropy;
   const crop=lookdev.keyCrops?.[i];if(crop){keyTexture.repeat.set(crop.repeat,1);keyTexture.offset.set(crop.offset,0);keyTexture.needsUpdate=true;}
   const key=new T.Mesh(new T.PlaneGeometry(lookdev.keyWidths?.[i]??1.63,2.45,12,24),new T.MeshBasicMaterial({map:keyTexture,transparent:true,alphaTest:.045,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
   if(lookdev.mattes?.[i+1]){try{const matte=await new T.TextureLoader().loadAsync(lookdevBase+lookdev.mattes[i+1]);if(disposed||actors.get(entry.id)!==entry){matte.dispose();key.geometry.dispose();key.material.dispose();continue;}if(crop){matte.repeat.set(crop.repeat,1);matte.offset.set(crop.offset,0);matte.needsUpdate=true;}key.material.alphaMap=matte;key.material.alphaTest=.965;key.material.needsUpdate=true;}catch(error){console.warn('Masque de pose indisponible.',error);}}
   key.userData.rest=Float32Array.from(key.geometry.attributes.position.array);
   key.position.y=1.22;key.renderOrder=3+i;key.name=i===0?'Seraphine basic windup reference-derived key pose':'Seraphine basic strike reference-derived key pose';
   if(i===0)entry.windupSprite=key;else entry.attackSprite=key;
   entry.pivot.add(key);
  }
  host.dataset.seraphineKeyposes=String(1+Number(!!entry.windupSprite)+Number(!!entry.attackSprite));host.dataset.seraphineMattes=String([entry.referenceSprite,entry.windupSprite,entry.attackSprite].filter(pose=>!!pose?.material.alphaMap).length);host.dataset.seraphineAttackAlpha=lookdev.mattes?.[2]?'silhouette-matte':'intrinsic-png';host.dataset.seraphineMotion=entry.clothSprite?'reference-hair-cloth-and-keyposes':entry.hairSprite?'reference-hair-region-and-keyposes':'regional-mesh-and-clean-keyposes';
  return;
 }
 const groomReview=requested==='groom-v4-1',silhouetteReview=requested==='silhouette-v4',surfaceReview=requested==='surface-v3';const modelName=groomReview?'seraphine-silhouette-v4-1-runtime.glb':silhouetteReview?'seraphine-silhouette-v4-runtime.glb':surfaceReview?'seraphine-surface-v3-runtime.glb':'seraphine-atelier-v2-runtime.glb';const gltf=await new GLTFLoader().loadAsync(`../../03_assets/characters/seraphine/modeling/${modelName}`);if(disposed||actors.get(entry.id)!==entry){disposeScene(gltf.scene);return;}entry.pivot.remove(entry.model.root);entry.model.dispose();entry.model=null;gltf.scene.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});entry.pivot.add(gltf.scene);host.dataset.seraphineMaterials=String(tuneHeroMaterials(gltf.scene,{roughness:.9,metalness:1.1}));entry.gltf={scene:gltf.scene,mixer:new T.AnimationMixer(gltf.scene),clips:new Map(gltf.animations.map(clip=>[clip.name,clip])),playing:null};host.dataset.seraphineModel=groomReview?'groom-v4-1':silhouetteReview?'silhouette-v4':surfaceReview?'surface-v3':'atelier-v2';}catch(error){host.dataset.seraphineModel='fallback';console.warn('Rig skinné de Séraphine indisponible, volume de secours conservé.',error);}}
 function sync(run){state=run.phase==='battle'?run:null;visible=!!state;host.hidden=!visible;if(!visible)return;
  const battle=run.battle,units=[...battle.heroes.filter(alive),...battle.enemies.filter(alive)],ids=new Set(units.map(unit=>unit.id));
  for(const [id,entry] of actors)if(!ids.has(id)){scene.remove(entry.pivot);disposeActor(entry);actors.delete(id);}
  for(const unit of units){let entry=actors.get(unit.id);if(!entry){
    const hero=!!HEROES[unit.id],pivot=new T.Group();scene.add(pivot);const contact=new T.Mesh(new T.CircleGeometry(.39,24),new T.MeshBasicMaterial({color:'#080509',transparent:true,opacity:.43,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.07;pivot.add(contact);
    const model=hero?createHeroModel(unit.id):null,enemy=hero?null:sentinel(unit);
    pivot.add(hero?model.root:enemy.root);pivot.scale.setScalar(hero?.67:.75);pivot.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
    entry={pivot,model,enemy,contact,id:unit.id,x:unit.x,lane:unit.lane,clip:'idle',started:performance.now()/1000};pivot.position.copy(actorPosition(unit.x,unit.lane));actors.set(unit.id,entry);if(unit.id==='seraphine'){host.dataset.seraphineModel='loading';void loadSeraphineSkin(entry);}else if(!hero&&useReferenceEnemies)void loadEnemySkin(entry);
   }
   entry.unit=unit;entry.goal=actorPosition(unit.x,unit.lane);
   entry.x=unit.x;entry.lane=unit.lane;
  }
  const reachable=new Set(reachableTiles(run,battle.selected).map(t=>`${t.x},${t.lane}`));
  const intents=new Set(battle.enemies.filter(alive).filter(e=>e.intent?.kind==='strike').map(e=>`${e.intent.x},${e.intent.lane}`));
  for(const cell of cells){const key=`${cell.x},${cell.lane}`,unit=units.find(u=>u.x===cell.x&&u.lane===cell.lane);cell.material.color.copy(unit?.id===battle.selected?selectedColor:intents.has(key)?intentColor:reachable.has(key)?reachColor:neutralColor);}
  host.dataset.actors=String(actors.size);host.dataset.floorTiles=String(cells.length);if(useReferenceEnemies)host.dataset.enemySprites=String([...actors.values()].filter(actor=>actor.enemySprite).length);
 }
 function action(actorId,kind,targetId){const entry=actors.get(actorId);if(!entry)return;entry.clip=kind==='move'?'run':kind==='basic'?'attack1':kind==='super'?'ultimateCast':kind.startsWith('skill')?`${kind}Cast`:'hitLight';entry.started=performance.now()/1000;if(entry.referenceSprite&&entry.clip==='attack1'){entry.referenceAttackElapsed=0;entry.slashEffect=makeSlash(entry,targetId);host.dataset.seraphineAttackTriggered='true';}}
 function enemyTurn(){const now=performance.now()/1000;for(const entry of actors.values())if(entry.enemy){entry.clip='attack1';entry.started=now;}}
 function resize(){const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);renderer.setSize(w,h,false);const aspect=w/h,span=portraitReview?.8:heroReview?2.4:4.68;camera.left=-span;camera.right=span;camera.top=span/aspect;camera.bottom=-camera.top;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(ms){if(disposed)return;raf=requestAnimationFrame(frame);if(!visible||document.hidden)return;const now=ms/1000,dt=Math.min(.05,Math.max(0,now-last));last=now;
  for(const entry of actors.values()){
   const p=entry.pivot;let t=now-entry.started;if(entry.referenceSprite&&entry.clip==='attack1'){entry.referenceAttackElapsed=(entry.referenceAttackElapsed??0)+dt;t=entry.referenceAttackElapsed;}p.position.lerp(entry.goal,reduced?1:Math.min(1,dt*7));
   if(Math.abs(p.position.x-entry.goal.x)>.02||Math.abs(p.position.z-entry.goal.z)>.02)entry.clip='run';
   else if(entry.clip==='run'&&t>.3){entry.clip='idle';entry.started=now;}
   const duration=entry.referenceSprite&&entry.clip==='attack1'?1.25:MOTIONS[entry.clip]?.duration??.8;
   const clip=entry.clip!=='idle'&&t>duration?'idle':entry.clip;
   if(clip==='idle'&&entry.clip!=='idle'){entry.clip='idle';entry.started=now;}
   if(entry.referenceSprite){const sprite=entry.referenceSprite,active=entry.clip!=='idle',basic=entry.clip==='attack1'&&!!entry.attackSprite,phase=Math.max(0,Math.min(1,t/1.25));
    const stage=basic?(phase<.16?'idle':phase<.52?(entry.windupSprite?'windup':'idle'):phase<.84?'attack':'idle'):'idle';
    sprite.visible=stage==='idle';sprite.position.y=1.22+(reduced?0:Math.sin(now*1.45)*.012);sprite.position.x=active?-.035*Math.sin(Math.min(1,t/.56)*Math.PI):0;sprite.rotation.z=active?-.012*Math.sin(Math.min(1,t/.58)*Math.PI):Math.sin(now*.85)*.004;p.rotation.y=entry.referenceDepth && stage==='idle' ? reviewYaw+(reduced?0:.025*Math.sin(now*.48)) : 0;
    if(entry.hairSprite){const hair=entry.hairSprite;hair.visible=stage==='idle';hair.position.y=sprite.position.y;hair.position.x=sprite.position.x;hair.rotation.z=sprite.rotation.z;if(!reduced&&hair.visible)deformReference(hair,now,1.35);}
    if(entry.clothSprite){const cloth=entry.clothSprite;cloth.visible=stage==='idle';cloth.position.y=sprite.position.y;cloth.position.x=sprite.position.x;cloth.rotation.z=sprite.rotation.z;if(!reduced&&cloth.visible)deformReference(cloth,now,1.25);}
    if(entry.windupSprite){entry.windupSprite.visible=stage==='windup';entry.windupSprite.position.x=-.055;entry.windupSprite.rotation.z=-.023;if(stage==='windup')host.dataset.seraphineWindupSeen='true';}
    if(entry.attackSprite){entry.attackSprite.visible=stage==='attack';entry.attackSprite.position.x=.10+Math.max(0,Math.min(1,(phase-.52)/.32))*.075;entry.attackSprite.rotation.z=.018;if(stage==='attack')host.dataset.seraphineAttackSeen='true';}
    host.dataset.seraphinePose=stage;
    const visiblePoses=Number(sprite.visible)+Number(!!entry.windupSprite?.visible)+Number(!!entry.attackSprite?.visible);host.dataset.seraphineVisiblePoses=String(visiblePoses);if(visiblePoses!==1)host.dataset.seraphinePoseOverlap='true';
    if(!reduced&&stage!=='idle')deformReference(stage==='windup'?entry.windupSprite:entry.attackSprite,now,.45);
    else if(!reduced&&!entry.hairSprite)deformReference(sprite,now,1);
   }
   else if(entry.gltf){const rig=entry.gltf;if(rig.playing!==entry.clip){rig.mixer.stopAllAction();const motion=rig.clips.get(entry.clip)??rig.clips.get('idle');if(motion){const action=rig.mixer.clipAction(motion);action.reset();action.setLoop(MOTIONS[entry.clip]?.loop?T.LoopRepeat:T.LoopOnce);action.clampWhenFinished=true;action.play();}rig.playing=entry.clip;}rig.mixer.update(dt);p.rotation.y=.14;}
   else if(entry.model){entry.model.apply(sampleHeroPose(entry.id,entry.clip,entry.clip==='idle'?now:now-entry.started),reduced?0:now);p.rotation.y=entry.id==='nyxara'?-.16:.14;}
   else if(entry.enemySprite){const sprite=entry.enemySprite,attack=entry.clip==='attack1'?Math.sin(Math.min(1,t/.7)*Math.PI):0;const bob=reduced?0:Math.sin(now*1.65+entry.x)*.017;sprite.position.y=sprite.userData.baseY+bob;sprite.position.x=-attack*.12;sprite.rotation.z=-attack*.035+(reduced?0:Math.sin(now*1.1+entry.x)*.008);p.rotation.y=0;}
   else{const enemy=entry.enemy,bob=reduced?0:Math.sin(now*2+entry.x)*.025;enemy.body.position.y=bob;enemy.arms[0].rotation.x=entry.clip==='attack1'?-.9*Math.sin(Math.min(1,t/.7)*Math.PI):Math.sin(now*1.6)*.06;enemy.arms[1].rotation.x=Math.sin(now*1.6+1)*.06;enemy.legs[0].rotation.x=Math.sin(now*3)*.025;enemy.legs[1].rotation.x=-enemy.legs[0].rotation.x;p.rotation.y=-.25;}
   p.position.y=.08;
  }
  for(let i=slashEffects.length-1;i>=0;i--){const effect=slashEffects[i],phase=(effect.entry.referenceAttackElapsed??0)/1.25,progress=Math.max(0,Math.min(1,(phase-.49)/.36));effect.group.visible=phase>=.49&&phase<.86;effect.group.scale.setScalar(.78+progress*.64);effect.group.rotation.z=-.16+progress*.53;effect.arc.material.opacity=(1-progress)*.98;effect.halo.material.opacity=(1-progress)*.58;if(phase>.54&&phase<.8)host.dataset.seraphineSlashSeen='true';if(phase>.93||!actors.has(effect.entry.id)){discardSlash(effect);slashEffects.splice(i,1);}}
  environment.update(now);
  renderer.render(scene,camera);
 }
 raf=requestAnimationFrame(frame);
 return {sync,action,enemyTurn,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const effect of slashEffects)discardSlash(effect);slashEffects.length=0;for(const entry of actors.values()){scene.remove(entry.pivot);disposeActor(entry);}const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());loadedTextures.forEach(texture=>texture.dispose());enemySourceTextures.forEach(texture=>texture.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
