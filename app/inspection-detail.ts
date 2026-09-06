import type {Atlas,Part} from './anatomy';
import {atlasAssetUrl,withAtlasAssetBase} from './atlas-assets';
import {decodeModelResponse} from './model-download';
export interface DetailPart extends Part {topology:string;sourceSha256:string;baseTriangles:number}
export interface DetailAtlas extends Omit<Atlas,'parts'> {parts:DetailPart[]}
export async function fetchDetailCatalogue(atlas:Atlas,signal:AbortSignal):Promise<DetailAtlas>{
 if(typeof DecompressionStream==='undefined')throw new Error('Source detail needs gzip decoding.');
 const response=await fetch(atlasAssetUrl('/models/inspection/detail.json',document.baseURI),{signal});
 if(!response.ok)throw new Error('Source detail is unavailable.');
 const detail=await response.json() as DetailAtlas;
 if(detail.version!=='bodyparts3d-4.0-inspection-v1'||!Array.isArray(detail.parts)||!Array.isArray(detail.chunks))throw new Error('Unrecognized detail catalogue.');
 const seen=new Set<string>();
 for(const part of detail.parts){
  const base=atlas.parts.find(p=>p.id===part.id);
  if(!base||seen.has(part.id)||base.conceptId!==part.conceptId||base.system!==part.system||base.name!==part.name)throw new Error('Detail identity differs from the base atlas.');
  if(!/^[a-f0-9]{64}$/.test(part.topology)||!Number.isInteger(part.chunk)||!detail.chunks[part.chunk])throw new Error('Invalid detail mapping.');
  for(let e=0;e<2;e++)for(let a=0;a<3;a++)if(!Number.isFinite(part.bounds[e][a])||Math.abs(base.bounds[e][a]-part.bounds[e][a])>2e-7)throw new Error('Detail registration differs from the base atlas.');
  seen.add(part.id);
 }
 return withAtlasAssetBase(detail,document.baseURI) as DetailAtlas;
}
export async function fetchDetailChunk(detail:DetailAtlas,index:number,signal:AbortSignal){
 const chunk=detail.chunks[index];
 return decodeModelResponse(await fetch(chunk.gzip??chunk.url,{signal}),chunk.bytes,true);
}
export function detailArrays(p:Part,buffer:ArrayBuffer){
 for(const [offset,count,bytes] of [[p.positions,p.vertexCount*3,4],[p.normals,p.vertexCount*3,2],[p.indices,p.indexCount,4]]){
  if(!Number.isInteger(offset)||!Number.isInteger(count)||offset<0||count<=0||offset%bytes!==0||offset+count*bytes>buffer.byteLength)throw new Error('Invalid geometry buffer.');
 }
 const positions=new Float32Array(buffer,p.positions,p.vertexCount*3),normals=new Int16Array(buffer,p.normals,p.vertexCount*3),indices=new Uint32Array(buffer,p.indices,p.indexCount);
 for(const value of positions)if(!Number.isFinite(value))throw new Error('Invalid geometry position.');
 for(const index of indices)if(index>=p.vertexCount)throw new Error('Invalid geometry index.');
 return {positions,normals,indices};
}
