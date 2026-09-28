import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.setDefaultTimeout(120000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=skin',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.querySelector('#model-status')?.textContent?.includes('Chargement'));
 const status=await page.locator('#model-status').textContent(),issues=await page.locator('#issues').textContent();
 console.log({status,issues,errors});assert.match(status,/Structure conforme/);assert.equal(await page.locator('#clip option').count(),42);
 assert.match(await page.locator('#material-count').textContent(),/10 matières/);await page.locator('#roughness').fill('75');await page.locator('#metalness').fill('150');assert.equal(await page.locator('#roughness-value').textContent(),'75 %');assert.equal(await page.locator('#metalness-value').textContent(),'150 %');await page.locator('#material-reset').click();assert.equal(await page.locator('#roughness-value').textContent(),'100 %');assert.equal(await page.locator('#metalness-value').textContent(),'100 %');
 await page.locator('#clip').selectOption('attack1');await page.waitForTimeout(500);await mkdir('tmp/shadow-echoes',{recursive:true});await page.screenshot({path:'tmp/shadow-echoes/asset-lab-seraphine-skin.png',timeout:120000});
 assert.deepEqual(errors,[]);console.log('Séraphine skinnée : 42 clips et rendu navigateur validés.');
}finally{await browser.close();}
