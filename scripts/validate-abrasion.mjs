import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {abrasionGeometry,ABRASION} from '../app/abrasion.ts';
const atlas=JSON.parse(readFileSync('public/models/atlas.json')),p=atlas.parts.find(p=>p.id===ABRASION.parent),b=readFileSync('public'+atlas.chunks[p.chunk].url);
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Int16Array(b.buffer,b.byteOffset+p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount),1));
const overlay=abrasionGeometry(g,17),pos=overlay.getAttribute('position'),tri=new T.Triangle(),v=new T.Vector3(),bary=new T.Vector3();assert(pos.count>300);let maxDistance=0;
for(let i=0;i<pos.count;i++){
 const t=overlay.userData.sourceTriangles[i];[tri.a,tri.b,tri.c].forEach((v,k)=>v.fromBufferAttribute(g.getAttribute('position'),g.index.getX(t*3+k)));
 v.fromBufferAttribute(pos,i);tri.getBarycoord(v,bary);assert(Math.min(...bary.toArray())>-.0001);maxDistance=Math.max(maxDistance,tri.closestPointToPoint(v,new T.Vector3()).distanceTo(v));assert(v.x>0&&v.z<-.055);assert.equal(overlay.getAttribute('partIndex').getX(i),17);
}assert(maxDistance<1e-6);assert(overlay.boundingBox.max.z-overlay.boundingBox.min.z>.005,'Must follow curved skin, not a plane');
console.log(JSON.stringify({parent:p.id,triangles:pos.count/3,maxDistanceMeters:maxDistance,bounds:overlay.boundingBox},null,2));
