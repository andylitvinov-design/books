import assert from 'node:assert/strict';
import {chromium,webkit,expect} from '@playwright/test';

const originals={
  en:['Dk0LBmOivQo','aUJde6A-9p0','fE6sD1zr1Js','itjo2_z2NGk','4NrryHcEF1A','hYwRNMxIMjc'].sort(),
  ru:['m9RfDgK76PU','MIVLm1GUTtM','ttQxUHopaUM','VABgpmn4ZYA','muOnIHllI7E','5oj0BIbLT4w'].sort(),
};

// Isolated synthetic browser: no production writes or third-party requests.
export async function verifyAboutTestimonials(origin='http://127.0.0.1:3100'){
  const url=new URL(origin);
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&['http:','https:'].includes(url.protocol));
  const remoteWebKitUrl=process.env.HH_SITE_VIDEO_WEBKIT_WS_ENDPOINT;
  if(remoteWebKitUrl){
    const remote=new URL(remoteWebKitUrl);
    assert.equal(remote.protocol,'ws:');
    assert.equal(remote.hostname,'127.0.0.1');
    assert.equal(remote.port,'39120');
    assert.equal(remote.pathname,'/');
    assert.equal(remote.search,'');
    assert.equal(remote.hash,'');
    assert.equal(remote.username,'');
    assert.equal(remote.password,'');
  }
  for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
    // The official pinned Linux image provides the missing real WebKit libraries.
    // Keep all original EN/RU/ES and viewport/browser assertions unchanged.
    const browser=await (engine==='webkit' && remoteWebKitUrl
      ? webkit.connect(remoteWebKitUrl,{timeout:20000})
      : type.launch());
    try{
      for(const locale of ['en','ru','es'])for(const width of [320,390,430]){
        const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await context.route('**/*',route=>{
          const request=route.request(),target=new URL(request.url());
          return target.origin===url.origin&&['GET','HEAD'].includes(request.method())?route.continue():route.abort();
        });
        try{
          await page.goto(origin+'/'+locale+'/about',{waitUntil:'domcontentloaded',timeout:90000});
          const primary=locale==='ru'?'ru':'en',other=locale==='ru'?'en':'ru';
          const first=page.locator(`[data-about-primary-testimonials="${primary}"] [data-about-testimonial-audio="${primary}"]`);
          await expect(first).toHaveCount(6);
          assert.deepEqual((await first.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-testimonial-video-id')))).sort(),originals[primary]);
          const disclosure=page.locator('[data-about-other-language-testimonials]');
          await expect(disclosure.locator('[data-about-secondary-testimonials]')).toHaveCount(0);
          await page.waitForFunction(()=>{const d=document.querySelector('[data-about-other-language-testimonials]');
            return d&&Object.keys(d).some(k=>k.startsWith('__reactProps$'));},null,{timeout:30000});
          await disclosure.locator('summary').click();
          const more=disclosure.locator(`[data-about-secondary-testimonials="${other}"] [data-about-testimonial-audio="${other}"]`);
          await expect(more).toHaveCount(6);
          assert.deepEqual((await more.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-testimonial-video-id')))).sort(),originals[other]);
          await expect(page.locator('iframe')).toHaveCount(0);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,engine+' '+locale+' '+width+' overflow');
          assert.deepEqual(errors,[],engine+' '+locale+' '+width+' page errors');
          console.log('PASS about-testimonials',engine,locale,width);
        }finally{await context.close();}
      }
    }finally{await browser.close();}
  }
}
