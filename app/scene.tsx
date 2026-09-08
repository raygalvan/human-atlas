import {productionMaterial} from './injury-appearance';
import {geometryFromData} from './production-injury';
import {SAH,subarachnoidGeometry,subarachnoidMaterial} from './subarachnoid';
import {RIB_FRACTURE,fractureGeometry} from './rib-fracture';
import {ABRASION,abrasionGeometry,abrasionMaterial} from './abrasion';
import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createExplosionLayout} from './explosion-layout';
import {decodeModelResponse} from './model-download';
import {PointerTap} from './pointer-tap';
import {SYSTEMS,type Atlas,type SceneState,type Part} from './anatomy';
import {anatomyColor,inspectionGroups,partIsVisible,skullCut,isClipped,registrationTarget,type DetailStatus} from './inspection';
import {fetchDetailCatalogue,fetchDetailChunk,detailArrays,type DetailAtlas} from './inspection-detail';
interface Props {atlas:Atlas;state:SceneState;onSelect:(id:string,point?:number[],normal?:number[])=>void;onProgress:(n:number)=>void;onError:(s:string)=>void;onDetailStatus:(s:DetailStatus)=>void}
export default function AnatomyScene({atlas,state,onSelect,onProgress,onError,onDetailStatus}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect);
 latest.current=state;select.current=onSelect;
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,dirty=true,ready=false,lastView='',lastReset=-1,lastIsolate='',layoutKey='',amount=0;
  let lastState:SceneState|null=null;
  const abort=new AbortController();
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onError('This browser could not start the 3D viewer. Please try a browser with WebGL enabled.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:2));renderer.setClearColor('#f2f3f3');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive human anatomy. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);
  camera.position.set(1.4,1.05,3.6);controls.target.set(0,.85,0);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=.07;controls.maxDistance=40;controls.maxPolarAngle=Math.PI;controls.addEventListener('change',()=>{dirty=true;});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xfff6ef,0x778494,.65));
  const key=new T.DirectionalLight(0xfffaf4,2.0);key.position.set(-2,4,3);scene.add(key);
  const rim=new T.DirectionalLight(0xe9f0ff,.85);rim.position.set(2,2,-3);scene.add(rim);
  const fill=new T.DirectionalLight(0xffffff,.45);fill.position.set(3,1,4);scene.add(fill);
  const ground=new T.Mesh(new T.CircleGeometry(30,96),new T.MeshStandardMaterial({color:0xd5d9dc,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.019;scene.add(ground);
  const platform=new T.Mesh(new T.CylinderGeometry(.68,.7,.028,100),new T.MeshStandardMaterial({color:0xeeeeec,metalness:.12,roughness:.67}));platform.position.y=-.016;scene.add(platform);
  const ring=new T.Mesh(new T.RingGeometry(.63,.632,128),new T.MeshBasicMaterial({color:0x8c969f,transparent:true,opacity:.4,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;scene.add(ring);
  const innerRing=new T.Mesh(new T.RingGeometry(.55,.551,128),new T.MeshBasicMaterial({color:0xa4aeb8,transparent:true,opacity:.16,side:T.DoubleSide}));innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.001;scene.add(innerRing);
  const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),partTexture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);partTexture.needsUpdate=true;
  const selectedData=new Uint8Array(width*4),selectionTexture=new T.DataTexture(selectedData,width,1);selectionTexture.needsUpdate=true;
  const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],centers=atlas.parts.map(p=>new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
  const offsets:T.Vector3[]=[],bounds=atlas.parts.map(p=>new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));
  let packingWidth=1,packingHeight=1;
  const markerPositions=new Float32Array(atlas.parts.length*3),markerGeometry=new T.BufferGeometry();markerGeometry.setAttribute('position',new T.BufferAttribute(markerPositions,3));
  const markerMaterial=new T.PointsMaterial({color:0x64748b,size:5,sizeAttenuation:false,transparent:true,opacity:.72,depthTest:false});
  markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const markers=new T.Points(markerGeometry,markerMaterial);markers.frustumCulled=false;markers.renderOrder=10;markers.visible=false;scene.add(markers);
  const hover=document.createElement('div');hover.className='part-hover';hover.setAttribute('role','tooltip');hover.hidden=true;el.appendChild(hover);
  type Target={index:number;x:number;y:number;left:number;right:number;top:number;bottom:number};let targets:Target[]=[];
  const projected=new T.Vector3();
  const findTarget=(x:number,y:number,radius:number)=>{let best=-1,score=Infinity;for(const t of targets){const dx=Math.max(t.left-x,0,x-t.right),dy=Math.max(t.top-y,0,y-t.bottom),distance=Math.hypot(dx,dy);if(distance>radius)continue;const candidate=distance+Math.hypot(t.x-x,t.y-y)*.025;if(candidate<score){score=candidate;best=t.index;}}return best;};
  const groups=inspectionGroups(atlas),brainIds=new Set(groups.brain),skullIds=new Set(groups.skull);
  const clipUniform={value:1},testId={value:-1},testCenter={value:new T.Vector3()},testNormal={value:new T.Vector3()},testRadius={value:.01};
  let abrasionMesh:T.Mesh|undefined;
  const sahMeshes=new Map<number,T.Mesh>(),sahCache=new Map<T.BufferGeometry,T.BufferGeometry>();const sahMaterial=subarachnoidMaterial(partTexture,width);materials.push(sahMaterial);
  const baseGeometry=new Map<number,T.BufferGeometry>(),detailGeometry=new Map<number,T.BufferGeometry>(),activeGeometry=new Map<number,T.BufferGeometry>();
  const batches=new Map<number,{mesh:T.Mesh;members:number[]}[]>();
  const indexById=new Map(atlas.parts.map((p,i)=>[p.id,i]));
  let detailCatalogue:Promise<DetailAtlas>|null=null,detailRequestKey='',detailState:DetailStatus='base';
  const detailLoads=new Map<number,Promise<void>>(),approvedDetail=new Set<number>();
  const reportDetail=(value:DetailStatus)=>{if(detailState!==value){detailState=value;onDetailStatus(value);}};
  const materialFor=(system:string)=>{
   const m=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:system==='skeletal'?.82:system==='nervous'?.88:.7,envMapIntensity:.3,side:T.DoubleSide,transparent:system==='integumentary',opacity:system==='integumentary'?.1:1,depthWrite:system!=='integumentary'});
   m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{partState:{value:partTexture},selectionState:{value:selectionTexture},stateWidth:{value:width},skullCut:clipUniform,testId,testCenter,testNormal,testRadius});
    shader.vertexShader=`attribute float partIndex;
      uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth;
      varying float partVisible; varying float partSelected; varying float partSkull; varying float sourcePart;
      varying vec3 referencePosition; varying vec3 referenceNormal;
`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5);
      vec4 state = texture2D(partState, stateUv); vec4 selection = texture2D(selectionState, stateUv);
      referencePosition = position; referenceNormal = normal; sourcePart = partIndex;
      transformed += state.xyz; partVisible = state.w; partSelected = selection.r; partSkull = selection.g;`);
    shader.fragmentShader=`varying float partVisible; varying float partSelected; varying float partSkull; varying float sourcePart;
      varying vec3 referencePosition; varying vec3 referenceNormal;
      uniform float skullCut; uniform float testId; uniform vec3 testCenter; uniform vec3 testNormal; uniform float testRadius;
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if (partVisible < 0.5 || (partSkull > 0.5 && referencePosition.x > skullCut)) discard;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      // Developer-only synthetic surface patch; evaluated before GPU translations.
      if (abs(sourcePart-testId)<0.25) {
        vec3 delta=referencePosition-testCenter; float depth=dot(delta,testNormal);
        float radius=length(delta-testNormal*depth);
        float maskWeight=(1.0-smoothstep(testRadius*.8,testRadius,radius))
          *(1.0-smoothstep(testRadius*.3,testRadius*.5,abs(depth)))
          *smoothstep(.25,.5,dot(normalize(referenceNormal),testNormal));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.32,.48),maskWeight*.85);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      // A cool edge identifies selection without washing out anatomical materials.
      float selectionRim=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);
      totalEmissiveRadiance+=vec3(.035,.10,.17)*selectionRim*partSelected;`);
   };materials.push(m);return m;
  };
  const mats=new Map(SYSTEMS.map(s=>[s.id,materialFor(s.id)]));
  const makeGeometry=(p:Part,i:number,buffer:ArrayBuffer)=>{
   const arrays=detailArrays(p,buffer),g=new T.BufferGeometry();
   g.setAttribute('position',new T.BufferAttribute(arrays.positions,3));
   g.setAttribute('normal',new T.BufferAttribute(arrays.normals,3,true));
   g.setIndex(new T.BufferAttribute(arrays.indices,1));
   g.setAttribute('partIndex',new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i),1));
   const color=new T.Color(anatomyColor(p,brainIds)??SYSTEMS.find(s=>s.id===p.system)?.color??'#aebbb8'),colors=new Float32Array(p.vertexCount*3);
   for(let v=0;v<p.vertexCount;v++)color.toArray(colors,v*3);
   g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeBoundingBox();if('topology' in p){const actual=[g.boundingBox!.min.toArray(),g.boundingBox!.max.toArray()];for(let e=0;e<2;e++)for(let a=0;a<3;a++)if(Math.abs(actual[e][a]-p.bounds[e][a])>2e-7){g.dispose();throw new Error('Detail buffer registration mismatch.');}}g.computeBoundingSphere();geometries.push(g);return g;
  };
  const rebuildBatch=(ci:number)=>{
   for(const batch of batches.get(ci)??[]){scene.remove(batch.mesh);batch.mesh.geometry.dispose();}
   const bySystem=new Map<string,{gs:T.BufferGeometry[];members:number[]}>();
   atlas.parts.forEach((p,i)=>{const g=activeGeometry.get(i);if(p.chunk!==ci||!g)return;const group=bySystem.get(p.system)??{gs:[],members:[]};group.gs.push(g);group.members.push(i);bySystem.set(p.system,group);});
   const next:{mesh:T.Mesh;members:number[]}[]=[];
   bySystem.forEach(({gs,members},system)=>{const geometry=mergeGeometries(gs,false);if(!geometry)throw new Error('Could not assemble anatomy geometry.');const mesh=new T.Mesh(geometry,mats.get(system as never));mesh.frustumCulled=false;scene.add(mesh);next.push({mesh,members});});
   batches.set(ci,next);dirty=true;
  };
  const setActiveGeometry=(i:number,g:T.BufferGeometry)=>{
   if(atlas.parts[i].id===ABRASION.parent){if(abrasionMesh){scene.remove(abrasionMesh);abrasionMesh.geometry.dispose();(abrasionMesh.material as T.Material).dispose();}abrasionMesh=new T.Mesh(abrasionGeometry(g,i),abrasionMaterial(partTexture,width));abrasionMesh.frustumCulled=false;abrasionMesh.visible=false;scene.add(abrasionMesh);}
   if(SAH.parents.includes(atlas.parts[i].id)){const old=sahMeshes.get(i);if(old)scene.remove(old);let overlay=sahCache.get(g);if(!overlay){overlay=subarachnoidGeometry(g,i);sahCache.set(g,overlay);geometries.push(overlay);}const mesh=new T.Mesh(overlay,sahMaterial);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);sahMeshes.set(i,mesh);}
   activeGeometry.set(i,g);const pick=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));
   (pickers[i]?.material as T.Material|undefined)?.dispose();pick.matrixAutoUpdate=false;pick.position.set(data[i*4],data[i*4+1],data[i*4+2]);pick.updateMatrix();pick.updateMatrixWorld(true);pickers[i]=pick;
   bounds[i].copy(g.boundingBox!);
  };
  const productionMeshes=new Map<string,{mesh:T.Mesh;parent:number;mode:string}>();let productionKey='';
  async function syncProduction(){
   const entries=latest.current.productionInjuries??[],key=JSON.stringify(entries);if(key===productionKey)return;productionKey=key;
   for(const {mesh} of productionMeshes.values()){scene.remove(mesh);mesh.geometry.dispose();(mesh.material as T.Material).dispose();}productionMeshes.clear();syncDetail();lastState=null;
   for(const entry of entries){if(entry.hidden)continue;const i=indexById.get(entry.parentId);if(i===undefined)continue;
    try{const response=await fetch(entry.url,{signal:abort.signal,credentials:'same-origin'});if(!response.ok)throw new Error('Injury asset unavailable');const asset=await response.json() as {parentId:string;mode:string;recipe:{kind:string};appearanceVersion?:number;geometry:import("./production-injury").GeometryData};if(disposed||productionKey!==key)return;
     if(asset.parentId!==entry.parentId||asset.mode!==entry.mode)throw new Error('Injury registration mismatch');
     const geometry=geometryFromData(asset.geometry,i);const material=productionMaterial(partTexture,width,asset.recipe.kind,asset.appearanceVersion??0);const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);productionMeshes.set(entry.id,{mesh,parent:i,mode:entry.mode});lastState=null;dirty=true;syncDetail();
    }catch(e){if(!disposed){el.dataset.productionError='Injury asset could not be loaded';console.error('Injury asset could not be loaded');}}
   }
  }
  const fractures=new Map<T.BufferGeometry,T.BufferGeometry>();
  const syncDetail=()=>{
   const s=latest.current,changedChunks=new Set<number>();
   atlas.parts.forEach((p,i)=>{const base=baseGeometry.get(i);if(!base)return;let g=s.isolate&&s.sourceDetail!==false&&s.selected.includes(p.id)&&approvedDetail.has(i)?detailGeometry.get(i)??base:base;if(p.id===RIB_FRACTURE.parent&&s.fractureMode&&s.fractureVisible){if(!fractures.has(g)){const cut=fractureGeometry(g,i);fractures.set(g,cut);geometries.push(cut);}g=fractures.get(g)!;}const replacement=[...productionMeshes.values()].find(item=>item.parent===i&&item.mode==='replacement');if(replacement)g=replacement.mesh.geometry;if(activeGeometry.get(i)!==g){setActiveGeometry(i,g);changedChunks.add(p.chunk);}});
   changedChunks.forEach(rebuildBatch);if(changedChunks.size)lastState=null;
  };
  const requestDetail=async(ids:string[])=>{
   try{
    reportDetail('loading');detailCatalogue??=fetchDetailCatalogue(atlas,abort.signal);const detail=await detailCatalogue;
    const wanted=new Set(ids),parts=detail.parts.filter(p=>wanted.has(p.id));
    let cursor=0;const chunks=[...new Set(parts.map(p=>p.chunk))];
    await Promise.all(Array.from({length:3},async()=>{while(cursor<chunks.length){const ci=chunks[cursor++];if(!detailLoads.has(ci)){detailLoads.set(ci,(async()=>{const buffer=await fetchDetailChunk(detail,ci,abort.signal);if(disposed)return;const staged=new Map<number,T.BufferGeometry>();for(const p of detail.parts.filter(p=>p.chunk===ci)){const i=indexById.get(p.id)!;staged.set(i,makeGeometry(p,i,buffer));}staged.forEach((g,i)=>detailGeometry.set(i,g));})());}await detailLoads.get(ci);}}));
    if(disposed)return;parts.forEach(p=>approvedDetail.add(indexById.get(p.id)!));syncDetail();if(detailRequestKey===ids.join(','))reportDetail(parts.length?'ready':'base');dirty=true;
   }catch{if(!disposed&&detailRequestKey===ids.join(','))reportDetail('unavailable');}
  };
  let loaded=0;
  const loadChunk=async(ci:number)=>{const chunk=atlas.chunks[ci],compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';const response=await fetch(compressed?chunk.gzip!:chunk.url,{signal:abort.signal});const buffer=await decodeModelResponse(response,chunk.bytes,compressed);if(disposed)return;atlas.parts.forEach((p,i)=>{if(p.chunk!==ci)return;const g=makeGeometry(p,i,buffer);baseGeometry.set(i,g);setActiveGeometry(i,g);});rebuildBatch(ci);lastState=null;loaded++;onProgress(Math.round(loaded/atlas.chunks.length*100));dirty=true;};
  (async()=>{try{let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<atlas.chunks.length){const i=cursor++;await loadChunk(i);}}));if(!disposed){ready=true;dirty=true;}}catch(e){if(!disposed)onError(e instanceof Error?e.message:'Could not load the anatomy.');}})();
  const viewDirection=(view:string)=>new T.Vector3(...(view==='front'?[0,0,1]:view==='back'?[0,0,-1]:view==='side'||view==='left'?[1,0,0]:view==='right'?[-1,0,0]:view==='superior'?[0,1,.001]:view==='inferior'?[0,-1,.001]:[.2,.1,1]) as [number,number,number]).normalize();
  const fit=(view:string,extent=0)=>{const aspect=camera.aspect,mobile=el.clientWidth<768,normalDistance=mobile?Math.max(4.5,1.8*el.clientHeight/Math.max(160,el.clientHeight-350)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))):4;const reservedHeight=mobile?350:270;const availableAspect=Math.max(.35,(el.clientWidth-(mobile?40:340))/Math.max(160,el.clientHeight-reservedHeight));const atlasDistance=Math.max(packingHeight,packingWidth/availableAspect)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*(el.clientHeight/Math.max(160,el.clientHeight-reservedHeight))*1.08;const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);if(extent>.8)view='front';const direction=viewDirection(view);controls.target.set(extent>.1&&el.clientWidth>767?-packingWidth*.12:0,extent>.1||mobile?.85:.68,0);camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();dirty=true;};
  const resize=()=>{lastIsolate='';focusKey='';ribFocusKey='';sahFocusKey='';layoutKey='';lastState=null;renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<768||el.clientHeight<600?1.5:2));camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);fit(latest.current.view,amount);};const observer=new ResizeObserver(resize);observer.observe(el);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap(),worldBox=new T.Box3(),hitPoint=new T.Vector3();
  const down=(e:PointerEvent)=>{hover.hidden=true;tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);};
  const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||amount<.5||e.pointerType==='touch'){hover.hidden=true;return;}const rect=el.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,index=findTarget(x,y,12);hover.hidden=index<0;renderer.domElement.style.cursor=index<0?'grab':'pointer';if(index>=0){hover.textContent=atlas.parts[index].name;hover.style.left=`${Math.max(8,Math.min(x+14,el.clientWidth-260))}px`;hover.style.top=`${Math.max(8,Math.min(y+18,el.clientHeight-55))}px`;}};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const up=(e:PointerEvent)=>{const validTap=tap.up(e.pointerId,e.clientX,e.clientY);if(!validTap||!ready)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);let nearest=Infinity,found=-1,anchor:number[]|undefined,anchorNormal:number[]|undefined;const hasSolid=atlas.parts.some((p,i)=>p.system!=='integumentary'&&data[i*4+3]>.5);pickers.forEach((mesh,i)=>{if(!mesh||data[i*4+3]<.5||(hasSolid&&atlas.parts[i].system==='integumentary'))return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hits=raycaster.intersectObject(mesh,false);const hit=hits.find(h=>!isClipped(h.point.x-mesh.position.x,skullIds.has(atlas.parts[i].id),latest.current.skullReveal??0));if(hit&&hit.distance<nearest){nearest=hit.distance;found=i;anchor=hit.point.clone().sub(mesh.position).toArray();anchorNormal=hit.face?.normal.toArray();}});if(found<0&&amount>.45)found=findTarget(e.clientX-rect.left,e.clientY-rect.top,e.pointerType==='touch'?24:16);if(found>=0){hover.hidden=true;select.current(atlas.parts[found].id,anchor,anchorNormal);}};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
  const compass=document.createElement('div');compass.className='orientation-compass';compass.setAttribute('aria-label','Patient orientation: L left, R right, A anterior, P posterior, S superior, I inferior');el.appendChild(compass);
  const compassAxes=([['L',1,0,0],['R',-1,0,0],['S',0,1,0],['I',0,-1,0],['A',0,0,1],['P',0,0,-1]] as const).map(([name,x,y,z])=>{const label=document.createElement('span');label.textContent=name;compass.appendChild(label);return {label,axis:new T.Vector3(x,y,z)};});
  const axisVector=new T.Vector3(),inverseCamera=new T.Quaternion();
  const clock=new T.Clock();let lastExtent=-1,focusKey='',ribFocusKey='',sahFocusKey='',lastTurn=0,turnRemaining=0,fractureKey='';
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);void syncProduction();const elapsed=clock.getDelta(),dt=Math.min(elapsed,.05),s=latest.current;const nextFracture=String(s.fractureMode)+':'+s.fractureVisible;if(nextFracture!==fractureKey){fractureKey=nextFracture;syncDetail();}const detailKey=ready&&s.isolate&&s.sourceDetail!==false?s.selected.filter(id=>brainIds.has(id)||skullIds.has(id)||groups.rib.includes(id)).join(','):'';if(detailKey!==detailRequestKey){detailRequestKey=detailKey;syncDetail();if(detailKey)void requestDetail(detailKey.split(','));else reportDetail('base');}const changed=lastState?.sahMode!==s.sahMode||lastState?.sahVisible!==s.sahVisible||lastState?.abrasionMode!==s.abrasionMode||lastState?.abrasionVisible!==s.abrasionVisible||lastState?.visible!==s.visible||lastState?.selected!==s.selected||lastState?.isolate!==s.isolate||lastState?.selectionMode!==s.selectionMode||lastState?.hiddenParts!==s.hiddenParts||lastState?.skullReveal!==s.skullReveal||lastState?.registrationTest!==s.registrationTest;const moving=Math.abs(amount-s.explode)>.0001;if(moving){amount=T.MathUtils.damp(amount,s.explode,8,dt);dirty=true;}if(changed||moving||lastExtent<0){

    const visible=new Set(s.visible),selection=new Set(s.selected);const visibleParts=atlas.parts.filter(p=>partIsVisible(p,s,skullIds.has(p.id)));const nextLayoutKey=visibleParts.map(p=>p.id).join(',')+':'+camera.aspect.toFixed(3);if(nextLayoutKey!==layoutKey){const layout=createExplosionLayout(visibleParts,camera.aspect);packingWidth=layout.width;packingHeight=layout.height;atlas.parts.forEach((p,i)=>{const cell=layout.cells.get(p.id);offsets[i]=cell?new T.Vector3(cell.x,cell.y+.85,0):centers[i].clone();});layoutKey=nextLayoutKey;if(amount>.05&&!s.isolate)fit(s.view,Math.max(0,(amount-.3)/.7));}
    atlas.parts.forEach((p,i)=>{const c=centers[i],destination=offsets[i];let dx=0,dy=0,dz=0;if(amount<=.45){const t=amount/.45;const group=SYSTEMS.findIndex(sys=>sys.id===p.system);const angle=group/SYSTEMS.length*Math.PI*2;dx=Math.sin(angle)*t*.48;dy=(c.y-.85)*t*.28;dz=Math.cos(angle)*t*.48;}else{const t=(amount-.45)/.55,group=SYSTEMS.findIndex(sys=>sys.id===p.system),angle=group/SYSTEMS.length*Math.PI*2;dx=T.MathUtils.lerp(Math.sin(angle)*.48,destination.x-c.x,t);dy=T.MathUtils.lerp((c.y-.85)*.28,destination.y-c.y,t);dz=T.MathUtils.lerp(Math.cos(angle)*.48,-c.z,t);}const selected=selection.has(p.id),tint=selected&&!s.isolate;data.set([dx,dy,dz,partIsVisible(p,s,skullIds.has(p.id))?1:0],i*4);selectedData[i*4]=tint?255:0;selectedData[i*4+1]=skullIds.has(p.id)?255:0;markerPositions.set(data[i*4+3]>.5?[c.x+dx,c.y+dy,c.z+dz]:[10000,10000,10000],i*3);const mesh=pickers[i];if(mesh){mesh.position.set(dx,dy,dz);mesh.updateMatrix();mesh.updateMatrixWorld(true);}});partTexture.needsUpdate=true;selectionTexture.needsUpdate=true;markerGeometry.attributes.position.needsUpdate=true;
    clipUniform.value=(s.skullReveal??0)>0?skullCut(s.skullReveal!):1;
    for(const list of batches.values())for(const batch of list)batch.mesh.visible=batch.members.some(i=>data[i*4+3]>.5);
    const skinMat=mats.get('integumentary')!;const opaque=!!s.abrasionMode||[...productionMeshes.values()].some(item=>atlas.parts[item.parent].system==='integumentary');if(skinMat.transparent===opaque){skinMat.transparent=!opaque;skinMat.opacity=opaque?1:.1;skinMat.depthWrite=opaque;skinMat.needsUpdate=true;}
    if(abrasionMesh)abrasionMesh.visible=!!s.abrasionMode&&!!s.abrasionVisible&&data[indexById.get(ABRASION.parent)!*4+3]>.5;
    productionMeshes.forEach(({mesh,parent,mode})=>{mesh.visible=mode!=='replacement'&&data[parent*4+3]>.5;});el.dataset.productionCount=String(productionMeshes.size);
    sahMeshes.forEach((mesh,i)=>{mesh.visible=!!s.sahMode&&!!s.sahVisible&&data[i*4+3]>.5;});
    testId.value=-1;
    if(s.registrationTest){const id=registrationTarget(s.inspection),i=indexById.get(id),g=i===undefined?undefined:baseGeometry.get(i);if(g&&i!==undefined){
      const pos=g.getAttribute('position'),norm=g.getAttribute('normal');let vertex=0,score=-Infinity;
      for(let v=0;v<pos.count;v++){const candidate=pos.getZ(v);if(candidate>score&&norm.getZ(v)>.45){score=candidate;vertex=v;}}
      testId.value=i;testCenter.value.fromBufferAttribute(pos,vertex);testNormal.value.fromBufferAttribute(norm,vertex).normalize();testRadius.value=id==='FJ3229'?.008:.012;
    }}
lastState=s;lastExtent=amount;dirty=true;}
   if(s.view!==lastView||s.reset!==lastReset){fit(s.view,amount);lastView=s.view;lastReset=s.reset;}if(moving&&!s.isolate)fit(amount>.5?'front':s.view,Math.max(0,(amount-.3)/.7));const isolateKey=s.isolate?s.selected.join(',')+':'+s.reset+':'+s.inspectorOpen+':'+s.layersOpen+':'+camera.aspect:'';if(isolateKey!==lastIsolate||(s.isolate&&moving)){if(s.isolate){const box=new T.Box3();atlas.parts.forEach((p,i)=>{if(s.selected.includes(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});if(!box.isEmpty()){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const w=el.clientWidth,h=el.clientHeight,landscape=w>h&&h<=600,mobile=w<768||(w<=1024&&landscape&&matchMedia('(pointer: coarse)').matches);let left=20,right=w-20,top=mobile?(landscape?95:110):135,bottom=h-(mobile?(landscape?45:100):170);if(!mobile){left=305;right=w-95;}if(s.layersOpen&&mobile){const panel=document.querySelector('.layers-panel')?.getBoundingClientRect();if(panel){if(landscape)left=panel.right+16;else bottom=panel.top-16;}}if(s.inspectorOpen){if(landscape){right=w-335;top=100;bottom=h-125;}else if(mobile){const sheet=document.querySelector('.detail-sheet')?.getBoundingClientRect(),header=document.querySelector('.identity')?.getBoundingClientRect();top=(header?.bottom??94)+16;bottom=(sheet?.top??h*.58-139)-16;}else{right=w-370;left=w>1100?285:25;}}const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top);camera.setViewOffset(w,h,w/2-(left+right)/2,h/2-(top+bottom)/2,w,h);const distance=Math.max(.07,Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.35);controls.maxDistance=Math.max(40,distance*2);controls.target.copy(center);camera.position.copy(center).add(viewDirection(s.view).multiplyScalar(distance));controls.update();dirty=true;}}else if(lastIsolate){camera.clearViewOffset();fit(s.view,amount);}lastIsolate=isolateKey;}
   if(!s.shoulderFocus&&focusKey.startsWith('true')){camera.clearViewOffset();dirty=true;}const nextFocus=String(s.shoulderFocus)+':'+s.reset+':'+s.layersOpen;if(s.abrasionMode&&s.shoulderFocus&&(nextFocus!==focusKey||moving)){const i=indexById.get(ABRASION.parent)!;controls.target.set(.172+data[i*4],1.397+data[i*4+1],-.10+data[i*4+2]);camera.position.copy(controls.target).add(new T.Vector3(.08,.04,-.38));camera.clearViewOffset();if(el.clientWidth>767)camera.setViewOffset(el.clientWidth,el.clientHeight,-100,0,el.clientWidth,el.clientHeight);else if(s.layersOpen){const panel=document.querySelector('.layers-panel')?.getBoundingClientRect();if(panel)camera.setViewOffset(el.clientWidth,el.clientHeight,0,el.clientHeight/2-(110+Math.max(150,panel.top-16))/2,el.clientWidth,el.clientHeight);}controls.update();dirty=true;}focusKey=nextFocus;
   const nextRibFocus=String(s.fractureFocus)+':'+s.reset+':'+s.layersOpen;if(s.fractureMode&&s.fractureFocus&&(nextRibFocus!==ribFocusKey||moving)){const i=indexById.get(RIB_FRACTURE.parent)!;controls.target.set(.083+data[i*4],1.387+data[i*4+1],.010+data[i*4+2]);camera.position.copy(controls.target).add(new T.Vector3(.065,.04,.045));camera.clearViewOffset();if(el.clientWidth>767)camera.setViewOffset(el.clientWidth,el.clientHeight,-100,0,el.clientWidth,el.clientHeight);controls.update();dirty=true;}ribFocusKey=nextRibFocus;
   const nextSahFocus=String(s.sahFocus)+':'+s.reset+':'+s.layersOpen;if(s.sahMode&&s.sahFocus&&nextSahFocus!==sahFocusKey){controls.target.fromArray(SAH.center);camera.position.copy(controls.target).add(new T.Vector3(.09,.085,.09));camera.clearViewOffset();if(el.clientWidth>767)camera.setViewOffset(el.clientWidth,el.clientHeight,-100,0,el.clientWidth,el.clientHeight);else if(s.layersOpen){const panel=document.querySelector('.layers-panel')?.getBoundingClientRect();if(panel)camera.setViewOffset(el.clientWidth,el.clientHeight,0,el.clientHeight/2-(110+Math.max(150,panel.top-16))/2,el.clientWidth,el.clientHeight);}controls.update();dirty=true;}sahFocusKey=nextSahFocus;
   if((s.abrasionTurn??0)!==lastTurn){lastTurn=s.abrasionTurn??0;turnRemaining=2*Math.PI;}
   if(turnRemaining>0&&(s.abrasionMode||s.fractureMode||s.sahMode)){const step=Math.min(turnRemaining,elapsed*.65);camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),step).add(controls.target);turnRemaining-=step;controls.update();dirty=true;}el.dataset.sahVisible=String([...sahMeshes.values()].some(m=>m.visible));el.dataset.sahParts=String([...sahMeshes.values()].filter(m=>m.visible).length);el.dataset.sahTranslations=JSON.stringify([...sahMeshes.keys()].map(i=>({id:atlas.parts[i].id,translation:Array.from(data.slice(i*4,i*4+3)),visible:data[i*4+3]>.5})));el.dataset.abrasionTurning=String(turnRemaining>0);
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;ground.visible=platform.visible=ring.visible=innerRing.visible=amount<.5&&!s.isolate;markers.visible=amount>.75;controls.autoRotate=s.rotate&&!s.isolate&&amount<.4;controls.autoRotateSpeed=.65;controls.update();if(controls.autoRotate)dirty=true;if(dirty){const renderStart=performance.now();renderer.render(scene,camera);el.dataset.renderMs=(performance.now()-renderStart).toFixed(2);el.dataset.drawCalls=String(renderer.info.render.calls);el.dataset.renderTriangles=String(renderer.info.render.triangles);el.dataset.detailParts=String([...activeGeometry].filter(([i,g])=>data[i*4+3]>.5&&g===detailGeometry.get(i)).length);el.dataset.visibleParts=String(atlas.parts.filter((p,i)=>data[i*4+3]>.5).length);el.dataset.overlayVisible=String(testId.value>=0&&data[testId.value*4+3]>.5);el.dataset.overlayAnchor=testCenter.value.toArray().join(',');el.dataset.fractureVisible=String(!!s.fractureMode&&!!s.fractureVisible&&data[indexById.get(RIB_FRACTURE.parent)!*4+3]>.5);el.dataset.fractureFaces=String(activeGeometry.get(indexById.get(RIB_FRACTURE.parent)!)?.userData.fractureFaces??0);el.dataset.abrasionVisible=String(!!abrasionMesh?.visible);el.dataset.abrasionTriangles=String((abrasionMesh?.geometry.getAttribute('position').count??0)/3);el.dataset.abrasionTranslation=Array.from(data.slice(indexById.get(ABRASION.parent)!*4,indexById.get(ABRASION.parent)!*4+3)).join(',');inverseCamera.copy(camera.quaternion).invert();compassAxes.forEach(({label,axis})=>{axisVector.copy(axis).applyQuaternion(inverseCamera);label.style.marginLeft=`${axisVector.x*30}px`;label.style.marginTop=`${-axisVector.y*30}px`;label.className=axisVector.z<-.15?'axis-back':'';});targets=[];if(amount>.45){const hasSolid=atlas.parts.some((p,i)=>p.system!=='integumentary'&&data[i*4+3]>.5);atlas.parts.forEach((p,i)=>{if(data[i*4+3]<.5||(hasSolid&&p.system==='integumentary'))return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2,left,right,top,bottom});});}dirty=false;}};
  animate();
  const contextLost=(e:Event)=>{e.preventDefault();onError('The 3D session was paused by your device. Reload to continue.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());pickers.forEach(p=>(p?.material as T.Material|undefined)?.dispose());materials.forEach(m=>m.dispose());scene.traverse(o=>{if(o instanceof T.Mesh&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env.dispose();partTexture.dispose();selectionTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();hover.remove();compass.remove();renderer.dispose();renderer.domElement.remove();};
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
