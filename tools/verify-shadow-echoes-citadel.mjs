import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {runeHint,RECIPES} from './lib/shadow-echoes/activities.mjs';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const base=process.env.SHADOW_WEB_URL??'http://localhost:4273/workspaces/shadow-echoes/07_exports/web/',out=new URL('../tmp/shadow-echoes/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[],checks=[];const key='shadow-echoes:citadel:v1';
try{
 const p=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await p.clock.install({time:new Date('2026-09-24T12:00:00Z')});await p.clock.pauseAt(new Date('2026-09-24T12:00:01Z'));
 await p.goto(base+'citadel.html',{waitUntil:'networkidle'});await p.locator('.hub-companion canvas').waitFor();await p.clock.runFor(32);
 const profile=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const go=async hash=>{await p.evaluate(hash=>location.hash=hash,hash);await p.clock.runFor(20);};
 const begin=async id=>{await go('activities');await p.locator(`[data-mode="${id}"]`).click();await p.locator(`[data-start="${id}"]`).click();await p.locator('#game-host').waitFor();await p.clock.runFor(32);};
 const finished=async(id,won=true)=>{await p.clock.runFor(550);await p.locator('.result-page').waitFor();assert.equal(await p.locator('.result-page').evaluate(e=>e.classList.contains('won')),won,id);console.log(`Niveau ${id} : ${won?'victoire':'défaite'} vérifiée`);};
 assert.equal(await p.locator('.mode-card').count(),10);await p.screenshot({path:fileURLToPath(new URL('citadel-desktop.png',out)),fullPage:true});
 await go('summon');await p.locator('#invoke').click();await p.locator('.ritual canvas').first().waitFor();assert.equal((await profile()).sigils,3);assert.equal((await profile()).summons,1);await p.clock.runFor(32);await p.screenshot({path:fileURLToPath(new URL('citadel-invocation.png',out)),fullPage:true});await p.locator('[data-close-modal]').click();
 const summoned=(await profile()).history[0];await go(`heroes/${summoned}`);await p.locator(`[data-upgrade="${summoned}"]`).click();assert.equal((await profile()).heroes[summoned].level,2);await p.locator(`[data-select="${summoned}"]`).click();assert.equal((await profile()).selected,summoned);
 await go('quests');await p.locator('[data-quest="summon"]').click();const afterQuest=await profile();assert.equal(afterQuest.sigils,4);assert.equal(await p.locator('[data-quest="summon"]').isDisabled(),true);
 checks.push('Hub, quatre héros, invocation réelle, fragments, élévation, sélection et quête sans double paiement');
 await begin('runes');const board=await p.locator('[data-rune]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-pressed')==='true'));for(const i of runeHint(board))await p.locator(`[data-rune="${i}"]`).click();await finished('runes');assert.ok((await profile()).relics.includes('moon'));
 const firstGold=(await profile()).gold;await p.clock.runFor(1000);assert.equal((await profile()).gold,firstGold);
 await go('relics');await p.locator('[data-equip="moon"]').selectOption('nyxara');assert.equal((await profile()).heroes.nyxara.relic,'moon');await p.screenshot({path:fileURLToPath(new URL('citadel-relics.png',out)),fullPage:true});
 await begin('alchemy');for(const r of RECIPES){for(const i of r.ingredients)await p.locator(`[data-ingredient="${i}"]`).click();await p.locator('#brew-heat').fill(String(r.heat));await p.locator('[data-action="brew"]').click();}await finished('alchemy');
 await begin('expedition');for(let i=0;i<5;i++)await p.locator('[data-path="1"]').click();await finished('expedition');
 await begin('memory');const known=new Map();let pairLoops=0;
 while(await p.locator('.memory-grid').count()&&pairLoops++<24){
  const unmatched=await p.locator('[data-card]:not(.matched)').evaluateAll(ns=>ns.map(n=>Number(n.dataset.card)));if(unmatched.length===0)break;
  let a,b;const found=[...known].find(([i,v])=>unmatched.includes(i)&&[...known].some(([j,w])=>j!==i&&unmatched.includes(j)&&w===v));
  if(found){a=found[0];b=[...known].find(([j,w])=>j!==a&&unmatched.includes(j)&&w===found[1])[0];}
  else a=unmatched.find(i=>!known.has(i))??unmatched[0];
  await p.locator(`[data-card="${a}"]`).click();const name=await p.locator(`[data-card="${a}"]`).getAttribute('aria-label');known.set(a,name);
  b??=[...known].find(([i,v])=>i!==a&&unmatched.includes(i)&&v===name)?.[0]??unmatched.find(i=>i!==a&&!known.has(i))??unmatched.find(i=>i!==a);
  await p.locator(`[data-card="${b}"]`).click();known.set(b,await p.locator(`[data-card="${b}"]`).getAttribute('aria-label'));await p.clock.runFor(850);
 }await finished('memory');
 let diceWon=false;for(let attempt=0;attempt<8&&!diceWon;attempt++){
  await begin('dice');for(let turn=0;turn<70&&await p.locator('.dice-table').count();turn++){const pot=Number(await p.locator('.dice-scores strong').nth(1).textContent()),total=Number(await p.locator('.dice-scores strong').nth(0).textContent());await p.locator(pot>0&&(pot>=10||total+pot>=35)?'[data-action="bank"]':'[data-action="roll"]').click();await p.clock.runFor(500);}await p.clock.runFor(550);diceWon=await p.locator('.result-page').evaluate(e=>e.classList.contains('won'));
 }assert.ok(diceWon,'Dés gagnables via décisions rendues');console.log('Niveau dice : victoire vérifiée');
 await begin('fishing');let fishingSteps=0;
 while(await p.locator('.activity-board.fishing').count()&&fishingSteps++<500){const label=await p.locator('[data-action="cast"]').textContent();if(label==='Lancer la ligne')await p.locator('[data-action="cast"]').click();else if(label==='Ferrer maintenant'){const text=await p.locator('#game-counter').textContent();const pos=Number(text.match(/Repère (\d+)/)?.[1]);if(pos>=38&&pos<=62)await p.locator('[data-action="cast"]').click();}else {const text=await p.locator('#game-counter').textContent(),tension=Number(text.match(/Tension (\d+)/)?.[1]);if(tension<47)await p.locator('[data-action="reel"]').dispatchEvent('pointerdown');else if(tension>55)await p.locator('[data-action="reel"]').dispatchEvent('pointerup');}await p.clock.runFor(100);}await finished('fishing');
 checks.push('Niveaux runes, alchimie, expédition, mémoire, dés et pêche gagnés par leurs commandes');
 await go('settings');const pending=p.waitForEvent('download');await p.locator('[data-export]').click();await(await pending).saveAs(fileURLToPath(new URL('citadel-save-export.json',out)));const exported=JSON.parse(await readFile(new URL('citadel-save-export.json',out),'utf8'));assert.equal(exported.version,1);
 const beforeImport=await profile();await p.locator('#import-save').setInputFiles({name:'invalide.json',mimeType:'application/json',buffer:Buffer.from('{')});assert.equal((await profile()).gold,beforeImport.gold);
 await p.locator('#import-save').setInputFiles(fileURLToPath(new URL('citadel-save-export.json',out)));await p.locator('#confirm-import').click();assert.equal((await profile()).gold,exported.gold);assert.equal((await profile()).active,null);
 await p.reload({waitUntil:'networkidle'});assert.equal((await profile()).heroes[summoned].level,exported.heroes[summoned].level);assert.equal((await profile()).heroes.nyxara.relic,'moon');
 checks.push('Sauvegarde, rechargement, export, import valide avec confirmation et rejet d’un fichier corrompu');
 for(const hash of ['hub','activities','heroes/nyxara','summon','relics','quests','settings']){await go(hash);await p.setViewportSize({width:390,height:844});await p.clock.runFor(32);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Débordement ${hash}`);await p.screenshot({path:fileURLToPath(new URL(`citadel-mobile-${hash.replace('/','-')}.png`,out)),fullPage:true});}
 checks.push('Sept écrans du hub vérifiés à 390 px sans débordement');assert.deepEqual(errors,[]);
 await writeFile(new URL('citadel-browser-report.json',out),JSON.stringify({passed:true,checks,errors,profile:await profile()},null,2));console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser.close();}
