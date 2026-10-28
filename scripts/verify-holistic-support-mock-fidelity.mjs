// Screenshot parity for the owner-approved Support mobile mock.
 // Local loopback only; synthetic data, no real client upload/CRM/checkout,
 // no external YouTube playback or health/test data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3118";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Loopback only");
const output = "artifacts/holistic-support-mock-fidelity";
await mkdir(output, { recursive: true });
const evidence = [];
const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2WQAAAABJRU5ErkJggg==", "base64");
for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const locale of ["ru", "en", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = browserType.name() + "/" + locale + "/" + width;
        const page = await browser.newPage({ viewport: {width, height: 844}, deviceScaleFactor: 1,
          hasTouch: true, isMobile: true, reducedMotion: "reduce" });
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        try {
          const res = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
            { waitUntil: "domcontentloaded", timeout: 75000 });
          assert.equal(res?.status(), 200, label + " status");
          const root = page.locator("[data-holistic-mobile-alternative]");
          await root.waitFor({state:"visible", timeout:35000});
          // SSR HTML precedes React hydration. Do not synthesize slider changes
          // against a native-only input before React has attached handlers.
          await page.waitForFunction(() => {
            const input = document.querySelector('[data-support-scale="relationships"] input[type="range"]');
            return Boolean(input && Object.keys(input).some(key => key.startsWith("__reactProps$")));
          }, null, {timeout:30000});

          assert.equal(await root.locator('[data-support-scale] input[type="range"]').count(), 4, label + " ratings");
          assert.equal(await root.locator('[data-support-tool]').count(), 4, label + " tools");
          assert.equal(await root.locator('[data-support-video]').count(), 4, label + " visible video cards");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav]').count(), 1, label + " dock");

          const geometry = await page.evaluate(() => {
            const root = document.querySelector("[data-holistic-mobile-alternative]");
            const measure = sel => [...root.querySelectorAll(sel)].map(el => {
              const r = el.getBoundingClientRect();
              return {x:r.left, y:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, shown:getComputedStyle(el).display!=="none"};
            });
            return {
              client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
              a:measure('[aria-labelledby="mobile-assessment-title"]'),
              photo:measure('[data-support-photo]'),
              tools:measure('[data-support-tool]'),
              toolsSection:measure('#support-tools'),
              hero:measure('[data-support-player]'),
              tabs:measure('[data-support-mode], [data-support-filter]'),
              videos:measure('[data-support-video]'),
              footer:measure('[data-support-mobile-bottom-nav]'),
            };
          });
          const allowedMargin=3;
          assert.ok(geometry.scroll<=geometry.client+allowedMargin, label+" overflow "+JSON.stringify(geometry));
          assert.ok(geometry.hero.length===1, label+" main scenic hero");
          assert.ok(geometry.hero[0].height>=300, label+" hero remains dominant");
          assert.equal(geometry.videos.length,4,label+" all four videos exist");
          assert.ok(geometry.videos.every(v=>v.right<=geometry.client+2 && v.x>=-2), label+" all four cards visible without swipe");
          assert.ok(geometry.videos.every(v=>Math.abs(v.y-geometry.videos[0].y)<3), label+" four cards in one row");
          const tabs = await page.locator('[data-support-mode], [data-support-filter]').all();
          assert.equal(tabs.length, 4, label+" four real filter/meditation pills");
          for (const tab of tabs) {
            const box=await tab.boundingBox();
            assert.ok(box && box.x>=0 && box.x+box.width<=width+2,label+" all filter pills visible");
          }
          if(width>350) {
            const assessment=geometry.a[0], tools=geometry.toolsSection[0], photo=geometry.photo[0];
            assert.ok(Math.abs(assessment.y-tools.y)<4,label+" ratings and tools same row");
            assert.ok(photo.y<=assessment.bottom && photo.y>=assessment.y-2,label+" photo centered between panels");
          }
          if(width===390) await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-"+width+".png",fullPage:true});

          // Real input and the accessible mock's actual single-screen interactions.
          const current = root.locator('[data-support-scale="relationships"] input[type="range"]');
          await current.focus();
          await current.press("Home");
          await current.press("ArrowRight");
          assert.equal(await current.inputValue(),"2",label+" keyboard slider works");
          await page.waitForFunction(() => document.querySelector('[data-support-scale="relationships"] output')?.textContent?.trim() === "2",
            null,{timeout:8000});

          await root.locator('select[aria-label]').first().selectOption("relationships");
          await root.locator('[data-support-recommendations]').click();
          const panel = root.locator('[data-support-personal-recommendations]');
          await panel.waitFor({state:"visible",timeout:8000});
          const chosenText=await panel.innerText();
          assert.ok(chosenText.includes("2/10"),label+" selected self-score: "+chosenText.slice(0,160));
          assert.equal(await panel.locator("[data-support-recommended-talisman]").getAttribute("data-support-recommended-talisman"),
            "fu-harmony",label+" source-backed harmony talisman");
          assert.equal(await panel.locator('[data-support-recommended-video]').count(),1,label+" one source recording");
          if(width===390) {
            await root.locator('[data-support-photo] input[type="file"]')
              .setInputFiles({name:"synthetic.png",mimeType:"image/png",buffer:photo});
            await root.locator('[data-support-photo] img').waitFor({state:"attached",timeout:5000});
            // Returning to video is a deliberate user action, no iframe until Play.
            await root.locator('[data-support-recommended-video] button').click();
            assert.equal(await root.locator('[data-support-player] iframe').count(),0,label+" no autoplay");
            await root.locator('[data-support-play]').click();
            const src = await root.locator('[data-support-player] iframe').getAttribute("src");
            assert.match(src??"", /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?autoplay=1/,label+" consent-to-play original");
          }
          assert.deepEqual(errors,[],label+" browser exceptions");
          evidence.push({label,geometry:{client:geometry.client,scroll:geometry.scroll,heroHeight:geometry.hero[0].height},
            fourVideos:true,threeZones:width>350,photo:width===390,noAutoplay:true});
        } finally { await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
await writeFile(output+"/results.json",JSON.stringify({checks:evidence},null,2));
console.log("Support mock fidelity browser cases: "+evidence.length+" passed.");
