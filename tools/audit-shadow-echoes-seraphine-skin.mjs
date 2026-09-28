import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {inspectHeroGlb} from './lib/shadow-echoes/hero-asset-gate.mjs';

const root=resolve(import.meta.dirname,'..'),base=resolve(root,'workspaces/shadow-echoes'),model=resolve(base,'03_assets/characters/seraphine/modeling/seraphine-skin-pilot.glb'),motionPath=resolve(base,'02_production/lot-10/seraphine-skin-validation.json'),output=resolve(base,'03_assets/characters/seraphine/modeling/skin-pilot-qa.json');
const bytes=await readFile(model),structure=inspectHeroGlb(bytes,{hero:'seraphine',stage:'release'}),motion=JSON.parse(await readFile(motionPath,'utf8'));
const technicalPass=structure.pass&&motion.deforms&&motion.plausible_deformation&&motion.skinned_vertices===structure.metrics.skinnedVertices&&motion.bones===structure.metrics.joints;
const report={hero:'seraphine',model,sha256:createHash('sha256').update(bytes).digest('hex'),technical_pass:technicalPass,artistic_status:'not_approved',artistic_reason:'Le visage, les cheveux, les matières et la silhouette du costume restent éloignés de la fiche cible.',structure,motion};
await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({technical_pass:technicalPass,artistic_status:report.artistic_status,sha256:report.sha256,metrics:structure.metrics},null,2));
if(!technicalPass)process.exitCode=1;
