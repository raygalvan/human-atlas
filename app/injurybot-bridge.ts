export const INJURYBOT_ATLAS_PROTOCOL=1 as const;

export interface HostedFindingSummary {
 id:string;
 anatomicalStructure:string;
 sourceStatus:'unlinked'|'linked'|'conflict'|'verified';
 placementStatus:'not_started'|'draft'|'attorney_approved'|'expert_approved';
 renderStatus:'not_started'|'draft'|'ready_for_review'|'approved';
 sourceIds:string[];
}
/** An injury the host has applied to this case. `id` is a catalogue id. */
export interface AppliedInjury {id:string;hidden:boolean}
/** An injury the host is generating for this case (no catalogue entry yet). */
export interface GeneratedInjury {id:string;name:string;status:'queued'|'generating'|'ready'|'failed';stage?:string}

export interface HostedCatalogueEntry {id:string;name:string;shortName:string;color:string;section:string;description:string;sourceIds:string[]}
export interface HostedCaseContext {
 catalogue?:HostedCatalogueEntry[];
 id:string;
 title:string;
 client?:string;
 matterNumber?:string;
 findings:HostedFindingSummary[];
 activeReferenceGroups:string[];
 appliedInjuries:AppliedInjury[];
 generatedInjuries:GeneratedInjury[];
 productionInjuries?:{id:string;name?:string;parentId:string;url:string;hidden:boolean;mode:"overlay"|"replacement"}[];
}

export interface InjuryBotHostConfig {
 embedded:boolean;
 parentOrigin:string|null;
 initialCase:{id:string;title:string;client?:string}|null;
}

export type InjuryBotHostMessage=
 | {type:'injurybot:atlas:init';version:typeof INJURYBOT_ATLAS_PROTOCOL;case:HostedCaseContext}
 | {type:'injurybot:atlas:match-result';version:typeof INJURYBOT_ATLAS_PROTOCOL;requestId:string;matches:string[];unmatched:string|null}
 | {type:'injurybot:atlas:generation';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string;injury:GeneratedInjury};
export type AtlasHostMessage=
 | {type:'human-atlas:ready';version:typeof INJURYBOT_ATLAS_PROTOCOL;capabilities:string[]}
 | {type:'human-atlas:selection';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string|null;sourceIds:string[];label:string;point?:number[];normal?:number[]}
 | {type:'human-atlas:injuries-applied';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string;injuries:AppliedInjury[]}
 | {type:'human-atlas:match-request';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string;requestId:string;description:string}
 | {type:'human-atlas:generate-request';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string;name:string;description:string};

