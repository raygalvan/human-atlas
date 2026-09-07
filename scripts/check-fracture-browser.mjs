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
const engine=process.env.ATLAS_BROWSER||'chromium',output=path.join(root,'artifacts/fracture',engine);
mkdirSync(output,{recursive:true});
const dist=path.join(root,'dist'),prefix='/courtroom-atlas/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix))throw Error();const f=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(!f.startsWith(dist+path.sep)||!statSync(f).isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});createReadStream(f).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const entry=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1200,height:850},recordVideo:{dir:output+'/video',size:{width:1200,height:850}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(90000);
const capture=async name=>{await page.waitForTimeout(600);return page.screenshot({path:output+'/'+name+'.png',timeout:90000});};
try {
 await page.goto(entry+'?test=fracture');await page.locator('.loading').waitFor({state:'hidden',timeout:150000});
 await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.detailParts==='1');
 const normal=await capture('01-normal-rib');
 await page.getByRole('switch',{name:'Show test fracture',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('.scene')?.dataset.fractureFaces)>0);
 const broken=await capture('02-localized-fracture');assert.notDeepEqual(normal,broken);
 await page.getByRole('button',{name:'Inspect fracture',exact:true}).click();await capture('03-close-up');
 await page.getByRole('button',{name:'Rotate rib 360°',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='true');await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='false',{},{timeout:60000});await capture('04-rotated');
 await page.mouse.move(760,420);await page.mouse.wheel(0,-200);await capture('05-zoom');
 await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await capture('06-base-topology');assert(Number(await page.locator('.scene').getAttribute('data-fracture-faces'))>0);
 await page.getByRole('switch',{name:'Original source detail',exact:true}).click();await capture('07-source-topology');
 await page.getByRole('switch',{name:'Show test fracture',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.fractureFaces==='0');await capture('08-normal-restored');
 await page.getByRole('button',{name:'Exit fracture test',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.fractureVisible==='false');
 assert.deepEqual(errors,[]);console.log('PASS normal rib, localized geometric break, close-up, full rotation, zoom, both source topologies, normal restoration, exit');
}finally{await context.close();await browser.close();server.close();}
