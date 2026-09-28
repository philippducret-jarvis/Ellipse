import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {parseGlb,inspectHeroGlb} from './lib/shadow-echoes/hero-asset-gate.mjs';

const base='workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/';
const groom=process.argv.includes('--groom'),variant=groom?'v4-1':'v4',model=groom?'seraphine-silhouette-v4-1':'seraphine-silhouette-v4-optimized';
const full=await readFile(base+model+'.glb');
const report=inspectHeroGlb(full,{stage:'release',hero:'seraphine'});
assert.equal(report.pass,true,report.errors.join('; '));
assert.equal(report.metrics.meshes,8);
const {json}=parseGlb(full);
for(const name of ['V4_PBR_Silver_Hair','V4_PBR_Crimson_Silk','V4_PBR_Charcoal_Silk']){
 const mat=json.materials.find(m=>m.name===name);
 assert.ok(mat,`${name} missing`);
 assert.ok(mat.pbrMetallicRoughness?.baseColorTexture,`${name} base color`);
 assert.ok(mat.pbrMetallicRoughness?.metallicRoughnessTexture,`${name} metal/roughness`);
 assert.ok(mat.normalTexture,`${name} normal`);
}
const runtime=inspectHeroGlb(await readFile(base+(groom?'seraphine-silhouette-v4-1-runtime.glb':'seraphine-silhouette-v4-runtime.glb')),{stage:'preview',hero:'seraphine'});
assert.ok(runtime.metrics.animations===8);

const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
const out='workspaces/shadow-echoes/02_production/lot-13/qa';
await mkdir(out,{recursive:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto(`http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=${groom?'groom':'silhouette'}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#clip')?.options.length===42);
 assert.match(await page.locator('#source').textContent(),groom?/V4\.1/:/V4/);
 assert.match(await page.locator('#model-status').textContent(),/Structure conforme/);
 await page.waitForTimeout(650);
 await page.screenshot({path:`${out}/seraphine-${variant}-atelier.png`,timeout:120000});
 await page.locator('#angle').click();
 await page.screenshot({path:`${out}/seraphine-${variant}-front.png`,timeout:120000});
 await page.locator('#head-detail').click();
 await page.locator('#stage').screenshot({path:`${out}/seraphine-${variant}-face-detail.png`,timeout:120000});
 await page.locator('#combat-scale').click();
 await page.screenshot({path:`${out}/seraphine-${variant}-combat-scale.png`,timeout:120000});
 await page.goto(`http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=${groom?'groom-v4-1':'silhouette-v4'}`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 await page.locator(`#arena-volume[data-seraphine-model="${groom?'groom-v4-1':'silhouette-v4'}"][data-environment="modeled-v2"]`).waitFor({timeout:120000});
 await page.waitForTimeout(600);
 await page.screenshot({path:`${out}/seraphine-${variant}-battle-modeled.png`,timeout:120000});
 assert.deepEqual(errors,[]);
 console.log(`Séraphine ${variant} : ${report.metrics.meshes} maillages skinnés, ${report.metrics.animations} clips, ${report.metrics.joints} articulations ; atelier et combat vérifiés.`);
}finally{await browser.close();}
