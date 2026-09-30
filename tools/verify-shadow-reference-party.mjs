import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const out='workspaces/shadow-echoes/02_production/lot-15/qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v15&camera=cinematic&environment=arcade-v3',{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 await page.locator('#arena-volume[data-hero-visuals="original-illustrations-v1"][data-hero-sprites="3"][data-enemy-sprites="3"]').waitFor({timeout:60000});
 await page.screenshot({path:`${out}/party-reference-v1-formation.png`});
 await page.locator('[data-hero=nyxara]').click();
 await page.locator('[data-action=basic]').click();
 await page.locator('#arena [data-unit=sentry-a]').click();
 await page.locator('#arena-volume[data-hero-action-visual="nyxara"][data-hero-effect-seen="true"]').waitFor({timeout:15000});
 await page.screenshot({path:`${out}/party-reference-v1-nyxara-basic.png`});
 assert.deepEqual(errors,[]);
 console.log('Formation de référence : trois Mythiques illustrés, trois sentinelles, frappe de Nyxara animée.');
}finally{await browser.close();}
