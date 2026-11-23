/**
 * #4707 consolidated into #4979: Therapy A/B guest WebKit acceptance. Real local Next UI,
 * 320/354/390/430 CSS pixels, RU/EN/ES, zero paid/remote generation.
 * Not a provider narration, private-account or rendered-video delivery test.
 */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium,webkit,expect} from '@playwright/test';
import {completeThreeStepGoalsQuiz} from './benchmarking/complete-three-step-goals-quiz.mjs';

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
   await page.route('**/*',route=>route.request().method()==='POST'?route.abort():route.continue());
   page.setDefaultTimeout(20000);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',req=>{if(req.method()==='POST')posts.push(new URL(req.url()).pathname);});
   await page.goto(BASE+'/'+locale+'/holistic-support/mandala',
    {waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:'attached',timeout:60000});
   await completeThreeStepGoalsQuiz(page,{engine});
   // After the real three-step quiz, the single-screen Create CTA is
   // intentionally hidden by the expanded layout; use its VISIBLE native
   // Continue to Montage button (ARIA snapshot from macOS WebKit run 45124044568).
   const advance=page.locator('[data-video-continue-scenarios]');
   await expect(advance).toBeVisible();
   await expect(advance).toBeEnabled();
   if(engine==='webkit')await advance.tap();else await advance.click();
   const studio=page.locator('[data-mandala-free-video]');
   const therapy=page.locator('[data-video-quick-control="effects"]');
   await expect(therapy).toBeVisible();
   if(engine==='webkit')await therapy.tap();else await therapy.click();
   await expect(studio).toHaveAttribute('data-active-workspace','effects');
   const shell=page.locator('[data-therapy-studio]');
   await expect(shell).toBeVisible();
   await expect(shell.locator('[data-therapy-tabs] [role="tab"]')).toHaveCount(4);
   const labels={en:'Therapy Studio steps',ru:'Этапы Therapy Studio',es:'Pasos de Therapy Studio'};
   await expect(shell.locator('[data-therapy-tabs]')).toHaveAttribute('aria-label',labels[locale]);
   for(const id of ['meditation','voice','practice','course'])
    await expect(shell.locator('[data-therapy-subtab="'+id+'"]')).toHaveCount(1);
   await expect(shell.locator('[data-therapy-format-switch]')).toHaveCount(0);
   await expect(shell.locator('[data-therapy-text-option]')).toHaveCount(2);
   await expect(shell.locator('[data-therapy-text-host]')).toBeVisible();
   await expect(shell.locator('[data-therapy-script-host]')).toBeHidden();
   // Four iPhone widths and EN/RU/ES: one tab row, tap geometry and real scroll panel.
   for(const width of [320,354,390,430]){
    await page.setViewportSize({width,height:820});
    const m=await shell.evaluate(node=>{
     const tabs=[...node.querySelectorAll('[data-therapy-tabs] button')].map(el=>el.getBoundingClientRect());
     const targets=[...node.querySelectorAll('[data-therapy-tabs] button,'+
      '[data-therapy-text-option],[data-therapy-approve-text],'+
      '[data-therapy-regenerate-local],[data-therapy-customize-text]')].map(el=>el.getBoundingClientRect());
     const script=node.querySelector('[data-therapy-full-script]').getBoundingClientRect();
     const panel=node.querySelector('[data-therapy-meditation-picker]').getBoundingClientRect();
     return {tabs:tabs.map(x=>[x.y,x.width,x.height]),
      targets:targets.map(x=>[x.width,x.height]),
      scriptWidth:script.width,panelWidth:panel.width,
      doc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};
    });
    assert.equal(m.tabs.length,4,'Four tabs '+locale+'/'+width);
    assert.ok(Math.max(...m.tabs.map(x=>x[0]))-Math.min(...m.tabs.map(x=>x[0]))<=2,
     'Single Therapy tab row '+JSON.stringify(m));
    assert.ok(m.targets.length>=9&&m.targets.every(([w,h])=>w>=44&&h>=44),
     'Accessible 44px taps '+JSON.stringify(m));
    assert.ok(m.scriptWidth>0&&m.scriptWidth<=m.panelWidth,
     'Text stays within the scrollable card '+JSON.stringify(m));
    assert.ok(m.doc<=m.viewport+2,'No horizontal overflow '+JSON.stringify(m));
    if(process.env.HH_THERAPY_SCREENSHOT_DIR){
     mkdirSync(process.env.HH_THERAPY_SCREENSHOT_DIR,{recursive:true});
     await page.evaluate(()=>window.scrollTo(0,0));
     await page.screenshot({path:process.env.HH_THERAPY_SCREENSHOT_DIR+'/'+engine+'-'+locale+'-'+width+'.png',
      animations:'disabled',fullPage:false,timeout:30000});
    }
   }
   await page.setViewportSize({width:390,height:820});
   const text=shell.locator('[data-therapy-full-script]');
   const a=await text.innerText();
   assert.ok(a.length>90,'Real full short script A');
   const optionB=shell.locator('[data-therapy-text-option="b"]');
   await optionB.tap();
   await expect(optionB).toHaveAttribute('aria-selected','true');
   assert.notEqual(await text.innerText(),a,'Option B swaps complete text');
   await shell.locator('[data-therapy-regenerate-local]').tap();
   await expect(shell.locator('[data-therapy-text-option="a"]')).toHaveAttribute('aria-selected','true');
   assert.notEqual(await text.innerText(),a,'Local generation offers new text');
   await shell.locator('[data-therapy-customize-text]').tap();
   const edited={en:'Breathe gently. Feel supported. Choose one kind step today.',
    ru:'Дышите мягко. Почувствуйте опору. Выберите один добрый шаг сегодня.',
    es:'Respira con calma. Siente el apoyo. Elige un paso amable hoy.'}[locale];
   await shell.locator('[data-therapy-text-editor]').fill(edited);
   await shell.locator('[data-therapy-customize-text]').tap();
   await expect(text).toHaveText(edited);
   await shell.locator('[data-therapy-approve-text]').tap();
   await expect(shell.locator('[data-therapy-subtab="voice"]')).toHaveAttribute('aria-selected','true');
   await expect(shell.locator('[data-therapy-approved-voice]')).toBeVisible();
   await expect(shell.locator('[data-therapy-voice-next] button')).toHaveCount(2);
   await shell.locator('[data-therapy-voice-to-practice]').tap();
   await expect(shell.locator('[data-therapy-subtab="practice"]')).toHaveAttribute('aria-selected','true');
   const effects=shell.locator('[data-therapy-advanced-effects]');
   await expect(effects).not.toHaveAttribute('open','');
   await effects.locator(':scope > summary').tap();
   await expect(effects).toHaveAttribute('open','');
   await shell.locator('[data-therapy-subtab="voice"]').tap();
   await shell.locator('[data-therapy-voice-to-course]').tap();
   await expect(shell.locator('[data-therapy-subtab="course"]')).toHaveAttribute('aria-selected','true');
   await expect(shell.locator('[data-therapy-script-host]')).toBeVisible();
   const request=shell.locator('[data-meditation-course-request]');
   const details=request.locator('xpath=ancestor::details[1]');
   if(await details.count()&&await request.isHidden())await details.locator(':scope > summary').tap();
   await expect(request).toBeVisible();
   await shell.locator('[data-meditation-generate]').tap();
   await expect(shell.locator('[data-meditation-eight-day-plan]')).toBeVisible();
   await expect(shell.locator('[data-meditation-course-day]')).toHaveCount(8);
   assert.deepEqual(posts,[],'No remote meditation/voice/video or billing requests');
   assert.deepEqual(errors,[],'No browser page exceptions');
   process.stdout.write('PASS '+engine+'/'+locale+' four-tab Therapy iPhone A/B, Voice and My Course\n');
  }finally{await context.close();}
 }
}finally{await browser.close();}
