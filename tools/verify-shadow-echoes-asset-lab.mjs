import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine',{waitUntil:'domcontentloaded'});
 await page.locator('#clip option').first().waitFor({state:'attached'});
 assert.equal(await page.locator('#clip option').count(),42);
 assert.match(await page.locator('#issues').textContent(),/Aucune peau pondérée/);
 assert.equal(await page.locator('#stage canvas').count(),1);
 await page.locator('#clip').selectOption('attack1');await page.waitForTimeout(350);await page.locator('#angle').click();assert.equal(await page.locator('#angle').textContent(),'Vue trois quarts');
 await mkdir('tmp/shadow-echoes',{recursive:true});await page.screenshot({path:'tmp/shadow-echoes/asset-lab-seraphine.png'});
 await page.locator('#candidate').setInputFiles('workspaces/shadow-echoes/03_assets/characters/seraphine/volume-v1/hero.glb');
 await page.waitForFunction(()=>document.querySelector('#source')?.textContent?.startsWith('Fichier local'));
 await page.waitForFunction(()=>document.querySelectorAll('#clip option').length===42);
 assert.match(await page.locator('#issues').textContent(),/Aucune peau pondérée/);
 await page.locator('#skin-pilot').click();await page.waitForFunction(()=>document.querySelector('#model-status')?.classList.contains('pass'));await page.waitForFunction(()=>document.querySelectorAll('#clip option').length===42);assert.match(await page.locator('#source').textContent(),/candidat skinné/);assert.match(await page.locator('#metrics').textContent(),/188201/);await page.locator('#clip').selectOption('attack1');await page.waitForTimeout(400);await page.screenshot({path:'tmp/shadow-echoes/asset-lab-seraphine-skin.png',timeout:90000});
 assert.deepEqual(errors,[]);console.log('Atelier GLB : ancien volume correctement signalé, candidat Séraphine skinné et 42 clips lisibles en vue trois quarts.');
}finally{await browser.close();}
