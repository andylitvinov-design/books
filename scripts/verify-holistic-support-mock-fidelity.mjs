// Screenshot parity for the owner-approved Support mobile mock.
 // Local loopback only; synthetic data, no real client upload/CRM/checkout,
 // no external YouTube playback or health/test data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { qaSupportDirectoryResponse } from "./fixtures/holistic-support-directory.mjs";
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
          hasTouch: true, isMobile: true, reducedMotion: "reduce", serviceWorkers: "block" });
        const errors = [];
        const directoryEvents = [];
        const watched = url => url.includes("/api/public/remote-energy-support-masters");
        page.on("pageerror", error => errors.push(error.message));
        page.on("requestfailed", req => { if (watched(req.url()))
          directoryEvents.push("FAILED " + (req.failure()?.errorText ?? "unknown") + " " + req.url()); });
        page.on("response", res => { if (watched(res.url()))
          directoryEvents.push("HTTP " + res.status() + " " + res.url()); });
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        await page.route(/\/api\/public\/remote-energy-support-masters(?:\?.*)?$/, async route => {
          const kind = new URL(route.request().url()).searchParams.get("kind");
          directoryEvents.push("MOCK " + (kind || "masters"));
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
          const mandalaAction=root.locator('[data-support-video-mandala]');
          assert.equal(await mandalaAction.count(),1,label+" one central Video Mandala shortcut");
          assert.equal(await mandalaAction.getAttribute("href"),
            "/"+locale+"/holistic-support/mandala",label+" genuine existing video studio route");
          assert.equal(await root.locator('[aria-labelledby="mobile-assessment-title"] [data-support-goal-filter-trigger]').count(), 1,
            label + " goal filter beneath the self-ratings");
          assert.equal(await root.locator('[data-support-active-focus]').count(), 1,
            label + " current focus beneath the portrait");
          assert.equal(await root.locator('[data-support-recommendations]').count(), 1,
            label + " quick match beneath the portrait");
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
          // The scenic workspace itself expands into a five-sector goal editor.
          await root.locator('[data-support-goal-filter-trigger]').click();
          const filter=root.locator('[data-support-goal-filter]');
          await filter.waitFor({state:"visible",timeout:8000});
          assert.equal(await filter.locator('[data-goal-sector]').count(),5,label+" five goal sectors");
          await filter.locator('[data-goal-sector="money"]').click();
          await filter.locator('[data-goal-concern="income"] input').check();
          await filter.locator('[data-goal-task="stableIncome"] input').check();
          assert.equal(await filter.locator('[data-goal-axis] input[type="range"]').count(),6,label+" now/want sliders");
          await filter.locator('[data-support-goal-apply]').click();
          await root.locator('[data-support-applied-goal]').waitFor({state:"visible",timeout:8000});
          assert.equal(await root.locator('[data-support-meditation-gallery] [data-support-video]').count(),4,
            label+" real published recordings preserved");
          assert.equal(await root.locator('[data-support-player] iframe').count(),0,label+" goals never autoplay");
          await root.locator('[data-support-goal-filter-trigger]').click();
          await root.locator('[data-support-goal-reset]').click();
          assert.equal(await root.locator('[data-goal-sector="energy"][aria-pressed="true"]').count(),1,
            label+" reset restores sector");
          await root.locator('[data-support-goal-filter] button[aria-label]').first().click();
          assert.equal(await root.locator('[data-support-applied-goal]').count(),0,label+" reset clears goal");
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
          const talismanHeight = await talisman.locator('[data-support-talisman]').evaluate(
            element => element.getBoundingClientRect().height);
          assert.ok(Math.abs(talismanHeight - geometry.hero[0].height) <= 10,
            label+" talisman stage uses the same compact height as meditation");
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
          // An isolated WebKit fixture request may fail once after many
          // browser cases. Verify that the real public-directory Retry works;
          // never accept the error placeholder as a successful master card.
          await healing.locator('[data-support-master-hero], [role="alert"]')
            .first().waitFor({state:"visible",timeout:15000});
          const retry = healing.locator('[role="alert"] button');
          if (await retry.count()) await retry.click();
          await heroMaster.waitFor({state:"visible",timeout:20000}).catch(async error => {
            const status = await healing.innerText().catch(() => "(directory unmounted)");
            throw new Error(label + " master gallery failed after bounded retry: " + status +
              " | directory=" + JSON.stringify(directoryEvents) + " / " + error.message);
          });
          const reikiTabs=healing.locator('[data-support-reiki-filters] [data-support-reiki-focus]');
          assert.equal(await reikiTabs.count(),4,label+" four Reiki intentions above the hero");
          assert.equal(await healing.locator('[data-support-reiki-focus="love"]').getAttribute('aria-pressed'),
            "true",label+" only published Tantra Reiki selected initially");
          const masterHeight=await heroMaster.evaluate(element => element.getBoundingClientRect().height);
          assert.ok(Math.abs(masterHeight-geometry.hero[0].height)<=10,
            label+" Reiki hero matches compact meditation hero");
          // User's filter belongs INSIDE the original large photo, not in a second hero.
          const tab = value => healing.locator('[data-support-reiki-tab="' + value + '"]');
          assert.equal(await tab("main").count(),1,label+" central Main tab");
          assert.equal(await tab("filter").count(),1,label+" central Filter tab");
          assert.equal(await tab("description").count(),1,label+" central Description tab");
          assert.equal(await tab("media").count(),1,label+" central Video/audio tab");
          // Screenshot regression: shared .page button {font:inherit} used to inflate
          // every Reiki tab into a huge two-line block on real iPhone Safari.
          const tabSizes=await healing.locator('[data-support-reiki-tab]').evaluateAll(elements =>
            elements.map(element => {
              const rect=element.getBoundingClientRect();
              const css=getComputedStyle(element);
              return {height:rect.height,fontsize:parseFloat(css.fontSize),left:rect.left,
                right:rect.right,top:rect.top,content:element.textContent?.trim()};
            }));
          assert.ok(tabSizes.every(item => item.height >= 40 && item.height <= 50 &&
            item.fontsize <= 13 && item.left >= -1 && item.right <= width+1),
            label+" Reiki tabs are compact, readable and on-screen: "+JSON.stringify(tabSizes));
          assert.ok(Math.max(...tabSizes.map(item=>item.top)) -
            Math.min(...tabSizes.map(item=>item.top)) <= 2,
            label+" four action tabs occupy a single row");
          await tab("filter").click();
          const reikiFilter=healing.locator('[data-support-reiki-filter]');
          await reikiFilter.waitFor({state:"visible"});
          const intro=healing.locator('[data-support-reiki-photo-intro]');
          const introHeight=await intro.evaluate(element => element.getBoundingClientRect().height);
          assert.ok(introHeight >= 68 && introHeight <= 160,
            label+" scenic photo remains visible ABOVE the filter, "+introHeight);
          const filterLayout=await reikiFilter.evaluate(element => {
            const buttons=Array.from(element.querySelectorAll(
              '[data-support-reiki-format] button,[data-support-reiki-price] button,'+
              '[data-support-reiki-timing] button,[data-support-reiki-report] button,'+
              '[data-support-reiki-provider] button'));
            const rect=element.getBoundingClientRect();
            return {height:rect.height,buttons:buttons.map(button=>{
              const box=button.getBoundingClientRect();
              return {height:box.height,font:parseFloat(getComputedStyle(button).fontSize)};
            }),scrollWidth:document.documentElement.scrollWidth,
              viewportWidth:document.documentElement.clientWidth};
          });
          assert.ok(filterLayout.height <= 565,
            label+" Reiki filters should be a compact sheet, not an enormous page: "+
              JSON.stringify(filterLayout));
          assert.ok(filterLayout.buttons.every(button =>
            button.height >= 40 && button.height <= 60 && button.font <= 13),
            label+" Reiki chips must keep 44px touch targets without inflated typography: "+
              JSON.stringify(filterLayout.buttons));
          assert.ok(filterLayout.scrollWidth <= filterLayout.viewportWidth + 2,
            label+" no page-wide overflow while price choices remain horizontally scrollable");
          assert.equal(await reikiFilter.locator('[data-support-reiki-format] button').count(),3,
            label+" session initiation training all available");
          assert.equal(await reikiFilter.locator('[data-support-reiki-price] button').count(),5,
            label+" five real price bands; Reset is the unfiltered choice");
          assert.equal(await reikiFilter.locator('[data-support-reiki-report] button').count(),3,
            label+" brief text voice report");
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),1,
            label+" provider preference only for sessions");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),0,
            label+" session has no certificate toggle");
          await reikiFilter.locator('[data-support-reiki-format] button').nth(2).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),0,
            label+" courses never show session practitioner selector");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),1,
            label+" courses show certificate preference");
          await reikiFilter.locator('[data-support-reiki-certificate] input').check();
          assert.ok((await reikiFilter.locator('[data-support-reiki-apply]').innerText()).includes("0"),
            label+" no fictional certified training offers");
          await reikiFilter.locator('[data-support-reiki-format] button').nth(1).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),1,
            label+" initiation may request a certificate");
          await reikiFilter.locator('[data-support-reiki-format] button').nth(0).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),1,
            label+" return to session resets certificate and restores provider");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),0,
            label+" certificate absent in session");
          await reikiFilter.locator('[data-support-reiki-report] button').nth(2).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-report] button').nth(2)
            .getAttribute("aria-pressed"),"true",label+" voice preference selectable");
          await reikiFilter.locator('[data-support-reiki-timing] button').nth(1).click();
          await reikiFilter.locator('[data-support-reiki-provider] button').nth(1).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider] button').nth(1)
            .getAttribute("aria-pressed"),"true",label+" Reiki master preference selectable");
          await reikiFilter.locator('button').filter({hasText:/^(Сбросить|Reset filters|Restablecer)$/}).click();
          // Apply must remain clickable even with the fixed bottom navigation.
          await reikiFilter.locator('[data-support-reiki-apply]').click();
          assert.equal(await healing.locator('[data-support-reiki-panel="main"]').count(),1,
            label+" apply action returns to the existing large photo");
          await tab("media").click();
          assert.equal(await healing.locator('[data-support-reiki-media]').count(),1,
            label+" media tab does not autoplay or invent a video");
          await tab("description").click();
          assert.equal(await healing.locator('[data-support-reiki-panel="description"]').count(),1,
            label+" original stage shows description");
          await tab("main").click();
          assert.equal(await healing.locator('[data-support-reiki-main]').count(),1,
            label+" original photo returns without a new panel");
          await healing.locator('[data-support-reiki-focus="strength"]').click();
          await healing.locator('[data-support-reiki-unavailable]').waitFor({state:"visible"});
          assert.equal(await healing.locator('[data-support-master-request]').count(),0,
            label+" no fake Kundalini Reiki offering");
          await healing.locator('[data-support-reiki-focus="purpose"]').click();
          await healing.locator('[data-support-reiki-unavailable]').waitFor({state:"visible"});
          await healing.locator('[data-support-reiki-focus="balance"]').click();
          await healing.locator('[data-support-master-hero]').waitFor({state:"visible"});
          await healing.locator('[data-support-reiki-focus="love"]').click();
          await healing.locator('[data-support-master-hero]').waitFor({state:"visible"});
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
          await offers.locator('[data-support-master-hero], [role="alert"]')
            .first().waitFor({state:"visible",timeout:15000});
          const offerRetry = offers.locator('[role="alert"] button');
          if (await offerRetry.count()) await offerRetry.click();
          await offers.locator('[data-support-master-hero]').waitFor({state:"visible",timeout:20000});
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
