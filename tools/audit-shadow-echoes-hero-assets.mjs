import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHeroGlb} from './lib/shadow-echoes/hero-asset-gate.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2),stage=args.includes('--preview')?'preview':'release',enforce=args.includes('--enforce');
const heroFlag=args.indexOf('--hero'),heroArg=heroFlag>=0?args[heroFlag+1]:null,pathArg=args.find((arg,index)=>!arg.startsWith('--')&&(heroFlag<0||index!==heroFlag+1));
const heroes=['seraphine','nyxara','lysael','voren'];
const candidates=pathArg?[[heroArg??basename(dirname(resolve(pathArg))),resolve(pathArg)]]:heroes.map(id=>[id,resolve(root,'workspaces/shadow-echoes/03_assets/characters',id,'volume-v1/hero.glb')]);
const results=[];for(const [hero,path] of candidates){try{const data=await readFile(path);results.push({path,...inspectHeroGlb(data,{hero,stage})});}catch(error){results.push({hero,path,stage,pass:false,errors:[error.message],warnings:[]});}}
const report={stage,passed:results.every(r=>r.pass),results};
if(!pathArg){const output=resolve(root,'workspaces/shadow-echoes/02_production/lot-08/hero-asset-gate.json');await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
if(enforce&&!report.passed)process.exitCode=1;
