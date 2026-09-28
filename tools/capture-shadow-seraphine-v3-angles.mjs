const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=surface',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#clip')?.options.length===42,undefined,{timeout:120000});
 await page.locator('#pause').click();
 await page.locator('#head-detail').click();
 await page.locator('#stage').screenshot({path:'workspaces/shadow-echoes/02_production/lot-12/qa/seraphine-v3-face-threequarter.png'});
 const stage=page.locator('#stage canvas'),box=await stage.boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+180,box.y+box.height*.5,{steps:12});await page.mouse.up();
 await page.locator('#stage').screenshot({path:'workspaces/shadow-echoes/02_production/lot-12/qa/seraphine-v3-face-side.png'});
}finally{await browser.close();}
