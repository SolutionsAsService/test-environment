// Optional integration tests: use an existing Playwright + Chromium installation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from '../scripts/dev.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = createServer();
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = process.env.TEST_URL || 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROMIUM_PATH || undefined});
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
const reports=[];
try {
  for (const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:375,height:812},{width:320,height:740}]) {
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=[]; const requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    page.on('request',r=>requests.push(r.url()));
    await page.goto(base); await page.waitForFunction(()=>document.querySelector('#runtimeStatus').textContent==='ready');
    const run=page.getByRole('button',{name:'Run example',exact:true});
    const stop=page.getByRole('button',{name:'Stop',exact:true});
    const reset=page.getByRole('button',{name:'Reset',exact:true});
    assert.equal(await run.isEnabled(),true); assert.equal(await stop.isDisabled(),true); assert.equal(await reset.isDisabled(),true);
    assert.equal(await page.getByLabel('Runnable example').count(),1); assert.equal(await page.getByLabel('Teaching profile').count(),1);
    const runBox=await run.boundingBox(); assert.ok(runBox.y<740,'Run is accessible without a long mobile scroll');
    await run.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#runtimeStatus').textContent==='running');
    assert.equal(await page.locator('#gpioValue').textContent(),'HIGH');
    assert.match(await page.locator('#serialOutput').textContent(),/Setup complete/);
    assert.equal(await run.isDisabled(),true); assert.equal(await stop.isEnabled(),true);
    assert.equal(await page.locator('#exampleSelect').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'stopButton');
    await page.waitForFunction(()=>document.querySelector('#gpioValue').textContent==='LOW');
    assert.equal(await page.locator('#announcement').textContent(),'Preview running. Outputs update below.');
    await page.screenshot({path:new URL('../artifacts/running-'+viewport.width+'.png',import.meta.url).pathname,fullPage:true});
    await stop.click(); const frozen=await page.locator('#runtime').textContent(); const serial=await page.locator('#serialOutput').textContent();
    await page.waitForTimeout(250); assert.equal(await page.locator('#runtime').textContent(),frozen); assert.equal(await page.locator('#serialOutput').textContent(),serial);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'runButton');
    await run.click(); assert.equal(await page.locator('#count-serial').textContent(),'2');
    await reset.click(); assert.equal(await page.locator('#runtimeStatus').textContent(),'ready'); assert.equal(await page.locator('#count-serial').textContent(),'0');
    assert.equal(await page.locator('#gpioValue').textContent(),'Not set'); assert.match(await page.locator('#eventStream').textContent(),/No events/);
    await page.getByLabel('Runnable example').selectOption('setup'); await run.click();
    assert.equal(await page.locator('#runtimeStatus').textContent(),'complete'); assert.equal(await page.locator('#count-serial').textContent(),'1');
    await page.waitForTimeout(150); assert.equal(await page.locator('#count-serial').textContent(),'1'); assert.equal(await stop.isDisabled(),true);
    await page.getByLabel('Runnable example').selectOption('dashboard');
    assert.equal(await run.isDisabled(),true); assert.match(await page.locator('#diagnostic').textContent(),/requires the ESP32/);
    assert.equal(await page.locator('#count-errors').textContent(),'0');
    await page.getByLabel('Teaching profile').selectOption('esp32'); await run.click();
    await page.waitForFunction(()=>document.querySelector('#networkState').textContent==='Connected (fictional)');
    await page.waitForFunction(()=>document.querySelector('#oledDisplay').textContent.includes('Frame B'));
    assert.equal(await page.locator('#count-network').textContent(),'2');
    assert.match(await page.locator('#eventStream').textContent(),/NETWORK/);
    await stop.click(); await reset.click();
    assert.equal(await page.locator('#networkState').textContent(),'Not used'); assert.match(await page.locator('#oledDisplay').textContent(),/No frame/);
    await page.locator('summary').focus(); await page.keyboard.press('Enter');
    const source=page.getByLabel('Example reference (read-only)',{exact:true});
    assert.equal(await source.getAttribute('readonly'),''); assert.match(await source.inputValue(),/Storyboard/);
    await source.focus(); await page.keyboard.press('Tab'); assert.notEqual(await page.evaluate(()=>document.activeElement.id),'sketchEditor');
    assert.equal(await page.locator('[aria-live="polite"]').count(),1);
    assert.equal(await page.locator('#runtime').getAttribute('role'),'timer');
    assert.equal(await page.locator('#runtime').getAttribute('aria-live'),'off');
    assert.equal(await page.locator('#stats .stat').count(),6); assert.equal(await page.locator('.wifi-field').count(),2);
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('button,select')].map(e=>e.getBoundingClientRect().height)}));
    assert.ok(layout.scroll<=layout.width,'no horizontal page overflow'); assert.ok(layout.controls.every(x=>x>=44),'touch controls at least 44px');
    await page.screenshot({path:new URL('../artifacts/reference-'+viewport.width+'.png',import.meta.url).pathname,fullPage:true});
    assert.deepEqual(errors,[]); assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin),'no external requests');
    reports.push({viewport,runY:Math.round(runBox.y),horizontalOverflow:false,pageErrors:errors.length,requests:requests.length});
    await context.close();
  }
  // Fault injection: never parse malicious/unsupported references, even if DOM readOnly is bypassed.
  if (!process.env.TEST_URL) {
    const page=await browser.newPage(); await page.goto(base); await page.waitForFunction(()=>document.querySelector('#runtimeStatus').textContent==='ready');
    await page.evaluate(()=>{document.querySelector('#sketchEditor').value='<img src=x onerror="window.pwned=true">'; document.querySelector('#runButton').click();});
    assert.equal(await page.locator('#runtimeStatus').textContent(),'error'); assert.match(await page.locator('#diagnostic').textContent(),/Custom sketches/);
    assert.equal(await page.locator('#count-errors').textContent(),'1'); await page.waitForTimeout(200); assert.equal(await page.locator('#count-errors').textContent(),'1');
    assert.equal(await page.evaluate(()=>!!window.pwned),false);
    await page.getByRole('button',{name:'Reset',exact:true}).click(); assert.equal(await page.locator('#runtimeStatus').textContent(),'ready');
    // Exercise text-only output escaping and scroll preservation through the actual renderer.
    await page.evaluate(async()=>{
      const {Preview}=await import('./engine.js');
      const start=Preview.prototype.start;
      Preview.prototype.start=function(...args){const result=start.apply(this,args);this.serial.push({at:0,message:'<img src=x onerror="window.pwned=true">'});for(let i=0;i<60;i++)this.serial.push({at:0,message:'history '+i});return result;};
    });
    await page.getByRole('button',{name:'Run example',exact:true}).click();
    assert.match(await page.locator('#serialOutput').textContent(),/<img src=x/); assert.equal(await page.locator('#serialOutput img').count(),0);
    await page.locator('#serialOutput').evaluate(e=>{e.scrollTop=90;});
    await page.waitForFunction(()=>document.querySelector('#count-gpio').textContent==='2');
    assert.equal(await page.locator('#serialOutput').evaluate(e=>e.scrollTop),90);
    await page.getByRole('button',{name:'Reset',exact:true}).click();
    await page.evaluate(async()=>{
      const {Preview}=await import('./engine.js');
      const advance=Preview.prototype.advance;
      Preview.prototype.advance=function(target){return advance.call(this,target===0?0:60001);};
    });
    await page.getByRole('button',{name:'Run example',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#runtimeStatus').textContent==='error');
    assert.match(await page.locator('#diagnostic').textContent(),/Reset, then Run/);
    assert.equal(await page.getByRole('button',{name:'Run example',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('#count-errors').textContent(),'1');
    await page.getByRole('button',{name:'Reset',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Run example',exact:true}).isEnabled(),true);
    await page.close();
  }
  console.log(JSON.stringify({browser:await browser.version(),sandbox:true,base,reports},null,2));
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
