import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
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
  await page.locator('[data-video-quick-control="psychocorrection"]').click();
  const pane=page.locator('[data-hypno-overview]');await pane.waitFor({state:'visible'});
  const activePreview=pane.locator('[data-hypno-preview] strong');
  const beforeSmart=await activePreview.innerText();
  await pane.locator('[data-hypno-smart]').click();
  assert.equal(await activePreview.innerText(),beforeSmart,'smart suggestions must await approval');
  await pane.locator('[data-hypno-request-edit]').click();
  const notes=pane.locator('[data-hypno-request-options] textarea');
  await notes.nth(0).fill(now);await notes.nth(1).fill(goal);
  const preview=pane.locator('[data-hypno-preview] strong');const before=await preview.innerText();
  await pane.locator('[data-hypno-smart]').click();
  const proposed=await pane.locator('[data-hypno-phrase="0"]').innerText();
  assert.equal(await preview.innerText(),before,'suggestion must not change active preview');
  assert.notEqual(proposed,before,'test must exercise a distinct suggestion');
  await pane.locator('[data-hypno-approve]').click();
  assert.equal(await preview.innerText(),proposed,'approved suggestion must be active');
  await pane.locator('[data-hypno-request-edit]').click();
  await notes.nth(0).fill('I want to kill myself');
  await pane.locator('[data-hypno-smart]').click();
  assert.equal(await pane.locator('[data-hypno-approve]').isDisabled(),true,'urgent input must not be approved as phrases');
  assert.deepEqual(writes,[],'personal notes must not be sent');
  console.log(`${engine}/${locale}/${width}: PASS scene click, local proposal, approval, safety and no writes`);
  await page.close();
 }
 }finally{await browser.close()}
}
