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
          assert.equal(await root.locator('[data-support-tool]').count(), 5, label + " tools");
          assert.equal(await root.locator('section:has([data-support-photo]) [data-support-recommendations]').count(), 1, label + " recommendations beneath scores");
          assert.equal(await root.locator('#support-tools [data-support-detailed-analysis]').count(), 1, label + " detailed tests beneath help choices");
          assert.equal(await root.locator('[data-support-video]').count(), 4, label + " visible video cards");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav]').count(), 1, label + " dock");
          // The old mock-portrait.webp was invalid and rendered a broken image
          // on iPhone. The non-uploaded state must show a real SVG silhouette.
          await page.waitForFunction(() => {
            const hero = document.querySelector('[data-support-player] > img');
            const placeholder = document.querySelector('[data-support-photo-placeholder]');
            return Boolean(hero?.complete && hero?.naturalWidth > 0 &&
              placeholder && placeholder.getBoundingClientRect().width >= 24);
          }, null, { timeout: 20000 });

          const geometry = await page.evaluate(() => {
            const root = document.querySelector("[data-holistic-mobile-alternative]");
            const measure = sel => [...root.querySelectorAll(sel)].map(el => {
              const r = el.getBoundingClientRect();
              return {x:r.left, y:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, shown:getComputedStyle(el).display!=="none"};
            });
            return {
              client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
              a:measure('[aria-labelledby="mobile-assessment-title"]'),
              profile:measure('section:has([data-support-photo])'),
              photo:measure('[data-support-photo]'),
              tools:measure('[data-support-tool]'),
              toolsSection:measure('#support-tools'),
              readableTools: [...root.querySelectorAll('[data-support-tool]')].map(btn => {
                const caption = [...btn.querySelectorAll('span')].find(x => getComputedStyle(x).display !== 'none');
                const b = btn.getBoundingClientRect(), t = caption?.getBoundingClientRect();
                return { left: t?.left ?? -1, right: t?.right ?? Infinity,
                  top: t?.top ?? -1, bottom: t?.bottom ?? Infinity,
                  buttonLeft: b.left, buttonRight: b.right,
                  buttonTop: b.top, buttonBottom: b.bottom,
                  textFits: !!caption && caption.scrollWidth <= caption.clientWidth + 1 &&
                    caption.scrollHeight <= caption.clientHeight + 2 };
              }),
              readableScores: [...root.querySelectorAll('[data-support-scale]')].map(label => {
                const txt=label.querySelector('span[class*="scaleLabel"]');
                const r=txt?.getBoundingClientRect();
                return { text:txt?.textContent, width:r?.width, scroll:txt?.scrollWidth,
                  fits:!!txt && txt.scrollWidth <= txt.clientWidth + 1 &&
                  r.left >= label.getBoundingClientRect().left - 2 &&
                  r.right <= label.getBoundingClientRect().right + 2 };
              }),
              hero:measure('[data-support-player]'),
              tabs:measure('[data-support-mode], [data-support-filter]'),
              videos:measure('[data-support-video]'),
              footer:measure('[data-support-mobile-bottom-nav]'),
            };
          });
          const allowedMargin=3;
          assert.ok(geometry.scroll<=geometry.client+allowedMargin, label+" overflow "+JSON.stringify(geometry));
          assert.ok(geometry.hero.length===1, label+" main scenic hero");
          if(width===320) {
            const headHeight=Math.round(geometry.hero[0].y-geometry.a[0].y);
            console.log("Support readable dashboard "+label+": "+headHeight+"px, assessment "+
              Math.round(geometry.a[0].height)+"px, tools "+Math.round(geometry.toolsSection[0].height)+"px");
            await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-320.png",fullPage:true});
          }
          assert.ok(geometry.hero[0].y-geometry.a[0].y<350,
            label+" two-row readable phone dashboard must expose practice within 350px");
          assert.ok(geometry.readableTools.every(t =>
            t.textFits && t.left>=t.buttonLeft-2 && t.right<=t.buttonRight+2 &&
            t.top>=t.buttonTop-2 && t.bottom<=t.buttonBottom+2),
            label+" all action captions fully visible: "+JSON.stringify(geometry.readableTools));
          assert.ok(geometry.readableScores.every(t=>t.fits),
            label+" self-rating labels must not truncate: "+JSON.stringify(geometry.readableScores));
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
          {
            const assessment=geometry.a[0], tools=geometry.toolsSection[0], profile=geometry.profile[0];
            assert.ok(Math.abs(assessment.y-profile.y)<4,
              label+" ratings and personal focus share the first row");
            assert.ok(tools.y>=assessment.bottom-3,
              label+" six large help options occupy the second row");
            assert.ok(tools.bottom<=geometry.hero[0].y-2,
              label+" all actions end before the video player begins");
            const testsLink = root.locator('#support-tools [data-support-detailed-analysis]');
            assert.equal(await testsLink.count(), 1, label+" canonical detailed-analysis entry");
            const parentClass = await testsLink.evaluate(el => el.parentElement?.className ?? "");
            assert.ok(parentClass.includes("toolGrid"), label+" detailed tests are the sixth action tile");
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
          await root.locator('[data-support-tool="pump"]').click();
          assert.equal(await root.locator('[data-support-courses-panel] a').count(), 2, label+" Academy course links");
          assert.equal(await root.locator('[data-support-player] iframe').count(), 0, label+" switching courses does not autoplay");
          await root.locator('[data-support-tool="healing"]').click();
          const healing = root.locator('[data-support-healing-panel]');
          await healing.waitFor({state:"visible",timeout:8000});
          assert.equal(await healing.locator('a[href$="/masters"]').count(), 1, label+" masters entry");
          assert.equal(await healing.locator('a[href$="/services/remote-energy-support"]').count(), 1, label+" energy service entry");
          await healing.locator('button[aria-controls="support-mobile-master-request"]').click();
          assert.equal(await healing.locator('#support-mobile-master-request').count(), 1, label+" existing optional master finder");
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
