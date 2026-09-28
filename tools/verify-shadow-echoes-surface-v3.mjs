import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { parseGlb, inspectHeroGlb } from './lib/shadow-echoes/hero-asset-gate.mjs';

const model='workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-surface-v3.glb';
const data=await readFile(model),report=inspectHeroGlb(data,{stage:'release',hero:'seraphine'});
assert.equal(report.pass,true,report.errors.join('; '));
const {json}=parseGlb(data),surfaces=json.materials.filter(material=>material.name.startsWith('V3_PBR_'));
assert.equal(surfaces.length,2);
for(const material of surfaces){
 assert.ok(material.pbrMetallicRoughness?.baseColorTexture,`${material.name}: base color`);
 assert.ok(material.pbrMetallicRoughness?.metallicRoughnessTexture,`${material.name}: metallic roughness`);
 assert.ok(material.normalTexture,`${material.name}: normal`);
}
for(const mesh of json.meshes.filter(mesh=>/retopped_UV_V3/.test(mesh.name)))for(const primitive of mesh.primitives){
 assert.notEqual(primitive.attributes.TEXCOORD_0,undefined,`${mesh.name}: UV`);
 assert.notEqual(primitive.attributes.JOINTS_0,undefined,`${mesh.name}: joints`);
 assert.notEqual(primitive.attributes.WEIGHTS_0,undefined,`${mesh.name}: weights`);
}

const {chromium}=await import('playwright').catch(()=>import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs',import.meta.url).href));
const browser=await chromium.launch({headless:true});
const out='workspaces/shadow-echoes/02_production/lot-12/qa';
await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.setDefaultTimeout(120000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=surface',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#clip')?.options.length===42);
 assert.match(await page.locator('#source').textContent(),/V3/);
 assert.match(await page.locator('#model-status').textContent(),/Structure conforme/);
 await page.waitForTimeout(700);
 await page.screenshot({path:`${out}/seraphine-v3-atelier.png`,timeout:120000});
 await page.locator('#angle').click();
 await page.screenshot({path:`${out}/seraphine-v3-front.png`,timeout:120000});
 await page.locator('#head-detail').click();
 await page.locator('#stage').screenshot({path:`${out}/seraphine-v3-face-detail.png`,timeout:120000});
 await page.locator('#combat-scale').click();
 assert.equal(await page.locator('#combat-scale').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:`${out}/seraphine-v3-combat-scale.png`,timeout:120000});
 await page.goto('http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=surface-v3',{waitUntil:'domcontentloaded'});
 await page.locator('[data-node=entry]').click();
 await page.locator('#toggle-render').click();
 await page.locator('#arena-volume[data-seraphine-model="surface-v3"]').waitFor({timeout:120000});
 await page.waitForTimeout(700);
 await page.screenshot({path:`${out}/seraphine-v3-battle.png`,timeout:120000});
 assert.deepEqual(errors,[]);
 console.log(`Séraphine V3 : ${report.metrics.animations} clips, ${report.metrics.joints} joints, deux surfaces UV/PBR et revue navigateur/échelle combat valides.`);
}finally{await browser.close();}
