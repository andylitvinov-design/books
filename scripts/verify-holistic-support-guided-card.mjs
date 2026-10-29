// Live UI acceptance in local-only Chromium + WebKit, EN/RU/ES, iPhone widths.
// No real provider writes, paid APIs, playback, sensitive fixtures or CRM changes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3119";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Loopback only");
const output = "artifacts/holistic-guided-recommendations";
await mkdir(output, { recursive: true });

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["ru","en","es"]) for (const width of [320,390,430]) {
      const tag = engine.name()+"/"+locale+"/"+width;
      const page = await browser.newPage({
        viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,
        reducedMotion:"reduce",serviceWorkers:"block",
      });
      const exceptions=[],writes=[];
      page.on("pageerror",e=>exceptions.push(e.message));
      page.on("request",req=>{
        if (!["GET","HEAD","OPTIONS"].includes(req.method()) && req.url().includes("/api/"))
          writes.push(req.method()+" "+req.url());
      });
      await page.route("**/youtube-nocookie.com/**",route=>route.abort());
      try {
        const response=await page.goto(origin+"/"+locale+"/holistic-support/mobile",
          {waitUntil:"domcontentloaded",timeout:75000});
        assert.equal(response?.status(),200,tag+" page");
        const root=page.locator("[data-holistic-mobile-alternative]");
        await root.waitFor({state:"visible",timeout:35000});
        await page.waitForFunction(()=>{
          const input=document.querySelector('[data-support-scale="money"] input');
          return !!(input&&Object.keys(input).some(x=>x.startsWith("__reactProps$")));
        },null,{timeout:30000});
        assert.equal(await root.locator("[data-support-scale]").count(),4,tag+" current four linked check-ins");
        assert.equal(await root.locator('[data-support-scale="goals"]').count(),0,tag+" Goals belong to Meaning");
        assert.equal(await root.locator('[data-support-scale="meaning"]').count(),1,tag+" Meaning retains the merged goals");
        assert.equal(await root.locator("[data-support-tool]").count(),7,tag+" original support actions");
        assert.equal(await root.locator("[data-support-mobile-bottom-nav]").count(),1,tag+" original dock");
        assert.equal(await root.locator("[data-support-inline-guide]").count(),0,tag+" closed by default");
        const slider=root.locator('[data-support-scale="money"] input');
        await slider.focus();
        await slider.press("Home");
        assert.equal(await slider.inputValue(),"1",tag+" changed rating");

        await root.locator("[data-support-recommendations]").click();
        const guide=root.locator("[data-support-inline-guide]");
        await guide.waitFor({state:"visible",timeout:10000});
        const original=await guide.locator("[data-support-guide-fixed-portrait]").boundingBox();
        assert.equal(await guide.locator("[data-support-guide-fixed-portrait] img").count(),1,tag+" fixed guide photo");
        assert.equal(await guide.locator("[data-support-guide-phase='review']").count(),1,tag+" grounded analysis");
        const analysis=await guide.locator("[data-support-guide-message='guide']").first().innerText();
        assert.ok(analysis.includes("1/10")&&!analysis.includes("5/10"),
          tag+" only values actually edited by visitor: "+analysis);
        assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),0,
          tag+" recommendations hidden before conversation ends");

        // Real typed question within the current step must receive a local,
        // relevant answer without advancing or triggering paid AI.
        const question={ru:"Почему именно эта тема?",en:"Why this topic?",es:"¿Por qué esta opción?"}[locale];
        await guide.locator("[data-support-guide-compose] input").fill(question);
        await guide.locator("[data-support-guide-compose] button").click();
        // React commits the local conversation on the next render. A direct
        // immediate count is flaky on WebKit 430px even when the reply arrives.
        await guide.locator("[data-support-guide-message]").nth(2)
          .waitFor({state:"visible",timeout:8000});
        assert.equal(await guide.locator("[data-support-guide-phase='review']").count(),1,
          tag+" answer a question without skipping current stage");
        assert.ok(await guide.locator("[data-support-guide-message]").count()>=3,
          tag+" question and reply appended to history");
        await guide.locator("[data-support-guide-phase='review'] button").first().click();
        assert.equal(await guide.locator("[data-support-guide-phase='need']").count(),1,tag+" confirm");
        await guide.locator("[data-support-guide-phase='need'] button").first().click();
        assert.equal(await guide.locator("[data-support-guide-phase='detail']").count(),1,tag+" dynamic follow-up");
        await guide.locator("[data-support-guide-phase='detail'] button").first().click();
        assert.equal(await guide.locator("[data-support-guide-phase='time']").count(),1,tag+" contextual reply");
        await guide.locator('[data-support-guide-minutes="10"]').click();
        assert.equal(await guide.locator("[data-support-guide-phase='format']").count(),1,tag+" duration chosen");
        await guide.locator('[data-support-guide-format="tests"]').click();
        assert.equal(await guide.locator("[data-support-guide-phase='confirm']").count(),1,tag+" explicit final review");
        assert.equal(await guide.locator("[data-support-guide-recommendations]").count(),0,
          tag+" not visible until a final click");
        assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),0,
          tag+" no early recommendation cards");

        if (locale==="ru"&&width===390) await page.screenshot({
          path:output+"/"+engine.name()+"-ru-390-conversation.png",fullPage:true,
        });

        await guide.locator("[data-support-guide-show-recommendations]").click();
        await guide.locator("[data-support-guide-recommendations]").waitFor({state:"visible",timeout:10000});
        assert.equal(await guide.locator("[data-support-guide-recommendation]").count(),1,tag+" actual result");
        assert.equal(await guide.locator("[data-support-guide-program]").count(),1,tag+" next steps");
        assert.equal(await guide.locator("[data-support-guide-primary-title]").count(),1,
          tag+" one visible named primary resource");
        assert.equal(await guide.locator("[data-support-guide-context]").count(),1,
          tag+" one compact context instead of repeated recommendation summary");
        const timeDisclosure=await guide.locator("[data-support-guide-time-preference]").innerText();
        assert.ok(timeDisclosure.includes("10") &&
          timeDisclosure.includes(({en:"not the duration",ru:"не длительность",es:"no es la duración"})[locale]),
          tag+" selected 10 minutes never masquerades as a verified duration");
        assert.equal(await guide.locator("[data-support-guide-recommendations] h3").count(),1,
          tag+" only one recommendation heading");
        assert.equal(await guide.locator('a[href="/'+locale+'/client/tests?journey=business"]').count(),1,
          tag+" real allowlisted tests destination");
        assert.ok(await guide.locator("[data-support-guide-message]").count()>=13,
          tag+" dialog messages accumulated");
        const portrait=await guide.locator("[data-support-guide-fixed-portrait]").boundingBox();
        assert.ok(original&&portrait&&Math.abs(original.x-portrait.x)<2,tag+" photo stays on left");
        const height=await guide.locator("[data-support-guide-thread]").evaluate(el=>({
          top:el.scrollTop,content:el.scrollHeight,window:el.clientHeight,
        }));
        assert.ok(height.content>height.window&&height.top>0,
          tag+" previous WhatsApp-like messages move up inside chat: "+JSON.stringify(height));
        const screen=await page.evaluate(()=>({
          scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,
        }));
        assert.ok(screen.scroll<=screen.client+3,tag+" no horizontal overflow: "+JSON.stringify(screen));
        assert.equal(await root.locator("[data-support-player] iframe").count(),0,
          tag+" no autoplay or unsolicited video");

        if (locale==="ru"&&width===390) {
          await page.screenshot({
            path:output+"/"+engine.name()+"-ru-390-recommendations.png",fullPage:true,
          });
          await guide.locator("[data-support-guide-recommendations] .unused-link, [data-support-guide-recommendations] button").last().click();
          assert.equal(await guide.locator("[data-support-guide-phase='format']").count(),1,
            tag+" return to the dialogue");
          await guide.locator("[data-support-guide-compose] input").fill("Другая тема");
          await guide.locator("[data-support-guide-compose] button").click();
          assert.equal(await guide.locator("[data-support-guide-phase='topic']").count(),1,
            tag+" switch topic without reloading");
          await guide.locator('[data-support-guide-topic="meaning"]').click();
          assert.equal(await guide.locator("[data-support-guide-phase='need']").count(),1,
            tag+" custom topic proceeds within same conversation");
        }
        assert.deepEqual(exceptions,[],tag+" no JS exceptions");
        assert.deepEqual(writes,[],tag+" no external writes or accidental CRM/booking");
        await guide.locator("header button").click();
        assert.equal(await root.locator("[data-support-inline-guide]").count(),0,tag+" closes, dashboard preserved");
        console.log("PASS adaptive support conversation "+tag);
      } finally {await page.close();}
    }
  } finally {await browser.close();}
}
