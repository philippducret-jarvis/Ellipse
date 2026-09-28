import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile} from './profile.mjs';
import {renderHeroSheet} from './hero-sheet.mjs';
import {KITS,ACTION_COOLDOWNS} from './ruins-rules.mjs';

test('La fiche Campagne présente les cinq actions réelles du niveau 2,5D',()=>{
 const profile=newProfile();
 for(const id of Object.keys(KITS)){
  const host={innerHTML:'',querySelector:()=>null};
  renderHeroSheet(host,profile,id,'powers','edge',()=>{});
  const section=host.innerHTML.match(/<div class="sheet-powers">([\s\S]*?)<\/div><button class="gold-button"/);
  assert.ok(section,id);
  assert.equal((section[1].match(/<article>/g)??[]).length,5,id);
  for(const name of [...KITS[id].skills,KITS[id].ultimate])assert.ok(section[1].includes(name),`${id}: ${name}`);
 assert.ok(section[1].includes(`${ACTION_COOLDOWNS[4].toFixed(1)} s de recharge`));
  renderHeroSheet(host,profile,id,'info','edge',()=>{});
  assert.ok(host.innerHTML.includes('Vie maximale · Pont des Serments'));
  assert.ok(host.innerHTML.includes(KITS[id].hp.toLocaleString('fr-FR')));
 }
});
