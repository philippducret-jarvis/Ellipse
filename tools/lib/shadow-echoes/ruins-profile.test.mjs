import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuins,command,stepRuins} from './ruins-rules.mjs';
import {ruinsBonuses,startRuinsRun,finishRuinsRun} from './ruins-profile.mjs';
import {PROFILE_KEY,readProfile} from './profile.mjs';

function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};}

test('Une traversée crédite le carnet et les quatre Mythiques une seule fois',()=>{
 const local=storage();assert.equal(startRuinsRun(local,'run-1').ok,true);
 const first=finishRuinsRun(local,'run-1',true,{time:100,survivors:4});
 assert.equal(first.ok,true);assert.equal(first.reward.gold,180);assert.equal(first.reward.essence,2);
 assert.equal(first.reward.heroXP.seraphine.amount,220);
 const profile=readProfile(local).profile;assert.equal(profile.modes.campaign.wins,1);assert.equal(profile.heroes.voren.level,2);
 assert.equal(finishRuinsRun(local,'run-1',true).ok,false);assert.equal(readProfile(local).profile.gold,profile.gold);
 assert.equal(startRuinsRun(local,'run-2').ok,true);
 const repeat=finishRuinsRun(local,'run-2',true);assert.equal(repeat.reward.first,false);assert.equal(repeat.reward.sigils,0);
});

test('Une défaite et une session remplacée ne donnent aucune récompense',()=>{
 const local=storage();assert.equal(startRuinsRun(local,'lost').ok,true);
 assert.equal(finishRuinsRun(local,'lost',false).reward.won,false);
 let profile=readProfile(local).profile;assert.equal(profile.gold,400);assert.equal(profile.modes.campaign.wins,0);
 assert.equal(startRuinsRun(local,'old').ok,true);assert.equal(startRuinsRun(local,'new').ok,true);
 assert.equal(finishRuinsRun(local,'old',true).reason,'replaced');
 assert.equal(finishRuinsRun(local,'new',true).ok,true);
 profile=readProfile(local).profile;assert.equal(profile.modes.campaign.wins,1);
});

test('Les bonus du carnet modifient les PV, dégâts, énergie et recharge dans les ruines',()=>{
 const local=storage(),profile=readProfile(local).profile;
 profile.heroes.seraphine.level=3;profile.heroes.seraphine.talents={edge:1};
 local.setItem(PROFILE_KEY,JSON.stringify(profile));
 const bonus=ruinsBonuses(local).seraphine,s=createRuins({seraphine:bonus}),h=s.party[0];
 assert.ok(h.maxHp>1100);assert.ok(bonus.attack>1);
 s.status='playing';h.x=-1;h.z=11;
 assert.equal(command(s,'basic'),true);stepRuins(s,.25);stepRuins(s,.1);
 assert.ok(s.enemies[0].hp<310-150);assert.ok(h.energy>=49);
 assert.ok(h.cooldowns[0]<.68);
});

test('Un carnet corrompu est préservé et une partie sans stockage ne crédite rien',()=>{
 const local=storage();local.setItem(PROFILE_KEY,'{broken');
 assert.equal(startRuinsRun(local,'x').reason,'invalid');assert.equal(local.getItem(PROFILE_KEY),'{broken');
 assert.equal(startRuinsRun(null,'x').reason,'unavailable');
});
