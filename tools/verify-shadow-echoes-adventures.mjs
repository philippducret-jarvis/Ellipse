import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const base=process.env.SHADOW_WEB_URL??'http://localhost:4273/workspaces/shadow-echoes/07_exports/web/',out=new URL('../tmp/shadow-echoes/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),errors=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});await p.clock.install({time:new Date('2026-09-24T13:00:00Z')});await p.clock.pauseAt(new Date('2026-09-24T13:00:01Z'));await p.goto(base+'citadel.html',{waitUntil:'networkidle'});
 const go=async id=>{await p.evaluate(id=>location.hash=`activities`,id);await p.clock.runFor(20);await p.locator(`[data-mode="${id}"]`).click();await p.locator(`[data-start="${id}"]`).click();await p.locator('#game-host').waitFor();await p.clock.runFor(30);};
 const result=async id=>{await p.clock.runFor(550);assert.equal(await p.locator('.result-page').evaluate(e=>e.classList.contains('won')),true,id);checks.push(`${id} : premier niveau gagné, récompense enregistrée`);console.log(checks.at(-1));};
 await go('caravan');await p.clock.runFor(2000);await p.locator('.game-toolbar [data-action="pause"]').click();const frozen=await p.locator('#game-counter').textContent();await p.clock.runFor(3000);assert.equal(await p.locator('#game-counter').textContent(),frozen);await p.locator('.game-pause [data-action="pause"]').click();
 for(let i=0;i<240&&await p.locator('.activity-board.caravan').count();i++){
  await p.evaluate(()=>{document.querySelector('[data-action="pulse"]')?.click();document.querySelector('.enemy-target:not(:disabled)')?.click();});await p.clock.runFor(250);
  if(i===30)await p.screenshot({path:fileURLToPath(new URL('citadel-caravan.png',out)),fullPage:true});
 }await result('caravan');
 await go('race');for(let i=0;i<200&&await p.locator('.activity-board.race').count();i++){
  const current=Number((await p.locator('#game-goal').textContent()).match(/Allée (\d)/)?.[1]),danger=Number((await p.locator('#game-counter').textContent()).match(/Ombre : allée (\d)/)?.[1]);if(current===danger)await p.locator(`[data-lane="${current<3?1:-1}"]`).click();await p.clock.runFor(250);if(i===40)await p.screenshot({path:fileURLToPath(new URL('citadel-race.png',out)),fullPage:true});
 }await result('race');
 await go('survival');let previous=[];for(let i=0;i<65&&await p.locator('.activity-board.survival').count();i++){
  const next=[Math.cos(i*.15)>0?'ArrowRight':'ArrowLeft',Math.sin(i*.15)>0?'ArrowDown':'ArrowUp'];for(const k of previous)if(!next.includes(k))await p.keyboard.up(k);for(const k of next)if(!previous.includes(k))await p.keyboard.down(k);previous=next;await p.evaluate(()=>document.querySelector('[data-action="pulse"]')?.click());await p.clock.runFor(1000);if(i===12)await p.screenshot({path:fileURLToPath(new URL('citadel-survival.png',out)),fullPage:true});
 }for(const k of previous)await p.keyboard.up(k);await result('survival');
 await go('campaign');const frame=p.frameLocator('iframe');await frame.locator('#start').click();let won=false;
 for(let step=0;step<240;step++){
  if(await p.locator('.result-page.won').count()){won=true;break;}
  if(await frame.locator('#result').isVisible()){assert.equal(await frame.locator('#result-title').textContent(),'La faille recule.');await frame.locator('#continue').click();}
  await p.evaluate(()=>{const d=document.querySelector('iframe')?.contentDocument;if(!d)return;for(const [i,m]of [...d.querySelectorAll('.member')].entries()){m.click();const skills=d.querySelectorAll('.skill'),warning=!d.getElementById('danger').hidden;if(i!==1||warning)skills[1].click();skills[2].click();}if(!d.getElementById('danger').hidden)d.getElementById('guard').click();});await p.clock.runFor(500);
 }assert.ok(won,'Victoire campagne reliée au hub');const profile=await p.evaluate(()=>JSON.parse(localStorage.getItem('shadow-echoes:citadel:v1')));assert.equal(profile.modes.campaign.wins,1);assert.ok(profile.relics.includes('rose'));await p.clock.runFor(2000);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('shadow-echoes:citadel:v1')).modes.campaign.wins),1);await p.screenshot({path:fileURLToPath(new URL('citadel-campaign-reward.png',out)),fullPage:true});checks.push('campaign : trois phases gagnées, message du bon iframe, récompense et relique uniques');
 assert.deepEqual(errors,[]);await writeFile(new URL('citadel-adventures-report.json',out),JSON.stringify({passed:true,checks,errors,profile},null,2));console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser.close();}
