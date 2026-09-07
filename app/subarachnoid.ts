import * as T from 'three';
/** Authored capability fixture. No patient evidence or measured hemorrhage. */
export const SAH={id:'synthetic-left-frontal-sah-v1',parents:['FJ1833','FJ1787','FJ1800'],laterality:'left',region:'left superior frontal convexity and modeled sulcal surfaces',center:[.028,1.693,.006] as const,source:'https://www.ncbi.nlm.nih.gov/books/NBK441958/',review:'synthetic-unreviewed',placement:'current-topology-barycentric-shell'};
type V={p:T.Vector3;n:T.Vector3;depth:number};
const blend=(a:V,b:V,t:number):V=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),depth:T.MathUtils.lerp(a.depth,b.depth,t)});
// Uneven local footprint, evaluated in reference coordinates, not screen space.
const coverage=(p:T.Vector3)=>{
 const x=(p.x-.028)/.030,z=(p.z-.006)/.034,a=Math.atan2(z,x);
 const rim=1+.15*Math.sin(3*a+.4)+.07*Math.sin(7*a)+.045*Math.sin(11*a);
 return Math.min(rim-Math.hypot(x,z),(p.y-1.675)/.009,(p.x-.004)/.008);
};
/** A thin illustrative blood layer attached to current source triangles.
 * Concavity comes from the source mesh's one-ring geometry, not invented folds.
 * Midpoints only tessellate the overlay; reference anatomy is never modified. */
export function subarachnoidGeometry(source:T.BufferGeometry,parentIndex:number){
 const p=source.getAttribute('position'),n=source.getAttribute('normal'),idx=source.index!;
 const neighbors=Array.from({length:p.count},()=>new Set<number>());
 for(let i=0;i<idx.count;i+=3){const a=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];a.forEach((v,j)=>{neighbors[v].add(a[(j+1)%3]);neighbors[v].add(a[(j+2)%3]);});}
 const vertices=Array.from({length:p.count},(_,i)=>{const pos=new T.Vector3().fromBufferAttribute(p,i),normal=new T.Vector3().fromBufferAttribute(n,i).normalize(),mean=new T.Vector3();neighbors[i].forEach(j=>mean.add(new T.Vector3().fromBufferAttribute(p,j)));if(neighbors[i].size)mean.divideScalar(neighbors[i].size);const concavity=Math.max(0,mean.sub(pos).dot(normal));return {p:pos,n:normal,depth:T.MathUtils.clamp(concavity/.0008,0,1)};});
 const positions:number[]=[],normals:number[]=[],colors:number[]=[],anchors:number[]=[],triangles:number[]=[];
 const emit=(vs:V[],id:number,underside=false)=>{for(let k=1;k+1<vs.length;k++)for(const v of (underside?[vs[0],vs[k+1],vs[k]]:[vs[0],vs[k],vs[k+1]])){
  const f=T.MathUtils.smoothstep(Math.max(0,coverage(v.p)),0,.16),thickness=underside?.000015:(.00010+.00075*v.depth)*f+.000025;
  positions.push(...v.p.clone().addScaledVector(v.n,thickness).toArray());normals.push(...v.n.clone().multiplyScalar(underside?-1:1).toArray());anchors.push(...v.p.toArray());triangles.push(id);
  const c=new T.Color('#7f1624').lerp(new T.Color('#390812'),v.depth*.8);colors.push(c.r,c.g,c.b);
 }};
 const cut=(vs:V[],id:number,depth=0)=>{
  const lens=vs.map((v,i)=>v.p.distanceToSquared(vs[(i+1)%3].p));const max=Math.max(...lens);
  if(max>.0015**2&&depth<10){const i=lens.indexOf(max),a=vs[i],b=vs[(i+1)%3],c=vs[(i+2)%3],m=blend(a,b,.5);cut([a,m,c],id,depth+1);cut([m,b,c],id,depth+1);return;}
  const poly:V[]=[];vs.forEach((a,i)=>{const b=vs[(i+1)%3],da=coverage(a.p),db=coverage(b.p);if(da>=0)poly.push(a);if((da>=0)!==(db>=0))poly.push(blend(a,b,da/(da-db)));});
  if(poly.length>2){emit(poly,id);emit(poly,id,true);}
 };
 for(let i=0;i<idx.count;i+=3){const vs=[vertices[idx.getX(i)],vertices[idx.getX(i+1)],vertices[idx.getX(i+2)]];if(new T.Triangle(vs[0].p,vs[1].p,vs[2].p).getArea()<1e-14)continue;if(vs.every(v=>v.p.y<1.674)||vs.every(v=>v.p.x<.003)||vs.every(v=>v.p.x>.066)||vs.every(v=>v.p.z<-.038)||vs.every(v=>v.p.z>.050))continue;cut(vs,i/3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('partIndex',new T.Float32BufferAttribute(new Array(positions.length/3).fill(parentIndex),1));g.userData.anchors=new Float64Array(anchors);g.userData.sourceTriangles=new Uint32Array(triangles);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function subarachnoidMaterial(partTexture:T.DataTexture,width:number){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:0,envMapIntensity:.25,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{partState:{value:partTexture},stateWidth:{value:width}});
  shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform float stateWidth; varying float parentVisible;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 parent=texture2D(partState,vec2((partIndex+.5)/stateWidth,.5)); transformed+=parent.xyz; parentVisible=parent.w;');
  shader.fragmentShader='varying float parentVisible;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(parentVisible<.5)discard;');
 };return m;
}
