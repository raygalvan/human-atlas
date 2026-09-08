export {injuryAppearance} from './injury-appearance.ts';
import * as T from 'three';
import {createSurfaceInjury,serializeGeometry,type InjuryRecipe} from './production-injury.ts';
import {fractureGeometry} from './rib-fracture.ts';
export {geometryFromData} from './production-injury.ts';
export function generateInjury(positions:number[],normals:number[],indices:number[],recipe:InjuryRecipe){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);
 const result=recipe.kind==='fracture'?fractureGeometry(g,0,{center:recipe.center,normal:recipe.normal,gap:recipe.depthMm/1000}):createSurfaceInjury(g,recipe);
 if(recipe.kind==='fracture'&&!result.userData.fractureFaces)throw new Error('Fracture plane does not produce closed fracture faces. Review placement.');
 return {appearanceVersion:1,geometry:serializeGeometry(result),source:serializeGeometry(g),mode:recipe.kind==='fracture'?'replacement':'overlay'};
}
