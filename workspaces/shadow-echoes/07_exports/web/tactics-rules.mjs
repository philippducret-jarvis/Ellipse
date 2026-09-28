// Isolated campaign experiment. No Citadel currency is awarded by this ruleset.
export const WIDTH=8,LANES=1;
export const HEROES={
 seraphine:{name:'Séraphine',role:'Percée',hp:520,basic:85,skills:['Floraison','Pas de ronce','Étreinte'],super:'Requiem des roses',color:'#eb667f'},
 nyxara:{name:'Nyxara',role:'Contrôle',hp:450,basic:70,skills:['Orbe du néant','Drain','Éclipse'],super:'Retour au silence',color:'#b987ef'},
 lysael:{name:'Lysael',role:'Soutien',hp:490,basic:60,skills:['Racines','Harmonie','Sanctuaire'],super:'Chant des mondes',color:'#e8d397'},
 voren:{name:'Voren',role:'Rempart',hp:650,basic:90,skills:['Cendres','Rempart','Fracture'],super:'Empire des cendres',color:'#ef966c'}
};
// Four slots per side; rank 1 stands nearest the opposing formation.
export const rankOf=unit=>unit.x<=3?4-unit.x:unit.x-3;
export const ACTION_RULES={
 seraphine:{basic:{from:[1,2],to:[1,2]},skill1:{from:[1,2],to:[1,2,3],shift:1},skill2:{from:[1,2,3],ally:true},skill3:{from:[1],to:[1,2],stun:true},super:{from:[1,2],to:[1,2,3]}},
 nyxara:{basic:{from:[2,3,4],to:[1,2,3,4]},skill1:{from:[2,3,4],to:[1,2,3,4]},skill2:{from:[2,3],to:[1,2,3,4]},skill3:{from:[3,4],to:[2,3,4],shift:-1,stun:true},super:{from:[2,3,4],to:[1,2,3,4]}},
 lysael:{basic:{from:[2,3,4],to:[1,2,3,4]},skill1:{from:[2,3],to:[1,2,3]},skill2:{from:[2,3,4],ally:true},skill3:{from:[3,4],ally:true},super:{from:[2,3,4],self:true}},
 voren:{basic:{from:[1,2],to:[1,2]},skill1:{from:[1],to:[1,2]},skill2:{from:[1,2],ally:true,to:[1,2]},skill3:{from:[1],to:[1],stun:true},super:{from:[1,2],self:true}}
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
const hash=(seed,text)=>{let h=seed>>>0;for(const char of text)h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;return h/4294967296;};
const optionsFor=depth=>(STAGES[depth]??[]).map(option=>({...option}));
export function createTacticalRun(seed=Date.now()>>>0){const slots={lysael:0,nyxara:1,seraphine:2,voren:3};return {version:2,seed:seed>>>0,phase:'route',depth:0,options:optionsFor(0),route:[],omens:1,boon:0,roster:Object.entries(HEROES).map(([id,kit])=>({id,hp:kit.hp,maxHp:kit.hp,energy:25,x:slots[id],lane:0,ap:2,shield:0})),battle:null,event:null,log:['L’expédition commence.']};}
function enemiesFor(kind){
 if(kind==='boss')return [{id:'malgrave',name:'Malgrave',hp:1350,maxHp:1350,damage:90,x:4,lane:0,boss:true,style:'brute'},{id:'cinder-a',name:'Cendre',hp:230,maxHp:230,damage:42,x:5,lane:0,style:'ranged'},{id:'cinder-b',name:'Cendre',hp:230,maxHp:230,damage:42,x:6,lane:0,style:'ranged'}];
 if(kind==='midboss')return [{id:'watcher',name:'Veilleur',hp:790,maxHp:790,damage:72,x:4,lane:0,boss:true,style:'brute'},{id:'sentry',name:'Sentinelle',hp:210,maxHp:210,damage:38,x:5,lane:0,style:'ranged'}];
 if(kind==='elite')return [{id:'elite',name:'Prélat cendré',hp:680,maxHp:680,damage:70,x:4,lane:0,boss:true,style:'brute'},{id:'guard',name:'Garde',hp:240,maxHp:240,damage:42,x:5,lane:0,style:'ranged'}];
 return [{id:'sentry-a',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:4,lane:0,style:'melee'},{id:'sentry-b',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:5,lane:0,style:'ranged'},{id:'sentry-c',name:'Sentinelle',hp:230,maxHp:230,damage:40,x:6,lane:0,style:'ranged'}];
}
function living(units){return units.filter(unit=>unit.hp>0);}
function refreshIntents(battle){for(const enemy of living(battle.enemies)){const ranks=enemy.style==='ranged'?[2,3,4]:[1,2],target=living(battle.heroes).filter(hero=>ranks.includes(rankOf(hero))).sort((a,b)=>rankOf(a)-rankOf(b)||a.hp-b.hp)[0];enemy.intent=target?{kind:'strike',x:target.x,lane:0,targetId:target.id,damage:enemy.damage,shift:enemy.style==='brute'?-1:0}:{kind:'approach'};}}
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
export function reachableTiles(run,id){if(run.phase!=='battle')return [];const hero=run.battle.heroes.find(h=>h.id===id&&h.hp>0);if(!hero||hero.ap<1)return [];return [hero.x-1,hero.x+1].filter(x=>x>=0&&x<4).map(x=>({x,lane:0,swap:living(run.battle.heroes).some(ally=>ally.x===x)}));}
export function legalTargets(run,id,action){if(run.phase!=='battle')return [];const battle=run.battle,hero=battle.heroes.find(h=>h.id===id&&h.hp>0),rule=ACTION_RULES[id]?.[action];if(!hero||!rule||!rule.from.includes(rankOf(hero))||hero.ap<(action==='basic'?1:2)||action==='super'&&hero.energy<100)return [];
 if(rule.self)return [id];if(rule.ally)return living(battle.heroes).filter(ally=>!rule.to||rule.to.includes(rankOf(ally))).map(ally=>ally.id);
 return living(battle.enemies).filter(enemy=>rule.to.includes(rankOf(enemy))).map(enemy=>enemy.id);
}
function damage(battle,enemy,amount){const absorbed=Math.min(enemy.shield??0,amount);enemy.shield=(enemy.shield??0)-absorbed;enemy.hp=Math.max(0,enemy.hp-(amount-absorbed));battle.effect={kind:'strike',target:enemy.id,amount:amount-absorbed};}
function shiftUnit(units,unit,step,min,max){const next=unit.x+step;if(next<min||next>max)return false;const other=living(units).find(item=>item.id!==unit.id&&item.x===next);if(other)other.x=unit.x;unit.x=next;return true;}
function concludeIfWon(run){const battle=run.battle;if(living(battle.enemies).length)return;run.roster=battle.heroes.map(hero=>({...hero,ap:2}));run.phase='victory';run.log.push(`${run.route.at(-1).name} libéré.`);}
export function moveHero(run,id,x,lane=0){if(run.phase!=='battle')return {ok:false,reason:'phase'};const battle=run.battle,hero=battle.heroes.find(h=>h.id===id),allowed=reachableTiles(run,id);if(!allowed.some(t=>t.x===x&&t.lane===lane))return {ok:false,reason:'position'};const other=living(battle.heroes).find(ally=>ally.x===x);if(other)other.x=hero.x;hero.x=x;hero.ap--;battle.selected=id;battle.effect={kind:'move',target:id};battle.log.unshift(`${HEROES[id].name} ${other?`échange sa place avec ${HEROES[other.id].name}`:'change de place'} · rang ${rankOf(hero)}.`);return {ok:true,swapped:other?.id??null};}
export function useAction(run,id,action,targetId){if(run.phase!=='battle')return {ok:false,reason:'phase'};const battle=run.battle,hero=battle.heroes.find(h=>h.id===id),rule=ACTION_RULES[id]?.[action];if(!hero)return {ok:false,reason:'hero'};const legal=legalTargets(run,id,action);if(!legal.includes(targetId))return {ok:false,reason:'target-or-rank'};const kit=HEROES[id],power=1+run.boon;hero.ap-=action==='basic'?1:2;battle.selected=id;
 if(action==='basic'){const target=battle.enemies.find(e=>e.id===targetId);damage(battle,target,Math.round(kit.basic*power));hero.energy=Math.min(100,hero.energy+30);battle.log.unshift(`${kit.name} attaque ${target.name}.`);}
 else if(action.startsWith('skill')){
  const index=Number(action.at(-1))-1,skillName=kit.skills[index],support=action==='skill2'&&['seraphine','lysael','voren'].includes(id)||action==='skill3'&&id==='lysael';
  if(support){const target=battle.heroes.find(h=>h.id===targetId);if(id==='lysael'&&action==='skill2'){const amount=Math.round(180*power);target.hp=Math.min(target.maxHp,target.hp+amount);battle.effect={kind:'heal',target:target.id,amount};}else{const amount=Math.round((action==='skill3'?190:150)*power);target.shield+=amount;battle.effect={kind:'shield',target:target.id,amount};}battle.log.unshift(`${kit.name} lance ${skillName} sur ${HEROES[target.id].name}.`);}
  else {const target=battle.enemies.find(e=>e.id===targetId),base={seraphine:[220,0,165],nyxara:[170,135,145],lysael:[115,0,0],voren:[190,0,200]}[id][index];damage(battle,target,Math.round(base*power));if(target.hp>0&&rule.shift){shiftUnit(battle.enemies,target,rule.shift,4,7);battle.log.unshift(`${target.name} change de rang : ${rankOf(target)}.`);}if(target.hp>0&&rule.stun)target.stun=1;if(id==='nyxara'&&action==='skill2')hero.hp=Math.min(hero.maxHp,hero.hp+110);battle.log.unshift(`${kit.name} lance ${skillName}.`);}
  hero.energy=Math.min(100,hero.energy+10);
 }
 else if(action==='super'){
  hero.energy=0;
  if(id==='lysael'){for(const ally of living(battle.heroes))ally.hp=Math.min(ally.maxHp,ally.hp+Math.round(230*power));battle.effect={kind:'super',target:id,amount:230};}
  else if(id==='voren'){for(const enemy of living(battle.enemies).filter(e=>rankOf(e)<=2))damage(battle,enemy,Math.round(260*power));battle.effect={kind:'super',target:id,amount:260};}
  else {const target=battle.enemies.find(e=>e.id===targetId);damage(battle,target,Math.round((id==='seraphine'?360:310)*power));battle.effect={kind:'super',target:target.id,amount:target.hp};}
  battle.log.unshift(`${kit.name} déclenche ${kit.super}.`);
 }
 battle.effect.actor=id;concludeIfWon(run);return {ok:true};
}
export function endTurn(run){if(run.phase!=='battle')return {ok:false,reason:'phase'};const battle=run.battle;for(const enemy of living(battle.enemies)){
  if(enemy.stun){enemy.stun=0;battle.log.unshift(`${enemy.name} est interrompu.`);continue;}
  const intent=enemy.intent;if(!intent)continue;
  if(intent.kind==='strike'){const hero=living(battle.heroes).find(item=>item.x===intent.x);if(hero){const absorbed=Math.min(hero.shield,enemy.damage);hero.shield-=absorbed;hero.hp=Math.max(0,hero.hp-(enemy.damage-absorbed));if(hero.hp>0&&intent.shift){shiftUnit(battle.heroes,hero,intent.shift,0,3);battle.log.unshift(`${HEROES[hero.id].name} est repoussé au rang ${rankOf(hero)}.`);}battle.log.unshift(`${enemy.name} frappe le rang annoncé.`);}else battle.log.unshift(`${enemy.name} frappe dans le vide.`);}
  else if(enemy.x>4&&!living(battle.enemies).some(other=>other.id!==enemy.id&&other.x===enemy.x-1)){enemy.x--;battle.log.unshift(`${enemy.name} avance au rang ${rankOf(enemy)}.`);}
 }
 if(!living(battle.heroes).length){run.roster=battle.heroes.map(h=>({...h,ap:0}));run.phase='lost';return {ok:true,lost:true};}
 battle.round++;for(const hero of living(battle.heroes))hero.ap=2;refreshIntents(battle);battle.effect={kind:'round',target:null};return {ok:true};
}
export const nextOptions=run=>run.phase==='route'?run.options:[];
export const eventChance=useOmen=>Math.min(.8,.25+(useOmen?.25:0));
