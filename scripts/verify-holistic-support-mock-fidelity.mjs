// Screenshot parity for the owner-approved Support mobile mock.
 // Local loopback only; synthetic data, no real client upload/CRM/checkout,
 // no external YouTube playback or health/test data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { qaSupportDirectoryResponse } from "./fixtures/holistic-support-directory.mjs";
import { createSupportDashboardRecorder } from "./helpers/support-dashboard-diagnostics.mjs";
const recordSupportDashboardFailure = createSupportDashboardRecorder();
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
        await page.route("**/api/public/remote-energy-support-masters?**", async route => {
          const kind = new URL(route.request().url()).searchParams.get("kind");
          await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(qaSupportDirectoryResponse(locale, kind)) });
        });
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
          assert.equal(await root.locator('[data-support-tool]').count(), 6, label + " four modes plus Courses/Masters");
          assert.equal(await root.locator('[aria-labelledby="mobile-assessment-title"] [data-support-recommendations]').count(), 1,
            label + " recommendations below the four self-rating scales");
          assert.equal(await root.locator('[aria-labelledby="mobile-assessment-title"] [data-support-detailed-analysis]').count(), 0,
            label + " no extra Tests CTA in check-in");
          assert.equal(await root.locator('[data-support-video]').count(), 4, label + " visible video cards");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav]').count(), 1, label + " dock");
          // These two locally bundled original-mock visuals must actually load.
          await page.waitForFunction(() => {
            const images = [...document.querySelectorAll(
              '[data-support-photo] img, [data-support-player] > img'
            )];
            return images.length >= 2 && images.every(img => img.complete && img.naturalWidth > 0);
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
              photo:measure('[data-support-photo]'),
              tools:measure('[data-support-tool]'),
              toolsSection:measure('#support-tools'),
              readableTools: [...root.querySelectorAll('[data-support-tool]')].map(btn => {
                const caption = [...btn.querySelectorAll('span')].find(x => getComputedStyle(x).display !== 'none');
                const b = btn.getBoundingClientRect(), t = caption?.getBoundingClientRect();
                return { left: t?.left ?? b.left, right: t?.right ?? b.right,
                  top: t?.top ?? b.top, bottom: t?.bottom ?? b.bottom,
                  buttonLeft: b.left, buttonRight: b.right, buttonTop: b.top, buttonBottom: b.bottom,
                  textFits: !caption || (caption.scrollWidth <= caption.clientWidth+2 &&
                    caption.scrollHeight <= caption.clientHeight+2) };
              }),
              readableScores: [...root.querySelectorAll('[data-support-scale]')].map(label => {
                const txt = label.querySelector('span[class*="scaleLabel"]');
                const lr = label.getBoundingClientRect(), tr = txt?.getBoundingClientRect();
                return { name: txt?.textContent, fits: Boolean(txt && tr &&
                  txt.scrollWidth <= txt.clientWidth+2 && tr.left>=lr.left-2 && tr.right<=lr.right+2) };
              }),
              gallery:measure('[data-support-meditation-gallery]'),
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
            console.log("Support top dashboard "+label+": "+headHeight+"px, assessment "+
              Math.round(geometry.a[0].height)+"px, tools "+Math.round(geometry.toolsSection[0].height)+"px");
            await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-320.png",fullPage:true});
          }
          if (!(geometry.hero[0].y-geometry.a[0].y<285)) {
            try { await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); }
            catch { /* Diagnostics must not replace the original fatal assertion. */ }
          }
          assert.ok(geometry.hero[0].y-geometry.a[0].y<285,
            label+" screenshot-like three-zone dashboard exposes scenic player by 285px");
          assert.ok(geometry.gallery.length===1 && geometry.hero[0].bottom<=geometry.gallery[0].y+2,
            label+" other meditations appear BELOW the scenic player");
          assert.ok(geometry.readableTools.every(t =>
            t.textFits && t.left>=t.buttonLeft-2 && t.right<=t.buttonRight+2 &&
            t.top>=t.buttonTop-2 && t.bottom<=t.buttonBottom+2),
            label+" all action captions visible within buttons: "+JSON.stringify(geometry.readableTools));
          assert.ok(geometry.readableScores.every(t=>t.fits),
            label+" all four focus labels visible: "+JSON.stringify(geometry.readableScores));
          assert.ok(geometry.hero[0].height>=268, label+" hero remains the dominant workspace");
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

          await root.locator('[data-support-recommendations]').click();
          const basis=root.locator('[data-support-meditation-gallery] [data-support-meditation-basis]');
          await basis.waitFor({state:"visible",timeout:8000});
          const statusText=await basis.innerText();
          assert.ok(statusText.includes("2/10"),label+" minimum score reflected in meditation rail");
          assert.ok(statusText.includes(locale==="ru"?"Отношения":locale==="es"?"Relaciones":"Relationships"),
            label+" theme chosen by minimum, not a Focus selector");
          assert.equal(await root.locator('[data-support-meditation-gallery] [data-support-video]').count(),
            4,label+" all source-backed thumbnail cards are retained");
          if(width===390) {
            await root.locator('[data-support-photo] input[type="file"]')
              .setInputFiles({name:"synthetic.png",mimeType:"image/png",buffer:photo});
            await root.locator('[data-support-photo] img[class*="photoPreview"]').waitFor({state:"attached",timeout:5000});
            // Selecting a thumb changes the player, but only explicit Play opens YouTube.
            const target=root.locator('[data-support-video]').last();
            await target.click();
            assert.equal(await root.locator('[data-support-player] iframe').count(),0,label+" no autoplay on selection");
            await root.locator('[data-support-play]').click();
            const src=await root.locator('[data-support-player] iframe').getAttribute("src");
            assert.match(src??"", /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?autoplay=1/,
              label+" consent-to-play original");
          }
          // Talisman has the same hero-first stage and source images in a
          // three-tile shelf. Navigation and local quote must not submit.
          await root.locator('[data-support-tool="talisman"]').click();
          const talisman=root.locator('[data-support-talisman-viewer]');
          await talisman.waitFor({state:"visible",timeout:8000});
          assert.equal(await talisman.locator('[data-support-talisman-thumb]').count(),3,
            label+" three verified Fu illustrations below their large hero");
          const tRects=await talisman.evaluate(el=>{
            const a=el.querySelector('[data-support-talisman]')?.getBoundingClientRect();
            const b=el.querySelector('[data-support-talisman-rail]')?.getBoundingClientRect();
            return {heroBottom:a?.bottom,railTop:b?.top};
          });
          assert.ok(tRects.railTop>=tRects.heroBottom-2,
            label+" Fu thumbnail shelf must follow the selected talisman");
          await root.locator('[data-support-tool="meditation"]').click();
          await root.locator('[data-support-tool="pump"]').click();
          assert.equal(await root.locator('[data-support-courses-panel] a').count(),2,
            label+" Academy course routes still work");
          assert.equal(await root.locator('[data-support-player] iframe').count(),0,
            label+" changing category never autoplays");
          await root.locator('[data-support-tool="healing"]').click();
          const healing=root.locator('[data-support-healing-panel] [data-support-master-viewer]');
          await healing.waitFor({state:"visible",timeout:8000});
          const heroMaster=healing.locator('[data-support-master-hero]');
          await heroMaster.waitFor({state:"visible",timeout:8000});
          assert.equal(await healing.locator('[data-support-master-thumb]').count(),2,
            label+" fixture's published specialist options beneath large hero");
          await healing.locator('[data-support-master-thumb="qa-energy-two"]').click();
          assert.equal(await heroMaster.getAttribute("data-support-master-hero"),"qa-energy-two",
            label+" clicking master thumbnail changes selection");
          await root.locator('[data-support-tool="masters"]').click();
          assert.equal(await root.locator('[data-support-master-viewer][data-support-directory-kind="masters"]').count(),1,
            label+" Masters shortcut opens same-page hero catalogue");
          await root.locator('[data-support-tool="consultation"]').click();
          const offers=root.locator('[data-support-master-viewer][data-support-directory-kind="consultation"]');
          await offers.locator('[data-support-master-hero]').waitFor({state:"visible",timeout:8000});
          assert.equal(await offers.locator('[data-support-master-thumb]').count(),2,
            label+" published-only consultation gallery reuses the scenic stage");
          assert.equal(await offers.locator('a[data-support-offer-request]').count(),1,
            label+" secure service request is an explicit navigation, not a silent booking");
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
