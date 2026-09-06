/** Evidence and placement reviews are independent. An old UI group is neither. */
export type Laterality='left'|'right'|'bilateral'|'midline'|'unspecified';
export type EvidenceReview={status:'unverified';sourceReference:null}|{status:'source-verified';sourceReference:{documentId:string;locator:string};reviewedBy:string};
export type Placement=
 | {method:'unplaced'}
 | {method:'reference-space-surface-mask';registration:string;center:[number,number,number];normal:[number,number,number];radius:number;depth:number}
 | {method:'triangle-barycentric';topology:string;triangle:number;weights:[number,number,number]};
export interface InjuryRecord {
 id:string;
 target:{sourceId:string;conceptId:string;laterality:Laterality};
 supportedAnatomicalRegion:string|null;
 evidence:EvidenceReview;
 placement:Placement;
 placementReview:{status:'unplaced'|'unreviewed'|'reviewed';reviewedBy?:string};
}
export function attachmentCompatible(placement:Placement,registration:string,topology:string){
 if(placement.method==='unplaced')return false;
 return placement.method==='reference-space-surface-mask'?placement.registration===registration:placement.topology===topology;
}
/** A surface mask evaluates the mesh's own interpolated reference position,
 * before GPU explosion translation. It is topology-independent within the exact
 * same source registration. Triangle attachments instead require a topology hash.
 * No Homer finding or real lesion is populated in this milestone.
 */
export const VERIFIED_INJURY_RECORDS:InjuryRecord[]=[];
export interface RegistrationFixture {sourceId:string;center:[number,number,number];normal:[number,number,number];radius:number;depth:number}
export function surfaceMaskWeight(point:number[],normal:number[],fixture:RegistrationFixture){
 const delta=point.map((v,i)=>v-fixture.center[i]);
 const depth=delta.reduce((sum,v,i)=>sum+v*fixture.normal[i],0);
 const tangent=Math.sqrt(Math.max(0,delta.reduce((sum,v)=>sum+v*v,0)-depth*depth));
 return tangent<=fixture.radius&&Math.abs(depth)<=fixture.depth&&normal.reduce((sum,v,i)=>sum+v*fixture.normal[i],0)>.25?1:0;
}
