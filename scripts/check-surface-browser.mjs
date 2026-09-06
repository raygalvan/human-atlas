import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream, mkdirSync, statSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tools = createRequire(path.join(process.env.ATLAS_BROWSER_TOOLS || root, 'package.json'));
const {chromium, webkit} = tools('playwright');
const engine = process.env.ATLAS_BROWSER || 'chromium';
const output = path.join(root, 'artifacts/surface');
mkdirSync(output, {recursive:true});
const prefix = '/courtroom-atlas/';
const dist = path.join(root, 'dist');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.gz':'application/gzip', '.svg':'image/svg+xml'};
let server, browser;
try {
  let entry = process.argv[2];
  if (!entry) {
    server = createServer((request, response) => {
      try {
        const url = new URL(request.url, 'http://localhost');
        if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
        const file = path.resolve(dist, decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
        if (!file.startsWith(dist + path.sep) || !statSync(file).isFile()) { response.writeHead(404).end(); return; }
        response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
        createReadStream(file).pipe(response);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    entry = `http://127.0.0.1:${server.address().port}${prefix}index.html`;
  }
  browser = await (engine === 'webkit' ? webkit : chromium).launch({headless:true, ...(engine === 'chromium' ? {args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']} : {})});
  for (const [label, viewport] of [['desktop',{width:1365,height:900}], ['mobile',{width:390,height:680}]]) {
    const mobile = label === 'mobile';
    const context = await browser.newContext({viewport, deviceScaleFactor:1, isMobile:mobile, hasTouch:mobile});
    const page = await context.newPage();
    const errors = [];
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('crash', () => errors.push('Browser page crashed'));
    await page.addInitScript(() => document.addEventListener('webglcontextlost', () => {window.__surfaceContextLost = true;}, true));
    try {
      await page.goto(entry, {waitUntil:'domcontentloaded',timeout:90000});
      await page.getByRole('heading',{name:'Homer Atlas'}).waitFor();
      await page.waitForFunction(() => document.querySelector('canvas') && !document.querySelector('.loading'), {}, {timeout:150000});
      const openLayers = async () => {
        if (!(await page.getByRole('tab',{name:/Homer.s Injuries/}).isVisible())) await page.getByRole('button',{name:'Open atlas layers',exact:true}).click();
      };
      for (let attempt=0; attempt<3; attempt++) {
        await openLayers();
        await page.getByRole('tab',{name:/Homer.s Injuries/}).click();
        await page.getByRole('tab',{name:'Body Surface',exact:true}).click();
        await page.waitForTimeout(400);
        assert.deepEqual(errors, [], 'Opening Body Surface must not remove the application');
        await page.getByRole('complementary',{name:'Homer body surface demonstrative'}).waitFor();
        await page.waitForFunction(() => {
          const image = document.querySelector('.surface-portrait img');
          return image?.complete && image.naturalWidth > 100;
        });
        // Close the mobile layer sheet if it still covers the reference panel.
        if (mobile && await page.getByRole('tab',{name:'Body Surface',exact:true}).isVisible()) await page.getByRole('button',{name:'Open atlas layers',exact:true}).click();
        await page.getByRole('button',{name:'Back',exact:true}).click();
        await page.getByRole('img',{name:'Posterior body surface reference'}).waitFor();
        await page.getByRole('button',{name:'Face',exact:true}).click();
        if (attempt === 2) await page.screenshot({path:path.join(output,`${engine}-${label}-surface.png`)});
        await openLayers();
        await page.getByRole('tab',{name:'Internal',exact:true}).click();
        await page.getByRole('tab',{name:'Systems',exact:true}).click();
      }
      if (mobile) {
        if (await page.getByRole('tab',{name:'Systems',exact:true}).isVisible()) await page.getByRole('button',{name:'Open atlas layers',exact:true}).click();
        assert.equal(await page.locator('.view-controls').isVisible(),false,'Camera bar must be removed on mobile');
        assert.equal(await page.locator('.explode-control').isVisible(),false,'Explode control must be removed on mobile');
        assert.equal(await page.locator('.dock-reset').isVisible(),false,'Dock reset must be removed on mobile');
        assert.equal(await page.getByRole('button',{name:'Open atlas layers',exact:true}).isVisible(),true);
      } else {
        assert.equal(await page.locator('.view-controls').isVisible(),true,'Desktop camera controls must remain');
        assert.equal(await page.locator('.explode-control').isVisible(),true,'Desktop explode control must remain');
      }
      assert.equal(await page.evaluate(() => !!window.__surfaceContextLost),false);
      assert.deepEqual(errors,[]);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Horizontal overflow');
      await page.screenshot({path:path.join(output,`${engine}-${label}-anatomy.png`)});
      console.log(`PASS ${engine} ${label}: three Body Surface round trips, portrait decode, Face/Back, retained canvas, responsive controls`);
    } catch(error) {
      await page.screenshot({path:path.join(output,`${engine}-${label}-failure.png`)}).catch(()=>{});
      writeFileSync(path.join(output,`${engine}-${label}-error.txt`),String(error.stack)+'\n'+JSON.stringify(errors));
      throw error;
    } finally { await context.close(); }
  }
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
