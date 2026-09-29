import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const version=process.argv[2]??'lookdev-v3';
const camera=process.argv[3]==='focus'?'&camera=seraphine':process.argv[3]==='portrait'?'&camera=portrait':'';
const reduced=process.argv.includes('--reduced');
const yawArgument=process.argv.find(argument=>argument.startsWith('--yaw='));
const yaw=yawArgument?Number(yawArgument.slice('--yaw='.length)):0;
assert.ok(Number.isFinite(yaw)&&Math.abs(yaw)<=.25);
assert.ok(['lookdev-v3','lookdev-v4','lookdev-v5','lookdev-v6','lookdev-v7','lookdev-v8','lookdev-v9','lookdev-v10'].includes(version));
const out='workspaces/shadow-echoes/02_production/lot-15/qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:reduced?'reduce':'no-preference'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto(`http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=${version}${camera}${yawArgument?`&reviewYaw=${yaw}`:''}`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 try{await page.locator(`#arena-volume[data-seraphine-model="${version}"][data-seraphine-materials="reference-with-silhouette-matte"][data-seraphine-keyposes="3"][data-seraphine-mattes="${version==='lookdev-v10'?2:3}"][data-enemy-sprites="3"]`).waitFor({timeout:60000});}
 catch(error){console.error('Etat du rendu :',await page.locator('#arena-volume').evaluate(node=>({...node.dataset})).catch(()=>null),'Erreurs :',errors);throw error;}
 if(version==='lookdev-v7')await page.locator('#arena-volume[data-seraphine-motion="reference-hair-region-and-keyposes"]').waitFor();
 if(version==='lookdev-v8')await page.locator('#arena-volume[data-seraphine-motion="reference-hair-cloth-and-keyposes"]').waitFor();
 if(version==='lookdev-v9'){
  await page.locator('#arena-volume[data-seraphine-depth="reference-heightfield-v1"]').waitFor();
  const depthRange=Number(await page.locator('#arena-volume').getAttribute('data-seraphine-depth-range'));
  assert.ok(depthRange>.08&&depthRange<.2,`Carte de profondeur incomplète : ${depthRange}`);
 }
 if(version==='lookdev-v10'){
  await page.locator('#arena-volume[data-seraphine-attack-alpha="intrinsic-png"]').waitFor();
  const alpha=await page.evaluate(async()=>{
   const image=new Image();image.src='/workspaces/shadow-echoes/03_assets/characters/seraphine/lookdev/seraphine-reference-attack-alpha-v10.png';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);
   const sample=(x,y)=>context.getImageData(x,y,1,1).data[3];
   return {size:[image.width,image.height],corner:sample(0,0),face:sample(520,220),cape:sample(600,800)};
  });
  assert.deepEqual(alpha.size,[1024,1536]);assert.ok(alpha.corner<5&&alpha.face>240&&alpha.cape>200,`Alpha de la frappe incorrect : ${JSON.stringify(alpha)}`);
 }
 await page.waitForTimeout(500);
 const cameraLabel=(camera.includes('portrait')?'-portrait':camera?'-focus':'')+(reduced?'-reduced':'')+(yawArgument?`-yaw-${String(yaw).replace('.','_')}`:'');
 await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-battle.png`});
 if(version==='lookdev-v8'){await page.waitForTimeout(900);await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-idle-late.png`});}
 await page.locator('[data-action=basic]').click();
 await page.locator('#arena [data-unit=sentry-a]').click();
 await page.locator('#arena-volume[data-seraphine-pose="windup"]').waitFor({timeout:15000});
 await page.locator('#arena-volume[data-seraphine-pose="attack"]').waitFor({timeout:15000});
 await page.screenshot({path:`${out}/seraphine-${version}${cameraLabel}-attack.png`});
 assert.deepEqual(errors,[]);
 console.log(`Séraphine ${version} : silhouettes et pose de frappe chargées en combat.`);
}finally{await browser.close();}
