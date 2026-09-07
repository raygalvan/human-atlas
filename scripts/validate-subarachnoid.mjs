import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {SAH,subarachnoidGeometry} from '../app/subarachnoid.ts';
for(const catalogue of ['atlas','inspection/detail']){
 const a=JSON.parse(readFileSync('public/models/'+catalogue+'.json'));let count=0,maxOffset=0;
 for(const id of SAH.parents){
  const p=a.parts.find(p=>p.id===id),c=a.chunks[p.chunk],b=c.gzip?gunzipSync(readFileSync('public'+c.gzip)):readFileSync('public'+c.url);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Int16Array(b.buffer,b.byteOffset+p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount),1));
  const before=Buffer.from(g.getAttribute('position').array).toString('base64'),overlay=subarachnoidGeometry(g,42),pos=overlay.getAttribute('position');assert(pos.count>300,id+' must have a genuine mesh patch');count+=pos.count/3;
  const tri=new T.Triangle(),anchor=new T.Vector3(),v=new T.Vector3(),bary=new T.Vector3();
  for(let i=0;i<pos.count;i++){
   const t=overlay.userData.sourceTriangles[i];[tri.a,tri.b,tri.c].forEach((v,k)=>v.fromBufferAttribute(g.getAttribute('position'),g.index.getX(t*3+k)));
   anchor.fromArray(overlay.userData.anchors,i*3);v.fromBufferAttribute(pos,i);tri.getBarycoord(anchor,bary);assert(Math.min(...bary.toArray())>-.0002);assert(tri.closestPointToPoint(anchor,new T.Vector3()).distanceTo(anchor)<1e-6);
   assert(v.toArray().every(Number.isFinite));const offset=v.distanceTo(anchor);assert(offset<.0009);maxOffset=Math.max(maxOffset,offset);assert(anchor.x>0&&anchor.y>1.674);assert.equal(overlay.getAttribute('partIndex').getX(i),42);
  }
  assert.equal(before,Buffer.from(g.getAttribute('position').array).toString('base64'));assert(overlay.boundingBox.max.y-overlay.boundingBox.min.y>.003,'Follows actual folds, not a plane');
 }
 console.log(catalogue,{parents:SAH.parents,triangles:count,maxOffsetMeters:maxOffset});
}
