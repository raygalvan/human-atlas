/** Actual browser regression against the production build under its nested URL.
 * Screenshots and video are review evidence, never a substitute for inspecting them.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(process.env.ATLAS_BROWSER_TOOLS||root,'package.json'));
const {chromium,webkit}=require('playwright'),{PNG}=require('pngjs');
const scope=process.env.ATLAS_SCOPE||'all';
const engine=process.env.ATLAS_BROWSER||'chromium',output=path.join(root,'artifacts/refinement',engine);
mkdirSync(output,{recursive:true});
const dist=path.join(root,'dist'),prefix='/courtroom-atlas/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix))throw Error();const f=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(!f.startsWith(dist+path.sep)||!statSync(f).isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});createReadStream(f).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const entry=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']}:{})});
const measurements=[],errors=[],touchSessions=new WeakMap();
function watch(page){page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Page crashed'));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});}
const settle=page=>page.waitForTimeout(450);
async function loaded(page,url=entry){const start=Date.now();await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>document.querySelector('canvas')&&!document.querySelector('.loading'),{},{timeout:150000});return Date.now()-start;}
async function layers(page){if(!await page.getByRole('tab',{name:'Systems',exact:true}).isVisible())await page.getByRole('button',{name:'Open atlas layers',exact:true}).click();}
async function inspect(page,name){await layers(page);const summary=page.locator('.inspection-controls summary');if(!await page.getByRole('button',{name:'Brain',exact:true}).isVisible())await summary.click();await page.getByRole('button',{name,exact:true}).click();}
async function closeLayers(page,mobile){if(mobile&&await page.getByRole('tab',{name:'Systems',exact:true}).isVisible())await page.getByRole('button',{name:'Minimize explore panel',exact:true}).click();await settle(page);}
async function overlay(page,visible){await page.waitForFunction(value=>document.querySelector('.scene')?.dataset.overlayVisible===String(value),visible,{timeout:45000});}
async function detail(page,count){await page.waitForFunction(n=>Number(document.querySelector('.scene')?.dataset.detailParts)===n,count,{timeout:90000});}
async function capture(page,name){await settle(page);const png=await page.screenshot({path:path.join(output,name+'.png'),timeout:90000});const image=PNG.sync.read(png);assert(image.width>300&&image.height>300);return png;}
async function orbit(page,mobile=false){
 if(mobile&&engine==='chromium'){
  // Keep the CDP session until context close: detaching resets Chromium's
  // emulation state and can silently turn a touch viewport into pointer:fine.
  const coarse=await page.evaluate(()=>matchMedia('(pointer: coarse)').matches);
  let session=touchSessions.get(page);if(!session){session=await page.context().newCDPSession(page);touchSessions.set(page,session);}
  const size=page.viewportSize(),x=size.width*.55,y=size.height*.42,start=Date.now();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y+12,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-42,y,id:1},{x:x+42,y,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await settle(page);assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),coarse,'Touch test must preserve device emulation');return Date.now()-start;
 }
 const box=await page.locator('canvas').boundingBox(),x=box.width*.56,y=box.height*.42,start=Date.now();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+box.width*.13,y+18,{steps:4});await page.mouse.up();await settle(page);return Date.now()-start;}
function bluePixels(bytes){const {data,width,height}=PNG.sync.read(bytes);let count=0;for(let y=135;y<height-175;y++)for(let x=320;x<width-110;x++){const i=(y*width+x)*4;if(data[i]<data[i+1]*.78&&data[i+2]>data[i+1]*1.08&&data[i+1]>45)count++;}return count;}
try{
 for(const [label,viewport] of [['desktop',{width:1365,height:900}],['phone-portrait',{width:390,height:600}],['phone-landscape',{width:844,height:390}]].filter(([label])=>scope==='all'||(scope==='desktop'?label==='desktop':scope==='mobile'?label!=='desktop':false))){
  const mobile=label!=='desktop',context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();watch(page);
  try{
   const loadMs=await loaded(page);measurements.push({engine,viewport,label,loadMs,environment:'GitHub Actions Linux; software rendering; emulated mobile, not a physical iPhone'});
   assert.equal(await page.getByRole('tab',{name:'Body Surface',exact:true}).count(),0);assert.equal(await page.getByRole('switch',{name:'Synthetic registration patch',exact:true}).count(),0);
   // Real user toggles, including three full round trips, retain both tab states.
   for(let repeat=0;repeat<3;repeat++){
    await layers(page);await page.getByRole('tab',{name:/^Injuries/}).click();
    await page.getByRole('button',{name:'Brain reference',exact:true}).click();await detail(page,54);
    await page.getByRole('switch',{name:'Show Left ribs 2–4 reference',exact:true}).click();
    await page.getByRole('tab',{name:'Systems',exact:true}).click();
    await page.getByRole('tab',{name:/^Injuries/}).click();assert.equal(await page.getByRole('switch',{name:'Show Left ribs 2–4 reference',exact:true}).getAttribute('aria-checked'),'true');
    await page.getByRole('button',{name:'Clear injuries',exact:true}).click();await page.getByRole('tab',{name:'Systems',exact:true}).click();
   }
   for(const [name,slug,count] of [['Brain','brain',59],['Skull','skull',18],['Left rib 2','rib',1]]){
    await inspect(page,name);await detail(page,count);if(mobile&&slug==='brain'){if(label==='phone-portrait'){const panel=await page.locator('.layers-panel').boundingBox(),size=page.viewportSize();assert(panel.y<=1&&panel.height>=size.height-2,'Portrait Explore must open full screen');assert(await page.getByRole('button',{name:'Minimize explore panel',exact:true}).isVisible(),'Full-screen Explore needs its minimize control');}await capture(page,`${label}-brain-layers-open`);}await closeLayers(page,mobile);
    const before=await capture(page,`${label}-${slug}`),orbitMs=await orbit(page,mobile),after=await capture(page,`${label}-${slug}-orbit`);assert.notDeepEqual(before,after,'Orbit must change the rendered anatomy');
    measurements.push({label,structure:name,orbitActionAndSettleMs:orbitMs,diagnostics:await page.locator('.scene').evaluate(el=>({...el.dataset})),input:mobile&&engine==='chromium'?'Emulated touch orbit and two-finger pinch':'Mouse orbit'});
    // Direct canvas picking must open a real named source structure.
    if(!mobile&&slug==='brain'){
     await page.getByRole('button',{name:'front view',exact:true}).click();await settle(page);
     await page.mouse.click(780,330);await page.locator('.detail-sheet').waitFor({state:'visible'});
     assert((await page.locator('.structure-title').innerText()).length>3);
     await page.getByRole('button',{name:'Close',exact:true}).click();await inspect(page,name);await detail(page,count);
    }
    await layers(page);
    if(!mobile&&engine==='chromium'){for(const direction of ['front','rear','left','right','top','base']){await page.getByRole('button',{name:`Inspect from ${direction}`,exact:true}).click();await capture(page,`${slug}-${direction}`);}}
   }
   await inspect(page,'Brain + skull');await detail(page,77);
   const reveal=page.getByRole('slider',{name:/Reveal through skull/});await reveal.press('Home');for(let n=0;n<5;n++)await reveal.press('PageUp');assert.equal(Number(await reveal.getAttribute('aria-valuenow')),50);
   await closeLayers(page,mobile);await capture(page,`${label}-relationship-reveal`);
   await layers(page);await reveal.press('Home');await closeLayers(page,mobile);await capture(page,`${label}-relationship-restored`);
   await layers(page);await page.getByRole('button',{name:'Restore atlas',exact:true}).click();await layers(page);
   await page.getByRole('switch',{name:'Show body surface',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'Show body surface',exact:true}).getAttribute('aria-checked'),'true');
   await closeLayers(page,mobile);
   assert.equal(await page.locator('.view-controls').isVisible(),!mobile);assert.equal(await page.locator('.explode-control').isVisible(),!mobile);assert.equal(await page.locator('.dock-reset').isVisible(),!mobile);
   if(mobile)assert(await page.getByRole('button',{name:'Open atlas layers',exact:true}).isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
   const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/models\//.test(n)));assert(requests.length>15&&requests.every(n=>n.includes('/courtroom-atlas/models/')),'All geometry stays below the nested hosting path');
   await capture(page,`${label}-normal-atlas`);assert.deepEqual(errors,[]);
   console.log(`PASS ${engine} ${label}: integrated selection, orbit, tab transitions, reveal/restore, ordinary skin, compact controls, nested assets`);
  }catch(error){writeFileSync(path.join(output,label+'-failure.txt'),String(error.stack)+'\n'+JSON.stringify(errors));await page.screenshot({path:path.join(output,label+'-failure.png'),timeout:90000}).catch(()=>{});throw error;}finally{await context.close();}
 }
 if(scope==='all'||scope==='registration'){
 // Synthetic fixtures live only behind the explicit developer view. Record a
 // short sequence exercising the actual GPU-driven attachment and topology swap.
 const context=await browser.newContext({viewport:{width:1365,height:900},deviceScaleFactor:1,...(engine==='chromium'?{recordVideo:{dir:path.join(output,'video'),size:{width:1365,height:900}}}:{})});
 const page=await context.newPage();watch(page);
 try{
  await loaded(page,entry+'?developer=registration');
  for(const [name,slug,count] of [['Brain','brain',59],['Skull','skull',18],['Left rib 2','rib',1]]){
   await inspect(page,name);await detail(page,count);await page.getByRole('button',{name:'Inspect from front',exact:true}).click();
   const clean=await capture(page,`${slug}-clean`);await page.getByRole('switch',{name:'Synthetic registration patch',exact:true}).click();
   const marked=await capture(page,`${slug}-synthetic`);assert(bluePixels(marked)>bluePixels(clean)+15,'Synthetic overlay must color the target surface');
   const anchor=await page.locator('.scene').getAttribute('data-overlay-anchor');
   await orbit(page);await capture(page,`${slug}-synthetic-orbit`);
   await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await detail(page,0);await capture(page,`${slug}-synthetic-base`);
   assert.equal(await page.locator('.scene').getAttribute('data-overlay-anchor'),anchor,'Topology-independent registration must not change on detail swap');
   await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await detail(page,count);
   const explode=page.getByRole('slider',{name:'Explode anatomy',exact:true});await explode.press('Home');for(let i=0;i<4;i++)await explode.press('PageUp');await page.waitForTimeout(1800);await capture(page,`${slug}-synthetic-exploded`);
   assert.equal(await page.locator('.scene').getAttribute('data-overlay-visible'),'true');
   if(slug==='brain'){await page.getByRole('switch',{name:'Show left cerebral hemisphere',exact:true}).click();await overlay(page,false);assert.equal(await page.locator('.scene').getAttribute('data-overlay-visible'),'false');await capture(page,'brain-parent-hidden');}
   await page.getByRole('button',{name:'Restore atlas',exact:true}).click();await overlay(page,false);assert.equal(await page.locator('.scene').getAttribute('data-overlay-visible'),'false');
  }
 }finally{await context.close();}
 for(const missing of ['catalogue','chunk']){
  const context=await browser.newContext({viewport:{width:1365,height:900}}),page=await context.newPage();watch(page);let failures=0;
  await page.route(missing==='catalogue'?'**/models/inspection/detail.json':'**/models/inspection/*.bin.gz',route=>{failures++;return route.fulfill({status:404,body:'Intentional missing optional detail'});});
  try{await loaded(page);await inspect(page,'Brain');await page.getByText('Detail unavailable. Base anatomy remains active.',{exact:true}).waitFor();assert(failures>0);await detail(page,0);assert.equal(await page.locator('.scene').getAttribute('data-visible-parts'),'59');await orbit(page);await capture(page,`missing-${missing}-working-brain`);assert.equal(await page.locator('.error').count(),0);assert.deepEqual(errors,[]);}finally{await context.close();}
 }
 console.log(`PASS ${engine}: surface masks survive rotation, source-detail swaps and explosion; hidden parents remove overlays; missing optional assets retain the base viewer`);
 }
}finally{writeFileSync(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));await browser.close();await new Promise(r=>server.close(r));}
