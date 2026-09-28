import assert from 'node:assert/strict';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if((message.type()==='warning'||message.type()==='error')&&!message.text().includes('GPU stall due to ReadPixels'))errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=surface-v3',{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 try{await page.locator('#arena-volume[data-seraphine-model="surface-v3"]').waitFor({timeout:120000});}
 catch(error){console.error('3D state:',await page.locator('#arena-volume').evaluate(el=>({hidden:el.hidden,dataset:el.dataset})));console.error('Browser errors:',errors);throw error;}
 await page.waitForTimeout(350);
 await page.screenshot({path:'workspaces/shadow-echoes/02_production/lot-12/qa/seraphine-v3-battle.png',timeout:120000});
 assert.deepEqual(errors,[]);
 console.log('V3 battle review: model loaded at combat scale.');
}finally{await browser.close();}
