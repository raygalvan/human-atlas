import * as T from 'three';
/** Synthetic road-rash capability fixture. No case evidence or measured wound. */
export const ABRASION = {id:'synthetic-left-posterior-shoulder-v1',parent:'FJ2810',concept:'FMA7163',center:[.172,1.397,-.10] as const};
// Deliberately asymmetric, scalloped perimeter, about 7 x 6 cm in reference space.
export const outline = Array.from({length:64},(_,i)=>{
 const a=i/64*Math.PI*2,r=1+.13*Math.sin(3*a+.7)+.09*Math.sin(7*a)+.055*Math.sin(17*a);
 return new T.Vector2(.172+Math.cos(a)*.035*r,1.397+Math.sin(a)*.029*r);
});
type V={p:T.Vector3;n:T.Vector3};
const cross=(a:T.Vector2,b:T.Vector2,p:T.Vector3)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
/** Clip each original skin triangle to triangulated irregular perimeter. Every
 * resulting vertex is barycentric on the CURRENT skin geometry. No projection
 * plane remains, no displaced vertices, no stale triangle IDs across LOD swaps. */
export function abrasionGeometry(skin:T.BufferGeometry,parentIndex:number){
 const pos=skin.getAttribute('position'),norm=skin.getAttribute('normal'),idx=skin.index!;
 const positions:number[]=[],normals:number[]=[],sourceTriangles:number[]=[];
 const ears=T.ShapeUtils.triangulateShape(outline,[]);
 for(let t=0;t<idx.count;t+=3){
  const vertices=[0,1,2].map(k=>{const i=idx.getX(t+k);return {p:new T.Vector3().fromBufferAttribute(pos,i),n:new T.Vector3().fromBufferAttribute(norm,i)};});
  if(vertices.every(v=>v.p.x<.125)||vertices.every(v=>v.p.x>.22)||vertices.every(v=>v.p.y<1.355)||vertices.every(v=>v.p.y>1.438))continue;
  if(vertices.some(v=>v.p.z>-.055)||vertices.reduce((s,v)=>s+v.n.z,0)>-.6)continue;
  for(const ear of ears){
   let poly:V[]=vertices;
   const corners=ear.map(i=>outline[i]);
   if(cross(corners[0],corners[1],new T.Vector3(corners[2].x,corners[2].y,0))<0)corners.reverse();
   for(let e=0;e<3&&poly.length;e++){
    const a=corners[e],b=corners[(e+1)%3],next:V[]=[];
    poly.forEach((v,i)=>{const w=poly[(i+1)%poly.length],dv=cross(a,b,v.p),dw=cross(a,b,w.p);
     if(dv>=-1e-12)next.push(v);
     if((dv>=0)!==(dw>=0)){const f=dv/(dv-dw);next.push({p:v.p.clone().lerp(w.p,f),n:v.n.clone().lerp(w.n,f)});}
    });poly=next;
   }
   for(let k=1;k+1<poly.length;k++){
    const tri=[poly[0],poly[k],poly[k+1]];
    if(new T.Vector3().subVectors(tri[1].p,tri[0].p).cross(new T.Vector3().subVectors(tri[2].p,tri[0].p)).lengthSq()<1e-20)continue;
    for(const v of tri){positions.push(...v.p.toArray());normals.push(...v.n.normalize().toArray());sourceTriangles.push(t/3);}
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('partIndex',new T.Float32BufferAttribute(new Array(positions.length/3).fill(parentIndex),1));g.userData.sourceTriangles=sourceTriangles;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function abrasionMaterial(partTexture:T.DataTexture,width:number){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:0,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{partState:{value:partTexture},stateWidth:{value:width}});
  shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform float stateWidth; varying vec3 abrasionPosition; varying float parentVisible;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   abrasionPosition=position; vec4 parent=texture2D(partState,vec2((partIndex+.5)/stateWidth,.5)); transformed+=parent.xyz; parentVisible=parent.w;`);
  shader.fragmentShader=`varying vec3 abrasionPosition; varying float parentVisible;
   float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(parentVisible<.5)discard;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 q=(abrasionPosition.xy-vec2(.172,1.397))*1000.;
   float coarse=grain(q*.24),fine=grain(q*2.1);
   float scrape=grain(vec2(q.x*.85,(q.y+q.x*.32)*.27));
   float islands=smoothstep(.75,.93,coarse+.08*scrape);
   vec3 raw=mix(vec3(.17,.025,.018),vec3(.48,.10,.07),coarse);
   raw=mix(raw,vec3(.72,.34,.25),smoothstep(.49,.78,scrape)*.32);
   raw=mix(raw,vec3(.045,.014,.009),smoothstep(.58,.88,fine)*.5);
   diffuseColor.rgb=mix(raw,vec3(.48,.30,.18),islands*.85);
  `);
 };
 return m;
}
