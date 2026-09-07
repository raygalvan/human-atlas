export const INJURYBOT_ATLAS_PROTOCOL=1 as const;

export interface HostedFindingSummary {
 id:string;
 anatomicalStructure:string;
 sourceStatus:'unlinked'|'linked'|'conflict'|'verified';
 placementStatus:'not_started'|'draft'|'attorney_approved'|'expert_approved';
 renderStatus:'not_started'|'draft'|'ready_for_review'|'approved';
 sourceIds:string[];
}

export interface HostedCaseContext {
 id:string;
 title:string;
 matterNumber?:string;
 findings:HostedFindingSummary[];
 activeReferenceGroups:string[];
}

export interface InjuryBotHostConfig {
 embedded:boolean;
 parentOrigin:string|null;
 initialCase:{id:string;title:string}|null;
}

export type InjuryBotHostMessage={type:'injurybot:atlas:init';version:typeof INJURYBOT_ATLAS_PROTOCOL;case:HostedCaseContext};
export type AtlasHostMessage=
 | {type:'human-atlas:ready';version:typeof INJURYBOT_ATLAS_PROTOCOL;capabilities:string[]}
 | {type:'human-atlas:selection';version:typeof INJURYBOT_ATLAS_PROTOCOL;caseId:string|null;sourceIds:string[];label:string};

const bounded=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=max?value.trim():null;
const validStatus=(value:unknown,allowed:string[])=>typeof value==='string'&&allowed.includes(value);

export function readInjuryBotHostConfig(search:string):InjuryBotHostConfig {
 const params=new URLSearchParams(search),embedded=params.get('embed')==='injurybot';
 let parentOrigin:string|null=null;
 try {const value=params.get('parentOrigin');if(value)parentOrigin=new URL(value).origin;}catch{/* Invalid origins never become trusted. */}
 const id=bounded(params.get('caseId'),120),title=bounded(params.get('caseTitle'),160);
 return {embedded,parentOrigin:embedded?parentOrigin:null,initialCase:embedded&&id&&title?{id,title}:null};
}

export function parseInjuryBotHostMessage(value:unknown):InjuryBotHostMessage|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const message=value as Record<string,unknown>;
 if(message.type!=='injurybot:atlas:init'||message.version!==INJURYBOT_ATLAS_PROTOCOL||!message.case||typeof message.case!=='object'||Array.isArray(message.case))return null;
 const source=message.case as Record<string,unknown>,id=bounded(source.id,120),title=bounded(source.title,160),matterNumber=source.matterNumber===undefined?undefined:bounded(source.matterNumber,120);
 if(!id||!title||matterNumber===null||!Array.isArray(source.findings)||!Array.isArray(source.activeReferenceGroups))return null;
 const findings:HostedFindingSummary[]=[];
 for(const item of source.findings){
  if(!item||typeof item!=='object'||Array.isArray(item))return null;
  const finding=item as Record<string,unknown>,findingId=bounded(finding.id,120),structure=bounded(finding.anatomicalStructure,240);
  if(!findingId||!structure||!validStatus(finding.sourceStatus,['unlinked','linked','conflict','verified'])||!validStatus(finding.placementStatus,['not_started','draft','attorney_approved','expert_approved'])||!validStatus(finding.renderStatus,['not_started','draft','ready_for_review','approved'])||!Array.isArray(finding.sourceIds)||finding.sourceIds.length>100)return null;
  const sourceIds=finding.sourceIds.map(value=>bounded(value,120));if(sourceIds.some(value=>!value))return null;
  findings.push({id:findingId,anatomicalStructure:structure,sourceStatus:finding.sourceStatus as HostedFindingSummary['sourceStatus'],placementStatus:finding.placementStatus as HostedFindingSummary['placementStatus'],renderStatus:finding.renderStatus as HostedFindingSummary['renderStatus'],sourceIds:sourceIds as string[]});
 }
 const groups=source.activeReferenceGroups.map(value=>bounded(value,120));if(groups.length>50||groups.some(value=>!value))return null;
 return {type:'injurybot:atlas:init',version:INJURYBOT_ATLAS_PROTOCOL,case:{id,title,...(matterNumber?{matterNumber}:{}),findings,activeReferenceGroups:groups as string[]}};
}

export function connectInjuryBotHost(config:InjuryBotHostConfig,onContext:(context:HostedCaseContext)=>void){
 if(!config.embedded||!config.parentOrigin||window.parent===window)return null;
 const send=(message:AtlasHostMessage)=>window.parent.postMessage(message,config.parentOrigin as string);
 const receive=(event:MessageEvent)=>{
  if(event.source!==window.parent||event.origin!==config.parentOrigin)return;
  const message=parseInjuryBotHostMessage(event.data);if(message)onContext(message.case);
 };
 window.addEventListener('message',receive);
 send({type:'human-atlas:ready',version:INJURYBOT_ATLAS_PROTOCOL,capabilities:['case-context','reference-groups','anatomy-selection']});
 return {
  selection:(caseId:string|null,sourceIds:string[],label:string)=>send({type:'human-atlas:selection',version:INJURYBOT_ATLAS_PROTOCOL,caseId,sourceIds,label}),
  dispose:()=>window.removeEventListener('message',receive),
 };
}

