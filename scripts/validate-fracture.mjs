import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {fractureGeometry} from '../app/rib-fracture.ts';
for(const name of ['atlas','inspection/detail']){
 const a=JSON.parse(readFileSync('public/models/'+name+'.json')),p=a.parts.find(p=>p.id==='FJ3229'),chunk=a.chunks[p.chunk],b=chunk.gzip?gunzipSync(readFileSync('public'+chunk.gzip)):readFileSync('public'+chunk.url);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Int16Array(b.buffer,b.byteOffset+p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount),1));g.computeBoundingBox();
 const before=Buffer.from(g.getAttribute('position').array.buffer).toString('base64'),cut=fractureGeometry(g,42);assert.equal(cut.getAttribute('normal').array.constructor,g.getAttribute('normal').array.constructor);assert.equal(cut.getAttribute('normal').normalized,g.getAttribute('normal').normalized);assert(cut.userData.fractureFaces>0,'Cut faces must be closed');assert.deepEqual(cut.boundingBox,g.boundingBox);assert.equal(before,Buffer.from(g.getAttribute('position').array.buffer).toString('base64'),'Normal source must remain intact');
 const source=g.getAttribute('position'),out=cut.getAttribute('position');const keys=new Set();for(let i=0;i<out.count;i++){const p=[out.getX(i),out.getY(i),out.getZ(i)];assert(p.every(Number.isFinite));keys.add(p.join(','));assert.equal(cut.getAttribute('partIndex').getX(i),42);}
 for(let i=0;i<source.count;i++)if(source.getZ(i)<.005||source.getZ(i)>.015)assert(keys.has([source.getX(i),source.getY(i),source.getZ(i)].join(',')),'Remote original surfaces retained');
 console.log(name,{normalTriangles:g.index.count/3,fractureTriangles:cut.index.count/3,cutFaces:cut.userData.fractureFaces});
}
