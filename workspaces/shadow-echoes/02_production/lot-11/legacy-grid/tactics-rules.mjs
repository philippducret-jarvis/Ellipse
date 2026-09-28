// Isolated campaign experiment. No Citadel currency is awarded by this ruleset.
export const WIDTH=7,LANES=3;
export const HEROES={
 seraphine:{name:'Séraphine',role:'Percée',hp:520,basic:85,range:1,skills:['Floraison','Pas de ronce','Étreinte'],super:'Requiem des roses',color:'#eb667f'},
 nyxara:{name:'Nyxara',role:'Contrôle',hp:450,basic:70,range:4,skills:['Orbe du néant','Drain','Éclipse'],super:'Retour au silence',color:'#b987ef'},
 lysael:{name:'Lysael',role:'Soutien',hp:490,basic:60,range:3,skills:['Racines','Harmonie','Sanctuaire'],super:'Chant des mondes',color:'#e8d397'},
 voren:{name:'Voren',role:'Rempart',hp:650,basic:90,range:1,skills:['Cendres','Rempart','Fracture'],super:'Empire des cendres',color:'#ef966c'}
};
const STAGES=[
 [{id:'entry',kind:'battle',name:'Porte des ruines',risk:'Combat',hint:'Première rencontre'}],
 [{id:'gallery',kind:'battle',name:'Galerie effondrée',risk:'Combat',hint:'Matériaux de renfort'},{id:'veil',kind:'mystery',name:'Voile murmurant',risk:'Mystère',hint:'Événement incertain'}],
 [{id:'bridge',kind:'battle',name:'Pont des serments',risk:'Combat',hint:'Accès direct'},{id:'reliquary',kind:'relic',name:'Reliquaire scellé',risk:'Relique',hint:'Détour sans combat'}],
 [{id:'midboss',kind:'midboss',name:'Veilleur des ruines',risk:'Demi-boss',hint:'Rencontre garantie'}],
 [{id:'sanctuary',kind:'rest',name:'Sanctuaire oublié',risk:'Repos',hint:'Soin du groupe'},{id:'whisper',kind:'mystery',name:'Chambre des échos',risk:'Mystère',hint:'Événement incertain'}],
 [{id:'bastion',kind:'battle',name:'Bastion des cendres',risk:'Combat',hint:'Voie plus sûre'},{id:'challenge',kind:'elite',name:'Sceau de l’épreuve',risk:'Élite',hint:'Danger et puissance accrus'}],
 [{id:'boss',kind:'boss',name:'Le trône brisé',risk:'Boss final',hint:'Affrontement garanti'}]
];
const tile=(x,lane)=>`${x},${lane}`;
const inBounds=(x,lane)=>Number.isInteger(x)&&Number.isInteger(lane)&&x>=0&&x<WIDTH&&lane>=0&&lane<LANES;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.lane-b.lane);
const hash=(seed,text)=>{let h=seed>>>0;for(const char of text)h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;return h/4294967296;};
const optionsFor=depth=>(STAGES[depth]??[]).map(option=>({...option}));
export function createTacticalRun(seed=Date.now()>>>0){return {version:1,seed:seed>>>0,phase:'route',depth:0,options:optionsFor(0),route:[],omens:1,boon:0,roster:Object.entries(HEROES).map(([id,kit],i)=>({id,hp:kit.hp,maxHp:kit.hp,energy:25,x:i===1?0:1,lane:i===2?2:i===3?0:1,ap:2,shield:0})),battle:null,event:null,log:['L’expédition commence.']};}
function enemiesFor(kind){
 if(kind==='boss')return [{id:'malgrave',name:'Malgrave',hp:1350,maxHp:1350,damage:90,x:5,lane:1,range:2,boss:true},{id:'cinder-a',name:'Cendre',hp:230,maxHp:230,damage:42,x:4,lane:0,range:1},{id:'cinder-b',name:'Cendre',hp:230,maxHp:230,damage:42,x:4,lane:2,range:1}];
 if(kind==='midboss')return [{id:'watcher',name:'Veilleur',hp:790,maxHp:790,damage:72,x:5,lane:1,range:2,boss:true},{id:'sentry',name:'Sentinelle',hp:210,maxHp:210,damage:38,x:4,lane:0,range:1}];
 if(kind==='elite')return [{id:'elite',name:'Prélat cendré',hp:680,maxHp:680,damage:70,x:5,lane:1,range:2,boss:true},{id:'guard',name:'Garde',hp:240,maxHp:240,damage:42,x:4,lane:2,range:1}];
 return [{id:'sentry-a',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:4,lane:0,range:1},{id:'sentry-b',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:5,lane:1,range:1},{id:'sentry-c',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:4,lane:2,range:1}];
}
function living(units){return units.filter(unit=>unit.hp>0);}
function occupied(battle,x,lane,exceptId){return [...living(battle.heroes),...living(battle.enemies)].some(unit=>unit.id!==exceptId&&unit.x===x&&unit.lane===lane);}
function clearLine(battle,a,b){if(a.lane!==b.lane)return true;for(let x=Math.min(a.x,b.x)+1;x<Math.max(a.x,b.x);x++)if(occupied(battle,x,a.lane))return false;return true;}
function refreshIntents(battle){for(const enemy of living(battle.enemies)){const target=[...living(battle.heroes)].sort((a,b)=>distance(a,enemy)-distance(b,enemy)||a.hp-b.hp)[0];if(!target){enemy.intent=null;continue;}enemy.intent={kind:distance(target,enemy)<=enemy.range?'strike':'approach',x:target.x,lane:target.lane,targetId:target.id,damage:enemy.damage};}}
function startBattle(run,kind){const battle={kind,round:1,heroes:run.roster.map(hero=>({...hero,ap:hero.hp>0?2:0})),enemies:enemiesFor(kind),selected:'seraphine',effect:null,log:[]};refreshIntents(battle);run.battle=battle;run.phase='battle';run.log.push(`Combat : ${run.route.at(-1).name}.`);}
export function enterNode(run,id,{useOmen=false}={}){
 if(run.phase!=='route')return {ok:false,reason:'phase'};const option=run.options.find(o=>o.id===id);if(!option)return {ok:false,reason:'route'};
 if(useOmen&&(option.kind!=='mystery'||run.omens<1))return {ok:false,reason:'omen'};
 if(useOmen)run.omens--;run.route.push({id:option.id,name:option.name,kind:option.kind,depth:run.depth});run.depth++;run.options=[];
 if(['battle','midboss','elite','boss'].includes(option.kind))startBattle(run,option.kind);
 else if(option.kind==='rest'){for(const hero of run.roster)if(hero.hp>0)hero.hp=Math.min(hero.maxHp,hero.hp+Math.round(hero.maxHp*.35));run.event={title:'Sanctuaire oublié',text:'Les survivants récupèrent 35 % de leur vie maximale.',special:false};run.phase='event';}
 else if(option.kind==='relic'){run.omens++;run.boon+=.1;run.event={title:'Reliquaire scellé',text:'Un Sceau du Destin et +10 % de puissance pour cette expédition.',special:false};run.phase='event';}
 else {const chance=Math.min(.8,.25+(useOmen?.25:0)),roll=hash(run.seed,`${run.depth}:${id}:event`),special=roll<chance;if(special)run.boon+=.15;else for(const hero of run.roster)if(hero.hp>0)hero.hp=Math.min(hero.maxHp,hero.hp+35);run.event={title:special?'Une étoile sous les ruines':'Échos fugitifs',text:special?'Événement spécial : +15 % de puissance jusqu’au boss.':'Aucun événement rare. Chaque survivant récupère 35 PV.',chance,roll,special};run.phase='event';}
 return {ok:true,node:option};
}
export function continueRoute(run){if(!['event','victory'].includes(run.phase))return false;run.event=null;run.battle=null;if(run.depth>=STAGES.length){run.phase='won';run.options=[];}else{run.phase='route';run.options=optionsFor(run.depth);}return true;}
export function selectHero(run,id){if(run.phase!=='battle'||!run.battle.heroes.some(h=>h.id===id&&h.hp>0))return false;run.battle.selected=id;return true;}
export function reachableTiles(run,id){if(run.phase!=='battle')return [];const battle=run.battle,hero=battle.heroes.find(h=>h.id===id&&h.hp>0);if(!hero||hero.ap<1)return [];const queue=[{x:hero.x,lane:hero.lane,steps:0}],seen=new Set([tile(hero.x,hero.lane)]),result=[];for(const current of queue){if(current.steps===2)continue;for(const [dx,dl]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=current.x+dx,lane=current.lane+dl,key=tile(x,lane);if(!inBounds(x,lane)||seen.has(key)||occupied(battle,x,lane,hero.id))continue;seen.add(key);const next={x,lane,steps:current.steps+1};queue.push(next);result.push({x,lane});}}return result;}
export function legalTargets(run,id,action){if(run.phase!=='battle')return [];const battle=run.battle,hero=battle.heroes.find(h=>h.id===id&&h.hp>0);if(!hero||!['basic','skill1','skill2','skill3','super'].includes(action))return [];const kit=HEROES[id],cost=action==='basic'?1:2;if(hero.ap<cost||action==='super'&&hero.energy<100)return [];
 if(action==='super'&&['lysael','voren'].includes(id))return [id];
 if(action==='skill2'&&['seraphine','lysael','voren'].includes(id)||action==='skill3'&&id==='lysael')return living(battle.heroes).filter(h=>distance(hero,h)<=3).map(h=>h.id);
 const ranges={seraphine:{skill1:2,skill3:3,super:3},nyxara:{skill1:4,skill2:3,skill3:4,super:5},lysael:{skill1:3},voren:{skill1:2,skill3:1}};
 const range=action==='basic'?kit.range:ranges[id][action]??0;
 return living(battle.enemies).filter(enemy=>distance(hero,enemy)<=range&&(id!=='seraphine'||hero.lane===enemy.lane)&&clearLine(battle,hero,enemy)).map(e=>e.id);
}
function damage(battle,enemy,amount){enemy.hp=Math.max(0,enemy.hp-amount);battle.effect={kind:'strike',target:enemy.id,amount};}
function concludeIfWon(run){const battle=run.battle;if(living(battle.enemies).length)return;run.roster=battle.heroes.map(hero=>({...hero,ap:2}));run.phase='victory';run.log.push(`${run.route.at(-1).name} libéré.`);}
export function moveHero(run,id,x,lane){if(run.phase!=='battle')return {ok:false,reason:'phase'};const hero=run.battle.heroes.find(h=>h.id===id),allowed=reachableTiles(run,id);if(!allowed.some(t=>t.x===x&&t.lane===lane))return {ok:false,reason:'position'};hero.x=x;hero.lane=lane;hero.ap--;run.battle.selected=id;run.battle.effect={kind:'move',target:id};run.battle.log.unshift(`${HEROES[id].name} change de position.`);return {ok:true};}
export function useAction(run,id,action,targetId){if(run.phase!=='battle')return {ok:false,reason:'phase'};const battle=run.battle,hero=battle.heroes.find(h=>h.id===id);if(!hero)return {ok:false,reason:'hero'};const legal=legalTargets(run,id,action);if(!legal.includes(targetId))return {ok:false,reason:'target'};const kit=HEROES[id],power=1+run.boon;hero.ap-=action==='basic'?1:2;battle.selected=id;
 if(action==='basic'){const target=battle.enemies.find(e=>e.id===targetId);damage(battle,target,Math.round(kit.basic*power));hero.energy=Math.min(100,hero.energy+30);battle.log.unshift(`${kit.name} attaque ${target.name}.`);}
 else if(action.startsWith('skill')){
  const index=Number(action.at(-1))-1,skillName=kit.skills[index],support=action==='skill2'&&['seraphine','lysael','voren'].includes(id)||action==='skill3'&&id==='lysael';
  if(support){const target=battle.heroes.find(h=>h.id===targetId);if(id==='lysael'&&action==='skill2'){const amount=Math.round(180*power);target.hp=Math.min(target.maxHp,target.hp+amount);battle.effect={kind:'heal',target:target.id,amount};}else{const amount=Math.round((action==='skill3'?190:150)*power);target.shield+=amount;battle.effect={kind:'shield',target:target.id,amount};}battle.log.unshift(`${kit.name} lance ${skillName} sur ${HEROES[target.id].name}.`);}
  else {const target=battle.enemies.find(e=>e.id===targetId),base={seraphine:[220,0,165],nyxara:[170,135,145],lysael:[115,0,0],voren:[190,0,200]}[id][index];damage(battle,target,Math.round(base*power));if(action==='skill3'&&id!=='lysael')target.stun=1;if(id==='nyxara'&&action==='skill2')hero.hp=Math.min(hero.maxHp,hero.hp+110);battle.log.unshift(`${kit.name} lance ${skillName}.`);}
  hero.energy=Math.min(100,hero.energy+10);
 }
 else if(action==='super'){
  hero.energy=0;
  if(id==='lysael'){for(const ally of living(battle.heroes))ally.hp=Math.min(ally.maxHp,ally.hp+Math.round(230*power));battle.effect={kind:'super',target:id,amount:230};}
  else if(id==='voren'){for(const enemy of living(battle.enemies).filter(e=>distance(hero,e)<=3))damage(battle,enemy,Math.round(260*power));battle.effect={kind:'super',target:id,amount:260};}
  else {const target=battle.enemies.find(e=>e.id===targetId);damage(battle,target,Math.round((id==='seraphine'?360:310)*power));battle.effect={kind:'super',target:target.id,amount:target.hp};}
  battle.log.unshift(`${kit.name} déclenche ${kit.super}.`);
 }
 battle.effect.actor=id;concludeIfWon(run);return {ok:true};
}
export function endTurn(run){if(run.phase!=='battle')return {ok:false,reason:'phase'};const battle=run.battle;for(const enemy of living(battle.enemies)){
  if(enemy.stun){enemy.stun=0;battle.log.unshift(`${enemy.name} est interrompu.`);continue;}
  const intent=enemy.intent;if(!intent)continue;
  if(intent.kind==='strike'){let hits=0;for(const hero of living(battle.heroes)){const radius=enemy.boss?1:0;if(distance(hero,intent)<=radius&&distance(hero,enemy)<=enemy.range){const absorbed=Math.min(hero.shield,enemy.damage);hero.shield-=absorbed;hero.hp=Math.max(0,hero.hp-(enemy.damage-absorbed));hits++;}}battle.log.unshift(hits?`${enemy.name} frappe la zone annoncée.`:`${enemy.name} frappe dans le vide.`);}
  else {const target=living(battle.heroes).find(h=>h.id===intent.targetId);if(target){for(const [x,lane] of [[enemy.x+Math.sign(target.x-enemy.x),enemy.lane],[enemy.x,enemy.lane+Math.sign(target.lane-enemy.lane)]]){if(inBounds(x,lane)&&!occupied(battle,x,lane,enemy.id)){enemy.x=x;enemy.lane=lane;break;}}battle.log.unshift(`${enemy.name} avance.`);}}
 }
 if(!living(battle.heroes).length){run.roster=battle.heroes.map(h=>({...h,ap:0}));run.phase='lost';return {ok:true,lost:true};}
 battle.round++;for(const hero of living(battle.heroes))hero.ap=2;refreshIntents(battle);battle.effect={kind:'round',target:null};return {ok:true};
}
export const nextOptions=run=>run.phase==='route'?run.options:[];
export const eventChance=useOmen=>Math.min(.8,.25+(useOmen?.25:0));
