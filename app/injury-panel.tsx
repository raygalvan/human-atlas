import {useState} from 'react';
import {Focus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import type {InjuryMatch} from './injury-library';
import type {AppliedInjury,GeneratedInjury} from './injurybot-bridge';

export type InjuryTab='client'|'apply';
interface Props {
 catalogueEntries?:{id:string;name:string;shortName:string;color:string;description:string;section:string}[];
 extraEntries?:{id:string;name:string;shortName:string;color:string;description:string}[];
 tab:InjuryTab;onTab:(tab:InjuryTab)=>void;
 applied:AppliedInjury[];generated:GeneratedInjury[];pieces:Map<string,number>;
 isolated:boolean;focused:string|null;
 onToggleHidden:(id:string,hidden:boolean)=>void;onFocus:(id:string)=>void;onIsolate:()=>void;onClear:()=>void;
 onApply:(ids:string[])=>void;
 onMatch:(description:string)=>Promise<InjuryMatch>;
 onGenerate:(name:string,description:string)=>Promise<void>;
}
const pieceLabel=(n:number)=>`${n} ${n===1?'piece':'pieces'}`;

/** Hosted-case panel: what is applied to the model, and how to apply more. */
export function InjuryPanel({tab,onTab,applied,generated,pieces,isolated,focused,onToggleHidden,onFocus,onIsolate,onClear,onApply,onMatch,onGenerate,extraEntries=[],catalogueEntries=[]}:Props){
 const entry=(id:string)=>extraEntries.find(item=>item.id===id)||catalogueEntries.find(item=>item.id===id);
 const [requestError,setRequestError]=useState('');
 const [mode,setMode]=useState<'find'|'describe'>('find'),[catQuery,setCatQuery]=useState(''),[desc,setDesc]=useState(''),[searching,setSearching]=useState(false);
 const [results,setResults]=useState<string[]|undefined>(undefined),[selected,setSelected]=useState<string[]>([]),[missing,setMissing]=useState<string|null>(null),[creating,setCreating]=useState(false);
 const appliedIds=applied.map(item=>item.id);
 const toggleSelected=(id:string)=>setSelected(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);
 const resetDescribe=()=>{setResults(undefined);setSelected([]);setMissing(null);setDesc('');};
 const apply=()=>{if(!selected.length)return;onApply(selected);setSelected([]);setResults(undefined);setMissing(null);setDesc('');setCatQuery('');onTab('client');};
 const find=async()=>{const text=desc.trim();if(!text||searching)return;setSearching(true);setRequestError('');try{const result=await onMatch(text);const hits=result.matches.filter((id)=>!!entry(id)&&!appliedIds.includes(id));setResults(hits);setSelected(hits);setMissing(result.unmatched);}catch(e){setRequestError((e as Error).message);}finally{setSearching(false);}};
 const create=async()=>{if(!missing||creating)return;setCreating(true);setRequestError('');try{await onGenerate(missing,desc.trim());setMissing(null);}catch(e){setRequestError((e as Error).message);}finally{setCreating(false);}};
 const checklist=(ids:string[])=>ids.map(id=>{const item=entry(id)!,on=selected.includes(id);return <label className={`injury-pick ${on?'on':''}`} key={id}><input type="checkbox" checked={on} onChange={()=>toggleSelected(id)} aria-label={`Select ${item.name}`}/><span className="injury-swatch" style={{background:item.color}}/><span className="injury-copy"><strong>{item.shortName}</strong><small>{pieceLabel(pieces.get(id)??0)} · in library</small></span></label>;});
 const catalogue=catalogueEntries.filter(i=>!appliedIds.includes(i.id)&&(!catQuery.trim()||(i.name+' '+i.shortName+' '+i.section).toLowerCase().includes(catQuery.trim().toLowerCase()))).map(i=>i.id);
 const applyLabel=selected.length?`Apply ${selected.length} ${selected.length===1?'injury':'injuries'} to the model`:'Select injuries to apply';
 const queued=generated.filter(item=>item.status!=='failed').length;
 return <>
  {requestError&&<p className="injury-note" role="alert">{requestError}</p>}
  <div className="panel-tabs injury-tabs" role="tablist" aria-label="Case injuries">
   <Button variant="ghost" role="tab" aria-selected={tab==='apply'} className={`apply-tab ${tab==='apply'?'active':''}`} onClick={()=>onTab('apply')}>Select Injuries</Button>
   <Button variant="ghost" role="tab" aria-selected={tab==='client'} className={`client-tab ${tab==='client'?'active':''}`} onClick={()=>onTab('client')}>Client Injuries{applied.length>0&&<span className="injury-badge">{applied.length}</span>}</Button>
  </div>
  {tab==='client'?<>
   {applied.length===0&&generated.length===0?<div className="injury-empty"><strong>No injuries applied</strong><p>Open Select Injuries to pick from the injury catalogue, or describe the client&apos;s injuries and AI will match or create them. Applied injuries appear here and on the 3D model.</p></div>:<>
    <div className="injury-owner"><strong>Applied to the model</strong><span>Toggle a group to show or hide it. Placement remains pending attorney review.</span></div>
    <div className="injury-list thin-scroll">
     {applied.map(item=>{const info=entry(item.id);if(!info)return null;const on=!item.hidden;return <div className={`injury-row ${on?'active':''} ${focused===info.id?'focused':''}`} key={item.id}><Button variant="ghost" className="injury-main" aria-label={info.shortName} onClick={()=>onFocus(info.id)} title={info.description}><span className="injury-swatch" style={{background:info.color}}/><span className="injury-copy"><strong>{info.shortName}</strong><small>{pieceLabel(pieces.get(info.id)??0)} · tap to isolate</small></span></Button><Switch checked={on} onCheckedChange={value=>onToggleHidden(item.id,!value)} aria-label={`Show ${info.name}`}/></div>;})}
     {generated.map(item=><div className="injury-row generated" key={item.id}><div className="injury-main"><span className="injury-swatch pending"/><span className="injury-copy"><strong>{item.name}</strong><small>{item.stage||(item.status==='ready'?'Generated · awaiting placement review':item.status==='failed'?'Generation failed':'Generating · up to 10 minutes')}</small></span></div><Switch checked={false} disabled aria-label={`${item.name} is not ready`}/></div>)}
    </div>
   </>}
   <div className="injury-foot client-foot"><Button variant="ghost" className={`isolate-injuries ${isolated?'active':''}`} disabled={!applied.length} aria-pressed={isolated} onClick={onIsolate}><Focus size={14}/>{isolated?'Show full body':'Isolate injuries'}</Button><Button variant="ghost" className="clear-injuries" disabled={!applied.length&&!generated.length} onClick={onClear}>Clear injuries</Button></div>
  </>:<>
   <div className="mode-toggle" role="tablist" aria-label="How to add injuries"><Button variant="ghost" role="tab" aria-selected={mode==='find'} className={mode==='find'?'active':''} onClick={()=>setMode('find')}>Find matching<br/>injuries</Button><Button variant="ghost" role="tab" aria-selected={mode==='describe'} className={mode==='describe'?'active':''} onClick={()=>setMode('describe')}>Describe client&apos;s<br/>injuries</Button></div>
   {mode==='find'?<>
    <div className="injury-owner"><strong>Injury catalogue</strong><span>Select the injuries to place on the model. Can&apos;t find one? Switch to <b>Describe client&apos;s injuries</b> and AI will match or create it.</span></div>
    <input className="catalogue-filter" value={catQuery} onChange={e=>setCatQuery(e.target.value)} placeholder="Filter the catalogue…" aria-label="Filter the injury catalogue"/>
    <div className="injury-list catalogue-list thin-scroll">{catalogue.length?checklist(catalogue):<p className="injury-note">{catalogueEntries.length>0&&catalogueEntries.every(i=>appliedIds.includes(i.id))?'Every catalogue entry is already applied to this case.':'No catalogue entry matches. Describe the injury instead and AI can create it.'}</p>}</div>
    <div className="apply-actions"><Button variant="ghost" className="apply-primary" disabled={!selected.length} onClick={apply}>{applyLabel}</Button></div>
   </>:<>
    <label className="describe-label" htmlFor="describe-injuries">Describe the client&apos;s injuries</label>
    <p className="injury-note">Use this when an injury isn&apos;t in our catalogue. AI matches your description to existing entries and offers to create anything missing.</p>
    <textarea id="describe-injuries" className={`describe-input ${results===undefined||searching?'fill':''}`} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. Broken kneecap after a fall."/>
    {results===undefined||searching?<div className="apply-actions"><Button variant="ghost" className="apply-primary" disabled={!desc.trim()||searching} onClick={find}>{searching?'Matching injuries…':'Find matching injuries'}</Button></div>:<>
     <div className="injury-owner"><strong>{results.length?'Matches in the catalogue':'No catalogue matches'}</strong><span>{results.length?'Select the injuries to place on the model.':'Nothing in the description matched an existing entry.'}</span></div>
     {results.length>0&&<div className="injury-list results-list thin-scroll">{checklist(results)}</div>}
     {missing&&<div className="missing-card" role="status"><strong>Not in our database yet</strong><p>We do not have <b>{missing}</b> in our injury database. Would you like to create the injury now and let AI apply it to the 3D model? This process can take up to 10 minutes.</p><div className="missing-actions"><Button variant="ghost" className="create-injury" disabled={creating} onClick={create}>{creating?'Creating… up to 10 min':'Create & apply with AI'}</Button><Button variant="ghost" className="skip-injury" disabled={creating} onClick={()=>setMissing(null)}>Skip</Button></div></div>}
     <div className="apply-actions">{results.length>0&&<Button variant="ghost" className="apply-primary" disabled={!selected.length} onClick={apply}>{applyLabel}</Button>}<Button variant="ghost" className="apply-secondary" onClick={resetDescribe}>Describe another injury</Button></div>
    </>}
   </>}
   <div className="injury-foot apply-foot"><span>{queued?`${queued} new ${queued===1?'injury':'injuries'} queued for AI generation`:'Library entries are placed only after review'}</span></div>
  </>}
 </>;
}
