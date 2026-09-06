import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {inspectionGroups,partIsVisible,isClipped,SOURCE_REGISTRATION} from '../app/inspection.ts';
import {attachmentCompatible,surfaceMaskWeight,VERIFIED_INJURY_RECORDS} from '../app/injury-attachments.ts';
const atlas=JSON.parse(readFileSync('public/models/atlas.json')),detail=JSON.parse(readFileSync('public/models/inspection/detail.json'));
const groups=inspectionGroups(atlas),ids=new Set();let triangles=0;
const buffers=detail.chunks.map(c=>{const gz=readFileSync('public'+c.gzip),b=gunzipSync(gz);assert.equal(gz.length,c.gzipBytes);assert.equal(b.length,c.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),c.sha256);return b;});
for(const p of detail.parts){
 assert(!ids.has(p.id));ids.add(p.id);const base=atlas.parts.find(x=>x.id===p.id);for(const key of ['name','conceptId','system'])assert.equal(p[key],base[key]);
 const b=buffers[p.chunk];for(const [offset,count,size] of [[p.positions,p.vertexCount*3,4],[p.normals,p.vertexCount*3,2],[p.indices,p.indexCount,4]])assert(offset%size===0&&offset+count*size<=b.length);
 const pos=new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),n=new Int16Array(b.buffer,b.byteOffset+p.normals,p.vertexCount*3),ix=new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount);
 for(const i of ix)assert(i<p.vertexCount);for(const v of pos)assert(Number.isFinite(v));
 for(let i=0;i<n.length;i+=3)assert(Math.abs(Math.hypot(...n.subarray(i,i+3))/32767-1)<.002,'Source normals must be unit length');
 for(let e=0;e<2;e++)for(let a=0;a<3;a++){const values=pos.filter((_,i)=>i%3===a);const bound=e?Math.max(...values):Math.min(...values);assert.equal(bound,p.bounds[e][a]);assert(Math.abs(bound-base.bounds[e][a])<2e-7);}
 const hash=createHash('sha256').update(Buffer.from(pos.buffer,pos.byteOffset,pos.byteLength)).update(Buffer.from(ix.buffer,ix.byteOffset,ix.byteLength)).digest('hex');assert.equal(hash,p.topology);assert(p.indexCount>=base.indexCount);triangles+=p.indexCount/3;
}
assert.equal(triangles,detail.triangles);assert(groups.brain.every(id=>ids.has(id)));assert.equal(groups.rib[0],'FJ3229');
const rib=atlas.parts.find(p=>p.id==='FJ3229'),opposite=atlas.parts.find(p=>p.name==='Right second rib');assert(rib.bounds[0][0]>0&&opposite.bounds[1][0]<0,'Patient laterality must be established from named structures');
const uniqueComponents=new Set(groups.components.flatMap(c=>c.ids));assert.equal(uniqueComponents.size,groups.brain.length);assert.equal(groups.components.flatMap(c=>c.ids).length,groups.brain.length,'Component controls must partition existing brain meshes');
const state={selected:[rib.id],visible:[],isolate:true};assert(partIsVisible(rib,state));assert(!partIsVisible(rib,{...state,hiddenParts:[rib.id]}));assert(!partIsVisible(rib,{...state,selected:[]}));
assert(!isClipped(.1,true,0));assert(isClipped(.02,true,.5));assert(!isClipped(.02,false,.5));
const mask={method:'reference-space-surface-mask',registration:SOURCE_REGISTRATION,center:[0,0,0],normal:[0,0,1],radius:.01,depth:.003};
assert(attachmentCompatible(mask,SOURCE_REGISTRATION,'new-topology'));assert(!attachmentCompatible(mask,'different-registration','new-topology'));
assert(attachmentCompatible({method:'triangle-barycentric',topology:'a'},SOURCE_REGISTRATION,'a'));assert(!attachmentCompatible({method:'triangle-barycentric',topology:'a'},SOURCE_REGISTRATION,'b'));
assert.equal(surfaceMaskWeight([.001,0,0],[0,0,1],mask),1);assert.equal(surfaceMaskWeight([.1,0,0],[0,0,1],mask),0);assert.equal(surfaceMaskWeight([0,0,.1],[0,0,1],mask),0);assert.equal(surfaceMaskWeight([0,0,0],[0,0,-1],mask),0);assert.equal(VERIFIED_INJURY_RECORDS.length,0);
console.log(`PASS: ${ids.size} original-detail meshes, ${triangles} triangles, exact source IDs/registration/bounds, unit normals, hashes, component membership, patient laterality and attachment compatibility.`);
