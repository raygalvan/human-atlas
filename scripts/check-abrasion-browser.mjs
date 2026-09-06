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
const engine=process.env.ATLAS_BROWSER||'chromium',output=path.join(root,'artifacts/abrasion',engine);
mkdirSync(output,{recursive:true});
const dist=path.join(root,'dist'),prefix='/courtroom-atlas/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix))throw Error();const f=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(!f.startsWith(dist+path.sep)||!statSync(f).isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});createReadStream(f).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const entry=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1200,height:850},recordVideo:{dir:output+'/video',size:{width:1200,height:850}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(90000);
const capture=async name=>{await page.waitForTimeout(700);const b=await page.screenshot({path:output+'/'+name+'.png',timeout:90000});const p=PNG.sync.read(b);let red=0;for(let i=0;i<p.data.length;i+=4){const [r,g,b]=p.data.subarray(i,i+3);if(r>g*1.45&&r>b*1.6&&r>60&&g<155)red++;}console.log(name,red);return red;};
try {
 await page.goto(entry+'?test=abrasion');await page.locator('.loading').waitFor({state:'hidden',timeout:150000});
 await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionVisible==='true');
 assert(await capture('01-shoulder')>1500,'Visible irregular abrasion');
 await page.getByRole('button',{name:'Rotate 360°',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='true');
 await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionTurning==='false',{},{timeout:180000});
 assert(await capture('02-rotated')>1500);
 await page.mouse.move(750,430);await page.mouse.wheel(0,-280);await capture('03-zoom');
 await page.getByRole('switch',{name:'Show body surface',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionVisible==='false');assert(await capture('04-skin-off')<100);
 await page.getByRole('switch',{name:'Show body surface',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionVisible==='true');assert(await capture('05-skin-restored')>1500);
 const explode=page.getByRole('slider',{name:'Explode test anatomy',exact:true});await explode.press('End');await page.waitForTimeout(2500);assert(await capture('06-exploded')>1500);
 assert.notEqual(await page.locator('.scene').getAttribute('data-abrasion-translation'),'0,0,0');
 await explode.press('Home');await page.waitForTimeout(2500);await page.getByRole('switch',{name:'Show test abrasion',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.abrasionVisible==='false');assert(await capture('07-clean')<100);
 await page.getByRole('switch',{name:'Show test abrasion',exact:true}).click();await page.getByRole('button',{name:'Whole body',exact:true}).click();await capture('08-whole-body');
 await page.getByRole('button',{name:'Focus shoulder',exact:true}).click();await capture('09-final');
 assert.deepEqual(errors,[]);console.log('PASS abrasion geometry, 360 rotation, zoom, skin toggle, explosion, clean skin');
}finally{await context.close();await browser.close();server.close();}
