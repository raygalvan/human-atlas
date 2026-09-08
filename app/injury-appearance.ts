import * as T from 'three';
import {subarachnoidMaterial} from './subarachnoid.ts';
const fract=(n:number)=>n-Math.floor(n);
/** Illustrative tissue palette anchored in reference coordinates, not pixels.
 * Color does not encode clinical severity or wound age. */
export function injuryAppearance(p:number[],kind:string):number[]{
 const [x,y,z]=p,coarse=(Math.sin(x*310+y*173+z*217)+Math.sin(y*421-z*291+x*81))*.25+.5;
 const grain=fract(Math.sin(Math.floor(x*1600)*127.1+Math.floor(y*1600)*311.7+Math.floor(z*1600)*74.7)*43758.5453);
 if(kind==='subarachnoid')return [.23+.15*coarse,.018+.02*coarse,.032+.027*coarse];
 const base=[.23+.27*coarse,.035+.105*coarse,.018+.062*coarse],dark=grain>.77?.48:1,scuff=coarse>.74?.24:0;
 return base.map((c,i)=>c*dark*(1-scuff)+[.65,.32,.19][i]*scuff);
}
export function productionMaterial(texture:T.DataTexture,width:number,kind:string,version=0){
 const material=subarachnoidMaterial(texture,width),before=material.onBeforeCompile;
 if(version!==1||!['abrasion','subarachnoid'].includes(kind))return material;
 material.roughness=kind==='abrasion'?.96:.5;
 material.onBeforeCompile=(shader,renderer)=>{
  before(shader,renderer);
  shader.vertexShader='varying vec3 injuryCoordinate;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ninjuryCoordinate=position;');
  shader.fragmentShader='varying vec3 injuryCoordinate;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=injuryCoordinate;
   float coarse=(sin(p.x*310.+p.y*173.+p.z*217.)+sin(p.y*421.-p.z*291.+p.x*81.))*.25+.5;
   float grain=fract(sin(dot(floor(p*1600.),vec3(127.1,311.7,74.7)))*43758.5453);
   ${kind==='abrasion'?`vec3 base=vec3(.23,.035,.018)+vec3(.27,.105,.062)*coarse;
   float dark=grain>.77?.48:1.,scuff=coarse>.74?.24:0.;
   diffuseColor.rgb=base*dark*(1.-scuff)+vec3(.65,.32,.19)*scuff;`:`diffuseColor.rgb=vec3(.23,.018,.032)+vec3(.15,.02,.027)*coarse;`}
  `);
 };
 material.customProgramCacheKey=()=>`injury-production-${kind}-appearance-v1`;
 return material;
}
