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
const engine=process.env.ATLAS_BROWSER||'chromium',output=path.join(root,'artifacts/subarachnoid',engine);
mkdirSync(output,{recursive:true});
const dist=path.join(root,'dist'),prefix='/courtroom-atlas/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix))throw Error();const f=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(!f.startsWith(dist+path.sep)||!statSync(f).isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});createReadStream(f).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const entry=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1200,height:850},recordVideo:{dir:output+'/video',size:{width:1200,height:850}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(90000);
const capture=async name=>{await page.waitForTimeout(600);const b=await page.screenshot({path:output+'/'+name+'.png',timeout:90000});const p=PNG.sync.read(b);let blood=0;for(let i=0;i<p.data.length;i+=4){const x=(i/4)%p.width,y=Math.floor(i/4/p.width);if(x<330||y<140||y>p.height-170)continue;const [r,g,b]=p.data.subarray(i,i+3);if(r>70&&r>g*1.8&&r>b*1.3&&g<110)blood++;}console.log(name,{bloodPixels:blood});return blood;};
try {
 const start=Date.now();await page.goto(entry+'?test=sah');await page.locator('.loading').waitFor({state:'hidden',timeout:150000});await page.waitForFunction(()=>Number(document.querySelector('.scene')?.dataset.detailParts)>10);await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.sahParts==='3');console.log('Ready milliseconds',Date.now()-start);
 const blood=await capture('01-isolated-brain');assert(blood>200,'Blood collection must actually render');
 await page.getByRole('switch',{name:'Show test hemorrhage',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.sahVisible==='false');assert(await capture('02-clean-brain')<50);
 await page.getByRole('switch',{name:'Show test hemorrhage',exact:true}).click();assert(await capture('03-restored')>200);
 await page.getByRole('button',{name:'Rotate brain 360°',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='true');await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='false',{},{timeout:60000});assert(await capture('04-rotated')>200);
 await page.getByRole('button',{name:'Skull on',exact:true}).click();await page.waitForTimeout(1200);assert(await capture('05-skull-on')<80,'Opaque skull must obscure the collection');
 await page.getByRole('button',{name:'Skull cutaway',exact:true}).click();assert(await capture('06-skull-revealed')>200);
 await page.getByRole('button',{name:'Isolate brain',exact:true}).click();assert(await capture('07-brain-isolated')>200);
 await page.getByRole('button',{name:'Inspect blood',exact:true}).click();await page.mouse.move(750,400);await page.mouse.wheel(0,-200);assert(await capture('08-close-up')>blood*2,'Close inspection must substantially enlarge the visible collection');
 await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await capture('09-base-topology');assert.equal(await page.locator('.scene').getAttribute('data-sah-parts'),'3');
 await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await capture('10-source-topology');
 await page.getByRole('switch',{name:'Show left cerebral hemisphere',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.sahVisible==='false');assert(await capture('11-parent-hidden')<50);
 await page.getByRole('switch',{name:'Show left cerebral hemisphere',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.sahVisible==='true');
 const slider=page.getByRole('slider',{name:'Explode test anatomy',exact:true});await slider.press('Home');for(let i=0;i<7;i++)await slider.press('PageUp');await page.waitForTimeout(2200);await capture('12-exploded');
 const translations=JSON.parse(await page.locator('.scene').getAttribute('data-sah-translations'));assert.equal(translations.length,3);assert(translations.every(x=>x.visible&&x.translation.some(v=>Math.abs(v)>.001)));assert(new Set(translations.map(x=>x.translation.join(','))).size>1,'Each overlay follows its own exploded gyrus');
 await slider.press('Home');await page.waitForTimeout(2000);await page.getByRole('button',{name:'Isolate brain',exact:true}).click();assert(await capture('13-reassembled')>200);
 await page.setViewportSize({width:390,height:600});await page.getByRole('button',{name:'Open atlas layers',exact:true}).click();await page.getByRole('switch',{name:'Show test hemorrhage',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:output+'/14-mobile-controls.png'});
 await page.getByRole('button',{name:'Exit hemorrhage test',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.sahVisible==='false');
 assert.deepEqual(errors,[]);console.log('PASS actual brain collection, clean toggle, rotation, skull occlusion/reveal, isolation, zoom, topology rebuild, parent visibility, per-parent explosion, reassembly, mobile controls');
}finally{await context.close();await browser.close();server.close();}
