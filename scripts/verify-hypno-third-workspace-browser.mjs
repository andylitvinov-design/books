// Guest-only browser acceptance for the original third Video Studio workspace.
// Local production server only; no personal data or paid video-provider requests.
import assert from 'node:assert/strict';
import {mkdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const origin=process.env.HH_TEST_PUBLIC_ORIGIN||'http://127.0.0.1:3100';
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/,'Hypno acceptance must target localhost');
const playwright=await import(process.env.HH_HYPNO_PLAYWRIGHT||'@playwright/test');
const screenshotDir=process.env.HH_HYPNO_SCREENSHOT_DIR||'';
const matrix=[['ru',320],['ru',354],['ru',375],['ru',390],['ru',430],['en',390],['es',390]];
let passed=0;
for(const [engine,driver] of [['chromium',playwright.chromium],['webkit',playwright.webkit]]){
  const browser=await driver.launch({headless:true});
  try{
    for(const [locale,width] of matrix){
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
      const page=await context.newPage();
      const unexpectedWrites=[];
      const runtimeErrors=[];
      page.on('pageerror',err=>runtimeErrors.push(String(err).slice(0,450)));
      await page.route('**/*',route=>{
        const req=route.request();
        if(!['GET','HEAD'].includes(req.method())){
          unexpectedWrites.push(req.method()+' '+new URL(req.url()).pathname);
          return route.abort();
        }
        return route.continue();
      });
      try{
        await page.goto(origin+'/'+locale+'/holistic-support/mandala#video-hypnocorrection-mobile',
          {waitUntil:'domcontentloaded',timeout:80000});
        await page.locator('[data-mandala-free-video][data-active-workspace="effects"]')
          .waitFor({state:'visible',timeout:45000});
        assert.equal(await page.locator('[data-video-quick-control="effects"]').getAttribute('aria-pressed'),'true',
          'deep link must select third workspace after hydration');
        const intro=page.locator('[data-hypno-intro-slot]');
        const wave=intro.locator('[data-hypno-wave]');
        await wave.waitFor({state:'visible',timeout:25000});
        assert.equal(await page.locator('[data-hypno-wave]').count(),1,'one Wave control');
        assert.equal(await page.locator('[data-hypno-mobile]').count(),1,'one original editor');
        const player=page.locator('[data-video-mandala-hero]');
        const goalControls=page.locator('[data-video-quick-section="1"] [data-video-quick-theme]');
        await goalControls.first().waitFor({state:'visible',timeout:25000});
        assert.equal(await goalControls.count(),6,'exactly six existing real goal selectors');
        const goalRects=await goalControls.evaluateAll(nodes=>nodes.map(node=>{
          const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};
        }));
        assert.ok(goalRects.every(r=>r.width>=65&&r.height>=44),'goal buttons remain readable and touchable');
        assert.ok(goalRects.slice(0,3).every(r=>Math.abs(r.y-goalRects[0].y)<=2),
          'three goal chips in the first row');
        assert.ok(goalRects.slice(3).every(r=>Math.abs(r.y-goalRects[3].y)<=2)&&
          goalRects[3].y>goalRects[0].y+25,'three goal chips in the second row');
        assert.equal(await page.locator('[data-video-quick-control="effects"]').count(),1,
          'the original workspace nav must not duplicate');
        const navTop=await page.locator('[data-video-quick-controls]').boundingBox();
        const waveTop=await wave.boundingBox();
        assert.ok(navTop&&waveTop&&navTop.y+navTop.height<=waveTop.y+3,
          'the single mobile tab rail appears before Wave');
        // Both clicks use the existing shared theme/scene state; no mock chips.
        await page.locator('[data-video-quick-theme="life"]').click();
        assert.equal(await page.locator('[data-video-quick-theme="life"]').getAttribute('aria-pressed'),'true');
        await page.locator('[data-video-quick-theme="energy"]').click();
        assert.equal(await page.locator('[data-video-quick-theme="energy"]').getAttribute('aria-pressed'),'true');
        // The lazy portal and its font/layout can settle after the Wave button
        // becomes visible, especially on mobile WebKit. Verify the real pixels,
        // not merely DOM order; do not waive a persistent layout regression.
        await page.evaluate(()=>document.fonts.ready);
        try {
          await page.waitForFunction(()=>{
            const wave=document.querySelector('[data-hypno-intro-slot] [data-hypno-wave]');
            const hero=document.querySelector('[data-video-mandala-hero]');
            if(!wave||!hero)return false;
            const w=wave.getBoundingClientRect(),p=hero.getBoundingClientRect();
            return w.height>=44&&p.height>0&&w.bottom<=p.top+1;
          },undefined,{timeout:14000,polling:200});
        } catch (error) {
          const geometry=await page.evaluate(()=>{
            const w=document.querySelector('[data-hypno-intro-slot] [data-hypno-wave]');
            const p=document.querySelector('[data-video-mandala-hero]');
            const slot=document.querySelector('[data-hypno-intro-slot]');
            const stage=p?.closest('[data-video-live-stage]');
            return {waveBottom:w?.getBoundingClientRect().bottom,
              playerTop:p?.getBoundingClientRect().top,
              slotOrder:slot?getComputedStyle(slot).order:null,
              stageOrder:stage?getComputedStyle(stage).order:null};
          });
          throw new Error('Wave must appear above original film player: '+JSON.stringify(geometry),{cause:error});
        }
        const effects=page.locator('[data-hypno-mobile]');
        const groups=effects.locator('[data-hypno-group]');
        assert.deepEqual(await groups.evaluateAll(nodes=>nodes.map(x=>x.getAttribute('data-hypno-group'))),
          ['audio','visual','meditation','phrases']);
        for(const id of ['audio','visual','phrases']){
          const group=effects.locator('[data-hypno-group="'+id+'"]');
          assert.equal(await group.locator('[data-hypno-card]').count(),3,id+': three feature cards');
          assert.equal(await group.locator('button[aria-expanded]').getAttribute('aria-expanded'),'true',
            id+': expanded by default');
          const rects=await group.locator('[data-hypno-card]').evaluateAll(nodes=>nodes.map(x=>{
            const r=x.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};
          }));
          const headerBox=await group.locator('button[aria-expanded]').boundingBox();
          assert.ok(headerBox&&rects.every(r=>r.y>=headerBox.y+headerBox.height-2),
            id+': full-width section heading must be ABOVE the three cards');
          assert.ok(rects.every(r=>r.width>=width*.22&&r.x>=-2),
            id+': cards must use the whole section width, not 27% photo strip');
          assert.ok(Math.max(...rects.map(x=>x.y))-Math.min(...rects.map(x=>x.y))<=2,
            id+' cards must share one horizontal row');
          const titlePhoto=await group.locator('button[aria-expanded] > img').evaluate(node=>
            getComputedStyle(node).display);
          assert.equal(titlePhoto,'none',id+': no oversized title photo panel beside controls');
        }
        // Approved owner mock puts both final CTAs AFTER all four effect
        // groups. Earlier flex order moved the CTA above Audio despite JSX.
        const finalActionOrder=await effects.evaluate(panel=>{
          const last=panel.querySelector('[data-hypno-group="phrases"]');
          const actions=panel.querySelector('[data-hypno-actions]');
          if(!(last instanceof HTMLElement)||!(actions instanceof HTMLElement))return null;
          const l=last.getBoundingClientRect(),a=actions.getBoundingClientRect();
          return {lastBottom:l.bottom,actionsTop:a.top,
            order:getComputedStyle(actions).order,buttons:actions.querySelectorAll('button').length};
        });
        assert.ok(finalActionOrder&&finalActionOrder.actionsTop>=finalActionOrder.lastBottom-2&&
          finalActionOrder.buttons===2,
          engine+' '+locale+' '+width+' final CTA must follow the Effects settings: '+JSON.stringify(finalActionOrder));
        assert.equal(await page.locator('[data-hypno-meditation-action]').count(),1,
          'one actual personal meditation action');
        assert.equal(await page.locator('[data-hypno-create]').count(),1,'single Create');
        assert.equal(await page.locator('[data-video-hero-create]').count(),0,'no duplicate hero Create');
        assert.equal(await effects.locator('[data-hypno-create]').isEnabled(),true,'real Create enabled');
        const overflow=await page.evaluate(()=>({
          page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
        assert.ok(overflow.page<=overflow.viewport+2,
          engine+' '+locale+' '+width+' overflow '+JSON.stringify(overflow));
        const targets=await effects.locator('[role="switch"]').evaluateAll(nodes=>
          nodes.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})));
        assert.ok(targets.length>=5&&targets.every(x=>x.w>=44&&x.h>=44),
          'switch touch targets need 44 by 44 CSS px');
        await wave.click();
        const light=effects.locator('[data-hypno-group="visual"] [role="switch"]').first();
        assert.equal(await light.getAttribute('aria-checked'),'true','Wave enables light');
        await light.click();
        assert.equal(await light.getAttribute('aria-checked'),'false','light can be disabled');
        await light.click();
        assert.equal(await light.getAttribute('aria-checked'),'true','light can be re-enabled');
        await page.locator('[data-video-quick-control="video"]').click();
        await page.locator('[data-mandala-free-video][data-active-workspace="video"]')
          .waitFor({state:'visible',timeout:20000});
        await page.locator('[data-video-quick-control="effects"]').click();
        await page.locator('[data-hypno-wave]').waitFor({state:'visible',timeout:20000});
        assert.equal(await page.locator('[data-hypno-wave]').count(),1,'Wave not duplicated on return');
        assert.equal(await page.locator('[data-hypno-group="visual"] [role="switch"]').first()
          .getAttribute('aria-checked'),'true','light preserved across tabs');
        if(locale==='ru'&&width===390){
          await page.locator('[data-hypno-group="audio"] [data-hypno-card]').first()
            .locator('button').first().click();
          await page.locator('[data-mandala-free-video][data-active-workspace="video"]')
            .waitFor({state:'visible',timeout:20000});
          await page.locator('[data-video-quick-control="effects"]').click();
          await page.locator('[data-hypno-group="meditation"] [data-hypno-options] button').first().click();
          await page.locator('[data-mandala-free-video][data-active-workspace="practices"]')
            .waitFor({state:'visible',timeout:20000});
          await page.locator('[data-video-quick-control="effects"]').click();
          await page.locator('[data-hypno-group="phrases"] [data-hypno-card]').first()
            .locator('button').first().click();
          await page.locator('[data-mandala-free-video][data-active-workspace="phrases"]')
            .waitFor({state:'visible',timeout:20000});
          await page.locator('[data-video-quick-control="effects"]').click();
        }
        // One true local Create→encoded file→Save proof from the third tab.
        // macOS WebKit audio/video export is already covered by its own job.
        if(engine==='chromium'&&locale==='ru'&&width===390){
          await page.locator('[data-video-quick-control="editor"]').click();
          const ten=page.locator('[data-video-duration="10"]');
          await ten.waitFor({state:'visible',timeout:20000});
          await ten.click();
          await page.locator('[data-video-quick-control="effects"]').click();
          await page.locator('[data-hypno-create]').click();
          const result=page.locator('[data-video-result][data-video-result-mode="rendered"]');
          await result.waitFor({state:'visible',timeout:150000});
          const link=result.locator('[data-mandala-video-download]');
          await link.waitFor({state:'visible',timeout:30000});
          const [download]=await Promise.all([page.waitForEvent('download',{timeout:30000}),link.click()]);
          const file=await download.path();
          assert.ok(file&&statSync(file).size>4096,'third-screen Create must download media bytes');
          const media=JSON.parse(execFileSync('ffprobe',[
            '-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',timeout:25000}));
          assert.ok(media.streams?.some(x=>x.codec_type==='video'),'download must have video frames');
          console.log('HYPNO_THIRD_CREATE_DOWNLOAD_PASS',JSON.stringify({
            bytes:statSync(file).size,filename:download.suggestedFilename(),
            streamTypes:media.streams.map(x=>x.codec_type)}));
        }
        if(screenshotDir&&width===390){
          mkdirSync(screenshotDir,{recursive:true});
          await page.locator('[data-video-quick-section="1"]').screenshot({
            path:join(screenshotDir,engine+'-'+locale+'-390-goals.png'),animations:'disabled'});
          await page.locator('[data-hypno-intro-slot]').screenshot({
            path:join(screenshotDir,engine+'-'+locale+'-390-wave.png'),animations:'disabled'});
          await page.locator('[data-hypno-mobile]').screenshot({
            path:join(screenshotDir,engine+'-'+locale+'-390-controls.png'),animations:'disabled'});
        }
        assert.deepEqual(unexpectedWrites,[],'guest QA must not send personal/AI/paid POSTs');
        assert.deepEqual(runtimeErrors,[],'no uncaught client errors');
        passed++;
        console.log('HYPNO_THIRD_BROWSER_PASS',JSON.stringify({
          engine,locale,width,deepLink:true,wave:true,tabs:true,guestOnly:true}));
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
assert.equal(passed,14);
console.log('HYPNO_THIRD_MOBILE_MATRIX_PASS',passed);
