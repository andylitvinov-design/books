// Click-level V2 acceptance: original mobile dashboard → welcome → short test
// invitation → practice → feedback → explicitly requested personal path.
// No real health data, provider mutations or automatic video playback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3119";
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error("Loopback only");
const output="artifacts/holistic-guided-recommendations";
await mkdir(output,{recursive:true});

for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try {
    for(const locale of ["ru","en","es"])for(const width of [320,390,430]){
      const tag=engine.name()+"/"+locale+"/"+width;
      const page=await browser.newPage({
        viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,
        reducedMotion:"reduce",serviceWorkers:"block",
      });
      const errors=[],writes=[];
      page.on("pageerror",err=>errors.push(err.message));
      page.on("request",req=>{
        if(!["GET","HEAD","OPTIONS"].includes(req.method())&&req.url().includes("/api/"))
          writes.push(req.method()+" "+req.url());
      });
      await page.route("**/youtube-nocookie.com/**",route=>route.abort());
      try{
        const response=await page.goto(origin+"/"+locale+"/holistic-support/mobile",
          {waitUntil:"domcontentloaded",timeout:75000});
        assert.equal(response?.status(),200,tag+" page");
        const root=page.locator("[data-holistic-mobile-alternative]");
        await root.waitFor({state:"visible",timeout:35000});
        await page.waitForFunction(()=>{
          const el=document.querySelector('[data-support-scale="money"] input');
          return Boolean(el&&Object.keys(el).some(key=>key.startsWith("__reactProps$")));
        },null,{timeout:30000});
        assert.equal(await root.locator("[data-support-scale]").count(),4,tag+" four approved check-ins");
        assert.equal(await root.locator("[data-support-tool]").count(),7,tag+" original tool tiles");
        assert.equal(await root.locator("[data-support-mobile-bottom-nav]").count(),1,tag+" bottom dock");
        assert.equal(await root.locator("[data-support-inline-guide]").count(),0,tag+" guide initially hidden");
        const slider=root.locator('[data-support-scale="money"] input');
        await slider.focus();await slider.press("Home");
        assert.equal(await slider.inputValue(),"1",tag+" user-adjusted money");
        await root.locator("[data-support-recommendations]").click();
        const guide=root.locator("[data-support-inline-guide]");
        await guide.waitFor({state:"visible",timeout:12000});
        const portrait=await guide.locator("[data-support-guide-fixed-portrait]").boundingBox();
        const messages=guide.locator("[data-support-guide-message]");
        assert.equal(await guide.locator("[data-support-guide-fixed-portrait] img").count(),1,tag+" guide photo");
        assert.ok((await messages.first().innerText()).length>0,tag+" welcome");
        assert.ok((await messages.nth(1).innerText()).includes("1/10"),tag+" checked rating in second bubble");
        assert.ok(!(await messages.nth(1).innerText()).includes("5/10"),tag+" no invented default rating");
        assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),0,
          tag+" no recommendations before the conversation");

        if(locale==="ru"&&width===390){
          await guide.locator("[data-support-guide-compose] input").fill("Почему именно эта тема?");
          await guide.locator("[data-support-guide-compose] button").click();
          assert.equal(await guide.locator('[data-support-guide-phase="review"]').count(),1,
            tag+" a free-form question does not skip the current stage");
        }
        await guide.locator('[data-support-guide-phase="review"] button').first().click();
        assert.equal(await guide.locator('[data-support-guide-phase="test-invite"]').count(),1,tag+" gentle test offer");

        if(locale==="ru"&&width===390){
          await guide.locator("[data-guide-talk-first]").click();
          assert.equal(await guide.locator('[data-support-guide-phase="reflection"]').count(),1,
            tag+" talk-first option asks an open question");
          await guide.locator("[data-support-guide-compose] input").fill("Хочу ясности в деньгах");
          await guide.locator("[data-support-guide-compose] button").click();
          assert.equal(await guide.locator('[data-support-guide-phase="test-invite"]').count(),1,
            tag+" free-form answer is acknowledged before options");
        }
        const tests=guide.locator("[data-guide-open-test-choice]");
        if(await tests.count()){
          await tests.click();
          assert.equal(await guide.locator('[data-support-guide-phase="test-pick"]').count(),1,tag+" real test choices");
          const cards=guide.locator("[data-guide-test-card]");
          assert.ok((await cards.count())>=1&&(await cards.count())<=2,tag+" one or two verified tests");
          const links=await guide.locator("[data-guide-start-test]").evaluateAll(anchors=>
            anchors.map(a=>({href:a.getAttribute("href"),target:a.target,label:a.textContent})));
          for(const link of links){
            assert.match(link.href,/^\/(?:en|ru)\/client\?startTests=[a-z0-9%-]+$/,tag+" secure guest runner link");
            assert.equal(link.target,"_blank",tag+" keep chat in current tab");
          }
          assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),0,tag+" tests are microchoices, not final path");
          if(locale==="ru"&&width===390){
            const testLink=guide.locator("[data-guide-start-test]").first();
            const popupWait=page.waitForEvent("popup",{timeout:12000});
            await testLink.click();
            const popup=await popupWait;
            await popup.close().catch(()=>{});
            assert.equal(await guide.locator('[data-support-guide-phase="test-return"]').count(),1,
              tag+" test launched without claiming its result");
            await guide.locator("[data-guide-continue-after-test]").click();
          }else{
            await guide.locator("[data-guide-skip-test]").click();
          }
        }else{
          await guide.locator("[data-guide-skip-test]").click();
        }

        assert.equal(await guide.locator('[data-support-guide-phase="practice-invite"]').count(),1,
          tag+" natural pivot to free practice");
        assert.equal(await guide.locator("[data-support-guide-recommendations]").count(),0,
          tag+" still no final path");
        await guide.locator("[data-guide-go-meditations]").click();
        assert.equal(await guide.locator('[data-support-guide-phase="time"]').count(),1,
          tag+" asks time without inventing video duration");
        await guide.locator('[data-support-guide-minutes="10"]').click();
        assert.equal(await guide.locator('[data-support-guide-phase="media-pick"]').count(),1,
          tag+" shows verified meditation choices");
        assert.ok((await guide.locator("[data-guide-media-card]").count())<=3,tag+" maximum three source videos");
        assert.equal(await root.locator("[data-support-player] iframe").count(),0,tag+" no autoplay");
        await guide.locator('[data-guide-media-short-practice]').click();
        assert.equal(await guide.locator('[data-support-guide-phase="exercise"]').count(),1,
          tag+" alternative free practice without navigating elsewhere");
        await guide.locator('[data-support-guide-phase="exercise"] button').first().click();
        assert.equal(await guide.locator('[data-support-guide-phase="feedback"]').count(),1);
        await guide.locator('[data-support-guide-phase="feedback"] button').first().click();
        assert.equal(await guide.locator('[data-support-guide-phase="path-confirm"]').count(),1);
        assert.equal(await guide.locator("[data-support-guide-recommendations]").count(),0,
          tag+" final recommendation gated by explicit My Path click");
        if(locale==="ru"&&width===390)await page.screenshot({
          path:output+"/"+engine.name()+"-ru-390-conversation.png",fullPage:true,
        });
        await guide.locator("[data-support-guide-show-recommendations]").click();
        await guide.locator("[data-support-guide-recommendations]").waitFor({state:"visible",timeout:10000});
        assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),1,tag+" one primary path");
        assert.equal(await guide.locator("[data-support-guide-program]").count(),1,tag+" next steps");
        assert.ok(await guide.locator("[data-support-guide-alternative]").count()<=2,tag+" up to two alternatives");
        assert.ok(await messages.count()>=10,tag+" conversation grows rather than replacing replies");
        const portraitAfter=await guide.locator("[data-support-guide-fixed-portrait]").boundingBox();
        assert.ok(portrait&&portraitAfter&&Math.abs(portrait.x-portraitAfter.x)<2,tag+" fixed avatar stays left");
        const thread=await guide.locator("[data-support-guide-thread]").evaluate(el=>({
          top:el.scrollTop,content:el.scrollHeight,window:el.clientHeight,
        }));
        assert.ok(thread.content>thread.window&&thread.top>0,tag+" old WhatsApp replies move upward");
        const measure=await page.evaluate(()=>({
          width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
        }));
        assert.ok(measure.width<=measure.viewport+3,tag+" no mobile horizontal overflow "+JSON.stringify(measure));
        assert.equal(await root.locator("[data-support-player] iframe").count(),0,tag+" video still not auto-playing");
        assert.deepEqual(writes,[],tag+" no CRM writes or automatic booking");
        assert.deepEqual(errors,[],tag+" no runtime exceptions");
        if(locale==="ru"&&width===390)await page.screenshot({
          path:output+"/"+engine.name()+"-ru-390-my-path.png",fullPage:true,
        });
        await guide.locator("header button").click();
        assert.equal(await root.locator("[data-support-inline-guide]").count(),0,tag+" closes gracefully");
        console.log("PASS V2 test→practice→path "+tag);
      }finally{await page.close();}
    }
  }finally{await browser.close();}
}
