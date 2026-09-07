import {HOMER_INJURIES,type HomerInjuryId} from './injuries.ts';
/** Catalogue matching that runs inside the viewer when no host answers.
 * The host (injury.bot) can override with a server-side match; this keeps the
 * "Describe client's injuries" flow working offline and in the courtroom demo. */
const KEYWORDS:Record<HomerInjuryId,RegExp>={
 'brain-hemorrhage':/\b(subarachnoid|subdural|epidural|intracranial|brain bleed|brain h(a)?emorrhage|hemorrhage|haemorrhage|concussion|brain)\b/i,
 'skull-fracture':/\b(skull|cranial|cranium|frontal bone|orbital|supraorbital|head fracture)\b/i,
 'left-ribs-2-4':/\b(left (upper )?ribs?|ribs? (2|3|4|two|three|four)\b|left rib)/i,
 'right-ribs-2-5':/\b(right (upper )?ribs?|ribs? (2|3|4|5|two|three|four|five)\b|right rib)/i,
 'right-ribs-8-10':/\b(right (lower )?ribs?|ribs? (8|9|10|eight|nine|ten)\b|lower ribs?)/i,
 'left-costal-cartilage-3-7':/\b(costal cartilage|costochondral|cartilage)\b/i,
 'pulmonary-findings':/\b(lungs?|pulmonary|pneumothorax|hemothorax|contused lung)\b/i,
 'periaortic-findings':/\b(aorta|aortic|periaortic|mediastin)/i,
};
/** Injuries a description may name that no catalogue entry covers yet. */
const UNKNOWN:[RegExp,string][]=[
 [/\bfemur|thigh\b/i,'Femur fracture'],
 [/\bcervical|spine|spinal|vertebra|whiplash|neck fracture\b/i,'Cervical spine injury'],
 [/\bknee|acl|meniscus|patella\b/i,'Knee ligament tear'],
 [/\bshoulder|rotator|clavicle|collarbone\b/i,'Shoulder injury'],
 [/\bankle|foot|metatarsal\b/i,'Ankle fracture'],
 [/\bwrist|radius|forearm|ulna\b/i,'Distal radius fracture'],
 [/\bburn|scald\b/i,'Thermal burn'],
 [/\bpelvi|hip\b/i,'Pelvic fracture'],
 [/\bliver|hepatic|spleen|splenic|kidney|renal|bowel|mesenter\b/i,'Abdominal organ injury'],
 [/\bhumerus|upper arm|elbow\b/i,'Humerus fracture'],
 [/\btibia|fibula|shin|lower leg\b/i,'Tibial fracture'],
];
export interface InjuryMatch {matches:HomerInjuryId[];unmatched:string|null}
export function matchInjuriesLocally(description:string):InjuryMatch{
 const text=description.trim();
 if(!text)return {matches:[],unmatched:null};
 const matches=HOMER_INJURIES.filter(i=>!i.id.includes('ribs')&&KEYWORDS[i.id].test(text)).map(i=>i.id);
 // Ribs: laterality comes from any side word in the description; an unnamed side
 // suggests both sides rather than guessing. Rib numbers of 8 or more, or "lower",
 // point at the right lower group; everything else is the upper groups.
 if(/\bribs?\b|\brib cage\b/i.test(text)){
  const left=/\bleft\b/i.test(text),right=/\bright\b/i.test(text),numbers=[...text.matchAll(/\b(\d{1,2})\b/g)].map(m=>Number(m[1])).filter(n=>n>=1&&n<=12);
  const lower=numbers.some(n=>n>=8)||/\blower ribs?\b|\b(eighth|ninth|tenth)\b/i.test(text),upper=numbers.some(n=>n<8)||!lower;
  if(left||!right)matches.push('left-ribs-2-4');
  if(right||!left){if(upper)matches.push('right-ribs-2-5');if(lower)matches.push('right-ribs-8-10');}
 }
 const unknown=UNKNOWN.find(([re])=>re.test(text));
 return {matches,unmatched:unknown?unknown[1]:matches.length?null:'the injuries described'};
}
export function filterCatalogue(query:string,exclude:string[]){
 const q=query.trim().toLowerCase();
 return HOMER_INJURIES.filter(i=>!exclude.includes(i.id)&&(!q||i.name.toLowerCase().includes(q)||i.shortName.toLowerCase().includes(q)||i.section.toLowerCase().includes(q)));
}
