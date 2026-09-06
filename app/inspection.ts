import type {Atlas,Part,SceneState} from './anatomy';
export type Inspection = 'brain'|'skull'|'relationship'|'rib';
export type DetailStatus = 'base'|'loading'|'ready'|'unavailable';
export const SOURCE_REGISTRATION='bodyparts3d-4.0-meters-y-up-v1';
export function inspectionGroups(atlas:Atlas){
 const concept=(id:string)=>atlas.concepts.find(c=>c.id===id)?.elements??[];
 const brain=concept('FMA50801'),brainSet=new Set(brain);
 // The source skull concept also contains eyes and hyoids. Preserve the concept
 // unchanged; this inspection selects cranial and facial bones, excluding the hyoids.
 const skull=concept('FMA46565').filter(id=>atlas.parts.some(p=>p.id===id&&p.system==='skeletal'&&!/hyoid/i.test(p.name)));
 const left=concept('FMA61819').filter(id=>brainSet.has(id)),right=concept('FMA67292').filter(id=>brainSet.has(id));
 const cerebellum=concept('FMA67944').filter(id=>brainSet.has(id)),brainstem=concept('FMA79876').filter(id=>brainSet.has(id));
 const assigned=new Set([...left,...right,...cerebellum,...brainstem]);
 return {brain,skull,relationship:[...new Set([...brain,...skull])],rib:concept('FMA8012'),components:[
  {id:'left',name:'Left cerebral hemisphere',ids:left},
  {id:'right',name:'Right cerebral hemisphere',ids:right},
  {id:'cerebellum',name:'Cerebellum',ids:cerebellum},
  {id:'brainstem',name:'Brainstem',ids:brainstem},
  {id:'central',name:'Other source brain structures',ids:brain.filter(id=>!assigned.has(id))},
 ]};
}
export function partIsVisible(part:Part,state:SceneState){
 if(state.hiddenParts?.includes(part.id))return false;
 return state.isolate?state.selected.includes(part.id):state.visible.includes(part.system)||state.selected.includes(part.id);
}
export const skullCut=(amount:number)=>.08-.165*amount;
export function isClipped(x:number,isSkull:boolean,amount:number){return isSkull&&amount>0&&x>skullCut(amount);}
export function anatomyColor(part:Part,brainIds:Set<string>):string|undefined{
 if(brainIds.has(part.id)){
  if(/white matter|capsule/i.test(part.name))return '#d7c9bd';
  if(/cerebellum/i.test(part.name))return '#b8a29e';
  if(/pons|medulla|midbrain/i.test(part.name))return '#baa8a0';
  return '#bd9997';
 }
 if(part.system==='skeletal')return '#d8cbb1';
}
