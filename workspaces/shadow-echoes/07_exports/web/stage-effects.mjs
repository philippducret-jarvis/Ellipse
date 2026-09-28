import {HEROES} from './heroes.mjs';
import {ENEMIES} from './edition-data.mjs';
export const ENEMY_ATLAS='../../03_assets/enemies/guardians-v2.png';
const TAU=Math.PI*2,clamp=x=>Math.min(1,Math.max(0,x));
export function actionPose(kind,time){const duration={attack:.85,skill:1.25,ultimate:1.65,hit:.55,guard:.8,defeat:1.2}[kind]??4,p=clamp(time/duration),pulse=Math.sin(p*Math.PI)**2;
 return {progress:p,lunge:['attack','skill','ultimate'].includes(kind)?Math.sin(Math.max(0,(p-.14)/.86)*Math.PI)**2*({attack:14,skill:20,ultimate:32}[kind]):kind==='hit'?-10*pulse:0,lift:kind==='ultimate'?-9*pulse:kind==='skill'?-3*pulse:0};}
export function createBattleStage(arena){
 const canvas=document.createElement('canvas');canvas.className='battle-stage';canvas.setAttribute('aria-hidden','true');arena.append(canvas);const ctx=canvas.getContext('2d');let image=null,lastEvent=0,casts=[],enemyHit=-10,enemyAttack=-10,phase=-1,deathAt=null;const source=new Image();source.src=ENEMY_ATLAS;source.decode().then(()=>image=source).catch(()=>{});
 function circle(x,y,r,color,alpha=1){ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r,r*.28,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
 function draw(state,time,enabled){
  const r=arena.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(w/1000,0,0,h/500,0,0);ctx.clearRect(0,0,1000,500);
  if(state.eventId<lastEvent)lastEvent=0;
  if(phase!==state.phase){phase=state.phase;casts=[];enemyHit=-10;enemyAttack=-10;deathAt=null;}
  for(const e of state.events){if(e.id<=lastEvent)continue;lastEvent=e.id;if(e.type==='cast'){casts.push({...e,kind:HEROES.find(h=>h.id===e.heroId).skills.findIndex(s=>s.id===e.skillId)});if(e.dealt)enemyHit=e.time+.24;}if(e.type==='hit')enemyAttack=e.time;}
  casts=casts.filter(e=>time-e.time<2);const meta=ENEMIES[state.phase],dead=state.target.hp<=0,charge=state.warning?clamp((time-state.warning.startedAt)/(state.warning.impactAt-state.warning.startedAt)):0;
  if(!dead)deathAt=null;else deathAt??=time;const death=dead?(enabled?clamp((time-deathAt)/.85):1):0;
  const hit=enabled?Math.max(0,1-(time-enemyHit)/.3):0,attack=enabled?Math.max(0,Math.sin(clamp((time-enemyAttack)/.65)*Math.PI)):0,bob=enabled?Math.sin(time*2.4)*(state.phase===1?5:1.5):0;
  const size=[480,390,460][phase],aspect=r.height/r.width*2,ex=815-attack*72+Math.max(0,hit)*4,ey=407-size*.4+bob;
  ctx.fillStyle='#02010899';ctx.beginPath();ctx.ellipse(ex,406,100,20,0,0,TAU);ctx.fill();circle(ex,402,85+charge*20,meta.color,.5+charge*.4);
  if(image){const cw=image.width/3,ch=image.height;ctx.save();ctx.translate(ex,ey+death*25);ctx.globalAlpha=1-death*.85;ctx.rotate(dead?death*.3:attack*-.06);ctx.scale(1-death*.12,1);if(hit>0&&time>=enemyHit)ctx.filter=`brightness(${1+hit*.3})`;for(let row=0;row<24;row++){const strip=ch/24,shift=enabled?Math.sin(time*2.4+row*.25)*Math.max(0,row-9)*.08:0;ctx.drawImage(image,phase*cw,row*strip,cw,strip,-size*aspect/2+shift,-size/2+row*size/24,size*aspect,size/24+.25);}ctx.restore();arena.dataset.enemyArt='ready';}
  else arena.dataset.enemyArt='loading';
  if(enabled&&!dead){for(let i=0;i<22;i++){const p=(time*(.15+(i%3)*.04)+i/22)%1,x=ex+Math.sin(i*12.3+time*.5)*(45+charge*55),y=407-p*180;ctx.globalAlpha=(1-p)*(.25+charge*.65);ctx.fillStyle=meta.color;ctx.beginPath();ctx.arc(x,y,1+i%3,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
  if(charge){circle(ex,402,100+charge*50,meta.color,charge);ctx.fillStyle=meta.color;ctx.globalAlpha=.1*charge;ctx.beginPath();ctx.ellipse(ex,402,100+charge*50,35,0,0,TAU);ctx.fill();ctx.globalAlpha=1;}
  for(let i=0;i<4;i++){const hero=HEROES[i],x=125+i*145;circle(x,415,40,hero.accent,.35);if(enabled&&state.heroes[hero.id].hp>0)for(let j=0;j<5;j++){const a=time*.55+j*TAU/5;ctx.fillStyle=hero.accent;ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(x+Math.cos(a)*35,414+Math.sin(a)*8,1.5,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
  if(!enabled)return;
  for(const e of casts){const hero=HEROES.find(h=>h.id===e.heroId),i=HEROES.indexOf(hero),age=time-e.time,duration=e.kind===2?1.65:e.kind===1?1.25:.85,p=clamp(age/duration);if(age<0||p>=1)continue;const x=125+i*145,y=320,color=hero.accent;
   ctx.save();ctx.globalAlpha=Math.sin(p*Math.PI);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=e.kind===2?24:12;
   if(hero.id==='lysael'){for(let j=0;j<4;j++){const hx=125+j*145;circle(hx,410,25+p*(e.kind===2?75:35),color,Math.sin(p*Math.PI));ctx.fillStyle=color;for(let k=0;k<6;k++){ctx.beginPath();ctx.ellipse(hx+Math.sin(k*3+p*3)*24,395-p*120+k*8,3,7,p*3,0,TAU);ctx.fill();}}}
   else if(hero.id==='nyxara'){const px=x+(ex-x)*clamp(p*2),py=y-Math.sin(p*Math.PI)*65;ctx.beginPath();ctx.arc(px,py,8+e.kind*7,0,TAU);ctx.fill();for(let k=0;k<10;k++){const a=p*8+k*TAU/10;ctx.beginPath();ctx.arc(px+Math.cos(a)*(18+e.kind*10),py+Math.sin(a)*(18+e.kind*10),2+k%3,0,TAU);ctx.fill();}}
   else {ctx.lineWidth=3+e.kind*4;ctx.beginPath();const ax=x+(ex-x)*clamp(p*2.3);ctx.ellipse(ax,320,35+e.kind*22,65+e.kind*17,-.7+Math.sin(p*Math.PI)*1.6,-1.4,1.8);ctx.stroke();for(let k=0;k<12+e.kind*12;k++){const spread=p*(35+e.kind*40),angle=k*2.399;ctx.beginPath();ctx.ellipse(ax+Math.cos(angle)*spread,320+Math.sin(angle)*spread,hero.id==='seraphine'?3:2,hero.id==='seraphine'?6:4,angle+p*4,0,TAU);ctx.fill();}}
   if(e.kind===2){circle(ex,405,40+p*170,color,1-p);ctx.globalAlpha=(1-p)*.14;ctx.fillRect(0,0,1000,500);}
   ctx.restore();
  }
 }
 return {draw,destroy(){canvas.remove();}};
}
