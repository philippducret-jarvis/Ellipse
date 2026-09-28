import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const base=process.env.SHADOW_WEB_URL??'http://localhost:4273/workspaces/shadow-echoes/07_exports/web/';
const out=new URL('../tmp/shadow-echoes/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),errors=[],checks=[],pixelChecks=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1150}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}motion.html`,{waitUntil:'networkidle'});
  await page.locator('#actor-host .mesh-actor').waitFor();await page.locator('#toggle').click();
  for(const name of ['Séraphine','Nyxara','Lysael','Voren']){
    await page.getByRole('button',{name:`Animer ${name}`,exact:true}).click();
    await page.locator('#actor-host .mesh-actor').waitFor();
    await page.getByRole('button',{name:'Pose de référence',exact:true}).click();
    const metric=await page.evaluate(()=>{
      const actual=document.querySelector('#actor-host .mesh-actor'),img=document.getElementById('reference');
      const expected=document.createElement('canvas'),read=document.createElement('canvas');
      expected.width=read.width=actual.width;expected.height=read.height=actual.height;
      expected.getContext('2d').drawImage(img,actual.width*150/1324,actual.height*150/1836,actual.width*1024/1324,actual.height*1536/1836);
      read.getContext('2d').drawImage(actual,0,0);
      const a=read.getContext('2d').getImageData(0,0,read.width,read.height).data,b=expected.getContext('2d').getImageData(0,0,read.width,read.height).data;
      let intersection=0,union=0,colorError=0,channels=0;
      for(let i=0;i<a.length;i+=4){if(a[i+3]>128||b[i+3]>128)union++;if(a[i+3]>128&&b[i+3]>128){intersection++;for(let c=0;c<3;c++){colorError+=Math.abs(a[i+c]-b[i+c]);channels++;}}}
      return {alphaIoU:intersection/union,meanColorError:colorError/channels,union};
    });
    pixelChecks.push({hero:name,...metric});assert.ok(metric.union>10000,name);assert.ok(metric.alphaIoU>.99,`${name} alpha ${metric.alphaIoU}`);assert.ok(metric.meanColorError<5,`${name} couleur ${metric.meanColorError}`);
    const rest=await page.locator('#actor-host .mesh-actor').evaluate(c=>c.toDataURL());
    await page.getByRole('button',{name:'Ultime',exact:true}).click();await page.locator('#timeline').fill('0.62');
    const moving=await page.locator('#actor-host .mesh-actor').evaluate(c=>c.toDataURL());assert.notEqual(rest,moving,`${name} ne bouge pas`);
    await page.waitForTimeout(120);assert.equal(await page.locator('#actor-host .mesh-actor').evaluate(c=>c.toDataURL()),moving,'La pose arrêtée change');
    await page.locator('#step').click();assert.notEqual(await page.locator('#actor-host .mesh-actor').evaluate(c=>c.toDataURL()),moving,'Pas à pas inactif');
    await page.locator('#strength').fill('0');assert.equal(await page.locator('#actor-host .mesh-actor').evaluate(c=>c.toDataURL()),rest,'Amplitude zéro différente de la pose fixe');
    await page.locator('#strength').fill('1');
  }
  checks.push('Quatre rigs : restitution RGBA en pose neutre, déformation visible, pose figée et pas à pas');
  await page.getByRole('button',{name:'Animer Séraphine',exact:true}).click();await page.locator('#actor-host .mesh-actor').waitFor();
  await page.locator('#timeline').fill('0.62');await page.locator('#bones').check();
  assert.equal(await page.locator('.mesh-overlay').isVisible(),true);
  await page.screenshot({path:fileURLToPath(new URL('motion-desktop.png',out)),fullPage:true});
  await page.locator('#wireframe').check();await page.locator('#weights').selectOption('weapon');await page.locator('#checker').check();
  await page.screenshot({path:fileURLToPath(new URL('motion-weights.png',out)),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:fileURLToPath(new URL('motion-mobile.png',out)),fullPage:true});
  checks.push('Articulations, poids, maillage, transparence et interface 390 px sans débordement');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${base}play.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('.fighter[data-motion="ready"]').length===4);
  await page.locator('#start').click();await page.locator('#layers-mode').uncheck();await page.locator('#auto').uncheck();
  await page.getByRole('button',{name:'Commander Séraphine',exact:true}).click();
  await page.locator('.skill').nth(1).click();
  await page.waitForFunction(()=>document.querySelector('.fighter .mesh-actor')?.dataset.clip==='skill');
  await page.locator('#pause').click();await page.waitForTimeout(150);
  const frozen=await page.locator('.fighter .mesh-actor').first().evaluate(c=>c.toDataURL());
  await page.waitForTimeout(200);assert.equal(await page.locator('.fighter .mesh-actor').first().evaluate(c=>c.toDataURL()),frozen);
  await page.locator('#motion').uncheck();await page.waitForFunction(()=>[...document.querySelectorAll('.fighter .mesh-actor')].every(c=>c.dataset.clip==='neutral'));
  await page.locator('#motion').check();await page.locator('#resume').click();
  checks.push('Quatre rigs dans le combat, compétence synchronisée, pause visuelle et désactivation du mouvement');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.fighter .mesh-actor')].every(c=>c.dataset.clip==='neutral'));
  assert.equal(await page.locator('#motion').isChecked(),false);
  await page.evaluate(()=>{
    const canvas=document.querySelector('.fighter .mesh-actor'),extension=canvas.getContext('webgl').getExtension('WEBGL_lose_context');
    extension.loseContext();setTimeout(()=>extension.restoreContext(),500);
  });
  await page.waitForFunction(()=>document.querySelectorAll('.fighter[data-motion="fallback"]').length===1);
  assert.equal(await page.locator('.fighter img').first().evaluate(i=>getComputedStyle(i).visibility),'visible');
  await page.waitForFunction(()=>document.querySelectorAll('.fighter[data-motion="ready"]').length===4);
  checks.push('Mouvements réduits, secours sur illustration en perte de contexte GPU et restauration');
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,pixelChecks,errors};await writeFile(new URL('motion-browser-report.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
