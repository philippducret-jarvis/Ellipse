import assert from 'node:assert/strict';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://localhost:4273/',{waitUntil:'domcontentloaded'});
 const project=page.getByText('Shadow Echoes',{exact:true}).first();
 await project.waitFor({timeout:20000});
 await project.click();
 const preview=page.getByRole('button',{name:/Aperçu jouable/}).first();
 await preview.waitFor({timeout:20000});
 await preview.click();
 const dialog=page.getByRole('dialog',{name:/Aperçu jouable/});
 await dialog.waitFor();
 const iframe=dialog.locator('iframe');
 assert.match(await iframe.getAttribute('src'),/shadow-echoes\/07_exports\/web\/preview\.html/);
 await iframe.contentFrame().locator('.app-shell').waitFor({timeout:20000});
 await dialog.getByRole('button',{name:'Plein écran'}).click();
 await page.waitForFunction(()=>!!document.fullscreenElement||!!document.querySelector('.es-modal-preview.is-expanded'));
 assert.equal(await iframe.count(),1);
 await dialog.getByRole('button',{name:'Quitter le plein écran'}).click();
 await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('.es-modal-preview.is-expanded'));
 console.log('Ellipse Studio: Shadow Echoes preview opens in iframe and enters/exits fullscreen.');
}finally{await browser.close();}
