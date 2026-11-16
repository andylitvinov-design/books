// Production-build-only first-screen CTA QA. No user forms, payments or private data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright');
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error('Homepage acceptance only runs against an isolated local production server');
}
const output = 'artifacts/home-first-screen';
await mkdir(output, { recursive: true });


const result=[];
for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
    for(const [locale,route] of [['en','/'],['ru','/ru'],['es','/es']]){
      for(const width of [320,390,430]){
        const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,
          isMobile:true,hasTouch:true,reducedMotion:'reduce'});
        const label=engine.name()+':'+locale+':'+width;
        try{
          const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:60000});
          assert.equal(response?.status(),200,label+': public Home must load');
          const root=page.locator('[data-hh-dialog-first]');
          const header=root.locator('[data-hh-dialog-header]');
          const prompt=root.locator('[data-hh-dialog-first-hero]');
          const form=root.locator('[data-hh-home-composer]');
          const switcher=root.locator('[data-hh-home-business-switch]');
          await root.waitFor({state:'visible',timeout:30000});
          assert.equal(await page.locator('.house-header--services,[data-profile-hub-tabs],[data-home-section-carousel],[data-profile-video-hero]').count(),0,
            label+': retired headers/carousel/video must not block first render');
          assert.equal(await page.locator('[data-sitewide-antistress-banner]').count(),0,
            label+': no promotional ribbon above My Space');
          const headerBox=await header.boundingBox(),promptBox=await prompt.boundingBox();
          assert.ok(headerBox&&promptBox&&headerBox.y+headerBox.height<=promptBox.y+2,
            label+': compact header precedes conversation');
          const brand=header.locator('a').first();
          assert.equal((await brand.innerText()).trim(),'My Space');
          assert.ok((await brand.boundingBox()).height<=54,label+': My Space stays one line');
          const lang=header.locator('[data-hh-home-language]');
          await lang.locator('summary').click();
          assert.equal(await lang.locator('a[lang]').count(),3);
          await lang.locator('summary').click();
          const modes=switcher.locator('button');
          assert.equal(await modes.count(),2);
          assert.equal(await modes.nth(0).getAttribute('aria-pressed'),'true');
          assert.equal(await root.locator('[data-hh-home-starters] button').count(),3);
          await modes.nth(1).click();
          assert.equal(await root.getAttribute('data-home-mode'),'business');
          assert.equal(await modes.nth(1).getAttribute('aria-pressed'),'true');
          await modes.nth(0).click();
          assert.equal(await root.getAttribute('data-home-mode'),'self');
          const input=form.locator('textarea');
          const send=form.locator('button[type="submit"]');
          assert.equal(await input.getAttribute('maxlength'),'1200');
          assert.equal(await send.isDisabled(),true);
          await input.fill('I want to explore a new idea');
          assert.equal(await send.isEnabled(),true);
          const search=header.locator('[data-site-search-trigger]');
          const menu=header.locator('details.site-main-menu');
          assert.equal(await search.count(),1);
          assert.equal(await menu.count(),1);
          const dock=page.locator('[data-hh-unified-dock]');
          await dock.waitFor({state:'visible',timeout:30000});
          assert.equal(await dock.locator('[data-unified-dock-item]').count(),7);
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
          assert.ok(overflow<=1,label+': no horizontal overflow');
          const box=await form.boundingBox();
          assert.ok(box&&box.width>width*.70&&box.height>=60,label+': main input is prominent');
          if(engine===webkit&&width===390)
            await page.screenshot({path:output+'/home-'+locale+'-webkit-390.png',fullPage:false});
          result.push({engine:engine.name(),locale,width,dialog:true,buttons:7});
        }finally{await page.close()}
      }
    }
  }finally{await browser.close()}
}
await writeFile(output+'/first-screen-results.json',JSON.stringify(result,null,2));
console.log('Dialog-first Home acceptance passed in Chromium/WebKit EN/RU/ES 320/390/430:',result.length);
