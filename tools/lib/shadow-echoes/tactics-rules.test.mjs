import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTION_RULES,rankOf,createTacticalRun,enterNode,continueRoute,reachableTiles,moveHero,legalTargets,useAction,endTurn,eventChance} from './tactics-rules.mjs';

const battle=seed=>{const run=createTacticalRun(seed);enterNode(run,'entry');return run;};

test('quatre rangs par camp, avec front opposé et formation conservée',()=>{
 const run=battle(1);assert.deepEqual(run.battle.heroes.map(hero=>[hero.id,rankOf(hero)]),[['seraphine',2],['nyxara',3],['lysael',4],['voren',1]]);
 assert.deepEqual(run.battle.enemies.map(enemy=>rankOf(enemy)),[1,2,3]);assert.equal(run.version,2);
});

test('l’échange de rang coûte un PA et modifie les actions permises',()=>{
 const run=battle(2),seraphine=run.battle.heroes[0],nyxara=run.battle.heroes[1];assert.deepEqual(legalTargets(run,'seraphine','basic'),['sentry-a','sentry-b']);
 assert.ok(reachableTiles(run,'seraphine').some(slot=>slot.x===1&&slot.swap));assert.equal(moveHero(run,'seraphine',1,0).ok,true);assert.equal(seraphine.ap,1);assert.equal(rankOf(seraphine),3);assert.equal(rankOf(nyxara),2);
 assert.deepEqual(legalTargets(run,'seraphine','basic'),[]);assert.deepEqual(legalTargets(run,'seraphine','skill2'),[]);assert.equal(moveHero(run,'seraphine',3,0).ok,false);
 assert.equal(moveHero(run,'seraphine',2,0).ok,true);assert.equal(seraphine.ap,0);assert.deepEqual(reachableTiles(run,'seraphine'),[]);
});

test('la cible et la position de départ filtrent compétences et super',()=>{
 const run=battle(3);assert.equal(ACTION_RULES.nyxara.skill3.from.includes(3),true);assert.deepEqual(legalTargets(run,'nyxara','skill3'),['sentry-b','sentry-c']);
 assert.deepEqual(legalTargets(run,'voren','skill3'),['sentry-a']);assert.deepEqual(legalTargets(run,'lysael','skill3'),['seraphine','nyxara','lysael','voren']);
 assert.deepEqual(legalTargets(run,'seraphine','super'),[]);run.battle.heroes[0].energy=100;assert.deepEqual(legalTargets(run,'seraphine','super'),['sentry-a','sentry-b','sentry-c']);
});

test('une compétence repousse ou attire une cible et peut permuter sa formation',()=>{
 const run=battle(4),enemies=run.battle.enemies;assert.equal(useAction(run,'seraphine','skill1','sentry-a').ok,true);assert.equal(enemies[0].x,5);assert.equal(enemies[1].x,4);
 assert.equal(useAction(run,'nyxara','skill3','sentry-c').ok,true);assert.equal(enemies[2].x,5);assert.equal(enemies[0].x,6);assert.equal(enemies[2].stun,1);
});

test('soin, protection et attaque annoncée suivent le rang occupé',()=>{
 const run=battle(5),heroes=run.battle.heroes,voren=heroes.find(hero=>hero.id==='voren'),seraphine=heroes[0],lysael=heroes[2];lysael.hp-=160;
 assert.equal(useAction(run,'lysael','skill2','lysael').ok,true);assert.ok(lysael.hp>330);assert.equal(useAction(run,'voren','skill2','voren').ok,true);assert.ok(voren.shield>0);
 const before=voren.hp,slot=voren.x;assert.equal(run.battle.enemies[0].intent.x,slot);assert.equal(moveHero(run,'seraphine',slot,0).ok,true);endTurn(run);assert.equal(voren.hp,before);assert.ok(seraphine.hp<seraphine.maxHp);
});

test('la route avance sans retour et le sceau fixe la chance de l’événement',()=>{
 const run=battle(901);for(const enemy of run.battle.enemies)enemy.hp=0;run.battle.enemies[0].hp=1;assert.equal(useAction(run,'voren','basic','sentry-a').ok,true);assert.equal(run.phase,'victory');
 continueRoute(run);assert.deepEqual(run.options.map(option=>option.id),['gallery','veil']);assert.equal(enterNode(run,'entry').ok,false);assert.equal(eventChance(false),.25);assert.equal(eventChance(true),.5);
 assert.equal(enterNode(run,'veil',{useOmen:true}).ok,true);assert.equal(run.event.chance,.5);assert.equal(run.omens,0);continueRoute(run);assert.deepEqual(run.options.map(option=>option.id),['bridge','reliquary']);
});

test('l’état de formation se sauvegarde et une expédition atteint le boss',()=>{
 const run=battle(302),choices=['entry','reliquary','midboss','sanctuary','bastion','boss'];let safety=0;
 const restored=JSON.parse(JSON.stringify(run));assert.equal(restored.version,2);assert.deepEqual(restored.battle.heroes,run.battle.heroes);
 function fight(){for(let turn=0;run.phase==='battle'&&turn<30;turn++){
  const encounter=run.battle;
  for(const hero of encounter.heroes){while(run.phase==='battle'&&hero.hp>0&&hero.ap>0&&safety++<500){
   const ally=encounter.heroes.filter(item=>item.hp>0&&item.hp<item.maxHp-160).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
   if(hero.id==='lysael'&&ally&&legalTargets(run,hero.id,'skill2').includes(ally.id)){useAction(run,hero.id,'skill2',ally.id);continue;}
   const target=legalTargets(run,hero.id,'basic').map(id=>encounter.enemies.find(enemy=>enemy.id===id)).sort((a,b)=>a.hp-b.hp)[0];if(target){useAction(run,hero.id,'basic',target.id);continue;}
   const move=reachableTiles(run,hero.id)[0];if(!move)break;moveHero(run,hero.id,move.x,move.lane);
  }}if(run.phase==='battle')endTurn(run);
 }assert.equal(run.phase,'victory',`Combat non gagné : ${run.route.at(-1)?.name}, tour ${run.battle?.round}`);}
 fight();continueRoute(run);enterNode(run,'veil');continueRoute(run);enterNode(run,'reliquary');continueRoute(run);
 for(const id of choices.slice(2)){assert.equal(enterNode(run,id).ok,true);if(run.phase==='battle')fight();continueRoute(run);}assert.equal(run.phase,'won');assert.equal(run.route.length,7);
});
