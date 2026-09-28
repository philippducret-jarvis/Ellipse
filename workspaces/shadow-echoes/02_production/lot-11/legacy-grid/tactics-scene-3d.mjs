import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createHeroModel} from './hero-model-3d.mjs';
import {sampleHeroPose,MOTIONS} from './hero-motion-3d.mjs';
import {HEROES,WIDTH,LANES,reachableTiles} from './tactics-rules.mjs';
import {tuneHeroMaterials} from './hero-material-tuning.mjs';

const stonePath='../../03_assets/environments/campaign-tactical/bridge-stone-albedo-v1.webp';
const tilePosition=(x,lane)=>new T.Vector3(x-(WIDTH-1)/2,0,(lane-1)*.75);
const actorPosition=(x,lane)=>tilePosition(x,lane).add(new T.Vector3((lane-1)*.28,0,0));
const alive=unit=>unit.hp>0;

/** One renderer for the entire encounter. The HTML grid remains the accessible input layer. */
export function createTacticsScene3D(host,{reduced=false}={}){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
 renderer.domElement.dataset.renderer='tactics-volume-3d';renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-3.55,3.55,1.5,-1.5,.1,50);
 camera.position.set(0,5.7,12);camera.lookAt(0,.8,0);
 scene.add(new T.HemisphereLight('#c7d4ec','#3b2633',2.2));
 const key=new T.DirectionalLight('#ffe3c1',3.2);key.position.set(-3,7,5);scene.add(key);
 const rim=new T.DirectionalLight('#ec485d',1.9);rim.position.set(4,4,-5);scene.add(rim);
 const stone=new T.MeshStandardMaterial({color:'#95939a',roughness:.98}),mortar=new T.MeshStandardMaterial({color:'#2c2933',roughness:1}),edge=new T.MeshStandardMaterial({color:'#5a555d',roughness:.94}),gold=new T.MeshStandardMaterial({color:'#aa8460',metalness:.5,roughness:.5}),red=new T.MeshStandardMaterial({color:'#8f283e',roughness:.85,side:T.DoubleSide});
 const cellGeo=new T.BoxGeometry(.96,.17,.7),boxGeo=new T.BoxGeometry(1,1,1),actors=new Map(),cells=[];
 const mesh=(geo,material,x,y,z,sx=1,sy=1,sz=1,parent=scene)=>{const object=new T.Mesh(geo,material);object.position.set(x,y,z);object.scale.set(sx,sy,sz);parent.add(object);return object;};
 mesh(boxGeo,mortar,0,-.38,0,7.5,.7,2.65);
 for(let lane=0;lane<LANES;lane++)for(let x=0;x<WIDTH;x++){
  const at=tilePosition(x,lane),material=stone.clone();material.color.offsetHSL(0,0,((x*7+lane*11)%9-4)*.012);
  const block=mesh(cellGeo,material,at.x,-.025,at.z);block.rotation.y=((x+lane)%3-1)*.011;cells.push({x,lane,block,material});
  if((x+lane)%4===0)mesh(boxGeo,edge,at.x-.37,-.115,at.z-.23,.19,.15,.12);
 }
 for(const side of [-1,1]){
  for(let x=-3.55;x<=3.6;x+=1.15){mesh(boxGeo,edge,x,.12,side*1.3,.19,.6,.24);mesh(boxGeo,gold,x,.46,side*1.3,.26,.1,.28);}
  mesh(boxGeo,edge,0,.44,side*1.3,7.5,.14,.18);
 }
 for(const x of [-3.55,3.55])for(const z of [-1.3,1.3]){
  mesh(boxGeo,edge,x,.7,z,.5,1.55,.45);mesh(boxGeo,gold,x,1.51,z,.67,.17,.6);
  mesh(new T.ConeGeometry(.25,.6,5),edge,x,1.91,z);
 }
 // Visible arch masonry below the playable bridge, not part of the painted backdrop.
 for(let x=-3;x<=3;x+=1.55){
  mesh(boxGeo,edge,x,-1.1,1.12,.36,1.25,.35);
  const arch=mesh(new T.TorusGeometry(.65,.14,6,18,Math.PI),edge,x,-.52,1.12);arch.rotation.z=Math.PI;
 }
 const torch=[];for(const x of [-3.45,3.45])for(const z of [-1.2,1.2]){
  mesh(new T.CylinderGeometry(.06,.1,.35,8),gold,x,.85,z);
  const flame=mesh(new T.ConeGeometry(.1,.35,8),new T.MeshBasicMaterial({color:'#ff9e57'}),x,1.16,z);torch.push(flame);
 }
 const loader=new T.TextureLoader();loader.load(stonePath,texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(.85,.65);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());for(const cell of cells){cell.material.map=texture;cell.material.needsUpdate=true;}},undefined,()=>{});
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
  mesh(new T.BoxGeometry(.04,.8,.08),bone,-.35,.6,.05,1,1,1,arms[0]);
  mesh(new T.BoxGeometry(.11,.55,.05),crimson,-.35,.95,.08,1,1,1,arms[0]);
  mesh(new T.PlaneGeometry(.85,.85),red,0,.9,-.17,1,1,1,body);
  if(unit.boss){root.scale.setScalar(1.27);for(const s of [-1,1])mesh(new T.ConeGeometry(.12,.5,6),bone,s*.24,1.86,0,1,1,1,body);}
  return {root,body,arms,legs,materials:[armor,iron,crimson,bone]};
 }
 let state=null,raf=0,last=0,visible=false,disposed=false;
 const neutralColor=new T.Color('#95939a'),reachColor=new T.Color('#cbb06e'),intentColor=new T.Color('#d75568'),selectedColor=new T.Color('#f1d68f');
 function disposeScene(root){const geometries=new Set(),materials=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>{for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();});}
 function disposeActor(entry){if(entry.gltf){entry.gltf.mixer.stopAllAction();disposeScene(entry.gltf.scene);return;}if(entry.model){entry.model.dispose();return;}disposeScene(entry.pivot);}
 async function loadSeraphineSkin(entry){try{const gltf=await new GLTFLoader().loadAsync('../../03_assets/characters/seraphine/modeling/seraphine-skin-pilot.glb');if(disposed||actors.get(entry.id)!==entry){disposeScene(gltf.scene);return;}entry.pivot.remove(entry.model.root);entry.model.dispose();entry.model=null;entry.pivot.add(gltf.scene);host.dataset.seraphineMaterials=String(tuneHeroMaterials(gltf.scene,{roughness:.9,metalness:1.1}));entry.gltf={scene:gltf.scene,mixer:new T.AnimationMixer(gltf.scene),clips:new Map(gltf.animations.map(clip=>[clip.name,clip])),playing:null};host.dataset.seraphineModel='skinned';}catch(error){host.dataset.seraphineModel='fallback';console.warn('Rig skinné de Séraphine indisponible, volume de secours conservé.',error);}}
 function sync(run){state=run.phase==='battle'?run:null;visible=!!state;host.hidden=!visible;if(!visible)return;
  const battle=run.battle,units=[...battle.heroes.filter(alive),...battle.enemies.filter(alive)],ids=new Set(units.map(unit=>unit.id));
  for(const [id,entry] of actors)if(!ids.has(id)){scene.remove(entry.pivot);disposeActor(entry);actors.delete(id);}
  for(const unit of units){let entry=actors.get(unit.id);if(!entry){
    const hero=!!HEROES[unit.id],pivot=new T.Group();scene.add(pivot);
    const model=hero?createHeroModel(unit.id):null,enemy=hero?null:sentinel(unit);
    pivot.add(hero?model.root:enemy.root);pivot.scale.setScalar(hero?.67:.75);
    entry={pivot,model,enemy,id:unit.id,x:unit.x,lane:unit.lane,clip:'idle',started:performance.now()/1000};pivot.position.copy(actorPosition(unit.x,unit.lane));actors.set(unit.id,entry);if(unit.id==='seraphine'){host.dataset.seraphineModel='loading';void loadSeraphineSkin(entry);}
   }
   entry.unit=unit;entry.goal=actorPosition(unit.x,unit.lane);
   entry.x=unit.x;entry.lane=unit.lane;
  }
  const reachable=new Set(reachableTiles(run,battle.selected).map(t=>`${t.x},${t.lane}`));
  const intents=new Set(battle.enemies.filter(alive).filter(e=>e.intent?.kind==='strike').map(e=>`${e.intent.x},${e.intent.lane}`));
  for(const cell of cells){const key=`${cell.x},${cell.lane}`,unit=units.find(u=>u.x===cell.x&&u.lane===cell.lane);cell.material.color.copy(unit?.id===battle.selected?selectedColor:intents.has(key)?intentColor:reachable.has(key)?reachColor:neutralColor);}
  host.dataset.actors=String(actors.size);host.dataset.floorTiles=String(cells.length);
 }
 function action(actorId,kind){const entry=actors.get(actorId);if(!entry)return;entry.clip=kind==='move'?'run':kind==='basic'?'attack1':kind==='super'?'ultimateCast':kind.startsWith('skill')?`${kind}Cast`:'hitLight';entry.started=performance.now()/1000;}
 function enemyTurn(){const now=performance.now()/1000;for(const entry of actors.values())if(entry.enemy){entry.clip='attack1';entry.started=now;}}
 function resize(){const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);renderer.setSize(w,h,false);const aspect=w/h;camera.left=-3.62;camera.right=3.62;camera.top=3.62/aspect;camera.bottom=-camera.top;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(ms){if(disposed)return;raf=requestAnimationFrame(frame);if(!visible||document.hidden)return;const now=ms/1000,dt=Math.min(.05,Math.max(0,now-last));last=now;
  for(const entry of actors.values()){
   const p=entry.pivot,t=now-entry.started;p.position.lerp(entry.goal,reduced?1:Math.min(1,dt*7));
   if(Math.abs(p.position.x-entry.goal.x)>.02||Math.abs(p.position.z-entry.goal.z)>.02)entry.clip='run';
   else if(entry.clip==='run'&&t>.3){entry.clip='idle';entry.started=now;}
   const clip=entry.clip!=='idle'&&t>(MOTIONS[entry.clip]?.duration??.8)?'idle':entry.clip;
   if(clip==='idle'&&entry.clip!=='idle'){entry.clip='idle';entry.started=now;}
   if(entry.gltf){const rig=entry.gltf;if(rig.playing!==entry.clip){rig.mixer.stopAllAction();const motion=rig.clips.get(entry.clip)??rig.clips.get('idle');if(motion){const action=rig.mixer.clipAction(motion);action.reset();action.setLoop(MOTIONS[entry.clip]?.loop?T.LoopRepeat:T.LoopOnce);action.clampWhenFinished=true;action.play();}rig.playing=entry.clip;}rig.mixer.update(dt);p.rotation.y=.14;}
   else if(entry.model){entry.model.apply(sampleHeroPose(entry.id,entry.clip,entry.clip==='idle'?now:now-entry.started),reduced?0:now);p.rotation.y=entry.id==='nyxara'?-.16:.14;}
   else{const enemy=entry.enemy,bob=reduced?0:Math.sin(now*2+entry.x)*.025;enemy.body.position.y=bob;enemy.arms[0].rotation.x=entry.clip==='attack1'?-.9*Math.sin(Math.min(1,t/.7)*Math.PI):Math.sin(now*1.6)*.06;enemy.arms[1].rotation.x=Math.sin(now*1.6+1)*.06;enemy.legs[0].rotation.x=Math.sin(now*3)*.025;enemy.legs[1].rotation.x=-enemy.legs[0].rotation.x;p.rotation.y=-.25;}
   p.position.y=.08;
  }
  if(!reduced)torch.forEach((flame,i)=>{flame.scale.y=1+Math.sin(now*8+i)*.19;flame.rotation.y=now;});
  renderer.render(scene,camera);
 }
 raf=requestAnimationFrame(frame);
 return {sync,action,enemyTurn,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const entry of actors.values()){scene.remove(entry.pivot);disposeActor(entry);}const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
