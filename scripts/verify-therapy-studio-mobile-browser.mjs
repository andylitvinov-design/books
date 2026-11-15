/**
 * Public Therapy mobile guest Playwright acceptance. Real local Next UI,
 * 320/354/390/430 CSS pixels, RU/EN/ES, zero paid/remote generation.
 * Not a provider narration, private-account or rendered-video delivery test.
 */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium,webkit,expect} from '@playwright/test';

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||'http://127.0.0.1:3100').replace(/\/$/,'');
const engine=process.env.HH_THERAPY_BROWSER_ENGINE||'webkit';
assert.ok(['webkit','chromium'].includes(engine));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 for(const locale of ['en','ru','es']){
  const context=await browser.newContext({viewport:{width:390,height:820},isMobile:true,hasTouch:true,
   serviceWorkers:'block',acceptDownloads:true,reducedMotion:'reduce'});
  try{
   const page=await context.newPage(),errors=[],posts=[];
   page.setDefaultTimeout(20000);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',req=>{if(req.method()==='POST'&&
    /(?:meditation-writer|voice|personal-video|generate-video)/.test(req.url()))
      posts.push(new URL(req.url()).pathname);});
   await page.goto(BASE+'/'+locale+'/holistic-support/mandala',
    {waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:'attached',timeout:60000});
   const studio=page.locator('[data-mandala-free-video]'),tab=page.locator('[data-video-quick-control="effects"]');
   await expect(tab).toBeEnabled();
   await tab.tap();
   await expect(studio).toHaveAttribute('data-active-workspace','effects');
   const shell=page.locator('[data-therapy-studio]');
   await expect(shell).toBeVisible();
   await expect(shell.locator('[data-therapy-tabs] [role="tab"]')).toHaveCount(3);
   await expect(shell.locator('[data-meditation-generate]')).toBeVisible();
   await expect(shell.locator('[data-therapy-advanced-effects]')).toHaveCount(0);
   assert.equal(await page.locator('[data-video-mandala-hero]').count(),1,'One original video player');
   const labels={en:['Practice format','Therapy Studio steps'],
    ru:['Формат практики','Этапы Therapy Studio'],es:['Formato de práctica','Pasos de Therapy Studio']};
   await expect(shell.locator('[data-therapy-format-switch]')).toHaveAttribute('aria-label',labels[locale][0]);
   await expect(shell.locator('[data-therapy-tabs]')).toHaveAttribute('aria-label',labels[locale][1]);
   for(const width of [320,354,390,430]){
    await page.setViewportSize({width,height:820});
    const measure=await shell.evaluate(node=>{
      const box=selector=>node.querySelector(selector)?.getBoundingClientRect();
      const targets=[...node.querySelectorAll('[data-therapy-format-switch] button,'+
       '[data-therapy-tabs] button,[data-meditation-main-filters] select,'+
       '[data-meditation-writer-choices] button,[data-meditation-generate]')].map(x=>{
        const b=x.getBoundingClientRect();return [b.width,b.height];
      });
      return {hidden:getComputedStyle(node.querySelector('header')).display==='none',
       fmt:box('[data-therapy-format-switch]')?.top,tabs:box('[data-therapy-tabs]')?.top,
       editor:box('[data-video-personal-meditation]')?.top,
       doc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,targets};
    });
    assert.ok(measure.hidden,'No duplicate photograph banner on mobile: '+locale+'/'+width);
    assert.ok(measure.fmt<measure.tabs&&measure.tabs<measure.editor,
     'Format, tabs and editable script order '+JSON.stringify(measure));
    assert.ok(measure.doc<=measure.viewport+2,'No iPhone horizontal overflow '+JSON.stringify(measure));
    assert.ok(measure.targets.length>=9&&measure.targets.every(([w,h])=>w>=44&&h>=44),
     'Touchable Therapy controls '+JSON.stringify(measure));
    if(process.env.HH_THERAPY_SCREENSHOT_DIR){
      mkdirSync(process.env.HH_THERAPY_SCREENSHOT_DIR,{recursive:true});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:process.env.HH_THERAPY_SCREENSHOT_DIR+'/'+engine+'-'+locale+'-'+width+'.png',
       animations:'disabled',fullPage:false,timeout:30000});
    }
   }
   await page.setViewportSize({width:390,height:820});
   const contextPanel=shell.locator('[data-meditation-context]');
   await expect(contextPanel).not.toHaveAttribute('open','');
   await expect(shell.locator('[data-meditation-extra]')).toBeHidden();
   await contextPanel.locator('summary').tap();
   await expect(contextPanel).toHaveAttribute('open','');
   await expect(contextPanel.locator('div > span')).toHaveCount(4);
   await contextPanel.locator('summary').tap();
   const accents=shell.locator('[data-meditation-accents]');
   await accents.locator('summary').tap();
   await shell.locator('[data-meditation-extra]').fill('Gentle, optional focus');
   await accents.locator('summary').tap();
   await expect(shell.locator('[data-meditation-extra]')).toBeHidden();
   await shell.locator('[data-meditation-writer-mode="ai"]').tap();
   await expect(shell.locator('[data-meditation-generate]')).toBeDisabled();
   await expect(shell.locator('[data-meditation-ai-opt-in] input')).toHaveCount(2);
   await shell.locator('[data-meditation-writer-mode="local"]').tap();
   await expect(shell.locator('[data-meditation-generate]')).toBeEnabled();
   const course=shell.locator('[data-therapy-format="course"]');
   await course.tap();
   await expect(course).toHaveAttribute('aria-pressed','true');
   await expect(shell.locator('[data-meditation-course-request]')).toBeVisible();
   await shell.locator('[data-meditation-generate]').tap();
   await expect(shell.locator('[data-meditation-eight-day-plan]')).toBeVisible();
   await expect(shell.locator('[data-meditation-course-day]')).toHaveCount(8);
   const single=shell.locator('[data-therapy-format="single"]');
   await single.tap();
   await expect(single).toHaveAttribute('aria-pressed','true');
   await expect(shell.locator('[data-meditation-course-request]')).toHaveCount(0);
   await shell.locator('[data-meditation-generate]').tap();
   const written=shell.locator('[data-meditation-script]');
   await expect(written).toBeVisible();
   const original=await written.inputValue();
   assert.ok(original.length>140,'Real locale-specific local draft');
   await shell.locator('[data-meditation-method]').selectOption('grounding');
   await shell.locator('[data-meditation-generate]').tap();
   assert.notEqual(await written.inputValue(),original,'Changing method changes the text');
   const voice=shell.locator('[data-therapy-subtab="voice"]');
   await voice.tap();
   await expect(voice).toHaveAttribute('aria-selected','true');
   await expect(shell.locator('[data-meditation-narration]')).toBeVisible();
   await expect(shell.locator('[data-therapy-voice]')).toBeVisible();
   const practice=shell.locator('[data-therapy-subtab="practice"]');
   await practice.tap();
   await expect(shell.locator('[data-therapy-practice]')).toBeVisible();
   const effects=shell.locator('[data-therapy-advanced-effects]');
   await expect(effects).not.toHaveAttribute('open','');
   await effects.locator('summary').tap();
   await expect(effects).toHaveAttribute('open','');
   await expect(page.locator('[data-video-hypnocorrection-panel]')).toBeVisible();
   await shell.locator('[data-therapy-practice] button').first().tap();
   await expect(voice).toHaveAttribute('aria-selected','true');
   await practice.tap();
   await shell.locator('[data-therapy-practice] button').last().tap();
   await expect(studio).toHaveAttribute('data-active-workspace','phrases');
   assert.deepEqual(posts,[],'No external provider or video renderer POST for local Therapy');
   assert.deepEqual(errors,[],'No browser page exceptions');
   process.stdout.write('PASS '+engine+'/'+locale+' Therapy 320/354/390/430 and local Meditation/Voice/Practice\n');
  }finally{await context.close();}
 }
}finally{await browser.close();}
