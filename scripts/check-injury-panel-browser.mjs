/** Focused regression for the attorney's hosted injury application panel. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,mkdirSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=process.cwd(),require=createRequire(path.join(process.env.ATLAS_BROWSER_TOOLS||root,'package.json'));
const {chromium}=require('playwright');
const output=path.join(root,'artifacts/injury-panel');mkdirSync(output,{recursive:true});
const server=createServer((req,res)=>{
 if(req.url==='/host'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><style>body{margin:0}iframe{border:0;width:100vw;height:100vh}</style><iframe title="Atlas"></iframe><script>
 const frame=document.querySelector('iframe');frame.src='/index.html?embed=injurybot&parentOrigin='+encodeURIComponent(location.origin);
 window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin)return;const d=e.data,post=m=>frame.contentWindow.postMessage({version:1,...m},location.origin);
 if(d.type==='human-atlas:ready')post({type:'injurybot:atlas:init',case:{id:'synthetic-case',title:'Synthetic panel proof',findings:[],activeReferenceGroups:[],appliedInjuries:[],generatedInjuries:[],productionInjuries:[]}});
 if(d.type==='human-atlas:match-request')post({type:'injurybot:atlas:match-result',requestId:d.requestId,matches:[],unmatched:'Femur fracture'});
 if(d.type==='human-atlas:generate-request')post({type:'injurybot:atlas:generation',caseId:d.caseId,injury:{id:'synthetic-request',name:d.name,status:'queued',stage:'Queued for AI injury description'}});
 });</script>`);return;}
 try{const f=path.resolve(root,'dist',decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)));if(!f.startsWith(path.join(root,'dist')+path.sep)||!statSync(f).isFile())throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'})[path.extname(f)]||'application/octet-stream');createReadStream(f).pipe(res);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [name,viewport] of [['desktop',{width:1365,height:900}],['mobile',{width:390,height:844}]]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/host`);const frame=page.frameLocator('iframe');await frame.locator('canvas').waitFor();await frame.locator('.loading').waitFor({state:'hidden'});
 if(name==='mobile')await frame.getByRole('button',{name:'Open atlas layers',exact:true}).click();
 await frame.getByRole('tab',{name:'Apply Injuries',exact:true}).click();
 assert.equal(await frame.getByRole('button',{name:'Create / apply injuries',exact:true}).count(),0);
 await frame.getByPlaceholder('Filter the catalogue…').fill('skull');assert.equal(await frame.locator('.injury-pick').count(),1);
 await page.screenshot({path:path.join(output,name+'-find.png'),fullPage:true});
 await frame.getByRole('tab',{name:/Describe client/}).click();await frame.getByLabel("Describe the client's injuries",{exact:true}).fill('A fractured femur');await frame.getByRole('button',{name:'Find matching injuries',exact:true}).click();await frame.getByRole('button',{name:'Create & apply with AI',exact:true}).waitFor();
 await page.screenshot({path:path.join(output,name+'-describe.png'),fullPage:true});
 await frame.getByRole('button',{name:'Create & apply with AI',exact:true}).click();await frame.getByRole('tab',{name:'Client Injuries',exact:true}).click();await frame.getByText('Queued for AI injury description',{exact:true}).waitFor();
 await page.screenshot({path:path.join(output,name+'-queued.png'),fullPage:true});assert.deepEqual(errors,[]);assert.equal(await frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
 await context.close();console.log('PASS '+name+': restored tabs, checklist, Describe, missing card, AI request, persistent status layout');
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
