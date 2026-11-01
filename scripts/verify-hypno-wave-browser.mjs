import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
for(const [engine,driver,options] of [['chromium',chromium,{}],['webkit',webkit,{}]]){
 const browser=await driver.launch({headless:true,...options});
 try {for(const [locale,width,now,goal] of [
  ['ru',320,'Я боюсь выступать','Хочу спокойно выражать мысли'],
  ['en',390,'I am afraid to speak','I want to express myself calmly'],
  ['es',430,'Tengo miedo de hablar','Quiero expresar mis ideas con calma'],
 ]){const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const writes=[];await page.route('**/*',route=>{const r=route.request();let u=new URL(r.url());if(!['GET','HEAD'].includes(r.method()))writes.push(`${r.method()} ${u.pathname}`);return u.origin==='http://127.0.0.1:3100'&&['GET','HEAD'].includes(r.method())?route.continue():route.abort();});
  await page.goto(`http://127.0.0.1:3100/${locale}/holistic-support/mandala`,{waitUntil:'domcontentloaded',timeout:90000});
  // A real visitor must expand the approved advanced director; mounting
  // a hidden hydrated form does not make it visible to Playwright.
  const firstDetails=page.locator('[data-video-first-video-advanced]');
  await firstDetails.waitFor({state:'attached',timeout:60000});
  if(await firstDetails.getAttribute('open')===null)
    await firstDetails.locator(':scope > summary').click();
  await page.locator('[data-first-free-video][data-first-video-hydrated="true"]').waitFor({state:'visible',timeout:60000});
  if(engine==='chromium'&&locale==='ru'){
    const first=page.locator('[data-first-free-video]');
    await first.locator('[data-first-video-wish]').fill('Тихое утро');
    await first.locator('[data-first-video-filters] > summary').click();
    const avoid=first.locator('[data-first-video-avoid]');
    await avoid.fill('unrecognized purple spacecraft');
    await first.locator('[data-first-video-no-compatible-scenes]').waitFor({state:'visible'});
    assert.equal(await first.locator('[data-first-video-generate]').isDisabled(),true);
    await avoid.fill('море и вода');
    await page.waitForFunction(()=>document.querySelectorAll('[data-free-film-source]').length===4,undefined,{timeout:60000});
    const ids=await page.locator('[data-free-film-source]').evaluateAll(videos=>videos.map(video=>video.dataset.freeFilmSource));
    assert.ok(ids.every(id=>!/sea|ocean|coast|water|river|stream|falls|shore|beach|lake|wave|dew|mist/i.test(id)));
    assert.equal(await first.locator('[data-first-video-caption]').isChecked(),false);
    assert.equal(await first.locator('[data-first-video-music]').inputValue(),'none');
  }
  const scenes=page.locator('[data-video-scene-library] [data-free-film-more]');await scenes.click({timeout:20000});
  assert.equal(await page.locator('[data-video-scene-library] [data-free-film-preset]').count(),48);
  // Six-workspace Studio exposes this genuine Hypno editor under Phrases.
  await page.locator('[data-video-quick-control="phrases"]').click();
  const pane=page.locator('[data-hypno-overview]');await pane.waitFor({state:'visible'});
  const layout=await pane.evaluate(el=>{
    const rects=['[data-hypno-idea]','[data-hypno-phrases]','[data-hypno-voice]','[data-hypno-music]']
      .map(sel=>el.querySelector(sel)?.getBoundingClientRect());
    const firstPhrase=el.querySelector('[data-hypno-phrase="0"]');
    return {tops:rects.map(r=>r?.top),visible:rects.every(r=>r&&r.width>0),
      font:firstPhrase?parseFloat(getComputedStyle(firstPhrase).fontSize):0,
      height:firstPhrase?.getBoundingClientRect().height,scroll:el.scrollWidth,width:el.clientWidth};
  });
  assert.equal(layout.visible,true,'four ordered sections');
  assert.ok(layout.tops.every((top,i,a)=>i===0||top>a[i-1]),'Idea → phrases → voice → music');
  assert.ok(layout.font>=15.5&&layout.height>=44,'readable text and touch controls');
  assert.ok(layout.scroll<=layout.width+3,'no horizontal overflow');
  const voice=pane.locator('[data-hypno-voice] [data-video-affirmation-voice]');
  await voice.waitFor({state:'visible'});
  assert.equal(await voice.locator('[data-video-affirmation-voice-card]').count(),3);
  await voice.locator('[data-video-affirmation-gender="male"]').click();
  assert.equal(await voice.locator('[data-video-affirmation-voice-card]').count(),3);
  await voice.locator('[data-video-affirmation-gender="female"]').click();
  await pane.locator('[data-hypno-music] [data-phrase-music-play]').first().click();
  assert.equal(await page.locator('[data-video-quick-control="phrases"]').getAttribute('aria-pressed'),'true',
    'music preview cannot navigate away');
  const dir=process.env.HH_HYPNO_SCREENSHOT_DIR;
  if(dir){mkdirSync(dir,{recursive:true});
    await pane.screenshot({path:join(dir,engine+'-'+locale+'-'+width+'.png'),animations:'disabled'});}
  const activePreview=pane.locator('[data-hypno-preview] strong');
  const beforeSmart=await activePreview.innerText();
  const firstReady=pane.locator('[data-hypno-phrase="0"]');
  await firstReady.click();
  assert.equal(await activePreview.innerText(),beforeSmart,'ready selection stays pending before approval');
  await firstReady.click();
  assert.equal(await activePreview.innerText(),beforeSmart,'staged restore keeps video unchanged');
  await pane.locator('[data-hypno-smart]').click();
  assert.equal(await activePreview.innerText(),beforeSmart,'smart suggestions must await approval');
  // The current Phrases workspace reuses the visitor's optional goal input.
  // The obsolete pair of request textareas no longer exists.
  const wishDetails=page.locator('[data-video-wish-disclosure]');
  await wishDetails.waitFor({state:'visible'});
  if(await wishDetails.getAttribute('open')===null)
    await wishDetails.locator(':scope > summary').click();
  const wish=wishDetails.locator('[data-video-wish]');
  await wish.fill(now+' — '+goal);
  const preview=pane.locator('[data-hypno-preview] strong');const before=await preview.innerText();
  await pane.locator('[data-hypno-smart]').click();
  const proposed=await pane.locator('[data-hypno-phrase="0"]').innerText();
  assert.equal(await preview.innerText(),before,'suggestion must not change active preview');
  assert.notEqual(proposed,before,'test must exercise a distinct suggestion');
  await pane.locator('[data-hypno-approve]').click();
  assert.equal(await preview.innerText(),proposed,'approved suggestion must be active');
  await wish.fill('I want to kill myself');
  await pane.locator('[data-hypno-smart]').click();
  assert.equal(await pane.locator('[data-hypno-approve]').isDisabled(),true,'urgent input must not be approved as phrases');
  assert.deepEqual(writes,[],'personal notes must not be sent');
  console.log(`${engine}/${locale}/${width}: PASS scene click, local proposal, approval, safety and no writes`);
  await page.close();
 }
 }finally{await browser.close()}
}
