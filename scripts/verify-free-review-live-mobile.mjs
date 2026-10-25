// Read-only public acceptance. Chromium/WebKit emulate touch, not a physical iPhone.
// Never submit forms, create leads, publish media, or send messages.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium,webkit}=await import(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright');
const origin=(process.env.HH_LIVE_ORIGIN || 'https://holistichouse.vercel.app').replace(/\/$/,'');
const output='artifacts/free-review-live-mobile';
mkdirSync(output,{recursive:true});
const results=[];
const sizes=[[320,568],[375,667],[390,844],[430,932]];
for(const [engine,driver] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await driver.launch({headless:true});
  try{
    for(const locale of ['en','ru','es']){
      for(const [width,height] of sizes){
        const name=engine+'-'+locale+'-'+width+'x'+height;
        const record={engine,locale,width,height};
        const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
        const page=await context.newPage();
        const errors=[];
        const provider=[];
        page.on('pageerror',e=>errors.push(e.message.slice(0,250)));
        page.on('response',r=>{if(r.url().includes('/embed/sfVFOQNr2qk'))provider.push({status:r.status(),url:r.url().slice(0,180)});});
        try{
          const resp=await page.goto(origin+'/'+locale+'/services/free-situation-review',{waitUntil:'domcontentloaded',timeout:65000});
          assert.equal(resp?.status(),200,'public URL HTTP 200');
          assert.equal(await page.locator('[data-sitewide-personal-review-banner]').count(),0,'do not repeat a self-referral promo above the free review');
          const hero=page.locator('[data-free-entry-landing="situation"] section[aria-labelledby="free-entry-title"]');
          const video=hero.locator('[data-featured-constellations-video]');
          const cta=hero.locator('a[href="#free-diagnosis-options"]');
          const play=video.locator('button.site-video-play');
          await video.waitFor({state:'visible',timeout:30000});
          await page.waitForFunction(()=>{const b=document.querySelector('[data-featured-constellations-video] button.site-video-play');return b&&!b.disabled;},null,{timeout:35000});
          await page.evaluate(()=>document.fonts.ready);
          assert.equal(await video.locator('iframe').count(),0,'no autoplay iframe');
          assert.equal(await video.locator('a[href*="youtube.com"]').getAttribute('href'),'https://www.youtube.com/watch?v=sfVFOQNr2qk');
          const geom=await page.evaluate(()=>{
            const rect=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,right:r.right};};
            const main=document.querySelector('[data-free-entry-landing="situation"]');
            const hero=main.querySelector('section[aria-labelledby="free-entry-title"]');
            const video=main.querySelector('[data-featured-constellations-video]');
            const nav=document.querySelector('.mobile-bottom-navigation');
            const header=document.querySelector('header.house-header');
            return {
              viewport:{width:innerWidth,height:innerHeight},
              overflow:document.documentElement.scrollWidth-innerWidth,
              header:rect(header),hero:rect(hero),video:rect(video),
              frame:rect(video.querySelector('.site-video-frame')),
              cta:rect(hero.querySelector('a[href="#free-diagnosis-options"]')),
              nav:rect(nav),availableBottom:nav?nav.getBoundingClientRect().top:innerHeight,
              scenes:[...main.querySelectorAll('section[id="what-you-get"],section[id="how-it-works"]')].map(e=>({id:e.id,rect:rect(e)}))
            };
          });
          record.geometry=geom;
          await page.screenshot({path:output+'/'+name+'-first-screen.png',animations:'disabled',timeout:20000});
          assert.ok(geom.overflow<=2,'horizontal overflow '+geom.overflow);
          assert.ok(geom.frame&&Math.abs(geom.frame.width/geom.frame.height-16/9)<=0.06,'16:9 poster');
          assert.ok(geom.cta&&geom.nav&&geom.hero&&geom.video,'main mobile UI present');
          assert.ok(geom.cta.height>=42,'main CTA tap target');
          assert.ok(geom.video.bottom<geom.cta.top,'video first');
          assert.ok(geom.cta.bottom<=geom.availableBottom-1,'CTA clipped behind nav: '+JSON.stringify(geom));
          assert.ok(geom.hero.bottom<=geom.availableBottom+1,'first slide overflows viewport');
          for(const scene of geom.scenes){
            const budget=height-(geom.header?.height||0)-(geom.nav?.height||0)-8;
            assert.ok(scene.rect.height<=budget+2,scene.id+' slide taller than usable viewport: '+scene.rect.height+' > '+budget);
          }
          const capture=page.locator('#request-free-review[data-service-lead-capture]');
          const cards=page.locator('[data-diagnosis-offer]');
          assert.equal(await cards.count(),3,'three photo-led offers with one shared form');
          for(const id of ['situation-written-free','wu-xing-free','personal-session-30-eur50']){
            assert.equal(await cards.filter({has:page.locator('[data-diagnosis-order="'+id+'"]')}).count(),1,'one order CTA per '+id);
          }
          assert.equal(await capture.locator('input[type="checkbox"]').isChecked(),false,'consent defaults unchecked');
          await play.click({timeout:15000});
          const iframe=video.locator('iframe[data-video-playback="youtube"]');
          await iframe.waitFor({state:'attached',timeout:20000});
          const src=await iframe.getAttribute('src');
          assert.ok(src.startsWith('https://www.youtube-nocookie.com/embed/sfVFOQNr2qk?'),'exact YouTube source on opt-in Play');
          record.embedSrc=src;
          if(width===390)await page.screenshot({path:output+'/'+name+'-after-play.png',animations:'disabled',timeout:25000});
          await cta.click({timeout:15000});
          assert.equal(new URL(page.url()).hash,'#free-diagnosis-options','hero CTA opens three options');
          await capture.waitFor({state:'visible',timeout:18000});
          assert.equal(await capture.locator('input[name="contact"]').count(),1);
          assert.equal(await capture.locator('input[type="checkbox"]').isChecked(),false);
          assert.equal(await capture.locator('[data-lead-saved]').count(),0,'click is not a real lead');
          const wuDetail=cards.nth(1).locator('details');
          await wuDetail.locator('summary').click();
          assert.equal(await wuDetail.evaluate(el=>el.open),true,'Wu Xing details expand in place');
          await cards.nth(2).locator('[data-diagnosis-order="personal-session-30-eur50"]').click();
          assert.equal(new URL(page.url()).hash,'#request-free-review','order CTA reaches shared form');
          assert.equal(await capture.locator('select').inputValue(),'personal-session-30-eur50','paid option preselected');
          await capture.locator('select').selectOption('wu-xing-free');
          assert.equal(await cards.nth(1).getAttribute('data-diagnosis-selected'),'true','form selection updates selected card');
          assert.equal(await capture.locator('input[type="checkbox"]').isChecked(),false,'no implicit consent on selection');
          assert.equal(await capture.locator('[data-lead-saved]').count(),0,'selection is not a submitted lead');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,'expanded details fit viewport');
          if(width===390){
            const hubResponse=await page.goto(origin+'/'+locale+'/services/free-consultation',{waitUntil:'domcontentloaded',timeout:65000});
            assert.equal(hubResponse?.status(),200,'free-consultation route reachable');
            assert.equal(await page.locator('[data-free-consultation-hub] [data-diagnosis-offer]').count(),3,'hub has identical three options');
            assert.equal(await page.locator('[data-free-consultation-hub] [data-service-lead-capture]').count(),1,'hub has one CRM form');
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,'hub fits viewport');
            await page.goto(origin+'/'+locale+'/services/free-situation-review',{waitUntil:'domcontentloaded',timeout:65000});
          }
          const privateEntry=page.locator('[data-free-drawing-intake]');
          await page.locator('[data-optional-written-review] > summary').click();
          await privateEntry.waitFor({state:'visible'});
          assert.equal(await privateEntry.locator('form,textarea,[data-contact-channel-chooser]').count(),0,
            'private answers are not collected twice or copied into messenger');
          const privateLink=privateEntry.locator('a');
          assert.equal(await privateLink.count(),1);
          assert.equal(await privateLink.getAttribute('href'),'/'+locale+'/coaching/intake?topic=personal');
          assert.ok((await privateEntry.innerText()).includes(locale==='ru'?'Не отправляйте':locale==='es'?'No envíes':'Do not send'));
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,
            'expanded privacy instructions fit the phone width');
          record.privateIntakeHref=await privateLink.getAttribute('href');
          record.status='PASS';
          console.log('PASS '+name+' hero='+Math.round(geom.hero.bottom)+' bar='+Math.round(geom.availableBottom));
        }catch(error){
          record.status='FAIL';record.error=String(error.stack||error.message).slice(0,3000);
          console.error('FAIL '+name+' '+record.error);
          await page.screenshot({path:output+'/'+name+'-failed.png',fullPage:true,animations:'disabled',timeout:15000}).catch(()=>{});
        }finally{
          record.pageErrors=errors;record.providerResponses=provider;results.push(record);
          await context.close();
        }
      }
    }
  }finally{await browser.close();}
}
writeFileSync(output+'/results.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),results},null,2));
const failed=results.filter(x=>x.status!=='PASS');
console.log('TOTAL '+results.length+' PASS '+(results.length-failed.length)+' FAIL '+failed.length);
assert.equal(failed.length,0,'Inspect failed mobile geometry and Play screenshots in workflow artifact');
