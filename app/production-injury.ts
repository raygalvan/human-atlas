import * as T from 'three';
/** Versioned, measured illustrations on reference anatomy. Never a diagnosis. */
export type InjuryRecipe = { kind:'abrasion'|'subarachnoid'|'fracture'; parentId:string; center:[number,number,number]; normal:[number,number,number]; widthMm:number; heightMm:number; depthMm:number };
export type GeometryData={positions:number[];normals:number[];colors:number[];indices:number[]};
export function serializeGeometry(g:T.BufferGeometry):GeometryData {
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color');
 return {positions:Array.from({length:p.count*3},(_,i)=>p.array[i]),normals:Array.from({length:p.count*3},(_,i)=>i%3===0?n.getX(i/3):i%3===1?n.getY(Math.floor(i/3)):n.getZ(Math.floor(i/3))),colors:Array.from({length:p.count*3},(_,i)=>c?c.array[i]:.7),indices:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i)};
}
export function geometryFromData(d:GeometryData,index=0){
 if(!d||!Array.isArray(d.positions)||d.positions.length>1800000||d.positions.length%9||!d.positions.length||d.normals.length!==d.positions.length||d.colors.length!==d.positions.length||d.indices.length%3||d.indices.length>1800000||![...d.positions,...d.normals,...d.colors].every(Number.isFinite)||!d.indices.every(i=>Number.isInteger(i)&&i>=0&&i<d.positions.length/3))throw new Error('Invalid injury geometry');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(d.positions,3));g.setAttribute('normal',new T.BufferAttribute(Int16Array.from(d.normals,n=>Math.round(T.MathUtils.clamp(n,-1,1)*32767)),3,true));g.setAttribute('color',new T.Float32BufferAttribute(d.colors,3));g.setAttribute('partIndex',new T.Float32BufferAttribute(new Array(d.positions.length/3).fill(index),1));g.setIndex(d.indices);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
/** Clips actual source triangles to a local measured polygon. Thickness follows
 * interpolated source normals; no free-floating primitive replaces the anatomy. */
export function createSurfaceInjury(source:T.BufferGeometry,r:InjuryRecipe){
 const center=new T.Vector3(...r.center),normal=new T.Vector3(...r.normal).normalize();
 const u=new T.Vector3(Math.abs(normal.y)<.9?0:1,Math.abs(normal.y)<.9?1:0,0).cross(normal).normalize(),v=normal.clone().cross(u);
 const rx=r.widthMm/2000,ry=r.heightMm/2000,depth=r.depthMm/1000;
 type Vertex={p:T.Vector3;n:T.Vector3};
 const p=source.getAttribute('position'),n=source.getAttribute('normal'),idx=source.index;
 const out:number[]=[],normals:number[]=[],colors:number[]=[];
 const emit=(a:Vertex,b:Vertex,c:Vertex,offset:number,reverse=false)=>{for(const w of reverse?[c,b,a]:[a,b,c]){out.push(...w.p.clone().addScaledVector(w.n,offset).toArray());normals.push(...w.n.clone().multiplyScalar(reverse?-1:1).toArray());const shade=.8+.2*Math.sin(w.p.x*1721+w.p.y*1399);colors.push(.38*shade,.035*shade,.05*shade);}};
 for(let t=0;t<(idx?.count??p.count);t+=3){
  let poly:Vertex[]=[0,1,2].map(k=>{const i=idx?idx.getX(t+k):t+k;return {p:new T.Vector3().fromBufferAttribute(p,i),n:new T.Vector3().fromBufferAttribute(n,i).normalize()};});
  if(poly.every(w=>w.n.dot(normal)<.15))continue;
  // Tangent depth slab prevents a footprint hitting the far side of an organ.
  const planes:Array<(w:Vertex)=>number>=[w=>Math.max(rx,ry)*.6-w.p.clone().sub(center).dot(normal),w=>Math.max(rx,ry)*.6+w.p.clone().sub(center).dot(normal)];
  for(let j=0;j<48;j++){const a=j*Math.PI*2/48;planes.push(w=>{const d=w.p.clone().sub(center);return 1-d.dot(u)/rx*Math.cos(a)-d.dot(v)/ry*Math.sin(a);});}
  for(const plane of planes){const next:Vertex[]=[];poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],da=plane(a),db=plane(b);if(da>=0)next.push(a);if((da>=0)!==(db>=0)){const f=da/(da-db);next.push({p:a.p.clone().lerp(b.p,f),n:a.n.clone().lerp(b.n,f).normalize()});}});poly=next;if(!poly.length)break;}
  for(let j=1;j+1<poly.length;j++){emit(poly[0],poly[j],poly[j+1],depth);if(depth){emit(poly[0],poly[j],poly[j+1],0,true);}}
  if(depth)poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],aa={p:a.p.clone().addScaledVector(a.n,depth),n:a.n},bb={p:b.p.clone().addScaledVector(b.n,depth),n:b.n};emit(a,b,bb,0);emit(a,bb,aa,0);});
 }
 if(!out.length)throw new Error('The measured footprint does not intersect the selected anatomy. Review placement and normal direction.');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(Array.from({length:out.length/3},(_,i)=>i));return g;
}
