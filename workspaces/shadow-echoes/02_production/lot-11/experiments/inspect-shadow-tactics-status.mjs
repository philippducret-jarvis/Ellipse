const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html');await page.locator('[data-node=entry]').click();await page.locator('#toggle-render').click();await page.waitForFunction(()=>document.querySelector('#arena-volume')?.dataset.seraphineModel!=='loading',null,{timeout:120000}).catch(()=>{});
 console.log(await page.locator('#arena-volume').evaluate(element=>({...element.dataset,hidden:element.hidden})),errors);
}finally{await browser.close();}
