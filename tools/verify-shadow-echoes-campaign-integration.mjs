import assert from 'node:assert/strict';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html#heroes/seraphine/powers',{waitUntil:'domcontentloaded'});
 await page.locator('.sheet-powers article').first().waitFor();
 assert.equal(await page.locator('.sheet-powers article').count(),5);
 assert.match(await page.locator('.sheet-powers').textContent(),/Requiem des roses/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html#codex',{waitUntil:'domcontentloaded'});
 await page.locator('.bestiary article').first().waitFor();
 assert.equal(await page.locator('.bestiary article').count(),3);
 assert.match(await page.locator('.page-inner').textContent(),/sept adversaires/);
 assert.deepEqual(errors,[]);
 console.log('Fiche des cinq actions et grimoire des sept ennemis : rendu mobile sans erreur.');
}finally{await browser.close();}
