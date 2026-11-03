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
  ["ru", "imagery-therapy", 390],
  ["es", "imagery-therapy", 390],
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
      });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        const response = await page.goto(origin + "/" + locale + "/services/" + slug, {
          waitUntil: "domcontentloaded", timeout: 60000,
        });
        assert.equal(response?.status(), 200, label + " HTTP");
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
        const form=capture.locator("form[data-compact-lead-form]");
        await form.waitFor({state:"visible",timeout:20000});
        await page.waitForFunction(()=>document.querySelector(
          '[data-service-visual-screen="final-capture"] [data-compact-lead-form], [data-core-visual-screen="final-capture"] [data-compact-lead-form]')?.getAttribute(
          "data-compact-hydrated")==="true",null,{timeout:15000});
        assert.equal(await form.locator('input[name="contact"][required]').count(),1,
          label+" real contact input");
        const consent=form.locator('input[type="checkbox"][required]');
        assert.equal(await consent.count(),1,label+" explicit reply consent");
        assert.equal(await consent.isChecked(),false,label+" consent unchecked by default");
        assert.ok(await form.locator('[data-enquiry-attribution-choice] input[type="checkbox"]').count()<=1,
          label+" attribution is optional and separate");
        // The current CRM-first capture uses an explicit messenger button, not
        // a legacy form submit. Before consent it MUST NOT dispatch a POST.
        assert.equal(await form.locator('button[type="submit"]').count(),0,
          label+" no default form submission");
        const action=form.locator('button[data-compact-channel="whatsapp"]');
        await action.waitFor({state:"visible"});
        let unexpectedWrites=0;
        await page.route("**/api/service-enquiries",route=>{
          if(route.request().method()==="POST"){unexpectedWrites++;return route.abort("blockedbyclient");}
          return route.continue();
        });
        await action.click();
        await form.locator('[role="alert"]').waitFor({state:"visible",timeout:10000});
        assert.equal(unexpectedWrites,0,label+" no CRM request without consent");
        assert.equal(await page.locator("[data-sitewide-capture]:visible").count(), 0,
          label + " no duplicate generic form");
        assert.deepEqual(errors, [], label + " unexpected page errors");
        if (engine === webkit && slug === "imagery-therapy" && width === 390 && locale === "en") {
          await page.screenshot({ path: output + "/imagery-en-first-screen-webkit.png" });
          await capture.scrollIntoViewIfNeeded();
          await page.screenshot({ path: output + "/imagery-en-final-form-webkit.png" });
        }
        results.push({ label, screens: rows, horizontalOverflow: false, form: true, errors: [] });
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