const bounded=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=max?value.trim():null;
const validStatus=(value:unknown,allowed:string[])=>typeof value==='string'&&allowed.includes(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

export function readInjuryBotHostConfig(search:string):InjuryBotHostConfig {
 const params=new URLSearchParams(search),embedded=params.get('embed')==='injurybot';
 let parentOrigin:string|null=null;
 try {const value=params.get('parentOrigin');if(value)parentOrigin=new URL(value).origin;}catch{/* Invalid origins never become trusted. */}
 const id=bounded(params.get('caseId'),120),title=bounded(params.get('caseTitle'),160),client=bounded(params.get('caseClient'),160);
 return {embedded,parentOrigin:embedded?parentOrigin:null,initialCase:embedded&&id&&title?{id,title,...(client?{client}:{})}:null};
}

function parseGenerated(value:unknown):GeneratedInjury|null{
 if(!isRecord(value))return null;
 const id=bounded(value.id,120),name=bounded(value.name,160);
 if(!id||!name||!validStatus(value.status,['queued','generating','ready','failed']))return null;
 return {id,name,status:value.status as GeneratedInjury['status'],...(bounded(value.stage,500)?{stage:value.stage as string}:{})};
}

export function parseInjuryBotHostMessage(value:unknown):InjuryBotHostMessage|null {
 if(!isRecord(value)||value.version!==INJURYBOT_ATLAS_PROTOCOL)return null;
 if(value.type==='injurybot:atlas:match-result'){
  const requestId=bounded(value.requestId,120);
  if(!requestId||!Array.isArray(value.matches)||value.matches.length>200)return null;
  const matches=value.matches.map(item=>bounded(item,120));if(matches.some(item=>!item))return null;
  const unmatched=value.unmatched===null||value.unmatched===undefined?null:bounded(value.unmatched,160);
  if(unmatched===null&&value.unmatched!==null&&value.unmatched!==undefined)return null;
  return {type:'injurybot:atlas:match-result',version:INJURYBOT_ATLAS_PROTOCOL,requestId,matches:matches as string[],unmatched};
 }
 if(value.type==='injurybot:atlas:generation'){
  const caseId=bounded(value.caseId,120),injury=parseGenerated(value.injury);
  return caseId&&injury?{type:'injurybot:atlas:generation',version:INJURYBOT_ATLAS_PROTOCOL,caseId,injury}:null;
 }
 if(value.type!=='injurybot:atlas:init'||!isRecord(value.case))return null;
 const source=value.case,id=bounded(source.id,120),title=bounded(source.title,160),matterNumber=source.matterNumber===undefined?undefined:bounded(source.matterNumber,120),client=source.client===undefined?undefined:bounded(source.client,160);
 if(!id||!title||matterNumber===null||client===null||!Array.isArray(source.findings)||!Array.isArray(source.activeReferenceGroups))return null;
 const findings:HostedFindingSummary[]=[];
 for(const item of source.findings){
  if(!isRecord(item))return null;
  const findingId=bounded(item.id,120),structure=bounded(item.anatomicalStructure,240);
  if(!findingId||!structure||!validStatus(item.sourceStatus,['unlinked','linked','conflict','verified'])||!validStatus(item.placementStatus,['not_started','draft','attorney_approved','expert_approved'])||!validStatus(item.renderStatus,['not_started','draft','ready_for_review','approved'])||!Array.isArray(item.sourceIds)||item.sourceIds.length>500)return null;
  const sourceIds=item.sourceIds.map(entry=>bounded(entry,120));if(sourceIds.some(entry=>!entry))return null;
  findings.push({id:findingId,anatomicalStructure:structure,sourceStatus:item.sourceStatus as HostedFindingSummary['sourceStatus'],placementStatus:item.placementStatus as HostedFindingSummary['placementStatus'],renderStatus:item.renderStatus as HostedFindingSummary['renderStatus'],sourceIds:sourceIds as string[]});
 }
 const groups=source.activeReferenceGroups.map(entry=>bounded(entry,120));if(groups.length>50||groups.some(entry=>!entry))return null;
 const appliedInjuries:AppliedInjury[]=[];
 if(source.appliedInjuries!==undefined){
  if(!Array.isArray(source.appliedInjuries)||source.appliedInjuries.length>200)return null;
  for(const item of source.appliedInjuries){if(!isRecord(item))return null;const injuryId=bounded(item.id,120);if(!injuryId)return null;appliedInjuries.push({id:injuryId,hidden:item.hidden===true});}
 }
 const catalogue:HostedCatalogueEntry[]=[];
 if(source.catalogue!==undefined){if(!Array.isArray(source.catalogue)||source.catalogue.length>500)return null;for(const e of source.catalogue){if(!isRecord(e)||!bounded(e.id,120)||!bounded(e.name,160))return null;catalogue.push({id:e.id as string,name:e.name as string,shortName:bounded(e.shortName,160)||e.name as string,color:typeof e.color==='string'&&/^#[0-9a-f]{6}$/i.test(e.color)?e.color:'#984b49',section:bounded(e.section,120)||'Injury library',description:bounded(e.description,8000)||'',sourceIds:Array.isArray(e.sourceIds)?e.sourceIds.filter((id):id is string=>typeof id==='string'&&/^FJ\d+$/.test(id)).slice(0,20):[]});}}
 const productionInjuries:NonNullable<HostedCaseContext['productionInjuries']>=[];
 if(source.productionInjuries!==undefined){
 if(!Array.isArray(source.productionInjuries)||source.productionInjuries.length>50)return null;
 for(const entry of source.productionInjuries){if(!isRecord(entry)||!bounded(entry.id,120)||!bounded(entry.parentId,120)||typeof entry.url!=='string'||!/^\/api\/cases\/[a-zA-Z0-9_-]+\/production\/[a-zA-Z0-9_-]+\/geometry$/.test(entry.url)||!['overlay','replacement'].includes(String(entry.mode)))return null;productionInjuries.push({id:entry.id as string,...(bounded(entry.name,160)?{name:entry.name as string}:{}),parentId:entry.parentId as string,url:entry.url,mode:entry.mode as 'overlay'|'replacement',hidden:entry.hidden===true});}}
 const generatedInjuries:GeneratedInjury[]=[];
 if(source.generatedInjuries!==undefined){
  if(!Array.isArray(source.generatedInjuries)||source.generatedInjuries.length>200)return null;
  for(const item of source.generatedInjuries){const parsed=parseGenerated(item);if(!parsed)return null;generatedInjuries.push(parsed);}
 }
 return {type:'injurybot:atlas:init',version:INJURYBOT_ATLAS_PROTOCOL,case:{id,title,...(client?{client}:{}),...(matterNumber?{matterNumber}:{}),findings,activeReferenceGroups:groups as string[],appliedInjuries,generatedInjuries,productionInjuries,catalogue}};
}

export interface HostHandlers {
 context:(context:HostedCaseContext)=>void;
 matchResult?:(result:Extract<InjuryBotHostMessage,{type:'injurybot:atlas:match-result'}>)=>void;
 generation?:(message:Extract<InjuryBotHostMessage,{type:'injurybot:atlas:generation'}>)=>void;
}
export function connectInjuryBotHost(config:InjuryBotHostConfig,handlers:HostHandlers){
 if(!config.embedded||!config.parentOrigin||window.parent===window)return null;
 const send=(message:AtlasHostMessage)=>window.parent.postMessage(message,config.parentOrigin as string);
 const receive=(event:MessageEvent)=>{
  if(event.source!==window.parent||event.origin!==config.parentOrigin)return;
  const message=parseInjuryBotHostMessage(event.data);if(!message)return;
  if(message.type==='injurybot:atlas:init')handlers.context(message.case);
  else if(message.type==='injurybot:atlas:match-result')handlers.matchResult?.(message);
  else handlers.generation?.(message);
 };
 window.addEventListener('message',receive);
 send({type:'human-atlas:ready',version:INJURYBOT_ATLAS_PROTOCOL,capabilities:['case-context','reference-groups','anatomy-selection','applied-injuries','injury-matching','injury-generation']});
 return {
  selection:(caseId:string|null,sourceIds:string[],label:string,point?:number[],normal?:number[])=>send({type:'human-atlas:selection',version:INJURYBOT_ATLAS_PROTOCOL,caseId,sourceIds,label,...(point&&normal?{point,normal}:{})}),
  injuriesApplied:(caseId:string,injuries:AppliedInjury[])=>send({type:'human-atlas:injuries-applied',version:INJURYBOT_ATLAS_PROTOCOL,caseId,injuries}),
  matchRequest:(caseId:string,requestId:string,description:string)=>send({type:'human-atlas:match-request',version:INJURYBOT_ATLAS_PROTOCOL,caseId,requestId,description}),
  generateRequest:(caseId:string,name:string,description:string)=>send({type:'human-atlas:generate-request',version:INJURYBOT_ATLAS_PROTOCOL,caseId,name,description}),
  dispose:()=>window.removeEventListener('message',receive),
 };
}
