// Isolated Chromium/WebKit QA of visual personal-service landings. Never submits a live lead.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Service browser QA may run only against local production-mode Next.");
}
const output = "artifacts/visual-service-mobile";
await mkdir(output, { recursive: true });
const results = [];

const cases = [
  ["en", "imagery-therapy", 320],
  ["en", "imagery-therapy", 390],
  ["en", "imagery-therapy", 430],
  ["ru", "imagery-therapy", 320],
  ["ru", "imagery-therapy", 390],
  ["ru", "imagery-therapy", 430],
  ["es", "imagery-therapy", 320],
  ["es", "imagery-therapy", 390],
  ["es", "imagery-therapy", 430],
  ["en", "psychohomeopathy", 390],
  ["en", "systemic-constellations", 390],
  ["en", "hypnotherapy-course", 390],
];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const [locale, slug, width] of cases) {
      const height = 844;
      const label = engine.name() + ":" + locale + ":" + slug + ":" + width;
      const page = await browser.newPage({
        viewport: { width, height }, hasTouch: true,
        deviceScaleFactor: 1, reducedMotion: "reduce",
        // A PWA Service Worker bypasses Playwright route interception.
        // Block it so all synthetic CRM POSTs stay in this test's mock.
        serviceWorkers: "block",
      });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        const response = await page.goto(origin + "/" + locale + "/services/" + slug, {
          waitUntil: "domcontentloaded", timeout: 60000,
        });
        assert.equal(response?.status(), 200, label + " HTTP");
        if (slug === "psychohomeopathy") {
          // This legacy service now redirects to the canonical Alchemy landing.
          // Verify that real destination and its consented request, rather than
          // expecting the retired personal-service template.
          assert.equal(new URL(page.url()).pathname, `/${locale}/services/alchemy-of-soul`, label + " canonical redirect");
          const panels=page.locator("[data-alchemy-panel]");
          await panels.first().waitFor({state:"visible",timeout:25000});
          assert.ok(await panels.count()>=2,label+" Alchemy stages remain visible");
          const request=page.locator('[data-alchemy-panel="request"]');
          assert.equal(await request.count(),1,label+" one Alchemy request");
          const messenger=request.locator('[data-messenger-only-contact]');
          await messenger.waitFor({state:"visible",timeout:15000});
          assert.equal(await messenger.locator('a[data-messenger-only-channel]').count(),2,
            label+" two customer-initiated messenger choices");
          assert.equal(await messenger.locator('form,input[type="email"],input[type="tel"]').count(),0,
            label+" no standalone CRM request");
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=width+2,label+" no horizontal overflow");
          assert.deepEqual(errors,[],label+" unexpected page errors");
          results.push({label,redirect:"alchemy-of-soul",form:true,errors:[]});
          continue;
        }
        const personal = slug !== "hypnotherapy-course";
        const root = personal ? "[data-visual-service-landing]" : "[data-core-service-visual]";
        const visual = personal ? "[data-service-visual-screen]" : "[data-core-visual-screen]";
        await page.locator(root).waitFor({ state: "visible", timeout: 25000 });
        const screens = page.locator(visual);
        const n = await screens.count();
        assert.ok(n >= 6, label + " has one stage per topic");
        assert.equal(await page.locator(visual + '[data-service-visual-screen="final-capture"],' +
          visual + '[data-core-visual-screen="final-capture"]').count(), 1,
          label + " one final capture stage");

        const rows = [];
        for (let i = 0; i < n; i++) {
          const section = screens.nth(i);
          const id = await section.getAttribute(personal ? "data-service-visual-screen" : "data-core-visual-screen");
          const video = id === "video";
          assert.ok(video ? await section.locator("[data-service-video]").count() > 0
            : await section.locator("img").count() > 0,
            label + ":" + id + " needs a real image or approved video");
          const rect = await section.boundingBox();
          assert.ok(rect?.width && rect.width <= width + 2, label + ":" + id + " fits horizontally");
          // Hidden FAQ content and expandable detail text may grow on user demand.
          // The default closed state must remain within one ordinary mobile viewport.
          assert.ok(rect.height <= height - 25,
            label + ":" + id + " exceeds one visible screen: " + Math.round(rect.height));
          rows.push({ id, height: Math.round(rect.height) });
        }
        const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(docWidth <= width + 2, label + " document must not overflow horizontally");
        const capture = screens.last();
        const messengerBlocks=capture.locator('[data-messenger-only-contact]');
        const messengerCount=await messengerBlocks.count();
        assert.ok(messengerCount>=1&&messengerCount<=2,
          label+" one primary card and at most one optional user-opened request; got "+messengerCount);
        const messenger=messengerBlocks.first();
        if(messengerCount===2){
          const secondaryMessenger=messengerBlocks.nth(1);
          assert.equal(await secondaryMessenger.evaluate(node=>{
            const details=node.closest("details");
            return Boolean(details && !details.open);
          }),true,label+" optional contact remains behind its deliberate disclosure");
        }
        await messenger.waitFor({state:"visible",timeout:20000});
        const details=messenger.locator('details');
        if(await details.count()&&await details.getAttribute('open')===null)
          await details.locator(':scope > summary').click();
        const whatsapp=messenger.locator('a[data-messenger-only-channel="whatsapp"]');
        const telegram=messenger.locator('a[data-messenger-only-channel="telegram"]');
        await whatsapp.waitFor({state:"visible",timeout:15000});
        await telegram.waitFor({state:"visible",timeout:15000});
        const draft=new URL(await whatsapp.getAttribute('href'));
        assert.equal(draft.origin,'https://wa.me',label+" official manual messaging endpoint");
        assert.ok((draft.searchParams.get('text')||'').length>24,label+" published service in draft");
        assert.equal(await messenger.locator('form,input[type="email"],input[type="tel"]').count(),0,
          label+" no unverified contact-only form");
        assert.equal(await capture.locator('[data-lead-saved]').count(),0,
          label+" no fake saved receipt");
        assert.equal(await page.locator("[data-sitewide-capture]:visible").count(),0,
          label+" no duplicate generic form");
        assert.deepEqual(errors,[],label+" no unexpected page errors");
        if (slug === "imagery-therapy" && width === 320 && locale === "en") {
          await capture.scrollIntoViewIfNeeded();
          await page.screenshot({ path: output + "/imagery-en-final-capture-320-" + engine.name() + ".png" });
        }
        if (engine === webkit && slug === "imagery-therapy" && width === 390 && locale === "en") {
          await page.screenshot({ path: output + "/imagery-en-first-screen-webkit.png" });
          await capture.scrollIntoViewIfNeeded();
          await page.screenshot({ path: output + "/imagery-en-final-form-webkit.png" });
        }
        results.push({ label, screens: rows, horizontalOverflow: false, messengerChannels: 2, errors: [] });
        console.log("PASS visual service route: "+label);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
console.log("PASS visual service 320/390/430, EN/RU/ES, Chromium and WebKit (" + results.length + " routes)");
