import type {Atlas,Part,SystemId} from './anatomy';

export type HomerInjuryId =
 | 'brain-hemorrhage'
 | 'skull-fracture'
 | 'left-ribs-2-4'
 | 'right-ribs-2-5'
 | 'right-ribs-8-10'
 | 'left-costal-cartilage-3-7'
 | 'pulmonary-findings'
 | 'periaortic-findings';

export interface HomerInjuryGroup {
 id:HomerInjuryId;
 section:'Head & brain'|'Rib cage'|'Chest';
 name:string;
 shortName:string;
 color:string;
 description:string;
 evidenceNote:string;
 reviewStatus:'unverified';
 resolver:(atlas:Atlas)=>string[];
}

const normalize=(value:string)=>value.toLowerCase().replace(/[_,()\[\]-]+/g,' ').replace(/\s+/g,' ').trim();
const unique=(ids:string[])=>[...new Set(ids)];
const parts=(atlas:Atlas,predicate:(part:Part,name:string)=>boolean)=>atlas.parts.filter(p=>predicate(p,normalize(p.name))).map(p=>p.id);
const conceptParts=(atlas:Atlas,predicate:(name:string)=>boolean,system?:SystemId)=>{
 const allowed=system?new Set(atlas.parts.filter(p=>p.system===system).map(p=>p.id)):null;
 return unique(atlas.concepts.filter(c=>predicate(normalize(c.name))).flatMap(c=>c.elements).filter(id=>!allowed||allowed.has(id)));
};
const words=(value:string)=>new Set(normalize(value).split(' '));
const ordinal=(n:number)=>n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
const numbered=(name:string,n:number)=>{
 const token=words(name);
 return token.has(String(n))||token.has(ordinal(n))||token.has(n===1?'first':n===2?'second':n===3?'third':n===4?'fourth':n===5?'fifth':n===6?'sixth':n===7?'seventh':n===8?'eighth':n===9?'ninth':'tenth');
};
const side=(name:string,which:'left'|'right')=>words(name).has(which);
const numberedRibs=(atlas:Atlas,which:'left'|'right',numbers:number[])=>parts(atlas,(p,name)=>p.system==='skeletal'&&name.includes('rib')&&side(name,which)&&numbers.some(n=>numbered(name,n)));
const numberedCostalCartilage=(atlas:Atlas,which:'left'|'right',numbers:number[])=>{
 const matches=(name:string)=>side(name,which)&&numbers.some(n=>numbered(name,n))&&((name.includes('costal')&&name.includes('cartilage'))||(name.includes('rib')&&name.includes('cartilage')));
 return fallback(conceptParts(atlas,matches),parts(atlas,(_p,name)=>matches(name)));
};
const fallback=(primary:string[],secondary:string[])=>primary.length?primary:secondary;

export const HOMER_INJURIES:HomerInjuryGroup[]=[
 {
  id:'brain-hemorrhage',section:'Head & brain',name:'Brain reference',shortName:'Brain reference',color:'#b42318',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>fallback(conceptParts(atlas,name=>name==='brain','nervous'),parts(atlas,(p,name)=>p.system==='nervous'&&name.includes('brain'))),
 },
 {
  id:'skull-fracture',section:'Head & brain',name:'Skull reference',shortName:'Skull reference',color:'#c96712',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>fallback(conceptParts(atlas,name=>name==='skull'||name.includes('cranium'),'skeletal'),parts(atlas,(p,name)=>p.system==='skeletal'&&(name.includes('skull')||name.includes('cranium')||name.includes('cranial')))),
 },
 {
  id:'left-ribs-2-4',section:'Rib cage',name:'Left ribs 2–4 reference',shortName:'Left ribs 2–4',color:'#a9362d',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>numberedRibs(atlas,'left',[2,3,4]),
 },
 {
  id:'right-ribs-2-5',section:'Rib cage',name:'Right ribs 2–5 reference',shortName:'Right ribs 2–5',color:'#8f241f',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>numberedRibs(atlas,'right',[2,3,4,5]),
 },
 {
  id:'right-ribs-8-10',section:'Rib cage',name:'Right ribs 8–10 reference',shortName:'Right ribs 8–10',color:'#701d1d',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>numberedRibs(atlas,'right',[8,9,10]),
 },
 {
  id:'left-costal-cartilage-3-7',section:'Rib cage',name:'Left costal cartilage 3–7',shortName:'Costal cartilage 3–7',color:'#d97706',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>numberedCostalCartilage(atlas,'left',[3,4,5,6,7]),
 },
 {
  id:'pulmonary-findings',section:'Chest',name:'Pulmonary reference',shortName:'Lungs',color:'#9f3b50',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>fallback(conceptParts(atlas,name=>name==='lung'||name==='lungs'||name.includes(' lung'),'respiratory'),parts(atlas,(p,name)=>p.system==='respiratory'&&name.includes('lung'))),
 },
 {
  id:'periaortic-findings',section:'Chest',name:'Periaortic reference',shortName:'Periaortic',color:'#b91c1c',
  description:'Inherited reference-anatomy group. Its case finding, rib levels, laterality, and location have not been checked against an identified source report in this repository.',
  evidenceNote:'Unverified. Source report and page citation required before this becomes a Homer finding or an injury placement.',reviewStatus:'unverified',
  resolver:atlas=>fallback(conceptParts(atlas,name=>name==='aorta'||name.includes('aorta'),'arterial'),parts(atlas,(p,name)=>p.system==='arterial'&&name.includes('aorta'))),
 },
];

export function resolveHomerInjury(atlas:Atlas,id:HomerInjuryId){
 const injury=HOMER_INJURIES.find(item=>item.id===id);
 return injury?unique(injury.resolver(atlas)):[];
}

export function resolveHomerInjuries(atlas:Atlas,ids:HomerInjuryId[]){
 return unique(ids.flatMap(id=>resolveHomerInjury(atlas,id)));
}
