import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectHeroGlb,parseGlb} from './hero-asset-gate.mjs';

function fixture(){
 const bin=Buffer.alloc(36);bin.writeUInt16LE(1,12);bin.writeUInt16LE(2,14);bin.writeFloatLE(.5,20);bin.writeFloatLE(.5,24);
 const clips=['idle','idleLook','walk','run','dodgeForward','attack1','hitLight','death','summon'];
 const gltf={asset:{version:'2.0'},buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:12},{buffer:0,byteOffset:12,byteLength:8},{buffer:0,byteOffset:20,byteLength:16}],accessors:[{bufferView:0,componentType:5126,count:1,type:'VEC3'},{bufferView:1,componentType:5123,count:1,type:'VEC4'},{bufferView:2,componentType:5126,count:1,type:'VEC4'}],meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2}}]}],nodes:[{mesh:0,skin:0},...Array.from({length:17},(_,i)=>({name:`bone${i}`}))],skins:[{joints:Array.from({length:17},(_,i)=>i+1)}],animations:clips.map(name=>({name,channels:[{target:{node:1,path:'rotation'},sampler:0}]}))};
 const json=Buffer.from(JSON.stringify(gltf)),padding=(4-json.length%4)%4,jsonChunk=Buffer.concat([json,Buffer.alloc(padding,32)]),header=Buffer.alloc(12),chunkHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonChunk.length+8+bin.length,8);chunkHeader.writeUInt32LE(jsonChunk.length);chunkHeader.write('JSON',4);binHeader.writeUInt32LE(bin.length);binHeader.write('BIN\0',4);return Buffer.concat([header,chunkHeader,jsonChunk,binHeader,bin]);
}

test('Le contrôle refuse les GLB corrompus et les modèles articulés sans peau',async()=>{
 assert.throws(()=>parseGlb(Buffer.from('bad')));
 const source=new URL('../../../workspaces/shadow-echoes/03_assets/characters/seraphine/volume-v1/hero.glb',import.meta.url);
 const report=inspectHeroGlb(await readFile(source),{hero:'seraphine'});
 assert.equal(report.pass,false);assert.equal(report.metrics.animations,42);assert.equal(report.metrics.skins,0);
 assert.match(report.errors.join(' '),/peau pondérée/);
});

test('Une peau avec influences multiples et clips ciblant le squelette passe le contrôle préliminaire',()=>{
 const candidate=fixture(),preview=inspectHeroGlb(candidate,{stage:'preview',hero:'seraphine'});
 assert.equal(preview.pass,true,preview.errors.join('; '));assert.equal(preview.metrics.joints,17);assert.equal(preview.metrics.multiInfluenceRatio,1);
 const release=inspectHeroGlb(candidate,{stage:'release',hero:'seraphine'});assert.equal(release.pass,false);assert.ok(release.metrics.missingClips.length>0);
});
