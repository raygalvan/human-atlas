import * as T from 'three';
/** Synthetic mechanical demonstration, not patient imaging or a case finding. */
export const RIB_FRACTURE={parent:'FJ3229',concept:'FMA8012',center:[.083,1.387,.010] as const,gap:.0012};
type V={p:T.Vector3;n:T.Vector3;c:T.Color};
const field=(p:T.Vector3)=>p.z-.010+.00065*Math.sin((p.x-.09)*1400)+.0004*Math.sin((p.y-1.39)*1900);
const blend=(a:V,b:V,t:number):V=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),c:a.c.clone().lerp(b.c,t)});
/** Rebuilt from whichever registered source geometry is active. Original surfaces
 * outside the small fracture slab are copied exactly, without displacement. */
export function fractureGeometry(source:T.BufferGeometry,parentIndex:number){
 const pos=source.getAttribute('position'),normal=source.getAttribute('normal'),color=source.getAttribute('color'),idx=source.index!;
 const points:number[]=[],normals:number[]=[],colors:number[]=[],segments:[T.Vector3,T.Vector3][][]=[[],[]];let faces=0;
 const emit=(v:V[])=>{for(let k=1;k+1<v.length;k++)for(const w of [v[0],v[k],v[k+1]]){points.push(...w.p.toArray());normals.push(...w.n.toArray());colors.push(w.c.r,w.c.g,w.c.b);}};
 const clip=(tri:V[],sign:number,bucket:number)=>{
  const out:V[]=[],edge:T.Vector3[]=[];
  tri.forEach((a,i)=>{const b=tri[(i+1)%3],da=sign*field(a.p)-RIB_FRACTURE.gap/2,db=sign*field(b.p)-RIB_FRACTURE.gap/2;
   if(da>=0)out.push(a);
   if((da>=0)!==(db>=0)){const v=blend(a,b,da/(da-db));out.push(v);edge.push(v.p);}
  });emit(out);if(edge.length===2&&edge[0].distanceToSquared(edge[1])>1e-16)segments[bucket].push([edge[0],edge[1]]);
 };
 const cut=(tri:V[],depth=0)=>{
  const lengths=tri.map((v,i)=>v.p.distanceToSquared(tri[(i+1)%3].p)),max=Math.max(...lengths);
  if(max>.0015**2&&depth<12){const i=lengths.indexOf(max),a=tri[i],b=tri[(i+1)%3],c=tri[(i+2)%3],m=blend(a,b,.5);cut([a,m,c],depth+1);cut([m,b,c],depth+1);return;}
  clip(tri,1,0);clip(tri,-1,1);
 };
 for(let t=0;t<idx.count;t+=3){const tri=[0,1,2].map(k=>{const i=idx.getX(t+k);return {p:new T.Vector3().fromBufferAttribute(pos,i),n:new T.Vector3().fromBufferAttribute(normal,i),c:color?new T.Color().setRGB(color.getX(i),color.getY(i),color.getZ(i)):new T.Color('#d8cbb1')};});
  if(tri.every(v=>v.p.z<.005)||tri.every(v=>v.p.z>.015)||tri.every(v=>v.p.x<.07))emit(tri);else cut(tri);
 }
 // Close the two cut contours with explicitly illustrative solid fracture faces.
 // These are NOT reconstructed cortex, marrow, or trabecular anatomy.
 for(let side=0;side<2;side++){
  const pool=segments[side].slice();
  while(pool.length){const first=pool.pop()!,loop=[first[0],first[1]];let closed=false;
   for(let step=0;step<segments[side].length+1;step++){
    const end=loop.at(-1)!;if(end.distanceToSquared(loop[0])<1e-12){closed=true;loop.pop();break;}
    const i=pool.findIndex(e=>e.some(p=>p.distanceToSquared(end)<1e-12));if(i<0)break;
    const e=pool.splice(i,1)[0];loop.push(e[0].distanceToSquared(end)<1e-12?e[1]:e[0]);
   }
   if(!closed||loop.length<3)continue;
   const polygon=loop.map(p=>new T.Vector2(p.x,p.y));
   for(const ids of T.ShapeUtils.triangulateShape(polygon,[])){
    const vertices=ids.map(i=>loop[i]);const n=new T.Vector3().subVectors(vertices[1],vertices[0]).cross(new T.Vector3().subVectors(vertices[2],vertices[0])).normalize();if(n.z*(side===0?-1:1)<0){vertices.reverse();n.negate();}
    emit(vertices.map(p=>({p,n,c:new T.Color('#a89474')})));faces++;
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('normal',new T.BufferAttribute(Int16Array.from(normals,n=>Math.round(T.MathUtils.clamp(n,-1,1)*32767)),3,true));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('partIndex',new T.Float32BufferAttribute(new Array(points.length/3).fill(parentIndex),1));g.setIndex(new T.BufferAttribute(Uint32Array.from({length:points.length/3},(_,i)=>i),1));g.computeBoundingBox();g.computeBoundingSphere();g.userData.fractureFaces=faces;return g;
}
