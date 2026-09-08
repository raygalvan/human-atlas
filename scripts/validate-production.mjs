import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateInjury} from '../app/production-worker.ts';
const atlas=JSON.parse(readFileSync('public/models/atlas.json','utf8'));
for(const recipe of [
 {kind:'abrasion',parentId:'FJ2810',center:[.172,1.397,-.10],normal:[0,0,-1],widthMm:70,heightMm:58,depthMm:0},
 {kind:'subarachnoid',parentId:'FJ1833',center:[.028,1.693,.006],normal:[0,1,0],widthMm:60,heightMm:68,depthMm:.5},
 {kind:'fracture',parentId:'FJ3229',center:[.083,1.387,.010],normal:[0,0,1],widthMm:20,heightMm:20,depthMm:1.2}
]){
 const p=atlas.parts.find(p=>p.id===recipe.parentId),buffer=readFileSync('public/'+atlas.chunks[p.chunk].url.replace(/^\//,'')),ab=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
 const positions=Array.from(new Float32Array(ab,p.positions,p.vertexCount*3)),normals=Array.from(new Int16Array(ab,p.normals,p.vertexCount*3),n=>n/32767),indices=Array.from(new Uint32Array(ab,p.indices,p.indexCount));
 const before=positions.slice();const result=generateInjury(positions,normals,indices,recipe);assert.deepEqual(positions,before);assert.ok(result.geometry.positions.length>90);assert.ok(result.geometry.positions.every(Number.isFinite));assert.equal(result.mode,recipe.kind==='fracture'?'replacement':'overlay');
 for(let i=0;i<result.geometry.positions.length;i++){const a=i%3;assert.ok(result.geometry.positions[i]>=p.bounds[0][a]-.012&&result.geometry.positions[i]<=p.bounds[1][a]+.012,'Registered inside parent bounds plus stated thickness');}
 console.log(recipe.kind,result.geometry.positions.length/9,'triangles registered to',p.name);
}
