import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
await mkdir('tmp/shadow-echoes',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.setDefaultTimeout(120000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=atelier',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#clip')?.options.length===42);
 assert.match(await page.locator('#model-status').textContent(),/Structure conforme/);assert.equal(await page.locator('#clip option').count(),42);
 assert.match(await page.locator('#material-count').textContent(),/14 matières/);
 await page.locator('#clip').selectOption('idle');await page.waitForTimeout(700);
 await page.screenshot({path:'tmp/shadow-echoes/seraphine-atelier-v2.png',timeout:120000});
 await page.locator('#angle').click();await page.screenshot({path:'tmp/shadow-echoes/seraphine-atelier-v2-front.png',timeout:120000});
 const stage=page.locator('#stage canvas'),box=await stage.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+350,box.y+box.height*.5,{steps:15});await page.mouse.up();await page.screenshot({path:'tmp/shadow-echoes/seraphine-atelier-v2-reverse.png',timeout:120000});
 assert.deepEqual(errors,[]);console.log('Atelier Séraphine V2 : GLB skinné, 42 clips, 14 matières et rendu navigateur valides.');
}finally{await browser.close();}
