/** Playable 2.5D scene rules. Profile bonuses are snapshotted at the start of a run. */
export const PARTY=['seraphine','nyxara','lysael','voren'];
export const WALK_AREAS=[[-7,7,7,17],[-2.5,2.5,-3,8],[-8,8,-12,-2],[-2.8,2.8,-17,-11],[-8,8,-27,-16]];
export const OBSTACLES=[{x:-4,z:11,w:1.6,d:1.6},{x:4,z:10,w:1.6,d:1.6},{x:-4,z:-6,w:1.7,d:1.7},{x:4,z:-8,w:1.7,d:1.7},{x:-4.8,z:-21,w:1.5,d:1.5},{x:4.8,z:-21,w:1.5,d:1.5}];
export const TORCH_SPOTS=[[-5,14],[5,14],[-2.6,6],[2.6,6],[-2.8,-3],[2.8,-3],[-6,-9],[6,-9],[-3,-16],[3,-16],[-6,-24],[6,-24]];
export const COLLIDERS=[...OBSTACLES,...[-1,1].flatMap(s=>[{x:s*2.5,z:6.1,w:1.25,d:1.25},{x:s*2.7,z:-12.5,w:1.25,d:1.25},{x:s*2.9,z:-26.3,w:1.25,d:1.25},{x:s*6,z:-11,w:3.8,d:1.25}]),...TORCH_SPOTS.map(([x,z])=>({x,z,w:.35,d:.35}))];
export const KITS={
 seraphine:{name:'Séraphine',hp:1100,range:3.2,basic:150,color:'#ed6d89',skills:['Floraison · dégâts','Pas de ronce · protection','Étreinte · immobilise'],ultimate:'Requiem des roses'},
 nyxara:{name:'Nyxara',hp:1050,range:6,basic:125,color:'#b68aff',skills:['Orbe · dégâts','Drain · vol de vie','Éclipse · interrompt'],ultimate:'Retour au silence'},
 lysael:{name:'Lysael',hp:1200,range:6,basic:100,color:'#e4d49a',skills:['Racines · dégâts','Harmonie · soin d’équipe','Sanctuaire · boucliers'],ultimate:'Chant des Mondes'},
 voren:{name:'Voren',hp:1500,range:3.5,basic:170,color:'#ffa365',skills:['Cendres · dégâts','Rempart · bouclier','Fracture · étourdit'],ultimate:'L’Empire renaît'}
};
export const ACTION_COOLDOWNS=[.68,5,8,10,15,2.4];
export const ENCOUNTERS=[
 {name:'Sentinelles de l’entrée',role:'Trois sentinelles',hp:310,positions:[[-1,9],[1,8.6],[0,7.3]],rule:'Approchent le groupe, annoncent leur frappe au sol puis récupèrent.'},
 {name:'Veilleurs des vestiges',role:'Trois veilleurs',hp:460,positions:[[-2,-5],[2,-6],[0,-9]],rule:'Défendent le passage vers la source de soin et la dernière arène.'},
 {name:'Gardien du Seuil',role:'Boss final',hp:3000,positions:[[0,-22]],rule:'Annonce une large frappe ; sa zone d’impact s’agrandit sous 50 % de vie.'}
];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z,r=.32){return WALK_AREAS.some(([a,b,c,d])=>x>=a+r&&x<=b-r&&z>=c+r&&z<=d-r)&&!COLLIDERS.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
// Search a small deterministic navigation grid; no diagonal corner cutting.
export function findPath(from,to,allowed=walkable){
 const cell=.5,key=(x,z)=>`${x},${z}`,sx=Math.round(from.x/cell),sz=Math.round(from.z/cell),tx=Math.round(to.x/cell),tz=Math.round(to.z/cell);
 if(!allowed(tx*cell,tz*cell))return [];
 const queue=[[sx,sz]],seen=new Map([[key(sx,sz),null]]);let end=null;
 for(let n=0;n<queue.length&&n<4500;n++){const [x,z]=queue[n],k=key(x,z);if(x===tx&&z===tz){end=k;break;}for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(seen.has(nk)||!allowed(nx*cell,nz*cell))continue;seen.set(nk,k);queue.push([nx,nz]);}}
 if(!end)return [];const path=[];while(seen.get(end)!==null){const [x,z]=end.split(',').map(Number);path.push({x:x*cell,z:z*cell});end=seen.get(end);}return path.reverse();
}
const baseBonus={attack:1,health:1,healing:1,shield:1,cooldown:1,energy:0,ultimate:1};
export function createRuins(bonuses={}){
 const enemies=[];for(const [wave,encounter]of ENCOUNTERS.entries())for(const [x,z]of encounter.positions){const boss=wave===2,hp=encounter.hp;enemies.push({id:enemies.length,wave,x,z,hp,maxHp:hp,boss,phase:'idle',timer:1.1,stun:0,deadAt:0,heading:0});}
 return {time:0,status:'ready',paused:false,selected:0,stage:0,cleared:[],rested:false,events:[],path:[],combo:0,kills:0,dodges:0,party:PARTY.map((id,i)=>{const bonus={...baseBonus,...bonuses[id]},maxHp=Math.round(KITS[id].hp*bonus.health);return {id,x:(i%2)*1.4-.7,z:14+Math.floor(i/2)*1.2,hp:maxHp,maxHp,bonus,energy:35,shield:0,cooldowns:[0,0,0,0,0,0],clip:'idle',clipAt:0,heading:Math.PI,invulnerable:0,pending:null,auto:1+i*.3};}),enemies};
}
export function canWalk(s,x,z){if(!walkable(x,z))return false;for(const [stage,zg]of [[0,5.8],[1,-12.4]])if(!s.cleared.includes(stage)&&Math.abs(z-zg)<.5)return false;return true;}
function emit(s,type,props={}){s.eventId=(s.eventId??0)+1;s.events.push({type,seq:s.eventId,at:s.time,...props});if(s.events.length>80)s.events.shift();}
function animate(s,h,clip){h.clip=clip;h.clipAt=s.time;}
function move(s,h,dx,dz){const before={x:h.x,z:h.z};if(canWalk(s,h.x+dx,h.z))h.x+=dx;if(canWalk(s,h.x,h.z+dz))h.z+=dz;return distance(before,h)>.001;}
function target(s,h,range=Infinity){return s.enemies.filter(e=>e.hp>0&&e.wave===s.stage&&distance(e,h)<=range).sort((a,b)=>distance(a,h)-distance(b,h))[0];}
export function selectHero(s,i){if(i<0||i>3||s.party[i].hp<=0)return false;s.selected=i;s.path=[];return true;}
export function command(s,action,dir={x:0,z:-1}){
 if(s.status!=='playing'||s.paused)return false;const h=s.party[s.selected],kit=KITS[h.id];if(h.hp<=0||h.pending)return false;
 const slot={basic:0,skill1:1,skill2:2,skill3:3,ultimate:4,dodge:5}[action];if(slot===undefined||h.cooldowns[slot]>0)return false;
 if(action==='ultimate'&&h.energy<100)return false;
 if(action==='dodge'){const len=Math.hypot(dir.x,dir.z)||1;h.dash={x:dir.x/len,z:dir.z/len,left:.32};h.invulnerable=.4;h.cooldowns[5]=2.4;animate(s,h,'dodgeForward');s.path=[];s.dodges++;return true;}
 const e=target(s,h,action==='basic'?kit.range:7);const support=(action==='skill2'&&h.id!=='nyxara')||(h.id==='lysael'&&['skill3','ultimate'].includes(action));
 if(!e&&!support){emit(s,'notice',{text:'Rapprochez-vous d’un ennemi.'});return false;}
 if(e)h.heading=Math.atan2(e.x-h.x,e.z-h.z);
 if(action==='ultimate')h.energy=0;
 h.cooldowns[slot]=ACTION_COOLDOWNS[slot]*(slot===5?1:h.bonus.cooldown);
 h.pending={action,targetId:e?.id,at:s.time+(action==='ultimate'?.85:.25)};
 animate(s,h,action==='basic'?`attack${s.combo++%3+1}`:action==='ultimate'?'ultimateStart':`skill${slot}Start`);return true;
}
function damageEnemy(s,e,amount,hero,ultimate=false){if(e.hp<=0)return;amount=Math.round(amount*hero.bonus.attack*(ultimate?hero.bonus.ultimate:1));e.hp=Math.max(0,e.hp-amount);emit(s,'damage',{x:e.x,z:e.z,amount,color:KITS[hero.id].color});if(e.hp===0){e.phase='dead';e.deadAt=s.time;s.kills++;emit(s,'kill',{x:e.x,z:e.z});}}
function resolve(s,h,p){
 const kit=KITS[h.id],e=s.enemies.find(e=>e.id===p.targetId),near=s.enemies.filter(e=>e.hp>0&&e.wave===s.stage&&distance(e,h)<7),act=p.action;
 if(act==='companion'){if(e?.hp>0&&distance(e,h)<=kit.range+.6){damageEnemy(s,e,38,h);h.energy=Math.min(100,h.energy+5+h.bonus.energy);emit(s,'strike',{x:h.x,z:h.z,tx:e.x,tz:e.z,color:kit.color,ranged:kit.range>4});}return;}
 if(act==='basic'){if(e?.hp>0&&distance(e,h)<=kit.range+.8){damageEnemy(s,e,kit.basic,h);h.energy=Math.min(100,h.energy+14+h.bonus.energy);emit(s,'strike',{x:h.x,z:h.z,tx:e.x,tz:e.z,color:kit.color,ranged:kit.range>4});}return;}
 animate(s,h,act==='ultimate'?'ultimateCast':`skill${act.at(-1)}Cast`);emit(s,'spell',{x:h.x,z:h.z,color:kit.color,big:act==='ultimate'});
 if(act==='skill1'){for(const foe of near)damageEnemy(s,foe,220,h);h.energy=Math.min(100,h.energy+20+h.bonus.energy);}
 if(act==='skill2'){
  if(h.id==='lysael'){for(const ally of s.party)if(ally.hp>0)ally.hp=Math.min(ally.maxHp,ally.hp+Math.round(240*h.bonus.healing));}
  else if(h.id==='nyxara'){if(e?.hp>0){damageEnemy(s,e,260,h);h.hp=Math.min(h.maxHp,h.hp+Math.round(210*h.bonus.healing));}}
  else {h.shield=Math.min(900,h.shield+Math.round(360*h.bonus.shield));if(h.id==='seraphine')h.invulnerable=1.8;}
  h.energy=Math.min(100,h.energy+15+h.bonus.energy);
 }
 if(act==='skill3'){if(h.id==='lysael'){for(const ally of s.party)if(ally.hp>0)ally.shield=Math.min(750,ally.shield+Math.round(200*h.bonus.shield));}else for(const foe of near){damageEnemy(s,foe,190,h);foe.stun=2.5;foe.phase='idle';foe.timer=1.3;}h.energy=Math.min(100,h.energy+18+h.bonus.energy);}
 if(act==='ultimate'){if(h.id==='lysael'){for(const ally of s.party)if(ally.hp>0){ally.hp=Math.min(ally.maxHp,ally.hp+Math.round(500*h.bonus.healing*h.bonus.ultimate));ally.shield=Math.min(900,ally.shield+Math.round(250*h.bonus.shield*h.bonus.ultimate));}}else{for(const foe of near)damageEnemy(s,foe,780,h,true);if(h.id==='voren')h.shield=Math.min(900,Math.round(500*h.bonus.shield));if(h.id==='nyxara')h.hp=Math.min(h.maxHp,h.hp+Math.round(330*h.bonus.healing));}}
}
export function interact(s){if(s.status!=='playing'||s.paused||!s.cleared.includes(1)||s.rested)return false;const h=s.party[s.selected];if(distance(h,{x:3,z:-10})>2.6)return false;s.rested=true;for(const a of s.party){a.hp=a.maxHp;a.energy=Math.min(100,a.energy+25);}emit(s,'rest',{x:3,z:-10});return true;}
export function objective(s){if(s.status==='won')return 'Le Gardien est vaincu. Le passage est ouvert.';if(s.status==='lost')return 'Le groupe est tombé. Reprenez la traversée.';if(!s.cleared.includes(0))return 'Éliminez les trois Sentinelles de l’entrée.';if(!s.cleared.includes(1))return 'Traversez le pont et libérez les ruines.';if(!s.cleared.includes(2))return 'Rejoignez l’arène et terrassez le Gardien.';return 'Victoire';}
export function stepRuins(s,seconds,input={x:0,z:0}){
 if(s.status!=='playing'||s.paused)return;let remaining=Math.min(.25,Math.max(0,seconds));while(remaining>1e-7){const dt=Math.min(1/60,remaining);tick(s,dt,input);remaining-=dt;}
}
function tick(s,dt,input){
 if(s.status!=='playing')return;s.time+=dt;const lead=s.party[s.selected];
 if(s.cleared.includes(0)&&lead.z<-2)s.stage=Math.max(s.stage,1);if(s.cleared.includes(1)&&lead.z<-17)s.stage=2;
 for(const [i,h]of s.party.entries()){
  h.cooldowns=h.cooldowns.map(c=>Math.max(0,c-dt));h.invulnerable=Math.max(0,h.invulnerable-dt);if(h.hp<=0)continue;
  if(h.pending&&s.time>=h.pending.at){resolve(s,h,h.pending);h.pending=null;}
  let dx=0,dz=0,speed=3.5;
  if(h.dash){dx=h.dash.x;dz=h.dash.z;speed=10;h.dash.left-=dt;if(h.dash.left<=0)h.dash=null;}
  else if(i===s.selected){dx=input.x;dz=input.z;if(dx||dz)s.path=[];else if(s.path.length){const p=s.path[0];if(distance(h,p)<.18)s.path.shift();else{dx=p.x-h.x;dz=p.z-h.z;}}}
  else {const offset=[[-1.1,.9],[1.1,.9],[0,2.1],[1.2,1.8]][i],foe=target(s,h,8),engage=foe&&!lead.moving&&distance(lead,foe)<7&&distance(h,foe)>KITS[h.id].range-.4,goal=engage?foe:{x:lead.x+offset[0],z:lead.z+offset[1]};if(engage||distance(h,lead)>2){h.navTime=(h.navTime??0)-dt;if(!h.nav?.length||h.navTime<=0){h.nav=findPath(h,walkable(goal.x,goal.z)?goal:lead,(x,z)=>canWalk(s,x,z));h.navTime=.9;}const p=h.nav?.[0];if(p){if(distance(h,p)<.2)h.nav.shift();else{dx=p.x-h.x;dz=p.z-h.z;}}speed=distance(h,lead)>6?4.4:3.9;}}
  const len=Math.hypot(dx,dz);if(len>.01){dx/=len;dz/=len;h.moving=move(s,h,dx*speed*dt,dz*speed*dt);if(!h.pending)h.heading=Math.atan2(dx,dz);}else h.moving=false;
  if(s.time-h.clipAt>1.5&&!h.pending)h.clip=h.moving?'run':'idle';
  if(i!==s.selected&&!h.pending){h.auto-=dt;const e=target(s,h,KITS[h.id].range);if(e&&h.auto<=0){h.auto=1.7;h.heading=Math.atan2(e.x-h.x,e.z-h.z);animate(s,h,'attack1');h.pending={action:'companion',targetId:e.id,at:s.time+.25};}}
 }
 for(const e of s.enemies){
  if(e.hp<=0||e.wave!==s.stage)continue;e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;e.timer-=dt;
  const alive=s.party.filter(h=>h.hp>0);if(!alive.length)break;const h=alive.sort((a,b)=>distance(a,e)-distance(b,e))[0];e.heading=Math.atan2(h.x-e.x,h.z-e.z);
  if(e.phase==='idle'){
   if(distance(e,h)>2.8){const d=distance(e,h),v=(e.boss?1.05:1.65)*dt;move(s,e,(h.x-e.x)/d*v,(h.z-e.z)/d*v);}
   if(e.timer<=0&&distance(e,h)<(e.boss?8:3.2)){e.phase='tell';e.timer=e.boss?1.5:1.15;e.aim={x:h.x,z:h.z};e.radius=e.boss?(e.hp<e.maxHp/2?3.1:2.5):1.55;emit(s,'warning',{x:e.aim.x,z:e.aim.z});}
  }else if(e.phase==='tell'&&e.timer<=0){
   e.phase='recover';e.timer=e.boss?1.8:2;emit(s,'slam',{x:e.aim.x,z:e.aim.z,big:e.boss});
   for(const a of alive)if(distance(a,e.aim)<e.radius&&a.invulnerable<=0){let hit=e.boss?240:115;const absorbed=Math.min(a.shield,hit);a.shield-=absorbed;hit-=absorbed;a.hp=Math.max(0,a.hp-hit);emit(s,'hurt',{x:a.x,z:a.z,amount:hit});if(!a.pending)animate(s,a,a.hp>0?'hitLight':'death');if(a.hp===0){a.pending=null;animate(s,a,'death');}}
  }else if(e.phase==='recover'&&e.timer<=0){e.phase='idle';e.timer=.8;}
 }
 if(!s.enemies.some(e=>e.wave===s.stage&&e.hp>0)&&!s.cleared.includes(s.stage)){s.cleared.push(s.stage);emit(s,'clear',{stage:s.stage});if(s.stage===2){s.status='won';for(const h of s.party)if(h.hp>0)animate(s,h,'victory');}}
 if(lead.hp<=0){const i=s.party.findIndex(h=>h.hp>0);if(i<0){s.status='lost';s.path=[];}else selectHero(s,i);}
}
