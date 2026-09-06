import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import type {Atlas,SceneState,View} from './anatomy';
import {inspectionGroups,registrationTarget,type Inspection,type DetailStatus} from './inspection';
import './inspection.css';
interface Props {atlas:Atlas;state:SceneState;detailStatus:DetailStatus;onInspect:(mode:Inspection)=>void;onChange:(patch:Partial<SceneState>)=>void;onRestore:()=>void}
export function InspectionControls({atlas,state,detailStatus,onInspect,onChange,onRestore}:Props){
 const groups=inspectionGroups(atlas),mode=state.inspection,head=mode==='brain'||mode==='relationship';
 const developer=new URLSearchParams(location.search).get('developer')==='registration';
 return <details className="inspection-controls" open={mode?true:undefined}>
  <summary>Inspect anatomy</summary>
  <div className="inspection-presets">{([['brain','Brain'],['skull','Skull'],['relationship','Brain + skull'],['rib','Left rib 2']] as [Inspection,string][]).map(([id,name])=><Button key={id} variant="ghost" aria-pressed={mode===id} onClick={()=>onInspect(id)}>{name}</Button>)}</div>
  {mode&&<div className="inspection-options">
   <div className="inspection-option"><label htmlFor="source-detail">Original source detail</label><Switch id="source-detail" checked={state.sourceDetail!==false} onCheckedChange={value=>onChange({sourceDetail:!!value})}/></div>
   <p className="detail-status" role="status">{detailStatus==='loading'?'Loading source geometry…':detailStatus==='ready'?'Original geometry active':detailStatus==='unavailable'?'Detail unavailable. Base anatomy remains active.':'Browser geometry active'}</p>
   {head&&groups.components.map(group=><div className="inspection-option" key={group.id}><span>{group.name}</span><Switch aria-label={`Show ${group.name.toLowerCase()}`} checked={group.ids.some(id=>!state.hiddenParts?.includes(id))} onCheckedChange={value=>onChange({hiddenParts:value?(state.hiddenParts??[]).filter(id=>!group.ids.includes(id)):[...new Set([...(state.hiddenParts??[]),...group.ids])]})}/></div>)}
   {(mode==='skull'||mode==='relationship')&&<div className="skull-reveal"><label id="skull-reveal-label">Reveal through skull <output>{Math.round((state.skullReveal??0)*100)}%</output></label><Slider aria-labelledby="skull-reveal-label" min={0} max={100} step={1} value={[(state.skullReveal??0)*100]} onValueChange={v=>onChange({skullReveal:(Array.isArray(v)?v[0]:v)/100})}/><p>From patient left. Open cut, with no added internal tissue or bone thickness.</p></div>}
   <div className="inspection-views" aria-label="Inspection directions">{([['front','Front'],['back','Rear'],['left','Left'],['right','Right'],['superior','Top'],['inferior','Base']] as [View,string][]).map(([view,label])=><Button key={view} variant="ghost" aria-label={`Inspect from ${label.toLowerCase()}`} disabled={state.explode>.8&&view!=='front'} onClick={()=>onChange({view,reset:state.reset+1,rotate:false})}>{label}</Button>)}</div>
   <p className="patient-orientation">Left and right always refer to the patient.</p>
   {developer&&<div className="registration-test"><strong>Developer test · synthetic</strong><p>{atlas.parts.find(p=>p.id===registrationTarget(mode))?.name}. Blue test patch, not a Homer finding.</p><div className="inspection-option"><span>Registration patch</span><Switch aria-label="Synthetic registration patch" checked={!!state.registrationTest} onCheckedChange={value=>onChange({registrationTest:!!value})}/></div></div>}
   <Button variant="ghost" className="restore-anatomy" onClick={onRestore}>Restore atlas</Button>
  </div>}
 </details>;
}
