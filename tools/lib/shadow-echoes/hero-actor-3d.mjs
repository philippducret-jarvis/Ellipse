import * as T from './vendor/three.module.js';
import {createHeroModel} from './hero-model-3d.mjs';
import {sampleHeroPose,mixPoses,resolvedMotion,MOTIONS} from './hero-motion-3d.mjs';
export class HeroActor3D{
 constructor(host,id,{onFallback=()=>{},interactive=false,facing=0}={}){
  this.host=host;this.id=id;this.disposed=false;this.lost=false;this.lastPose=null;this.turn=facing;this.onFallback=onFallback;this.clock=0;
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.canvas=this.renderer.domElement;this.canvas.className='hero-volume';this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label',`${id} · personnage articulé en trois dimensions`);this.canvas.dataset.hero=id;this.canvas.dataset.renderer='volume-3d';
  this.scene=new T.Scene();this.scene.add(new T.HemisphereLight('#e5dff3','#343044',1.35));
  const key=new T.DirectionalLight('#fff0df',2.7);key.position.set(2.5,4,4);this.scene.add(key);const rim=new T.DirectionalLight('#afb8ff',2.2);rim.position.set(-3,2,-2);this.scene.add(rim);const fill=new T.DirectionalLight('#f7c9c0',.5);fill.position.set(-2,1,4);this.scene.add(fill);
  this.model=createHeroModel(id);this.pivot=new T.Group();this.pivot.add(this.model.root);this.scene.add(this.pivot);this.camera=new T.PerspectiveCamera(28,1,.1,30);this.camera.position.set(0,1.48,5.8);this.camera.lookAt(0,1.18,0);
  this.abort=new AbortController();const {signal}=this.abort;
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;onFallback(true);},{signal});this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;onFallback(false);this.draw(this.lastClip??'idle',this.lastTime??0);},{signal});
  if(interactive){let drag=null;this.canvas.tabIndex=0;this.canvas.title='Glissez pour tourner le personnage · flèches gauche/droite au clavier';this.canvas.addEventListener('pointerdown',e=>{drag=e.clientX;this.canvas.setPointerCapture(e.pointerId);},{signal});this.canvas.addEventListener('pointermove',e=>{if(drag!==null){this.turn+=(e.clientX-drag)*.009;drag=e.clientX;}},{signal});for(const event of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(event,()=>{drag=null;},{signal});this.canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.turn+=e.key==='ArrowLeft'?-.18:.18;}},{signal});}
  this.canvas.style.touchAction=interactive?'pan-y':'auto';host.append(this.canvas);host.dataset.renderer='volume-3d';this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.draw('idle',0);
 }
 resize(){if(this.disposed)return;const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;const fov=28*Math.PI/180;const distance=Math.max(5.45,1.18/(Math.tan(fov/2)*this.camera.aspect));this.camera.position.set(0,1.46,distance);this.camera.updateProjectionMatrix();if(this.lastClip)this.draw(this.lastClip,this.lastTime);}
 draw(clip,time,strength=1,options={}){
  if(this.disposed||this.lost)return;const name=resolvedMotion(clip),safeTime=Number.isFinite(time)?Math.max(0,time):0,changed=clip!==this.lastClip,dt=changed?0:Math.max(0,Math.min(.1,safeTime-(this.lastTime??safeTime)));
  this.clock+=dt;let pose=sampleHeroPose(this.id,name,safeTime);
  if(changed){this.fromPose=this.lastPose;this.blendTime=0;}else this.blendTime+=dt;
  if(name!=='neutral'&&this.fromPose&&this.blendTime<.16)pose=mixPoses(this.fromPose,pose,this.blendTime/.16);
  if(options.locomotion&&name!=='neutral'){const legs=sampleHeroPose(this.id,options.locomotion,options.locomotionTime??safeTime);for(const joint of ['thighL','thighR','shinL','shinR','footL','footR'])pose.joints[joint]=legs.joints[joint];pose.offset[1]+=legs.offset[1];}this.canvas.dataset.locomotion=options.locomotion??'';
  this.model.apply(pose,name==='neutral'?0:this.clock);this.lastPose=pose;this.pivot.rotation.y=this.turn;this.lastClip=clip;this.lastTime=safeTime;this.canvas.dataset.clip=clip;this.canvas.dataset.motion=name;this.canvas.dataset.joints=String(Object.keys(this.model.bones).length);this.renderer.render(this.scene,this.camera);
 }
 destroy(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.resizeObserver.disconnect();this.model.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();}
}
export async function loadVolumeActor(host,id,options){return new HeroActor3D(host,id,options);}
/** Sheet, hub and invocation all use the same skeletal model and lifecycle. */
export function mountLivingPortrait(host,id,{motion=()=>true,interactive=true}={}){
 let actor,disposed=false,raf,elapsed=0,last=performance.now(),selectedClip=null,selectedTime=0;
 const note=document.createElement('span');note.className='volume-loading';note.textContent='Le Mythique prend forme…';host.append(note);
 loadVolumeActor(host,id,{interactive,onFallback:lost=>{note.hidden=!lost;note.textContent='Le rendu 3D est momentanément indisponible.';}}).then(a=>{
  if(disposed){a.destroy();return;}actor=a;note.hidden=true;
  if(host.classList.contains('sheet-portrait')){const controls=document.createElement('div');controls.className='portrait-motion-controls';controls.innerHTML='<button type="button" data-pose="select">Saluer</button><button type="button" data-pose="attack1">Attaque</button><button type="button" data-pose="skill1Cast">Pouvoir</button><button type="button" data-pose="victory">Victoire</button><a href="./motion-3d.html">Tous les mouvements ↗</a>';host.append(controls);controls.addEventListener('click',e=>{const name=e.target.closest('[data-pose]')?.dataset.pose;if(name){selectedClip=name;selectedTime=elapsed;}});}
  function frame(now){if(disposed)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!document.hidden){if(motion())elapsed+=dt;let name='idle',t=elapsed;if(selectedClip){t=elapsed-selectedTime;name=selectedClip;if(t>=MOTIONS[name].duration){selectedClip=null;name='idle';t=elapsed;}}else if(elapsed<2){name=host.classList.contains('ritual-actor')?'summon':'select';}else if(Math.floor(elapsed/9)%3===1){name='idleLook';t=elapsed%9;}actor.draw(motion()?name:'neutral',motion()?t:0);}raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
 }).catch(()=>{note.textContent='Le rendu 3D nécessite WebGL 2. Rechargez la page ou utilisez un navigateur compatible.';host.dataset.renderer='unavailable';});
 return()=>{disposed=true;cancelAnimationFrame(raf);actor?.destroy();host.querySelector('.portrait-motion-controls')?.remove();note.remove();};
}
