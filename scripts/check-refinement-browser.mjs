import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(process.env.ATLAS_BROWSER_TOOLS||root,'package.json'));
const {chromium,webkit}=require('playwright');
const engine=process.env.ATLAS_BROWSER||'chromium',label=process.env.ATLAS_CAPTURE||'baseline';
const output=path.join(root,'artifacts/refinement',label);mkdirSync(output,{recursive:true});
const dist=path.resolve(process.env.ATLAS_DIST||path.join(root,'dist')),prefix='/courtroom-atlas/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix))throw Error();const file=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(dist+path.sep)||!statSync(file).isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});createReadStream(file).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']}:{})});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:1365,height:900},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|shader|WebGL/i.test(message.text()))errors.push(message.text());});
 const start=Date.now();await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('canvas')&&!document.querySelector('.loading'),{},{timeout:150000});
 results.push({loadMs:Date.now()-start,engine,viewport:'1365x900',gpu:'software renderer on GitHub Actions',revision:process.env.ATLAS_SOURCE_REVISION||process.env.GITHUB_SHA});
 for(const [name,slug] of [['brain','brain'],['skull','skull'],['left second rib','rib']].filter(([,slug])=>label!=='brain-milestone'||slug==='brain')){
  await page.getByRole('button',{name:'Search anatomy',exact:true}).click();
  await page.getByRole('combobox').fill(name);
  await page.getByRole('option').filter({has:page.locator('.search-result-name').getByText(name,{exact:true})}).click();
  await page.getByRole('button',{name:'Isolate structure',exact:true}).click();
  if(label!=='baseline')await page.waitForFunction(n=>Number(document.querySelector('.scene')?.dataset.detailParts)===n,slug==='brain'?59:slug==='skull'?18:1,{timeout:90000});
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(output,`${engine}-${slug}-front.png`)});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(output,`${engine}-${slug}-isolated.png`)});
  if(label!=='baseline'||process.env.ATLAS_MEASURE_INTERACTION==='1'){
  await page.evaluate(()=>{window.atlasFrameTimes=[];window.atlasMeasureFrames=true;const sample=now=>{window.atlasFrameTimes.push(now);if(window.atlasMeasureFrames)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  const actionStart=Date.now();
  const canvas=await page.locator('canvas').boundingBox();
  await page.mouse.move(canvas.width*.55,canvas.height*.42);await page.mouse.down();await page.mouse.move(canvas.width*.75,canvas.height*.42,{steps:4});await page.mouse.up();
  await page.waitForTimeout(500);
  const cadence=await page.evaluate(()=>{window.atlasMeasureFrames=false;const times=window.atlasFrameTimes;return times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);});
  results.push({structure:name,orbitActionAndSettleMs:Date.now()-actionStart,rafIntervalMedianMs:cadence[Math.floor(cadence.length*.5)]??null,rafIntervalP95Ms:cadence[Math.floor(cadence.length*.95)]??null,rafSamples:cadence.length,note:'Mouse orbit plus 500 ms settle; software-rendered animation-frame cadence, not physical-device FPS or GPU timing'});
  await page.screenshot({path:path.join(output,`${engine}-${slug}-oblique.png`)});
  }
  results.push({structure:name,diagnostics:await page.locator('.scene').evaluate(el=>({...el.dataset}))});
  await page.getByRole('button',{name:'Assemble and reset',exact:true}).click();
 }
 assert.deepEqual(errors,[]);await context.close();
}finally{writeFileSync(path.join(output,`${engine}-measurements.json`),JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
