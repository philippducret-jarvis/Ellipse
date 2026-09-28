import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const version=process.argv[2]??'lookdev-v3';
const camera=process.argv[3]==='focus'?'&camera=seraphine':process.argv[3]==='portrait'?'&camera=portrait':'';
const reduced=process.argv.includes('--reduced');
assert.ok(['lookdev-v3','lookdev-v4','lookdev-v5','lookdev-v6','lookdev-v7','lookdev-v8'].includes(version));
const out='workspaces/shadow-echoes/02_production/lot-15/qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:reduced?'reduce':'no-preference'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto(`http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=${version}${camera}`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 await page.locator(`#arena-volume[data-seraphine-model="${version}"][data-seraphine-materials="reference-with-silhouette-matte"][data-seraphine-keyposes="3"][data-seraphine-mattes="3"][data-enemy-sprites="3"]`).waitFor({timeout:30000});
 if(version==='lookdev-v7')await page.locator('#arena-volume[data-seraphine-motion="reference-hair-region-and-keyposes"]').waitFor();
 if(version==='lookdev-v8')await page.locator('#arena-volume[data-seraphine-motion="reference-hair-cloth-and-keyposes"]').waitFor();
 await page.waitForTimeout(500);
 const cameraLabel=(camera.includes('portrait')?'-portrait':camera?'-focus':'')+(reduced?'-reduced':'');
 await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-battle.png`});
 if(version==='lookdev-v8'){await page.waitForTimeout(900);await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-idle-late.png`});}
 await page.locator('[data-action=basic]').click();
 await page.locator('#arena [data-unit=sentry-a]').click();
 await page.locator('#arena-volume[data-seraphine-pose="windup"]').waitFor({timeout:15000});
 await page.locator('#arena-volume[data-seraphine-pose="attack"]').waitFor({timeout:15000});
 await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-attack.png`});
 assert.deepEqual(errors,[]);
 console.log(`Séraphine ${version} : les trois masques de silhouette et la pose de frappe sont chargés en combat.`);
}finally{await browser.close();}
